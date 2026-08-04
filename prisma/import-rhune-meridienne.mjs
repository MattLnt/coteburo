import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Rhune";
const NOM_PRODUIT = "Méridienne";

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
      mk({composition:"2 places - 1 pouf",tablette:"Sans tablette",tissu:"B"},1863,"RUYD/10"),
      mk({composition:"2 places - 1 pouf",tablette:"Sans tablette",tissu:"B+"},1898,"RUYD/10"),
      mk({composition:"2 places - 1 pouf",tablette:"Sans tablette",tissu:"C"},1933,"RUYD/10"),
      mk({composition:"2 places - 1 pouf",tablette:"Sans tablette",tissu:"D"},2003,"RUYD/10"),
      mk({composition:"2 places - 1 pouf",tablette:"Tablette à droite",tissu:"B"},2268,"RUYD/1B"),
      mk({composition:"2 places - 1 pouf",tablette:"Tablette à droite",tissu:"B+"},2303,"RUYD/1B"),
      mk({composition:"2 places - 1 pouf",tablette:"Tablette à droite",tissu:"C"},2338,"RUYD/1B"),
      mk({composition:"2 places - 1 pouf",tablette:"Tablette à droite",tissu:"D"},2408,"RUYD/1B"),
      mk({composition:"3 places - 1 pouf",tablette:"Sans tablette",tissu:"B"},2684,"RUZD/10"),
      mk({composition:"3 places - 1 pouf",tablette:"Sans tablette",tissu:"B+"},2719,"RUZD/10"),
      mk({composition:"3 places - 1 pouf",tablette:"Sans tablette",tissu:"C"},2769,"RUZD/10"),
      mk({composition:"3 places - 1 pouf",tablette:"Sans tablette",tissu:"D"},2854,"RUZD/10"),
      mk({composition:"3 places - 1 pouf",tablette:"Tablette à droite",tissu:"B"},3089,"RUZD/1B"),
      mk({composition:"3 places - 1 pouf",tablette:"Tablette à droite",tissu:"B+"},3124,"RUZD/1B"),
      mk({composition:"3 places - 1 pouf",tablette:"Tablette à droite",tissu:"C"},3174,"RUZD/1B"),
      mk({composition:"3 places - 1 pouf",tablette:"Tablette à droite",tissu:"D"},3259,"RUZD/1B"),
      mk({composition:"3 places - 2 poufs",tablette:"Sans tablette",tissu:"B"},2424,"RUZE/10"),
      mk({composition:"3 places - 2 poufs",tablette:"Sans tablette",tissu:"B+"},2461,"RUZE/10"),
      mk({composition:"3 places - 2 poufs",tablette:"Sans tablette",tissu:"C"},2499,"RUZE/10"),
      mk({composition:"3 places - 2 poufs",tablette:"Sans tablette",tissu:"D"},2574,"RUZE/10"),
      mk({composition:"3 places - 2 poufs",tablette:"Tablette à droite",tissu:"B"},2829,"RUZE/1B"),
      mk({composition:"3 places - 2 poufs",tablette:"Tablette à droite",tissu:"B+"},2866,"RUZE/1B"),
      mk({composition:"3 places - 2 poufs",tablette:"Tablette à droite",tissu:"C"},2904,"RUZE/1B"),
      mk({composition:"3 places - 2 poufs",tablette:"Tablette à droite",tissu:"D"},2979,"RUZE/1B"),
  ];

  await prisma.produitVitrine.update({
    where: { id: v.id },
    data: {
      axesDeclinaisons: [
        { id: "composition", nom: "Composition", valeurs: ["2 places - 1 pouf","3 places - 1 pouf","3 places - 2 poufs"] },
        { id: "tablette", nom: "Tablette", valeurs: ["Sans tablette","Tablette à droite"] },
        { id: "tissu", nom: "Catégorie tissu", valeurs: ["B","B+","C","D"] },
      ],
      declinaisons: decl,
    },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
  console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons`);
  console.log(`\n✓ Méridienne Rhune traitée.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
