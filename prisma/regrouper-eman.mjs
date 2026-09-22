// Regroupe les vingt-sept fiches Eman en deux.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/regrouper-eman.mjs
//   node prisma/regrouper-eman.mjs --appliquer
//
// POURQUOI
//   Le tarif Sokoa donne une référence par combinaison. L'import a fait une
//   fiche par ligne : vingt-sept pages pour deux sièges. Un client qui ouvre
//   « Sièges opérateur » voit vingt-sept chaises presque identiques.
//
//   Le modèle à choix sait faire mieux : une fiche, des questions, un prix
//   par combinaison. C'est exactement ce pour quoi il a été construit.
//
// LES SIX QUESTIONS, ET POURQUOI PAS HUIT
//   Roulettes et piétement répondent toujours ensemble — vérifié sur les
//   vingt et une fiches « fauteuil » : ø65 va toujours avec l'aluminium
//   poli, ø50 avec le nylon. Deux questions pour une seule information en
//   font perdre une au client sans rien lui apprendre.
//
//   Le soutien lombaire n'existe que sur le dossier tapissé. Il devient une
//   valeur du dossier plutôt qu'une question qui ne s'applique presque
//   jamais.
//
// CE QUI N'EST PAS DEVINÉ
//   Le mécanisme. Chaque fiche porte une section « Mécanismes au choix » qui
//   nomme ses deux références : « Synchro automatique (NH86/J0) » et
//   « Synchro Plus (NH16/J0) ». On lit cette section ; on ne décode pas le
//   numéro. Une référence dont le mécanisme n'est pas écrit fait échouer le
//   regroupement de sa fiche.
//
// LA GARDE QUI COMPTE
//   Deux variantes qui aboutissent aux mêmes réponses seraient deux prix
//   pour une même configuration : c'est le signe qu'une information a été
//   perdue en chemin. Le script REFUSE d'écrire dans ce cas, et dit
//   lesquelles.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Eman";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── Lire une fiche ────────────────────────────────────────────────────
const PRODUIT = (k) => (/\bfauteuil\b/.test(k) ? "Fauteuil haut dossier - Eman"
  : /\bchaise\b/.test(k) ? "Chaise haut dossier - Eman" : null);

const lireFinition = (k) => (/\bblanc\b/.test(k) ? "Blanc" : /\bnoir\b/.test(k) ? "Noir" : null);

// Le soutien lombaire entre dans le dossier : il n'existe que sur le tapissé.
const lireDossier = (k) => {
  if (/\bresille\b/.test(k)) return "Résille";
  if (/\btapisse\b/.test(k)) return /\brl\b/.test(k) ? "Tapissé — avec soutien lombaire" : "Tapissé";
  if (/\btoile\b/.test(k)) return "Toile";
  return null;
};

const lireTetiere = (k) => (/\btetiere\b/.test(k) ? "Avec têtière" : "Sans têtière");

// Roulettes et piétement ne font qu'une question : ils sont liés.
const lirePietement = (k) => (/\b65\b|sol dur/.test(k)
  ? "Aluminium poli — roulettes ø65, sol dur"
  : "Nylon — roulettes ø50, sol moquette");

// Le tarif suffixe certaines références d'un « +coloris* » que la section
// des mécanismes n'écrit pas : NL86/J+coloris* y figure sous NL86/J. On
// compare donc les références dépouillées de ce qui suit le plus.
const refNue = (r) => String(r || "").split("+")[0].replace(/\*+$/, "").trim().toUpperCase();

// Le tarif écrit « Tissu B » ici et « Tissu B — Xtrevira uniquement » là :
// c'est le même tissu, avec une restriction qui dépend du siège. Regroupées,
// ces restrictions sont portées par les combinaisons — une association
// interdite n'existe simplement pas — et n'ont plus rien à faire dans le
// libellé, où elles feraient deux entrées pour un seul tissu.
const tissuNu = (t) => String(t || "").split(/\s+[—–-]\s+/)[0].trim();

/** Le mécanisme de chaque référence, lu dans la section de la fiche. */
function mecanismesDe(sections) {
  const s = (Array.isArray(sections) ? sections : [])
    .find((x) => /m[ée]canisme/i.test(x?.titre || ""));
  if (!s) return null;
  const texte = String(s.contenu).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const out = new Map();
  // « Synchro automatique + translation d'assise (NH86/J0) »
  for (const m of texte.matchAll(/([^()|]+?)\s*\(([A-Z0-9/+*]+)\)/g)) {
    const libelle = m[1].replace(/^[\s·|]+/, "").trim();
    if (libelle) out.set(refNue(m[2]), libelle);
  }
  return out.size ? out : null;
}

