// Répartit les images des dépôts _A-TRIER dans les dossiers de fiches.
//
// En simulation par défaut. --appliquer pour déplacer les fichiers.
//
//   node prisma/repartir-depots.mjs
//   node prisma/repartir-depots.mjs --gamme=Verano
//   node prisma/repartir-depots.mjs --gamme=Verano --appliquer
//
// N'ÉCRIT RIEN EN BASE. Il ne fait que déplacer des fichiers sur le disque,
// pour que prisma/televerser-medias.mjs ait ensuite quelque chose à envoyer.
//
// LE TRAVAIL QU'IL REPREND
//   Deux cent vingt et une fiches n'ont aucune image, et cinq mille images
//   attendent dans les dépôts. Les répartir était le seul geste manuel qui
//   restait entre le catalogue et ses photos : ouvrir _A-TRIER, regarder,
//   déplacer, fiche par fiche.
//
// COMMENT IL APPARIE
//   Deux signaux, du plus sûr au moins sûr.
//
//   LA RÉFÉRENCE, où qu'elle soit dans le nom. « art-ver02ja-is-0_01.webp »
//   porte VER02JA, qui est la référence d'une combinaison de la fiche. C'est
//   une preuve, pas un indice : on la suit sans discuter.
//
//   LES MOTS DU NOM DE FICHE, sinon. « chaise-haute-verano_01.jpg » partage
//   « chaise » et « haute » avec « Chaise haute - Verano ». On exige que la
//   fiche gagnante ait au moins deux mots propres en commun avec le fichier,
//   et qu'elle devance nettement la suivante — sans quoi on ne tranche pas.
//
//   Les mots que toutes les fiches d'une gamme partagent — le nom de la
//   gamme, « chaise » quand elles sont douze — ne comptent pas : ils ne
//   distinguent rien. Seuls les mots qui séparent font foi.
//
// CE QU'IL NE FAIT PAS
//   Il ne devine pas. Un fichier que rien ne désigne reste dans son dépôt,
//   et le compte des restants est affiché. Mieux vaut cent fichiers à trier
//   à la main que dix images sur la mauvaise fiche.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readdir, mkdir, rename, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { homedir } from "node:os";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const FILTRE = (process.argv.find((a) => a.startsWith("--gamme=")) || "").slice(8) || null;

const MEDIAS = join(homedir(), "Desktop", "Matt", "COTEBURO-MEDIAS");
const CIBLE = join(MEDIAS, "CATALOGUE-2026");
const DEPOTS = ["photo", "ambiance", "schema"];

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// Les mêmes règles de nommage que televerser-medias, pour retrouver ses
// dossiers au caractère près. Les recopier plutôt que les partager serait la
// façon la plus sûre de les faire diverger — mais ce script est le seul autre
// à en avoir besoin, et l'import croisé coûterait plus qu'il ne rapporte.
const INTERDITS = /[<>:"/\\|?*]|[\p{Cc}]/gu;
const empreinte = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).slice(0, 4);
};
const nomSain = (s, max) => {
  const p = String(s ?? "").replace(INTERDITS, "-")
    .replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
  return p.length <= max ? (p || "sans-nom") : `${p.slice(0, max - 5).trim()}~${empreinte(p)}`;
};

const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Les mots trop courts ou trop communs ne distinguent rien.
const VIDES = new Set(["de", "du", "des", "la", "le", "les", "et", "en", "a", "au", "aux",
  "avec", "sans", "sur", "pour", "par", "un", "une", "cm", "mm", "art", "copie", "hd",
  "untitled", "capture", "ecran", "img", "photo", "image", "dt", "v2", "amb", "ambiance"]);
