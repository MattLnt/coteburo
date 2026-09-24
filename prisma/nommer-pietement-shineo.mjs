// Donne des libellés lisibles au fauteuil Shineo.
//
//   node prisma/nommer-pietement-shineo.mjs
//   node prisma/nommer-pietement-shineo.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// La fiche est bien bâtie — un axe tarifaire pour le piètement, un axe de
// finition à jetons pour la teinte — mais l'axe s'appelait « Modèle » et ses
// réponses recopiaient le tarif : « FAUTEUIL TISSU SHINEO PIEDS BOIS ». On
// nomme la question et on ne garde que ce qui distingue. Turquoise n'avait
// pas de couleur, donc pas de pastille.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const LIBELLES = {
  "FAUTEUIL TISSU SHINEO PIEDS BOIS": "Piètement bois",
  "FAUTEUIL TISSU SHINEO PIEDS METAL": "Piètement métal",
  "FAUTEUIL TISSU SHINEO ROULETTES": "Sur roulettes",
  "FAUTEUIL TISSU SHINEO PIED PYRAMIDE": "Pied pyramide",
};
const COULEURS = { TURQUOISE: "#2aa9b8" };

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL — la base est modifiée ═══" : "═══ SIMULATION — rien n'est écrit ═══");
  const v = await prisma.produitVitrine.findFirst({ where: { nom: "Fauteuil tissu - Shineo" },
    select: { id: true, choix: { select: { id: true, cle: true, nom: true, nature: true, valeurs: { select: { id: true, libelle: true, couleur: true } } } },
      combinaisons: { select: { id: true, valeurs: true } } } });
  if (!v) { console.log("introuvable"); return; }
  const axe = v.choix.find((c) => c.cle === "modele");
  if (!axe) { console.log("pas d'axe « modele » — déjà fait ?"); return; }
  const inconnues = axe.valeurs.filter((x) => !LIBELLES[x.libelle]);
  if (inconnues.length) { console.log(`✗ libellés hors table : ${inconnues.map((x) => x.libelle).join(", ")}`); return; }
  const teintes = v.choix.filter((c) => c.nature === "finition").flatMap((c) => c.valeurs).filter((x) => !x.couleur && COULEURS[x.libelle]);
  console.log(`« ${axe.nom} » → « Piètement » (clé pietement) : ${axe.valeurs.map((x) => `${x.libelle} → ${LIBELLES[x.libelle]}`).join(" · ")}`);
  console.log(`couleurs ajoutées : ${teintes.map((x) => `${x.libelle} ${COULEURS[x.libelle]}`).join(", ") || "—"}`);
  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }
  await prisma.$transaction([
    prisma.choix.update({ where: { id: axe.id }, data: { cle: "pietement", nom: "Piètement" } }),
    ...axe.valeurs.map((x) => prisma.valeurChoix.update({ where: { id: x.id }, data: { libelle: LIBELLES[x.libelle] } })),
    ...teintes.map((x) => prisma.valeurChoix.update({ where: { id: x.id }, data: { couleur: COULEURS[x.libelle] } })),
    ...v.combinaisons.map((k) => {
      const { modele, ...reste } = k.valeurs || {};
      const valeurs = { ...reste, pietement: LIBELLES[modele] };
      return prisma.combinaison.update({ where: { id: k.id }, data: { valeurs, empreinte: empreinteDe(valeurs) } });
    }),
  ]);
  console.log("écrit");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
