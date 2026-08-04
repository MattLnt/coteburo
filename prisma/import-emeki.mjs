import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "Emeki";

const PRODUITS = {"Fauteuil": {"ref": "EEX0/00", "prix": {"C": 995, "D": 1095}}, "Canapé": {"ref": "EEY0/00", "prix": {"C": 1841, "D": 2041}}, "Pouf": {"ref": "EEP0/00", "prix": {"C": 456, "D": 506}}};

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });

  let manquants = [];
  for (const [nomProduit, data] of Object.entries(PRODUITS)) {
    const v = produits.find((p) => norm(p.nom) === norm(nomProduit));
    if (!v) { manquants.push(nomProduit); continue; }
    const decl = Object.entries(data.prix).map(([tissu, px]) => mk({ tissu }, px, data.ref));
    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: {
        axesDeclinaisons: [
          { id: "tissu", nom: "Catégorie tissu", valeurs: ["C","D"] },
        ],
        declinaisons: decl,
      },
    });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: v.id } });
    console.log(`  ✓ ${gamme.nom} / ${v.nom} — ${decl.length} combinaisons (réf ${data.ref})`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans la gamme "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ Emeki traitée (Fauteuil, Canapé, Pouf).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
