"use server";

// Le tri des visuels : ce que l'écran demande au serveur.
//
// CE QU'IL RÉSOUT
//   Cent quatre-vingt-dix-sept fiches n'ont aucune image, et trois mille deux
//   cent dix-huit fichiers attendent dans les dépôts. L'appariement
//   automatique par le nom a donné ce qu'il pouvait — vingt-quatre fiches —
//   et plafonne : le reste s'appelle « 00670_01.jpg » ou « ambiance-arco-3 ».
//   Il faut des yeux, et l'explorateur de fichiers n'en est pas un : on n'y
//   voit pas à quelle fiche une photo se rapporte.
//
// CE QU'IL NE FAIT JAMAIS
//   Supprimer. Une image écartée part dans un dossier voisin, d'où elle
//   revient d'un clic. Le disque est la seule copie de certaines d'entre
//   elles.

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { synchroniserImagePrincipale } from "@/lib/imagePrincipale";
import { readdir, mkdir, rename, readFile, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import {
  racineMediatheque, souslaRacine, dossierFiche, dossierDepot,
  DEPOTS, EST_IMAGE, nomSain,
} from "@/lib/mediatheque";

// sharp est un module natif : en production son chargement échoue, et ce
// fichier est tiré par un écran de l'admin. On ne le charge qu'au moment de
// s'en servir — c'est-à-dire jamais là où la médiathèque n'existe pas.
let sharpCharge = null;
const chargerSharp = () => (sharpCharge ??= import("sharp").then((m) => m.default));

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const PLAFOND = 10 * 1024 * 1024;
const LARGEUR_MAX = 2600;

const slug = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** L'identifiant Cloudinary, déduit du chemin — pour qu'un second envoi écrase. */
const publicId = (rel) => `coteburo/${rel.split(/[/\\]/).map(slug).join("/")}`
  .replace(/\.[a-z0-9]+$/i, "");

async function compterImages(dossier) {
  let n = 0;
  const parcourir = async (d) => {
    let e = [];
    try { e = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
      if (x.isDirectory()) await parcourir(join(d, x.name));
      else if (EST_IMAGE.test(x.name)) n += 1;
    }
  };
  await parcourir(dossier);
  return n;
}

/** Les gammes qui ont quelque chose à trier, les plus urgentes d'abord. */
export async function listerGammesATrier() {
  await exigerAdmin();
  const base = racineMediatheque();
  if (!base) return { ok: false, error: "Aucune médiathèque sur ce disque." };

  const gammes = await prisma.gamme.findMany({
    select: {
      id: true, nom: true,
      marque: { select: { slug: true, nom: true } },
      vitrines: { select: { _count: { select: { visuels: true } } } },
    },
  });

  const out = [];
  for (const g of gammes) {
    const depot = souslaRacine(dossierDepot(g.marque.slug, g.nom), base);
    const nbDepot = depot ? await compterImages(depot) : 0;
    const vides = g.vitrines.filter((v) => v._count.visuels === 0).length;
    if (!nbDepot && !vides) continue;
    out.push({
      id: g.id, nom: g.nom, marque: g.marque.nom, marqueSlug: g.marque.slug,
      nbDepot, vides, fiches: g.vitrines.length,
    });
  }
  // Ce qui rapporte le plus d'abord : des fiches à remplir ET de quoi le faire.
  out.sort((a, b) => (b.vides && b.nbDepot ? 1 : 0) - (a.vides && a.nbDepot ? 1 : 0)
    || b.vides - a.vides || b.nbDepot - a.nbDepot);
  return { ok: true, racine: base, gammes: out };
}

/** Le dépôt et les fiches d'une gamme. */
export async function chargerGamme(gammeId) {
  await exigerAdmin();
  const base = racineMediatheque();
  if (!base) return { ok: false, error: "Aucune médiathèque sur ce disque." };

  const g = await prisma.gamme.findUnique({
    where: { id: gammeId },
    select: {
      id: true, nom: true,
      marque: { select: { slug: true, nom: true } },
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true,
          visuels: { orderBy: { ordre: "asc" }, take: 1, select: { url: true } },
          _count: { select: { visuels: true } },
        },
      },
    },
  });
  if (!g) return { ok: false, error: "Gamme introuvable." };

  const relDepot = dossierDepot(g.marque.slug, g.nom);
  const depot = [];
  for (const sous of DEPOTS) {
    const d = souslaRacine(`${relDepot}/${sous}`, base);
    if (!d) continue;
    let noms = [];
    try { noms = await readdir(d); } catch { continue; }
    for (const nom of noms.sort()) {
      if (!EST_IMAGE.test(nom)) continue;
      depot.push({ rel: `${relDepot}/${sous}/${nom}`, nom, sous });
    }
  }

  return {
    ok: true,
    gamme: { id: g.id, nom: g.nom, marque: g.marque.nom, marqueSlug: g.marque.slug },
    depot,
    fiches: g.vitrines.map((v) => ({
      id: v.id, nom: v.nom, nb: v._count.visuels, vignette: v.visuels[0]?.url || null,
    })),
  };
}

