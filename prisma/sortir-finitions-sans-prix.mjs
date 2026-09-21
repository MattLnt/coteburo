// Sort la finition des déclinaisons là où elle ne change pas le prix.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/sortir-finitions-sans-prix.mjs
//   node prisma/sortir-finitions-sans-prix.mjs --apercu="Armoire à rideaux - Eko"
//   node prisma/sortir-finitions-sans-prix.mjs --appliquer
//
// LE PROBLÈME
//   L'import a fait de la finition un axe de déclinaison, parce que le tarif
//   porte une ligne par combinaison. Mais sur la plupart des fiches, les
//   quinze lignes d'un même modèle affichent quinze fois le même prix : la
//   finition n'y coûte rien. Elle n'a alors rien à faire dans le calcul.
//
//   Deux conséquences. Le client se voit poser une question tarifaire qui
//   n'en est pas une, et le catalogue porte quinze déclinaisons là où une
//   suffit. L'ancienne base ne s'y trompait pas : la finition y était un
//   groupe de pastilles, purement présentatif, et la déclinaison ne portait
//   que ce qui fait le prix — les dimensions, l'élément, le passage.
//
// LE TEST
//   À dimensions égales, c'est-à-dire pour chaque combinaison des AUTRES
//   axes, le prix varie-t-il d'une finition à l'autre ?
//     - non → la finition sort des déclinaisons et redevient un choix libre
//     - oui → elle reste un axe, elle fait le prix
//
//   Le test se fait par combinaison, pas globalement : une fiche dont le prix
//   monte avec la largeur mais reste plat entre les finitions doit sortir.
//
// CE QU'IL FAUT AVOIR SOUS LA MAIN AVANT DE SORTIR UNE FINITION
//   Le client doit continuer à voir les finitions. Elles sont déjà là, dans
//   les groupes de finition rattachés à la fiche. Une fiche qui n'en aurait
//   aucun perdrait le choix en même temps que l'axe : on ne la touche pas,
//   et le rapport la signale.
//
// LA RÉFÉRENCE FOURNISSEUR
//   Le tarif donne une référence par finition — « BK421A » pour
//   aluminium/hêtre, « BK421F » pour aluminium/nebraska. En fusionnant les
//   lignes on n'en garderait qu'une, et le devis commanderait la mauvaise
//   teinte. La correspondance complète est donc rangée sur la déclinaison,
//   sous « referencesParFinition » : rien ne l'affiche, mais le lien au tarif
//   reste écrit et la commande restera exacte le jour où on la rebranchera.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const APERCU = (process.argv.find((a) => a.startsWith("--apercu=")) || "").slice(9) || null;

