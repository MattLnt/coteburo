import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function uid() { return Math.random().toString(36).slice(2, 7); }
const norm = (s) => (s ?? "").trim().toLowerCase();

const NOM_GAMME = "COMFORT";

// ─── Finitions réutilisables ───
const CORPS8 = [
          { nom: "Argile", couleur: "#a08d7c", ordre: 0 },
          { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
          { nom: "Chêne fil", couleur: "#c9a876", ordre: 2 },
          { nom: "Hêtre", couleur: "#d8b384", ordre: 3 },
          { nom: "Nebraska", couleur: "#b89b73", ordre: 4 },
          { nom: "Noir", couleur: "#23262a", ordre: 5 },
          { nom: "Timber", couleur: "#8a6a4a", ordre: 6 },
          { nom: "Yukon", couleur: "#6e5b4a", ordre: 7 }
];
const CORPS12 = [
          { nom: "Argile", couleur: "#a08d7c", ordre: 0 },
          { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
          { nom: "Chêne fil", couleur: "#c9a876", ordre: 2 },
          { nom: "Hêtre", couleur: "#d8b384", ordre: 3 },
          { nom: "Nebraska", couleur: "#b89b73", ordre: 4 },
          { nom: "Noir", couleur: "#23262a", ordre: 5 },
          { nom: "Timber", couleur: "#8a6a4a", ordre: 6 },
          { nom: "Yukon", couleur: "#6e5b4a", ordre: 7 },
          { nom: "Horizon", couleur: "#8ba0ab", ordre: 8 },
          { nom: "Ombre", couleur: "#6b6b68", ordre: 9 },
          { nom: "Pêche", couleur: "#e8b9a0", ordre: 10 },
          { nom: "Sauge", couleur: "#a3b18a", ordre: 11 }
];
const POIGNEE_COULEUR = [
          { nom: "Aluminium", couleur: "#9a9a94", ordre: 0 },
          { nom: "Blanc", couleur: "#f2f0ec", ordre: 1 },
          { nom: "Noir", couleur: "#23262a", ordre: 2 }
];
// Coloris corps / façade — paires réelles (façade = assortie/Argile/Blanc/Noir ; corps Argile/Blanc/Noir acceptent tout)
const PAIRES44 = [
  { nom: "Argile / Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Argile / Blanc", couleur: "#a08d7c", ordre: 1 },
  { nom: "Argile / Chêne fil", couleur: "#a08d7c", ordre: 2 },
  { nom: "Argile / Hêtre", couleur: "#a08d7c", ordre: 3 },
  { nom: "Argile / Nebraska", couleur: "#a08d7c", ordre: 4 },
  { nom: "Argile / Noir", couleur: "#a08d7c", ordre: 5 },
  { nom: "Argile / Timber", couleur: "#a08d7c", ordre: 6 },
  { nom: "Argile / Yukon", couleur: "#a08d7c", ordre: 7 },
  { nom: "Blanc / Argile", couleur: "#f2f0ec", ordre: 8 },
  { nom: "Blanc / Blanc", couleur: "#f2f0ec", ordre: 9 },
  { nom: "Blanc / Chêne fil", couleur: "#f2f0ec", ordre: 10 },
  { nom: "Blanc / Hêtre", couleur: "#f2f0ec", ordre: 11 },
  { nom: "Blanc / Nebraska", couleur: "#f2f0ec", ordre: 12 },
  { nom: "Blanc / Noir", couleur: "#f2f0ec", ordre: 13 },
  { nom: "Blanc / Timber", couleur: "#f2f0ec", ordre: 14 },
  { nom: "Blanc / Yukon", couleur: "#f2f0ec", ordre: 15 },
  { nom: "Chêne fil / Argile", couleur: "#c9a876", ordre: 16 },
  { nom: "Chêne fil / Blanc", couleur: "#c9a876", ordre: 17 },
  { nom: "Chêne fil / Chêne fil", couleur: "#c9a876", ordre: 18 },
  { nom: "Chêne fil / Noir", couleur: "#c9a876", ordre: 19 },
  { nom: "Hêtre / Argile", couleur: "#d8b384", ordre: 20 },
  { nom: "Hêtre / Blanc", couleur: "#d8b384", ordre: 21 },
  { nom: "Hêtre / Hêtre", couleur: "#d8b384", ordre: 22 },
  { nom: "Hêtre / Noir", couleur: "#d8b384", ordre: 23 },
  { nom: "Nebraska / Argile", couleur: "#b89b73", ordre: 24 },
  { nom: "Nebraska / Blanc", couleur: "#b89b73", ordre: 25 },
  { nom: "Nebraska / Nebraska", couleur: "#b89b73", ordre: 26 },
  { nom: "Nebraska / Noir", couleur: "#b89b73", ordre: 27 },
  { nom: "Noir / Argile", couleur: "#23262a", ordre: 28 },
  { nom: "Noir / Blanc", couleur: "#23262a", ordre: 29 },
  { nom: "Noir / Chêne fil", couleur: "#23262a", ordre: 30 },
  { nom: "Noir / Hêtre", couleur: "#23262a", ordre: 31 },
  { nom: "Noir / Nebraska", couleur: "#23262a", ordre: 32 },
  { nom: "Noir / Noir", couleur: "#23262a", ordre: 33 },
  { nom: "Noir / Timber", couleur: "#23262a", ordre: 34 },
  { nom: "Noir / Yukon", couleur: "#23262a", ordre: 35 },
  { nom: "Timber / Argile", couleur: "#8a6a4a", ordre: 36 },
  { nom: "Timber / Blanc", couleur: "#8a6a4a", ordre: 37 },
  { nom: "Timber / Timber", couleur: "#8a6a4a", ordre: 38 },
  { nom: "Timber / Noir", couleur: "#8a6a4a", ordre: 39 },
  { nom: "Yukon / Argile", couleur: "#6e5b4a", ordre: 40 },
  { nom: "Yukon / Blanc", couleur: "#6e5b4a", ordre: 41 },
  { nom: "Yukon / Yukon", couleur: "#6e5b4a", ordre: 42 },
  { nom: "Yukon / Noir", couleur: "#6e5b4a", ordre: 43 }
];
// Top Box : façade limitée à Argile/Blanc/Noir → 24 paires
const PAIRES24 = [
  { nom: "Argile / Argile", couleur: "#a08d7c", ordre: 0 },
  { nom: "Argile / Blanc", couleur: "#a08d7c", ordre: 1 },
  { nom: "Argile / Noir", couleur: "#a08d7c", ordre: 2 },
  { nom: "Blanc / Argile", couleur: "#f2f0ec", ordre: 3 },
  { nom: "Blanc / Blanc", couleur: "#f2f0ec", ordre: 4 },
  { nom: "Blanc / Noir", couleur: "#f2f0ec", ordre: 5 },
  { nom: "Chêne fil / Argile", couleur: "#c9a876", ordre: 6 },
  { nom: "Chêne fil / Blanc", couleur: "#c9a876", ordre: 7 },
  { nom: "Chêne fil / Noir", couleur: "#c9a876", ordre: 8 },
  { nom: "Hêtre / Argile", couleur: "#d8b384", ordre: 9 },
  { nom: "Hêtre / Blanc", couleur: "#d8b384", ordre: 10 },
  { nom: "Hêtre / Noir", couleur: "#d8b384", ordre: 11 },
  { nom: "Nebraska / Argile", couleur: "#b89b73", ordre: 12 },
  { nom: "Nebraska / Blanc", couleur: "#b89b73", ordre: 13 },
  { nom: "Nebraska / Noir", couleur: "#b89b73", ordre: 14 },
  { nom: "Noir / Argile", couleur: "#23262a", ordre: 15 },
  { nom: "Noir / Blanc", couleur: "#23262a", ordre: 16 },
  { nom: "Noir / Noir", couleur: "#23262a", ordre: 17 },
  { nom: "Timber / Argile", couleur: "#8a6a4a", ordre: 18 },
  { nom: "Timber / Blanc", couleur: "#8a6a4a", ordre: 19 },
  { nom: "Timber / Noir", couleur: "#8a6a4a", ordre: 20 },
  { nom: "Yukon / Argile", couleur: "#6e5b4a", ordre: 21 },
  { nom: "Yukon / Blanc", couleur: "#6e5b4a", ordre: 22 },
  { nom: "Yukon / Noir", couleur: "#6e5b4a", ordre: 23 }
];

function findVitrine(gamme, produits, nom) {
  const v = produits.find((p) => norm(p.nom) === norm(nom));
  if (!v) {
    console.error(`⚠ Produit "${nom}" introuvable dans la gamme "${gamme.nom}".`);
    console.error(`Produits présents :\n${produits.map((p) => " - " + p.nom).join("\n")}`);
  }
  return v;
}

async function ecrire(vitrine, axes, declinaisons, groupes) {
  await prisma.produitVitrine.update({
    where: { id: vitrine.id },
    data: { axesDeclinaisons: axes, declinaisons },
  });
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  let ordre = 0;
  for (const g of groupes) {
    await prisma.groupeFinition.create({
      data: { nom: g.nom, vitrineId: vitrine.id, ordre: ordre++, finitions: { create: g.finitions } },
    });
  }
  console.log(`  ✓ ${vitrine.nom} — ${declinaisons.length} combinaison(s) + ${groupes.length} groupe(s) de finitions`);
}

const mk = (valeurs, prix, ref) => ({ id: uid(), valeurs, prixTarifHT: String(prix), prixVenteHT: "", prixVerrouille: false, referenceFournisseur: ref });

async function main() {
  const gammes = await prisma.gamme.findMany({ select: { id: true, nom: true } });
  const gamme = gammes.find((g) => norm(g.nom) === norm(NOM_GAMME));
  if (!gamme) {
    console.error(`Gamme "${NOM_GAMME}" introuvable. Gammes existantes :`);
    console.error(gammes.map((g) => " - " + g.nom).join("\n"));
    process.exit(1);
  }
  const produits = await prisma.produitVitrine.findMany({ where: { gammeId: gamme.id }, select: { id: true, nom: true } });
  const P = (nom) => findVitrine(gamme, produits, nom);

  // 1. Caisson mobile (Tiroirs × Poignée)
  {
    const v = P("Caisson mobile");
    if (v) await ecrire(v,
      [{ id: "tiroirs", nom: "Tiroirs", valeurs: ["2 tiroirs", "3 tiroirs"] },
       { id: "poignee", nom: "Poignée", valeurs: ["Classique", "Design"] }],
      [ mk({ tiroirs:"2 tiroirs", poignee:"Classique" },257,"AP20C"),
        mk({ tiroirs:"2 tiroirs", poignee:"Design" },262,"AP20D"),
        mk({ tiroirs:"3 tiroirs", poignee:"Classique" },257,"AP21C"),
        mk({ tiroirs:"3 tiroirs", poignee:"Design" },262,"AP21D") ],
      [ { nom:"Corps", finitions: CORPS8 }, { nom:"Couleur poignée", finitions: POIGNEE_COULEUR } ]);
  }

  // 2. Caisson mobile slim (Poignée) — corps 12 teintes
  {
    const v = P("Caisson mobile slim");
    if (v) await ecrire(v,
      [{ id: "poignee", nom: "Poignée", valeurs: ["Classique", "Design"] }],
      [ mk({ poignee:"Classique" },277,"DR07C"), mk({ poignee:"Design" },282,"DR07D") ],
      [ { nom:"Corps", finitions: CORPS12 }, { nom:"Couleur poignée", finitions: POIGNEE_COULEUR } ]);
  }

  // 3. Caisson hauteur bureau — top L42 (Profondeur × Tiroirs × Poignée)
  {
    const v = P("Caisson hauteur bureau");
    if (v) await ecrire(v,
      [{ id:"profondeur", nom:"Profondeur", valeurs:["P60","P80"] },
       { id:"tiroirs", nom:"Tiroirs", valeurs:["3 tiroirs","4 tiroirs"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [ mk({profondeur:"P60",tiroirs:"3 tiroirs",poignee:"Classique"},470,"BD26C"),
        mk({profondeur:"P60",tiroirs:"3 tiroirs",poignee:"Design"},475,"BD26D"),
        mk({profondeur:"P60",tiroirs:"4 tiroirs",poignee:"Classique"},510,"BD27C"),
        mk({profondeur:"P60",tiroirs:"4 tiroirs",poignee:"Design"},520,"BD27D"),
        mk({profondeur:"P80",tiroirs:"3 tiroirs",poignee:"Classique"},530,"DR09C"),
        mk({profondeur:"P80",tiroirs:"3 tiroirs",poignee:"Design"},535,"DR09D"),
        mk({profondeur:"P80",tiroirs:"4 tiroirs",poignee:"Classique"},575,"DR10C"),
        mk({profondeur:"P80",tiroirs:"4 tiroirs",poignee:"Design"},585,"DR10D") ],
      [ { nom:"Coloris corps / façade", finitions: PAIRES44 }, { nom:"Couleur poignée", finitions: POIGNEE_COULEUR } ]);
  }

  // 4. Caisson retour hauteur bureau — top L50/L80 (Top × Tiroirs × Poignée)
  {
    const v = P("Caisson retour hauteur bureau");
    if (v) await ecrire(v,
      [{ id:"top", nom:"Top", valeurs:["L50","L80"] },
       { id:"tiroirs", nom:"Tiroirs", valeurs:["3 tiroirs","4 tiroirs"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [ mk({top:"L50",tiroirs:"3 tiroirs",poignee:"Classique"},495,"AP22C"),
        mk({top:"L50",tiroirs:"3 tiroirs",poignee:"Design"},500,"AP22D"),
        mk({top:"L50",tiroirs:"4 tiroirs",poignee:"Classique"},535,"AP23C"),
        mk({top:"L50",tiroirs:"4 tiroirs",poignee:"Design"},545,"AP23D"),
        mk({top:"L80",tiroirs:"3 tiroirs",poignee:"Classique"},535,"AP24C"),
        mk({top:"L80",tiroirs:"3 tiroirs",poignee:"Design"},540,"AP24D"),
        mk({top:"L80",tiroirs:"4 tiroirs",poignee:"Classique"},575,"AP25C"),
        mk({top:"L80",tiroirs:"4 tiroirs",poignee:"Design"},585,"AP25D") ],
      [ { nom:"Coloris corps / façade", finitions: PAIRES44 }, { nom:"Couleur poignée", finitions: POIGNEE_COULEUR } ]);
  }

  // 5. Caisson latéral hauteur bureau (Tiroirs × Poignée)
  {
    const v = P("Caisson latéral hauteur bureau");
    if (v) await ecrire(v,
      [{ id:"tiroirs", nom:"Tiroirs", valeurs:["3 tiroirs","4 tiroirs"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [ mk({tiroirs:"3 tiroirs",poignee:"Classique"},585,"AP38C"),
        mk({tiroirs:"3 tiroirs",poignee:"Design"},585,"AP38D"),
        mk({tiroirs:"4 tiroirs",poignee:"Classique"},630,"AP39C"),
        mk({tiroirs:"4 tiroirs",poignee:"Design"},640,"AP39D") ],
      [ { nom:"Coloris corps / façade", finitions: PAIRES44 }, { nom:"Couleur poignée", finitions: POIGNEE_COULEUR } ]);
  }

  // 6. Caisson hauteur bureau + Top Box (Tiroirs × Poignée) — 24 paires
  {
    const v = P("Caisson hauteur bureau + Top Box");
    if (v) await ecrire(v,
      [{ id:"tiroirs", nom:"Tiroirs", valeurs:["3 tiroirs","4 tiroirs"] },
       { id:"poignee", nom:"Poignée", valeurs:["Classique","Design"] }],
      [ mk({tiroirs:"3 tiroirs",poignee:"Classique"},705,"DH77C"),
        mk({tiroirs:"3 tiroirs",poignee:"Design"},710,"DH77D"),
        mk({tiroirs:"4 tiroirs",poignee:"Classique"},750,"DH78C"),
        mk({tiroirs:"4 tiroirs",poignee:"Design"},760,"DH78D") ],
      [ { nom:"Coloris corps / façade", finitions: PAIRES24 }, { nom:"Couleur poignée", finitions: POIGNEE_COULEUR } ]);
  }

  // 7. Kit 4 patins réhausse (accessoire réf unique)
  {
    const v = P("Kit 4 patins réhausse");
    if (v) await ecrire(v, [], [ mk({},32,"DP03") ],
      [ { nom:"Structure métal", finitions:[{ nom:"Noir métal", couleur:"#23262a", ordre:0 }] } ]);
  }

  // 8. Coussin d'assise caisson mobile (axe Tissu, prix variable)
  {
    const v = P("Coussin d'assise caisson mobile");
    const rows = [
    ["Beige", "95"],
    ["Chocolat", "95"],
    ["Forêt", "95"],
    ["Horizon", "95"],
    ["Pêche", "95"],
    ["Sable", "95"],
    ["Bleu", "105"],
    ["Bleu pétrole", "105"],
    ["Gris carbone", "105"],
    ["Gris clair", "105"],
    ["Ocre", "105"],
    ["Orange", "105"],
    ["Rouge", "105"],
    ["Vert acide", "105"],
    ["Vert eau", "105"]
    ];
    if (v) await ecrire(v,
      [{ id:"tissu", nom:"Tissu", valeurs:["Beige", "Chocolat", "Forêt", "Horizon", "Pêche", "Sable", "Bleu", "Bleu pétrole", "Gris carbone", "Gris clair", "Ocre", "Orange", "Rouge", "Vert acide", "Vert eau"] }],
      rows.map(([tissu, prix]) => mk({ tissu }, prix, "ED72")),
      []);
  }

  // 9. Coussin d'assise caisson slim (axe Tissu, prix variable)
  {
    const v = P("Coussin d'assise caisson slim");
    const rows = [
    ["Beige", "90"],
    ["Chocolat", "90"],
    ["Forêt", "90"],
    ["Horizon", "90"],
    ["Pêche", "90"],
    ["Sable", "90"],
    ["Bleu", "100"],
    ["Bleu pétrole", "100"],
    ["Gris carbone", "100"],
    ["Gris clair", "100"],
    ["Ocre", "100"],
    ["Orange", "100"],
    ["Rouge", "100"],
    ["Vert acide", "100"],
    ["Vert eau", "100"]
    ];
    if (v) await ecrire(v,
      [{ id:"tissu", nom:"Tissu", valeurs:["Beige", "Chocolat", "Forêt", "Horizon", "Pêche", "Sable", "Bleu", "Bleu pétrole", "Gris carbone", "Gris clair", "Ocre", "Orange", "Rouge", "Vert acide", "Vert eau"] }],
      rows.map(([tissu, prix]) => mk({ tissu }, prix, "ED73")),
      []);
  }

  console.log(`\n✓ Gamme "${gamme.nom}" traitée.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