async function envoyer(chemin, id) {
  if (!CLOUD || !PRESET) throw new Error("Clés Cloudinary absentes.");
  let buffer = await readFile(chemin);
  // L'envoi non signé plafonne à dix mégaoctets ; les photos du fonds en font
  // parfois douze. On les réduit plutôt que de les perdre.
  if (buffer.length > PLAFOND || /\.tiff?$/i.test(chemin)) {
    const sharp = await chargerSharp();
    buffer = await sharp(buffer).rotate()
      .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  }
  const form = new FormData();
  form.append("file", new Blob([buffer]), basename(chemin));
  form.append("upload_preset", PRESET);
  form.append("public_id", id);
  const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: "POST", body: form });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data.secure_url) throw new Error(data?.error?.message || `HTTP ${rep.status}`);
  return data.secure_url;
}

/**
 * Attribue des images du dépôt à une fiche : envoi, rattachement, rangement.
 *
 * Le fichier est déplacé dans le dossier de la fiche une fois l'envoi réussi
 * — jamais avant. Un échec laisse le dépôt intact, et l'on recommence.
 */
export async function attribuer(vitrineId, rels = []) {
  await exigerAdmin();
  const base = racineMediatheque();
  if (!base) return { ok: false, error: "Aucune médiathèque sur ce disque." };
  if (!rels.length) return { ok: false, error: "Aucune image retenue." };

  const v = await prisma.produitVitrine.findUnique({
    where: { id: vitrineId },
    select: {
      id: true, nom: true,
      gamme: { select: { nom: true, marque: { select: { slug: true } } } },
      visuels: { select: { url: true } },
    },
  });
  if (!v) return { ok: false, error: "Fiche introuvable." };

  const relFiche = dossierFiche(v.gamme.marque.slug, v.gamme.nom, v.nom);
  const dossier = souslaRacine(relFiche, base);
  if (!dossier) return { ok: false, error: "Dossier de fiche hors médiathèque." };
  await mkdir(dossier, { recursive: true });

  const connues = new Set(v.visuels.map((x) => x.url));
  let ordre = v.visuels.length;
  const faits = [];
  const echecs = [];

  for (const rel of rels.slice(0, 60)) {
    const source = souslaRacine(rel, base);
    if (!source) { echecs.push({ rel, raison: "hors médiathèque" }); continue; }

    // Une mise en situation part en fin de galerie : le préfixe « amb » est
    // ce que lit prisma/televerser-medias, on le pose ici une fois.
    const estAmbiance = rel.includes("/ambiance/") || /^amb/i.test(basename(rel));
    const estSchema = rel.includes("/schema/");
    let nomCible = basename(rel);
    if (estAmbiance && !/^amb/i.test(nomCible)) nomCible = `amb-${nomCible}`;

    try {
      const url = await envoyer(source, publicId(`${relFiche}/${nomCible}`));
      if (!connues.has(url)) {
        connues.add(url);
        await prisma.visuel.create({
          data: {
            vitrineId: v.id, url, ordre: ordre++,
            // La première image d'une fiche nue fait la vignette.
            role: ordre === 1 && !estAmbiance && !estSchema ? "vignette"
              : estAmbiance ? "ambiance" : estSchema ? "schema" : "galerie",
          },
        });
      }
      // Rangé seulement maintenant : un échec d'envoi doit laisser le dépôt
      // intact, sans quoi on perd la trace de ce qui reste à faire.
      let cible = join(dossier, nomCible);
      let i = 2;
      while (true) {
        try { await stat(cible); } catch { break; }
        const ext = extname(nomCible);
        cible = join(dossier, `${basename(nomCible, ext)}-${i}${ext}`);
        i += 1;
      }
      await rename(source, cible);
      faits.push(rel);
    } catch (e) {
      echecs.push({ rel, raison: e.message });
    }
  }

  if (faits.length) await synchroniserImagePrincipale(prisma, v.id);

  revalidatePath("/admin/visuels");
  revalidatePath(`/admin/produits/${v.id}`);
  return { ok: true, faits: faits.length, echecs };
}

/**
 * Écarte des images : elles quittent le dépôt sans quitter le disque.
 *
 * Rien n'est supprimé. Le dossier _ECARTE est un tiroir, pas une corbeille :
 * certaines de ces images sont la seule copie qui existe.
 */
export async function ecarter(rels = []) {
  await exigerAdmin();
  const base = racineMediatheque();
  if (!base) return { ok: false, error: "Aucune médiathèque sur ce disque." };

  let n = 0;
  for (const rel of rels.slice(0, 200)) {
    const source = souslaRacine(rel, base);
    if (!source) continue;
    // _ECARTE se pose à côté de _A-TRIER, dans la même gamme.
    const relCible = rel.replace(/\/_A-TRIER\/[^/]+\//, "/_ECARTE/");
    const cible = souslaRacine(relCible, base);
    if (!cible || cible === source) continue;
    try {
      await mkdir(join(cible, ".."), { recursive: true });
      await rename(source, cible);
      n += 1;
    } catch { /* déjà déplacé, ou verrouillé */ }
  }
  revalidatePath("/admin/visuels");
  return { ok: true, ecartees: n };
}
