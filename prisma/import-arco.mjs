import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();
const NOM_GAMME = "ARCO";

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) { console.error(`Gamme "${NOM_GAMME}" introuvable.`); console.error(gammes.map((g)=>" - "+g.nom).join("\n")); process.exit(1); }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const trouver = (n) => produits.find((p) => norm(p.nom) === norm(n));
  const manquants = [];

  // ── Chauffeuse ──
  const chauffeuse = trouver("Chauffeuse");
  if (!chauffeuse) manquants.push("Chauffeuse");
  else {
    await prisma.produitVitrine.update({ where: { id: chauffeuse.id }, data: {
      axesDeclinaisons: [
        { id: "revetement", nom: "Revêtement", valeurs: ["Tissu non feu","Simili (Chic)"] },
        { id: "pietement", nom: "Piètement", valeurs: ["Pieds bois","Pieds métal","Roulettes","Pyramidal","Roulettes chromées"] },
      ],
      declinaisons: [
      mk({revetement:"Tissu non feu",pietement:"Pieds bois"},185,"ARC01..-M1"),
      mk({revetement:"Tissu non feu",pietement:"Pieds métal"},166,"ARC02..-M1"),
      mk({revetement:"Tissu non feu",pietement:"Roulettes"},188,"ARC03..-M1"),
      mk({revetement:"Tissu non feu",pietement:"Pyramidal"},177,"ARC04..-M1"),
      mk({revetement:"Tissu non feu",pietement:"Roulettes chromées"},190,"ARC05..-M1"),
      mk({revetement:"Simili (Chic)",pietement:"Pieds bois"},185,"ARC01..-PU"),
      mk({revetement:"Simili (Chic)",pietement:"Pieds métal"},166,"ARC02..-PU"),
      mk({revetement:"Simili (Chic)",pietement:"Roulettes"},188,"ARC03..-PU"),
      mk({revetement:"Simili (Chic)",pietement:"Pyramidal"},177,"ARC04..-PU"),
      mk({revetement:"Simili (Chic)",pietement:"Roulettes chromées"},190,"ARC05..-PU"),
      ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: chauffeuse.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris tissu", vitrineId: chauffeuse.id, ordre: 0, finitions: { create: [
      { nom: "Beige", couleur: "#d8c9a8", ordre: 0 },
      { nom: "Bleu nuit", couleur: "#2b3a55", ordre: 1 },
      { nom: "Gris poivre", couleur: "#6b6d70", ordre: 2 },
      { nom: "Safran", couleur: "#e0a92e", ordre: 3 },
      { nom: "Terracotta", couleur: "#c56a4a", ordre: 4 },
      { nom: "Vert anglais", couleur: "#3a5443", ordre: 5 }
    ] } } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris simili", vitrineId: chauffeuse.id, ordre: 1, finitions: { create: [
      { nom: "Taupe", couleur: "#8b7d6b", ordre: 0 },
      { nom: "Cognac", couleur: "#8a4b2a", ordre: 1 },
      { nom: "Noir", couleur: "#23262a", ordre: 2 }
    ] } } });
    console.log(`  ✓ ${gamme.nom} / Chauffeuse — 10 combinaisons + 2 groupes de coloris`);
  }

  // ── Fauteuil lounge (prix unique 315, coloris finition) ──
  const lounge = trouver("Fauteuil lounge");
  if (!lounge) manquants.push("Fauteuil lounge");
  else {
    await prisma.produitVitrine.update({ where: { id: lounge.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, 315, "ARC08..") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: lounge.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: lounge.id, ordre: 0, finitions: { create: [
      { nom: "Gris", couleur: "#8b8d90", ordre: 0 },
      { nom: "Bronze", couleur: "#7a6a4f", ordre: 1 }
    ] } } });
    console.log(`  ✓ ${gamme.nom} / Fauteuil lounge — prix unique 315€ + 2 coloris`);
  }

  // ── Pouf (prix unique 115, coloris finition) ──
  const pouf = trouver("Pouf");
  if (!pouf) manquants.push("Pouf");
  else {
    await prisma.produitVitrine.update({ where: { id: pouf.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, 115, "ARC07..") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: pouf.id } });
    await prisma.groupeFinition.create({ data: { nom: "Coloris", vitrineId: pouf.id, ordre: 0, finitions: { create: [
      { nom: "Bleu", couleur: "#3f6fa3", ordre: 0 },
      { nom: "Gris", couleur: "#8b8d90", ordre: 1 },
      { nom: "Bronze", couleur: "#7a6a4f", ordre: 2 },
      { nom: "Vert", couleur: "#4a6b4a", ordre: 3 }
    ] } } });
    console.log(`  ✓ ${gamme.nom} / Pouf — prix unique 115€ + 4 coloris`);
  }

  // ── Banquette (prix unique 420, beige, 2 coussins inclus) ──
  const banquette = trouver("Banquette");
  if (!banquette) manquants.push("Banquette");
  else {
    await prisma.produitVitrine.update({ where: { id: banquette.id }, data: {
      axesDeclinaisons: [], declinaisons: [ mk({}, 420, "ARC06BE") ],
    } });
    await prisma.groupeFinition.deleteMany({ where: { vitrineId: banquette.id } });
    console.log(`  ✓ ${gamme.nom} / Banquette — prix unique 420€ (2 coussins inclus)`);
  }

  if (manquants.length) {
    console.error(`\n⚠ Produits manquants dans "${gamme.nom}" (à créer d'abord) : ${manquants.join(", ")}`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n") || " (aucun)"}`);
    process.exit(1);
  }
  console.log(`\n✓ ARCO traitée (Chauffeuse, Fauteuil lounge, Pouf, Banquette).`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
