import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Rhune";
const NOM_PRODUIT = "Table basse";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const v = produits.find((p) => norm(p.nom) === norm(NOM_PRODUIT));
  if (!v) {
    console.error(`⚠ Produit "${NOM_PRODUIT}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun — crée-le d'abord)"}`);
    process.exit(1);
  }

  const decl = [
      mk({format:"Carré 60 × 60 cm",hauteur:"Hauteur 25 cm"},368,"LTAC/1B"),
      mk({format:"Carré 60 × 60 cm",hauteur:"Hauteur 37,5 cm"},373,"LTT0/1B"),
      mk({format:"Rectangulaire 60 × 120 cm",hauteur:"Hauteur 25 cm"},418,"LTAR/1B"),
      mk({format:"Rectangulaire 60 × 120 cm",hauteur:"Hauteur 37,5 cm"},423,"LTTR/1B"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "format", nom: "Format", valeurs: ["Carré 60 × 60 cm","Rectangulaire 60 × 120 cm"] },
        { id: "hauteur", nom: "Hauteur", valeurs: ["Hauteur 25 cm","Hauteur 37,5 cm"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons (plateau décor chêne blanchi, structure métal noir)`);
  console.log(`\n✓ Table basse Rhune traitée — gamme Rhune complète (Fauteuil, Canapé, Méridienne, Banc, Table basse).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
