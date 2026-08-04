import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "TECSEAT";

const COL3 = [
  { nom: "Blanc", couleur: "#f2f0ec", ordre: 0 },
  { nom: "Gris", couleur: "#8b8d90", ordre: 1 },
  { nom: "Noir", couleur: "#23262a", ordre: 2 },
];

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── Chaise (p.108, par 4, 115€) : Piètement = axe (même prix), coloris finition ──
  const chaise = trouver("Chaise");
  if (!chaise) manquants.push("Chaise");
  else {
    await prisma.produitVitrine.update({ where: { id: chaise.id }, data: {
      axesDeclinaisons: [ { id: "pietement", nom: "Piètement", valeurs: ["Pied fenêtre chromé","4 pieds blancs","4 pieds noirs"] } ],
      declinaisons: [
        mk({ pietement: "Pied fenêtre chromé" }, 115, "TSE01.."),
        mk({ pietement: "4 pieds blancs" }, 115, "TSE02.."),
        mk({ pietement: "4 pieds noirs" }, 115, "TSE03.."),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: chaise.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris coque", vitrineId: chaise.id, ordre: 0, finitions: { create: COL3 } } });
    console.log(`  ✓ ${gamme.nom} / Chaise — 3 combinaisons (115€) + coloris`);
  }

  // ── Chaise Meeting (p.110, 125€) : coloris coque finition, prix unique ──
  const meeting = trouver("Chaise Meeting");
  if (!meeting) manquants.push("Chaise Meeting");
  else {
    await prisma.produitVitrine.update({ where: { id: meeting.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, 125, "TSE04..") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: meeting.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris coque", vitrineId: meeting.id, ordre: 0, finitions: { create: COL3 } } });
    console.log(`  ✓ ${gamme.nom} / Chaise Meeting — prix unique 125€ + coloris`);
  }

  // ── Chaise Étudiant (p.112, 245€) : coloris coque finition, prix unique ──
  const etudiant = trouver("Chaise Étudiant");
  if (!etudiant) manquants.push("Chaise Étudiant");
  else {
    await prisma.produitVitrine.update({ where: { id: etudiant.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, 245, "TSE05..") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: etudiant.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris coque", vitrineId: etudiant.id, ordre: 0, finitions: { create: COL3 } } });
    console.log(`  ✓ ${gamme.nom} / Chaise Étudiant — prix unique 245€ + coloris`);
  }

  // ── Tabouret (TECSUP p.108, par 2, 140€) : Piètement axe (même prix), coloris finition ──
  const tabouret = trouver("Tabouret");
  if (!tabouret) manquants.push("Tabouret");
  else {
    await prisma.produitVitrine.update({ where: { id: tabouret.id }, data: {
      axesDeclinaisons: [ { id: "pietement", nom: "Piètement", valeurs: ["Pied fenêtre chromé","4 pieds blancs","4 pieds noirs"] } ],
      declinaisons: [
        mk({ pietement: "Pied fenêtre chromé" }, 140, "TUP01.."),
        mk({ pietement: "4 pieds blancs" }, 140, "TUP02.."),
        mk({ pietement: "4 pieds noirs" }, 140, "TUP03.."),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: tabouret.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris coque", vitrineId: tabouret.id, ordre: 0, finitions: { create: COL3 } } });
    console.log(`  ✓ ${gamme.nom} / Tabouret — 3 combinaisons (140€) + coloris`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ TECSEAT traitée (Chaise, Chaise Meeting, Chaise Étudiant, Tabouret).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
