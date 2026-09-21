// Défait les liens entre une finition et le nuancier d'une AUTRE marque.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/delier-nuanciers-etrangers.mjs
//   node prisma/delier-nuanciers-etrangers.mjs --appliquer
//
// LE DÉFAUT
//   Sept cent soixante-quatorze finitions pointent vers le modèle d'un
//   nuancier qui n'est pas celui de leur fournisseur. Le « Blanc » d'un
//   plateau Buronomic désigne le « Blanc » du Spazio de Sokoa — un tissu
//   matelassé. Le « Noir » d'un piétement désigne le Runner, un tissu piqué.
//
//   Ces liens ont été faits par rapprochement de noms, entre catalogues.
//   « Blanc » égale « Blanc », et la couleur s'en accommodait : tant que les
//   modèles Sokoa n'avaient pas de vignette, rien ne se voyait.
//
//   Les vignettes ont été posées le 21 septembre. Sept cent cinquante-sept
//   finitions se sont alors mises à montrer un tissu à la place d'un
//   mélaminé. Le lien était faux depuis le début ; c'est l'image qui l'a
//   rendu visible.
//
// LA RÈGLE
//   Une finition n'hérite que d'un nuancier de son propre fournisseur. Le
//   lien étranger est défait ; la couleur, elle, est conservée — reprise du
//   modèle quand la finition n'en portait pas.
//
//   Rien n'est supprimé : les nuanciers restent, et un lien voulu se refait
//   d'un clic dans l'éditeur de finitions.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const valeurs = await prisma.valeurChoix.findMany({
    where: { choix: { nature: "finition" }, modeleId: { not: null } },
    select: {
      id: true, libelle: true, couleur: true, imageUrl: true,
      modele: { select: { nom: true, couleur: true, imageUrl: true } },
      palette: { select: { nom: true, marque: true } },
      choix: { select: { vitrine: { select: { gamme: { select: { marque: { select: { nom: true } } } } } } } },
    },
  });

  const etrangers = valeurs.filter((v) => {
    const fiche = v.choix.vitrine.gamme.marque?.nom;
    return v.palette?.marque && fiche && v.palette.marque !== fiche;
  });

  // Ce qu'on rendra à la finition pour qu'elle ne perde pas sa teinte.
  const plan = etrangers.map((v) => ({
    id: v.id,
    libelle: v.libelle,
    fiche: v.choix.vitrine.gamme.marque.nom,
    depuis: `${v.palette.marque} · ${v.palette.nom}`,
    // La couleur propre l'emporte ; à défaut on reprend celle du modèle, qui
    // est celle qu'on voyait jusqu'ici.
    couleur: v.couleur ?? v.modele?.couleur ?? null,
    // L'image, elle, ne se reprend PAS : c'est justement la photo d'un tissu
    // qui n'a rien à faire là.
    perdUneImage: !v.imageUrl && !!v.modele?.imageUrl,
    resteSansPastille: (v.couleur ?? v.modele?.couleur) == null,
  }));

  titre("CE QUI SERAIT DÉLIÉ");
  const g = new Map();
  for (const p of plan) {
    const k = `${p.fiche} → ${p.depuis}`;
    if (!g.has(k)) g.set(k, new Map());
    g.get(k).set(p.libelle, (g.get(k).get(p.libelle) || 0) + 1);
  }
  console.log("");
  for (const [k, m] of [...g].sort((a, b) => {
    const s = (x) => [...x[1].values()].reduce((p, q) => p + q, 0);
    return s(b) - s(a);
  })) {
    const n = [...m.values()].reduce((a, b) => a + b, 0);
    console.log(`   ${String(n).padStart(4)}  ${k}`);
    console.log(`         ${[...m].sort((a, b) => b[1] - a[1]).map(([l, c]) => `${l}×${c}`).join(" · ")}`);
  }

  const perdent = plan.filter((p) => p.perdUneImage).length;
  const nus = plan.filter((p) => p.resteSansPastille);
  console.log(`\n   ${plan.length} finition(s) déliée(s)`);
  console.log(`   ${perdent} cessent d'afficher la vignette d'un tissu étranger`);
  console.log(`   ${nus.length} resteraient sans pastille${nus.length ? ` — ${[...new Set(nus.map((p) => p.libelle))].join(", ")}` : ""}`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  // Un passage par couleur plutôt qu'un par finition : la base est distante,
  // et sept cent soixante-quatorze allers-retours coûteraient deux minutes.
  const parCouleur = new Map();
  for (const p of plan) {
    const k = p.couleur || "";
    if (!parCouleur.has(k)) parCouleur.set(k, []);
    parCouleur.get(k).push(p.id);
  }
  let faites = 0;
  for (const [couleur, ids] of parCouleur) {
    const r = await prisma.valeurChoix.updateMany({
      where: { id: { in: ids } },
      data: { modeleId: null, paletteId: null, couleur: couleur || null },
    });
    faites += r.count;
  }
  console.log(`   ${faites} finition(s) déliée(s), couleur conservée`);

  titre("CONTRÔLE");
  const reste = (await prisma.valeurChoix.findMany({
    where: { choix: { nature: "finition" }, modeleId: { not: null } },
    select: {
      palette: { select: { marque: true } },
      choix: { select: { vitrine: { select: { gamme: { select: { marque: { select: { nom: true } } } } } } } },
    },
  })).filter((v) => {
    const f = v.choix.vitrine.gamme.marque?.nom;
    return v.palette?.marque && f && v.palette.marque !== f;
  }).length;
  const sansPastille = await prisma.valeurChoix.count({
    where: { choix: { nature: "finition" }, couleur: null, imageUrl: null, modele: null },
  });
  console.log(`   liens étrangers restants : ${reste} · finitions sans pastille : ${sansPastille}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
