import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Batbi";
const NOM_PRODUIT = "Pouf";

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
      mk({version:"Standard",revetement:"X-Trevira"},549,"BBX0/00"),
      mk({version:"Standard",revetement:"Eden Free"},578,"BBX0/00"),
      mk({version:"Standard",revetement:"Enduits (C)"},614,"BBX0/00"),
      mk({version:"Standard",revetement:"Select / Grain"},770,"BBX0/00"),
      mk({version:"Hybride",revetement:"X-Trevira"},559,"BBX0/01"),
      mk({version:"Hybride",revetement:"Enduits (C)"},624,"BBX0/01"),
      mk({version:"Hybride",revetement:"Select / Grain"},780,"BBX0/01"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "version", nom: "Version", valeurs: ["Standard","Hybride"] },
        { id: "revetement", nom: "Revêtement", valeurs: ["X-Trevira","Eden Free","Enduits (C)","Select / Grain"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons (grille creuse : Hybride sans Eden Free)`);
  console.log(`\n✓ Batbi traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
