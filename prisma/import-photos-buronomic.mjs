import "dotenv/config";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rattache les captures pCon aux produits Buronomic, puis les envoie
// sur Cloudinary.
//
// Les fichiers portent la référence telle que le configurateur l'affiche —
// « DH507N », « ED701NNC » — alors que la base contient la référence du
// catalogue papier, plus courte : « DH50 », « ED70 ». Le rattachement se
// fait donc sur le préfixe, la référence du catalogue étant toujours le
// début de celle du configurateur.
//
// Les accessoires ne vivent pas dans la gamme où le configurateur les
// range : « Goulotte universelle » est dans « Accessoires Buronomic »,
// mais ses captures sont dans le dossier Alto ou Astrolite Haute. On
// cherche donc un produit dans toute la marque, pas seulement dans la
// gamme du dossier.
//
// La vue par défaut, celle sans suffixe de finition, devient la vignette.
// Les variantes alimentent la galerie.

const APPLIQUER = process.argv.includes("--appliquer");

// Le preset Cloudinary non signé attribue un identifiant aléatoire à
// chaque envoi : réimporter un produit déjà illustré duplique ses images
// au lieu de les remplacer. On saute donc ce qui a déjà une vignette,
// sauf demande explicite avec --forcer.
const FORCER = process.argv.includes("--forcer");

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Buronomic";

// Sans argument, toutes les gammes. Avec, seulement celles nommées.
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// Toutes les captures sont conservées : le tri se fera dans l'admin,
// où l'on voit les images plutôt que leurs noms de fichiers.
const MAX_IMAGES = Infinity;

const IMAGES = [".png", ".jpg", ".jpeg", ".webp"];

const normalise = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Les captures sont dans <gamme>/_captures.
async function capturesDe(dossierGamme) {
  try {
    const chemin = join(RACINE, dossierGamme, "_captures");
    const entrees = await readdir(chemin, { withFileTypes: true });
    return entrees
      .filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

// Un fichier n'est envoyé qu'une fois, même s'il sert à plusieurs fiches.
const urls = new Map();

async function uploader(dossierGamme, fichier) {
  const cle = `${dossierGamme}/${fichier}`;
  if (urls.has(cle)) return urls.get(cle);

  try {
    const contenu = await readFile(join(RACINE, dossierGamme, "_captures", fichier));
    const form = new FormData();
    form.append("file", new Blob([contenu]), fichier);
    form.append("upload_preset", PRESET);
    form.append("folder", `coteburo/buronomic/${normalise(dossierGamme).replace(/\s+/g, "-")}`);

    const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: "POST",
      body: form,
    });
    const data = await rep.json();

    if (!rep.ok || !data.secure_url) {
      console.log(`      ✗ ${fichier} : ${data.error?.message || rep.statusText}`);
      urls.set(cle, null);
      return null;
    }
    urls.set(cle, data.secure_url);
    return data.secure_url;
  } catch (e) {
    console.log(`      ✗ ${fichier} : ${e.message}`);
    urls.set(cle, null);
    return null;
  }
}

