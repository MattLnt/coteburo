// Fait suivre le nuancier au modèle : ValeurChoix.paletteId doit désigner le
// nuancier du FinitionModele qu'elle cite.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/recoller-palettes.mjs
//   node prisma/recoller-palettes.mjs --appliquer
//
// LE DÉFAUT
//   Neuf cent soixante-treize finitions du catalogue pointent vers un modèle
//   de la bibliothèque, et pas une ne porte le nuancier de ce modèle. Le
//   compteur « employée par N fiches » d'un nuancier affichait donc zéro
//   partout, alors que ses teintes sont employées.
//
//   Le lien par modeleId, lui, tient : c'est celui qui fait hériter la
//   couleur et la pastille. Rien n'est cassé à l'écran du client — mais
//   l'administration ment sur ce qui sert et ce qui dort, et c'est ce compte
//   qui devait dire quel nuancier on peut retirer.
//
// LA RÈGLE
//   Le nuancier suit le modèle, jamais l'inverse. Une valeur sans modèle
//   garde son nuancier tel quel : il a pu être posé à la main.
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
    where: { modeleId: { not: null } },
    select: {
      id: true, libelle: true, paletteId: true,
      modele: { select: { id: true, nom: true, paletteId: true, palette: { select: { nom: true, marque: true } } } },
    },
  });

  const aCorriger = valeurs.filter((v) => (v.modele?.paletteId ?? null) !== (v.paletteId ?? null));
  const sansNuancier = aCorriger.filter((v) => !v.modele?.paletteId);

  titre("CE QUI SERAIT RECOLLÉ");
  const parNuancier = new Map();
  for (const v of aCorriger) {
    const nom = v.modele?.palette
      ? `${v.modele.palette.marque ? `${v.modele.palette.marque} · ` : ""}${v.modele.palette.nom}`
      : "— modèle hors nuancier —";
    parNuancier.set(nom, (parNuancier.get(nom) || 0) + 1);
  }
  console.log("");
  for (const [nom, n] of [...parNuancier].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(5)}  ${nom}`);
  }
  console.log(`\n   ${aCorriger.length} finition(s) sur ${valeurs.length} liées à un modèle`);
  if (sansNuancier.length) {
    console.log(`   dont ${sansNuancier.length} dont le modèle n'appartient à aucun nuancier — mises à vide`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  // Un update par nuancier cible plutôt qu'un par valeur : neuf cent
  // soixante-treize allers-retours à cent soixante-quatorze millisecondes
  // feraient près de trois minutes.
  const parCible = new Map();
  for (const v of aCorriger) {
    const cle = v.modele?.paletteId ?? "";
    if (!parCible.has(cle)) parCible.set(cle, []);
    parCible.get(cle).push(v.id);
  }
  let faites = 0;
  for (const [paletteId, ids] of parCible) {
    const r = await prisma.valeurChoix.updateMany({
      where: { id: { in: ids } },
      data: { paletteId: paletteId || null },
    });
    faites += r.count;
  }
  console.log(`   ${faites} finition(s) recollée(s)`);

  titre("CONTRÔLE");
  const restant = (await prisma.valeurChoix.findMany({
    where: { modeleId: { not: null } },
    select: { paletteId: true, modele: { select: { paletteId: true } } },
  })).filter((v) => (v.modele?.paletteId ?? null) !== (v.paletteId ?? null)).length;
  const palettes = await prisma.paletteFinition.findMany({
    orderBy: [{ marque: "asc" }, { nom: "asc" }],
    select: { nom: true, marque: true, _count: { select: { valeurs: true } } },
  });
  console.log(`   désaccords restants : ${restant}\n`);
  for (const p of palettes) {
    console.log(`   ${String(p._count.valeurs).padStart(5)}  ${p.marque ? `${p.marque} · ` : ""}${p.nom}`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