const titre = (t) => console.log(`\n${"═".repeat(70)}\n${t}\n${"═".repeat(70)}`);
const comptePar = (L, f) => {
  const t = {};
  for (const x of L) t[f(x)] = (t[f(x)] || 0) + 1;
  return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} (${c})`).join(" · ");
};

function examiner(vitrine) {
  const axes = Array.isArray(vitrine.axesDeclinaisons) ? vitrine.axesDeclinaisons : [];
  const axeFin = axes.find((a) => a.id === "finition");
  if (!axeFin || (axeFin.valeurs || []).length < 2) return null;

  const autres = axes.filter((a) => a.id !== "finition").map((a) => a.id);
  const declinaisons = vitrine.declinaisons || [];

  // Une combinaison des autres axes = une « dimension égale ».
  const groupes = new Map();
  for (const d of declinaisons) {
    const k = JSON.stringify(autres.map((id) => d.valeurs?.[id] ?? null));
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(d);
  }

  let prixVarie = false;
  let ecoVarie = false;
  let refVarie = false;
  for (const L of groupes.values()) {
    if (new Set(L.map((d) => String(d.prixTarifHT))).size > 1) prixVarie = true;
    if (new Set(L.map((d) => String(d.ecoContribution))).size > 1) ecoVarie = true;
    if (new Set(L.map((d) => String(d.referenceFournisseur))).size > 1) refVarie = true;
  }

  return { axes, axeFin, autres, groupes, prixVarie, ecoVarie, refVarie, declinaisons };
}

function planifier(vitrine, e) {
  // On garde, par combinaison, la première déclinaison — son identifiant est
  // cité par les devis et les paniers, il ne doit pas changer.
  const gardees = [];
  for (const L of e.groupes.values()) {
    const d = L[0];
    const { finition, ...valeurs } = d.valeurs || {};
    const ligne = { ...d, valeurs };
    // La référence fournisseur encode la finition — « BK421A » pour
    // aluminium/hêtre, « BK421F » pour aluminium/nebraska. Ne garder que la
    // première reviendrait à commander la mauvaise teinte. On range donc la
    // correspondance sur la déclinaison : invisible à l'écran, mais le lien
    // au tarif reste écrit.
    if (e.refVarie) {
      ligne.referencesParFinition = Object.fromEntries(
        L.map((x) => [x.valeurs?.finition, x.referenceFournisseur]).filter(([k, r]) => k && r));
    }
    gardees.push(ligne);
  }
  return {
    id: vitrine.id,
    nom: vitrine.nom,
    axes: e.axes.filter((a) => a.id !== "finition"),
    declinaisons: gardees,
    avant: e.declinaisons.length,
    apres: gardees.length,
    nbFinitions: (e.axeFin.valeurs || []).length,
    refVarie: e.refVarie,
    ecoVarie: e.ecoVarie,
  };
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, axesDeclinaisons: true, declinaisons: true,
      groupesFinition: { select: { nom: true, finitions: { select: { nom: true } } } },
      gamme: { select: { marque: { select: { slug: true } } } },
    },
  });

  const aSortir = [];
  const aGarder = [];
  const sansGroupe = [];
  for (const v of vitrines) {
    const e = examiner(v);
    if (!e) continue;
    const marque = v.gamme?.marque?.slug || "?";
    if (e.prixVarie) { aGarder.push({ nom: v.nom, marque, nb: (e.axeFin.valeurs || []).length }); continue; }
    // Sans groupe de finition, sortir l'axe ferait disparaître le choix.
    if (!v.groupesFinition.length) {
      sansGroupe.push({ nom: v.nom, marque, nb: (e.axeFin.valeurs || []).length });
      continue;
    }
    aSortir.push({ ...planifier(v, e), marque, groupes: v.groupesFinition });
  }

  titre("CE QUE DIT LE TEST");
  const total = aSortir.length + aGarder.length + sansGroupe.length;
  console.log(`\n   fiches ayant un axe « finition » à deux valeurs ou plus : ${total}\n`);
  console.log(`   prix IDENTIQUE entre finitions → à sortir   ${String(aSortir.length).padStart(4)}`);
  console.log(`      ${comptePar(aSortir, (x) => x.marque)}`);
  console.log(`   prix VARIABLE selon la finition → à garder  ${String(aGarder.length).padStart(4)}`);
  console.log(`      ${comptePar(aGarder, (x) => x.marque)}`);
  if (sansGroupe.length) {
    console.log(`   prix identique MAIS aucun groupe de finition${String(sansGroupe.length).padStart(4)}`);
    console.log(`      ${comptePar(sansGroupe, (x) => x.marque)}`);
    console.log(`      sortir l'axe y ferait disparaître le choix : on n'y touche pas`);
  }

  const avant = aSortir.reduce((n, x) => n + x.avant, 0);
  const apres = aSortir.reduce((n, x) => n + x.apres, 0);
  console.log(`\n   déclinaisons sur ces fiches : ${avant} → ${apres} (${avant - apres} de moins)`);
  console.log(`   dont la référence fournisseur variait selon la finition : ${aSortir.filter((x) => x.refVarie).length}`);
  console.log(`   dont l'éco-contribution variait quand même              : ${aSortir.filter((x) => x.ecoVarie).length}`);

  if (APERCU) {
    const p = aSortir.find((x) => x.nom === APERCU) || aSortir.find((x) => x.nom.includes(APERCU));
    const g = aGarder.find((x) => x.nom === APERCU || x.nom.includes(APERCU));
    titre(`APERÇU — ${p ? p.nom : g ? g.nom : APERCU}`);
    if (g && !p) {
      console.log(`\n   fiche à GARDER : le prix varie selon la finition, l'axe reste`);
    } else if (!p) {
      console.log("\n   fiche hors du périmètre");
    } else {
      const v = vitrines.find((x) => x.id === p.id);
      const e = examiner(v);
      console.log(`\n   AVANT — ${p.avant} déclinaisons, ${e.axes.length} axes`);
      for (const a of e.axes) console.log(`      ${a.nom} : ${(a.valeurs || []).length} valeurs`);
      const ex = [...e.groupes.values()][0];
      console.log(`\n   Une même combinaison, toutes finitions confondues :`);
      for (const d of ex.slice(0, 6)) {
        console.log(`      ${String(d.referenceFournisseur || "—").padEnd(10)} ${String(d.prixTarifHT).padStart(7)} €   ${d.valeurs?.finition}`);
      }
      if (ex.length > 6) console.log(`      … ${ex.length} lignes au même prix`);
      console.log(`\n   APRÈS — ${p.apres} déclinaisons, ${p.axes.length} axes`);
      for (const a of p.axes) console.log(`      ${a.nom} : ${(a.valeurs || []).length} valeurs`);
      console.log(`      ${p.declinaisons[0].prixTarifHT} € — ${JSON.stringify(p.declinaisons[0].valeurs)}`);
      console.log(`\n   Le choix des finitions reste, en groupes :`);
      for (const gr of p.groupes) {
        console.log(`      ${gr.nom} : ${gr.finitions.map((f) => f.nom).slice(0, 8).join(" · ")}`);
      }
    }
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let n = 0;
  for (const p of aSortir) {
    await prisma.produitVitrine.update({
      where: { id: p.id },
      data: { axesDeclinaisons: p.axes, declinaisons: p.declinaisons },
    });
    n += 1;
    if (n % 25 === 0) console.log(`   ${n} / ${aSortir.length} fiches`);
  }
  console.log(`   ${n} fiches allégées`);

  titre("CONTRÔLE");
  const apresBase = await prisma.produitVitrine.findMany({
    select: { nom: true, axesDeclinaisons: true, declinaisons: true },
  });
  let restant = 0;
  let orphelines = 0;
  let sansAxe = 0;
  for (const v of apresBase) {
    const A = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    if (A.some((a) => a.id === "finition")) restant += 1;
    for (const d of v.declinaisons || []) {
      // Plus aucune déclinaison ne doit porter une finition sans axe pour la
      // recevoir, ni une valeur absente de son axe.
      for (const [k, val] of Object.entries(d.valeurs || {})) {
        const a = A.find((x) => x.id === k);
        if (!a) { sansAxe += 1; break; }
        if (!(a.valeurs || []).includes(val)) { orphelines += 1; break; }
      }
    }
  }
  console.log(`   fiches gardant un axe « finition »            ${String(restant).padStart(4)}`);
  console.log(`   déclinaisons portant une clé sans axe         ${String(sansAxe).padStart(4)}`);
  console.log(`   déclinaisons portant une valeur hors axe      ${String(orphelines).padStart(4)}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