async function main() {
  if (!CLOUD || !PRESET) { console.log("Clés Cloudinary absentes du .env."); return; }

  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  if (FORCER) console.log("Mode --forcer : les produits déjà illustrés seront retraités.\n");

  const marque = await prisma.marque.findFirst({
    where: { slug: "buronomic" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Buronomic introuvable."); return; }

  const gammes = await prisma.gamme.findMany({
    where: {
      marqueId: marque.id,
      ...(DEMANDEES.length
        ? { OR: DEMANDEES.map((n) => ({ nom: { contains: n, mode: "insensitive" } })) }
        : {}),
    },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  // Index de toutes les références de la marque, pour rattraper les
  // accessoires dont les captures sont rangées dans la gamme du produit
  // qui les utilise plutôt que dans la leur.
  const tousProduits = await prisma.produitVitrine.findMany({
    where: { gamme: { marqueId: marque.id } },
    select: {
      id: true, nom: true, sansDeclinaisons: true,
      referenceUnitaire: true, declinaisons: true,
      imageUrl: true,
      gamme: { select: { nom: true } },
    },
  });

  const refsDe = (v) => {
    const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    return [
      ...(v.referenceUnitaire ? [v.referenceUnitaire] : []),
      ...decl.map((d) => d.referenceFournisseur).filter(Boolean),
    ].map((r) => String(r).trim().toUpperCase());
  };

  // Les références les plus longues d'abord : « ED733 » doit l'emporter
  // sur « ED73 » pour un fichier qui commence par les deux.
  const indexRefs = [];
  for (const v of tousProduits) {
    for (const r of refsDe(v)) indexRefs.push({ ref: r, produit: v });
  }
  indexRefs.sort((a, b) => b.ref.length - a.ref.length);

  const rapport = [
    `# Import des captures Buronomic`,
    ``,
    `Lancé le ${new Date().toLocaleString("fr-FR")}`,
    ``,
  ];
  const noter = (s = "") => rapport.push(s);

  let produitsOk = 0, totalImages = 0, sautes = 0;
  const orphelines = [];

  // Une capture peut concerner un produit d'une autre gamme : on
  // rassemble d'abord tout, on écrit ensuite.
  const parProduit = new Map(); // id → { produit, fichiers: [...] }

  let dossiersDisque = [];
  try {
    const entrees = await readdir(RACINE, { withFileTypes: true });
    dossiersDisque = entrees.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    console.log(`Dossier racine illisible : ${e.message}`);
    return;
  }

  // Deux dossiers coexistent pour les gammes composées : « Astro Direction »,
  // créé par le script d'arborescence, et « Astro-Direction », créé par le
  // script de capture qui remplace les espaces par des tirets. On compare
  // donc sur les seules lettres et chiffres, et on retient le dossier qui
  // contient effectivement des images.
  const cleDossier = (s) => normalise(s).replace(/[^a-z0-9]/g, "");

  const trouverDossier = async (nomGamme) => {
    const cible = cleDossier(nomGamme);
    const candidats = dossiersDisque.filter((d) => cleDossier(d) === cible);
    if (!candidats.length) return null;
    for (const c of candidats) {
      const n = await capturesDe(c);
      if (n.length) return c;
    }
    return candidats[0];
  };

  // ── Rapprochement ──

  for (const gamme of gammes) {
    const dossierGamme = await trouverDossier(gamme.nom);
    const fichiers = dossierGamme ? await capturesDe(dossierGamme) : [];
    if (!fichiers.length) continue;

    const sansProduit = [];

    for (const f of fichiers) {
      const nom = basename(f, extname(f)).toUpperCase();

      // On cherche dans toute la marque, pas seulement dans la gamme du
      // dossier : les accessoires sont rangés ailleurs.
      const trouve = indexRefs.find((x) => nom.startsWith(x.ref));

      if (!trouve) { sansProduit.push(f); continue; }

      const id = trouve.produit.id;
      if (!parProduit.has(id)) {
        parProduit.set(id, { produit: trouve.produit, fichiers: [] });
      }
      parProduit.get(id).fichiers.push({ dossier: dossierGamme, fichier: f, ref: trouve.ref });
    }

    if (sansProduit.length) orphelines.push({ gamme: gamme.nom, fichiers: sansProduit });
  }

  // ── Écriture ──

  const ordonneesPar = [...parProduit.values()].sort((a, b) =>
    a.produit.gamme.nom.localeCompare(b.produit.gamme.nom, "fr")
    || a.produit.nom.localeCompare(b.produit.nom, "fr"));

  let gammeCourante = null;

  for (const { produit, fichiers } of ordonneesPar) {
    // Un produit déjà illustré garde ses images : les renvoyer créerait
    // des doublons sur Cloudinary.
    if (!FORCER && produit.imageUrl) { sautes++; continue; }

    if (produit.gamme.nom !== gammeCourante) {
      gammeCourante = produit.gamme.nom;
      console.log(`\n═══ ${gammeCourante} ═══`);
      noter(`\n## ${gammeCourante}\n`);
    }

    // La vue par défaut porte la référence seule, sans suffixe de
    // finition : elle fait la meilleure vignette.
    const parDefaut = fichiers.filter((x) => {
      const nom = basename(x.fichier, extname(x.fichier)).toUpperCase();
      return nom === x.ref;
    });

    const liste = [
      ...parDefaut,
      ...fichiers.filter((x) => !parDefaut.includes(x)),
    ].slice(0, MAX_IMAGES);

    console.log(`   ${produit.nom.slice(0, 48)}`);
    console.log(`      ${liste.length} image(s)`);
    noter(`\n### ${produit.nom}\n`);
    noter(`${liste.length} image(s) : ${liste.slice(0, 4).map((x) => x.fichier).join(", ")}${liste.length > 4 ? "…" : ""}`);

    if (!APPLIQUER) { produitsOk++; totalImages += liste.length; continue; }

    const liens = [];
    for (const x of liste) {
      const u = await uploader(x.dossier, x.fichier);
      if (u) liens.push(u);
    }

    if (liens.length) {
      await prisma.produitVitrine.update({
        where: { id: produit.id },
        data: { imageUrl: liens[0], images: liens },
      });
      produitsOk++;
      totalImages += liens.length;
    }
  }

  // ── Synthèse ──
  const sansCapture = tousProduits.filter(
    (v) => !parProduit.has(v.id) && refsDe(v).length && !v.imageUrl
  );

  noter(`\n---\n`);
  noter(`## Bilan\n`);
  noter(`${produitsOk} produit(s) illustré(s) · ${totalImages} image(s)`);
  noter(`${sautes} produit(s) déjà illustré(s), non retraité(s)`);
  noter(`${sansCapture.length} produit(s) sans capture\n`);

  if (sansCapture.length) {
    noter(`## Produits sans capture\n`);
    for (const v of sansCapture) {
      noter(`- **${v.gamme.nom}** — ${v.nom} (${refsDe(v).slice(0, 3).join(", ")})`);
    }
    noter(``);
  }

  if (orphelines.length) {
    noter(`## Captures sans produit\n`);
    noter(`Leur référence ne correspond à aucun produit en base — soit le`);
    noter(`produit n'a pas été importé, soit la référence diffère.\n`);
    for (const o of orphelines) {
      noter(`**${o.gamme}** — ${o.fichiers.length} fichier(s)`);
      noter(`   ${o.fichiers.slice(0, 10).join(", ")}${o.fichiers.length > 10 ? "…" : ""}`);
      noter(``);
    }
  }

  await writeFile("import-photos-buronomic.md", rapport.join("\n"), "utf8");

  console.log(`\n═══ ${produitsOk} produit(s) · ${totalImages} image(s) ═══`);
  if (sautes) console.log(`${sautes} produit(s) déjà illustré(s), non retraité(s).`);
  console.log(`${sansCapture.length} produit(s) sans capture.`);
  if (orphelines.length) {
    const n = orphelines.reduce((s, o) => s + o.fichiers.length, 0);
    console.log(`${n} capture(s) sans produit correspondant.`);
  }
  console.log(`\nRapport dans import-photos-buronomic.md`);

  if (!APPLIQUER) console.log("\nnode prisma\\import-photos-buronomic.mjs --appliquer");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());