const AXES = [
  { cle: "finition", nom: "Finition", lire: lireFinition },
  { cle: "dossier", nom: "Dossier", lire: lireDossier },
  { cle: "tetiere", nom: "Têtière", lire: lireTetiere },
  { cle: "pietement", nom: "Piétement et roulettes", lire: lirePietement },
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const gamme = await prisma.gamme.findFirst({
    where: { nom: GAMME },
    select: {
      id: true, nom: true,
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true, slug: true, descriptif: true, sectionsDevis: true,
          publie: true, venteSurDevis: true,
          sousCategories: { select: { id: true, categorieId: true } },
          visuels: { select: { id: true } },
          choix: {
            orderBy: { ordre: "asc" },
            select: { cle: true, nom: true, nature: true, valeurs: { orderBy: { ordre: "asc" }, select: { libelle: true } } },
          },
          combinaisons: {
            select: {
              valeurs: true, prixTarifHT: true, ecoContribution: true,
              poids: true, ean: true, referenceBase: true, pageCatalogue: true, ancienId: true,
            },
          },
        },
      },
    },
  });
  if (!gamme) { console.error(`Gamme ${GAMME} introuvable.`); process.exitCode = 1; return; }

  // ── Lire chaque fiche ───────────────────────────────────────────────
  const groupes = new Map();
  const refuses = [];

  for (const v of gamme.vitrines) {
    const k = nu(v.nom);
    const produit = PRODUIT(k);
    if (!produit) { refuses.push(`${v.nom} — ni chaise ni fauteuil`); continue; }

    const variantes = {};
    let manque = null;
    for (const a of AXES) {
      const r = a.lire(k);
      if (r == null) { manque = a.nom; break; }
      variantes[a.cle] = r;
    }
    if (manque) { refuses.push(`${v.nom} — ${manque} illisible`); continue; }

    const meca = mecanismesDe(v.sectionsDevis);
    if (!meca) { refuses.push(`${v.nom} — pas de section « Mécanismes »`); continue; }

    // La question du tissu, telle que la fiche la posait déjà.
    const tissu = v.choix.find((c) => c.nature === "tarifaire" && /finition|tissu/i.test(c.nom));

    if (!groupes.has(produit)) groupes.set(produit, { nom: produit, fiches: [] });
    groupes.get(produit).fiches.push({ v, variantes, meca, cleTissu: tissu?.cle || null });
  }

  // ── Construire les combinaisons de la fiche regroupée ───────────────
  for (const grp of groupes.values()) {
    const combinaisons = [];
    const collisions = [];
    const vues = new Map();
    const sansMeca = [];

    for (const f of grp.fiches) {
      for (const k of f.v.combinaisons) {
        const ref = k.referenceBase;
        const mecanisme = ref ? f.meca.get(refNue(ref)) : null;
        if (!mecanisme) { sansMeca.push(`${f.v.nom} · ${ref || "sans référence"}`); continue; }

        const valeurs = { ...f.variantes, mecanisme };
        if (f.cleTissu && k.valeurs?.[f.cleTissu]) valeurs.tissu = tissuNu(k.valeurs[f.cleTissu]);

        const empreinte = empreinteDe(valeurs);
        if (vues.has(empreinte)) {
          collisions.push({ a: vues.get(empreinte), b: `${ref} (${k.prixTarifHT} €)`, valeurs });
          continue;
        }
        vues.set(empreinte, `${ref} (${k.prixTarifHT} €)`);
        combinaisons.push({
          valeurs, empreinte,
          prixTarifHT: k.prixTarifHT, ecoContribution: k.ecoContribution,
          poids: k.poids, ean: k.ean, referenceBase: ref,
          pageCatalogue: k.pageCatalogue, ancienId: k.ancienId,
        });
      }
    }
    grp.combinaisons = combinaisons;
    grp.collisions = collisions;
    grp.sansMeca = sansMeca;
    // La fiche d'accueil : la mieux illustrée, pour garder ses visuels en place.
    grp.cible = [...grp.fiches].sort((a, b) => b.v.visuels.length - a.v.visuels.length)[0].v;
  }

  // ── Montrer ─────────────────────────────────────────────────────────
  titre("LES FICHES QU'ON OBTIENDRAIT");
  for (const grp of groupes.values()) {
    const prix = grp.combinaisons.map((c) => c.prixTarifHT).filter((x) => x != null);
    console.log(`\n   ${grp.nom}`);
    console.log(`      remplace ${grp.fiches.length} fiches · reprend celle de « ${grp.cible.nom.slice(0, 46)} »`);
    console.log("      ──");
    for (const a of AXES) {
      const vals = [...new Set(grp.fiches.map((f) => f.variantes[a.cle]))];
      if (vals.length < 2) continue;
      console.log(`      ${a.nom.padEnd(24)} ${vals.join(" · ")}`);
    }
    const mecas = [...new Set(grp.combinaisons.map((c) => c.valeurs.mecanisme))];
    if (mecas.length > 1) console.log(`      ${"Mécanisme".padEnd(24)} ${mecas.join(" · ")}`);
    const tissus = [...new Set(grp.combinaisons.map((c) => c.valeurs.tissu).filter(Boolean))];
    if (tissus.length > 1) console.log(`      ${"Tissu".padEnd(24)} ${tissus.slice(0, 5).join(" · ")}${tissus.length > 5 ? ` … (${tissus.length})` : ""}`);
    console.log("      ──");
    console.log(`      ${grp.combinaisons.length} variantes · ${Math.min(...prix)} à ${Math.max(...prix)} € HT`);
    console.log(`      ${grp.fiches.reduce((n, f) => n + f.v.visuels.length, 0)} visuels repris`);
  }

  const collisions = [...groupes.values()].flatMap((g) => g.collisions);
  const sansMeca = [...groupes.values()].flatMap((g) => g.sansMeca);

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }
  if (sansMeca.length) {
    titre("VARIANTES SANS MÉCANISME NOMMÉ");
    console.log("");
    for (const s of sansMeca.slice(0, 10)) console.log(`   ${s}`);
    if (sansMeca.length > 10) console.log(`   … et ${sansMeca.length - 10} autres`);
  }
  if (collisions.length) {
    titre("DEUX PRIX POUR UNE MÊME CONFIGURATION — RIEN NE SERA ÉCRIT");
    console.log("\n   Une information a été perdue en chemin : deux variantes");
    console.log("   distinctes aboutissent aux mêmes réponses.\n");
    for (const c of collisions.slice(0, 10)) {
      console.log(`   ${c.a}  ≠  ${c.b}`);
      console.log(`      ${JSON.stringify(c.valeurs)}`);
    }
    if (collisions.length > 10) console.log(`   … et ${collisions.length - 10} autres`);
    process.exitCode = 1;
    return;
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const grp of groupes.values()) {
    const cible = grp.cible;
    const autres = grp.fiches.map((f) => f.v).filter((v) => v.id !== cible.id);

    // 1. La fiche d'accueil prend le nom du produit.
    await prisma.produitVitrine.update({
      where: { id: cible.id },
      data: { nom: grp.nom, slug: slug(grp.nom), publie: true },
    });

    // 2. Ses anciennes questions et variantes cèdent la place.
    await prisma.choix.deleteMany({ where: { vitrineId: cible.id } });
    await prisma.combinaison.deleteMany({ where: { vitrineId: cible.id } });

    // 3. Les nouvelles questions, dans l'ordre où on les pose.
    const questions = [
      ...AXES.map((a) => ({ cle: a.cle, nom: a.nom })),
      { cle: "mecanisme", nom: "Mécanisme" },
      { cle: "tissu", nom: "Tissu" },
    ];
    let ordre = 0;
    for (const q of questions) {
      const vals = [...new Set(grp.combinaisons.map((c) => c.valeurs[q.cle]).filter(Boolean))];
      if (vals.length < 2) continue;
      await prisma.choix.create({
        data: {
          vitrineId: cible.id, cle: q.cle, nom: q.nom,
          nature: "tarifaire", rendu: "boutons", ordre: ordre++, origine: "editorial",
          valeurs: { create: vals.map((libelle, i) => ({ libelle, ordre: i })) },
        },
      });
    }

    // 4. Les variantes, avec leurs prix et leurs références.
    await prisma.combinaison.createMany({
      data: grp.combinaisons.map((c) => ({ ...c, vitrineId: cible.id })),
    });

    // 5. Les visuels des autres fiches rejoignent la fiche d'accueil.
    let rang = cible.visuels.length;
    for (const v of autres) {
      for (const img of v.visuels) {
        await prisma.visuel.update({ where: { id: img.id }, data: { vitrineId: cible.id, ordre: rang++ } });
      }
    }

    // 6. Les fiches remplacées sortent du catalogue sans être détruites :
    //    leurs prix et leurs références restent consultables si l'on doute.
    await prisma.produitVitrine.updateMany({
      where: { id: { in: autres.map((v) => v.id) } },
      data: { publie: false, accessoireSeul: true },
    });

    console.log(`   ${grp.nom}`);
    console.log(`      ${questions.length} questions · ${grp.combinaisons.length} variantes · ${autres.length} fiches dépubliées`);
  }

  titre("CONTRÔLE");
  const restantes = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true } });
  const comb = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true } } });
  console.log(`   fiches publiées dans ${GAMME} : ${restantes} · variantes : ${comb}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