const mots = (s) => nu(s).split(" ").filter((m) => m.length > 2 && !VIDES.has(m) && !/^\d+$/.test(m));

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — les fichiers sont déplacés ═══\n"
    : "═══ SIMULATION — rien n'est déplacé ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true,
      gamme: { select: { nom: true, marque: { select: { slug: true } } } },
      combinaisons: { select: { referenceBase: true } },
      _count: { select: { visuels: true } },
    },
  });

  // Les fiches, rangées par dossier de gamme.
  const parGamme = new Map();
  for (const v of vitrines) {
    const marque = v.gamme.marque.slug;
    const gamme = nomSain(v.gamme.nom, 30);
    if (FILTRE && nu(v.gamme.nom) !== nu(FILTRE)) continue;
    const cle = `${marque}/${gamme}`;
    if (!parGamme.has(cle)) parGamme.set(cle, []);
    parGamme.get(cle).push({
      id: v.id,
      nom: v.nom,
      vide: v._count.visuels === 0,
      dossier: join(CIBLE, marque, gamme, nomSain(v.nom, 58)),
      refs: [...new Set(v.combinaisons.map((k) => k.referenceBase).filter(Boolean).map(nu))],
      mots: mots(v.nom),
    });
  }

  const plan = [];
  const restants = [];

  for (const [cle, fiches] of parGamme) {
    // Un mot que toutes les fiches partagent ne sépare rien.
    const frequence = new Map();
    for (const f of fiches) for (const m of new Set(f.mots)) frequence.set(m, (frequence.get(m) || 0) + 1);
    const distinctif = (m) => (frequence.get(m) || 0) < Math.max(2, fiches.length * 0.6);

    for (const sous of DEPOTS) {
      const dossier = join(CIBLE, cle, "_A-TRIER", sous);
      let fichiers = [];
      try { fichiers = await readdir(dossier); } catch { continue; }

      for (const nom of fichiers) {
        if (!/\.(jpe?g|png|webp|tif?f)$/i.test(nom)) continue;
        const chemin = join(dossier, nom);
        try { if (!(await stat(chemin)).isFile()) continue; } catch { continue; }

        const k = nu(basename(nom, extname(nom)));
        const kSerre = k.replace(/ /g, "");

        // 1. La référence, où qu'elle soit dans le nom.
        const parRef = fiches.filter((f) => f.refs.some((r) => r.length >= 5 && kSerre.includes(r.replace(/ /g, ""))));
        if (parRef.length === 1) {
          plan.push({ cle, sous, nom, chemin, fiche: parRef[0], motif: "référence", score: null });
          continue;
        }

        // 2. Les mots propres du nom de fiche.
        const motsFichier = new Set(mots(nom));
        const scores = fiches
          .map((f) => ({ f, n: f.mots.filter((m) => distinctif(m) && motsFichier.has(m)).length }))
          .filter((x) => x.n >= 2)
          .sort((a, b) => b.n - a.n);

        if (scores.length && (scores.length === 1 || scores[0].n > scores[1].n)) {
          plan.push({ cle, sous, nom, chemin, fiche: scores[0].f, motif: `${scores[0].n} mots`, score: scores[0].n });
          continue;
        }
        restants.push({ cle, sous, nom });
      }
    }
  }

  // ── Ce qui serait déplacé ───────────────────────────────────────────
  titre("CE QUI SERAIT RÉPARTI");
  const parFiche = new Map();
  for (const p of plan) {
    if (!parFiche.has(p.fiche.id)) parFiche.set(p.fiche.id, { fiche: p.fiche, fichiers: [] });
    parFiche.get(p.fiche.id).fichiers.push(p);
  }
  let gammeCourante = null;
  for (const { fiche, fichiers } of [...parFiche.values()].sort((a, b) => a.fiche.dossier.localeCompare(b.fiche.dossier))) {
    const g = fiche.dossier.split(/[/\\]/).slice(-3, -1).join("/");
    if (g !== gammeCourante) { console.log(`\n   ${g}`); gammeCourante = g; }
    const etat = fiche.vide ? "" : "  (déjà illustrée)";
    console.log(`      ${String(fichiers.length).padStart(3)} → ${fiche.nom}${etat}`);
    for (const f of fichiers.slice(0, 3)) console.log(`            ${f.sous}/${f.nom}  [${f.motif}]`);
    if (fichiers.length > 3) console.log(`            … et ${fichiers.length - 3} autres`);
  }

  const fichesVides = [...parFiche.values()].filter((x) => x.fiche.vide).length;
  console.log(`\n   ${plan.length} fichier(s) · ${parFiche.size} fiche(s), dont ${fichesVides} aujourd'hui sans aucune image`);

  if (restants.length) {
    titre("LAISSÉS DANS LEUR DÉPÔT");
    const parG = new Map();
    for (const r of restants) parG.set(r.cle, (parG.get(r.cle) || 0) + 1);
    console.log("");
    for (const [g, n] of [...parG].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`   ${String(n).padStart(4)}  ${g}`);
    }
    console.log(`\n   ${restants.length} fichier(s) que rien ne désigne. Ils restent à trier à la main.`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour déplacer.");
    console.log("Puis : node prisma/televerser-medias.mjs");
    return;
  }

  titre("DÉPLACEMENT");
  let faits = 0;
  for (const { fiche, fichiers } of parFiche.values()) {
    await mkdir(fiche.dossier, { recursive: true });
    for (const f of fichiers) {
      // Le préfixe « amb » est ce que le téléverseur lit pour reléguer une
      // mise en situation en fin de galerie. On le pose ici, une fois.
      const cible = f.sous === "ambiance" && !/^amb/i.test(f.nom) ? `amb-${f.nom}` : f.nom;
      try {
        await rename(f.chemin, join(fiche.dossier, cible));
        faits += 1;
      } catch (e) {
        console.log(`   ÉCHEC ${f.nom} : ${e.message}`);
      }
    }
  }
  console.log(`   ${faits} fichier(s) déplacé(s) dans ${parFiche.size} dossier(s)`);
  console.log("\nÀ suivre : node prisma/televerser-medias.mjs");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
