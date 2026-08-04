import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Rhune";
const NOM_PRODUIT = "Banc";

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
      mk({places:"2 places (2 poufs)",tablette:"Sans tablette",tissu:"B"},1458,"RUQ0/10"),
      mk({places:"2 places (2 poufs)",tablette:"Sans tablette",tissu:"B+"},1475,"RUQ0/10"),
      mk({places:"2 places (2 poufs)",tablette:"Sans tablette",tissu:"C"},1493,"RUQ0/10"),
      mk({places:"2 places (2 poufs)",tablette:"Sans tablette",tissu:"D"},1528,"RUQ0/10"),
      mk({places:"2 places (2 poufs)",tablette:"Tablette de rangement à droite",tissu:"B"},1863,"RUQD/1B"),
      mk({places:"2 places (2 poufs)",tablette:"Tablette de rangement à droite",tissu:"B+"},1880,"RUQD/1B"),
      mk({places:"2 places (2 poufs)",tablette:"Tablette de rangement à droite",tissu:"C"},1898,"RUQD/1B"),
      mk({places:"2 places (2 poufs)",tablette:"Tablette de rangement à droite",tissu:"D"},1933,"RUQD/1B"),
      mk({places:"3 places (3 poufs)",tablette:"Sans tablette",tissu:"B"},2116,"RUR0/10"),
      mk({places:"3 places (3 poufs)",tablette:"Sans tablette",tissu:"B+"},2133,"RUR0/10"),
      mk({places:"3 places (3 poufs)",tablette:"Sans tablette",tissu:"C"},2161,"RUR0/10"),
      mk({places:"3 places (3 poufs)",tablette:"Sans tablette",tissu:"D"},2206,"RUR0/10"),
      mk({places:"3 places (3 poufs)",tablette:"Tablette de rangement à droite",tissu:"B"},2521,"RURD/1B"),
      mk({places:"3 places (3 poufs)",tablette:"Tablette de rangement à droite",tissu:"B+"},2543,"RURD/1B"),
      mk({places:"3 places (3 poufs)",tablette:"Tablette de rangement à droite",tissu:"C"},2566,"RURD/1B"),
      mk({places:"3 places (3 poufs)",tablette:"Tablette de rangement à droite",tissu:"D"},2611,"RURD/1B"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "places", nom: "Places", valeurs: ["2 places (2 poufs)","3 places (3 poufs)"] },
        { id: "tablette", nom: "Tablette", valeurs: ["Sans tablette","Tablette de rangement à droite"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons`);
  console.log(`\n✓ Banc Rhune traité.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
