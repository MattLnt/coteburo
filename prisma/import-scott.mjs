import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "SCOTT";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── Fauteuil (opérateur synchrone) : axe Version, coloris finition ──
  const fauteuil = trouver("Fauteuil");
  if (!fauteuil) manquants.push("Fauteuil");
  else {
    await prisma.produitVitrine.update({ where: { id: fauteuil.id }, data: {
      axesDeclinaisons: [ { id: "version", nom: "Version", valeurs: ["Structure noire, sans appui-tête","Structure noire, avec appui-tête","Structure gris clair, avec appui-tête"] } ],
      declinaisons: [
        mk({ version: "Structure noire, sans appui-tête" }, 255, "SCT05NRNR"),
        mk({ version: "Structure noire, avec appui-tête" }, 265, "SCT07.."),
        mk({ version: "Structure gris clair, avec appui-tête" }, 285, "SCT08NRNR"),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: fauteuil.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris (version avec appui-tête)", vitrineId: fauteuil.id, ordre: 0, finitions: { create: [
      { nom: "Bleu", couleur: "#3f6fa3", ordre: 0 },
      { nom: "Gris", couleur: "#8b8d90", ordre: 1 },
      { nom: "Noir", couleur: "#23262a", ordre: 2 },
    ] } } });
    console.log(`  ✓ ${gamme.nom} / Fauteuil — 3 combinaisons (255/265/285€) + coloris`);
  }

  // ── Fauteuil visiteur (pied luge, par 2) : prix unique 180€ ──
  const visiteur = trouver("Fauteuil visiteur");
  if (!visiteur) manquants.push("Fauteuil visiteur");
  else {
    await prisma.produitVitrine.update({ where: { id: visiteur.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, 180, "SCT25NRNR") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: visiteur.id } });
    console.log(`  ✓ ${gamme.nom} / Fauteuil visiteur — prix unique 180€ (Noir, pied luge)`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ SCOTT traitée (Fauteuil + Fauteuil visiteur).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
