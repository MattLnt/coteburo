// Donne un nom aux axes que l'import avait rangés dans « Modèle ».
//
//   node prisma/nommer-axes-caches.mjs
//   node prisma/nommer-axes-caches.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Quatre-vingt-une fiches portent une question « Modèle » dont les valeurs
//   sont le nom de la fiche répété, suivi d'une référence :
//
//     Chaise 4 pieds, vendue à l'unité (KEA0030)
//     Chaise 4 pieds, vendue à l'unité (KEA00R)
//
//   Le client voit sept blocs identiques. L'information est dans la
//   référence, et le tarif la nomme — mais l'import ne l'a pas lue.
//
// CE QUE CE SCRIPT TRAITE
//   Les gammes dont le tarif nomme lui-même chaque référence, en toutes
//   lettres, à côté d'elle. Rien n'est déduit d'un ordre d'apparition :
//
//     page 156  KEA0030 « Rose Corail », KEA00R « Rose Poudré »…
//     page 129  RUYD/10 « Pouf à droite », RUYG/10 « Pouf à gauche »
//
//   Les autres gammes attendent leur lecture de tarif. Une fiche dont une
//   référence n'est pas dans la table reste telle quelle, et le script le dit.
//
// CE QUE ÇA CHANGE POUR LE CLIENT
//   « Modèle » devient « Coloris » ou « Orientation », et ses valeurs
//   deviennent des mots. Ces axes ne changent pas le prix — seulement la
//   référence commandée — ils sont donc de nature « finition ».
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// ── Ce que le tarif écrit, référence par référence ────────────────────
//
// La clé est le suffixe qui suit la racine ; la valeur, le mot du tarif.
const TABLES = [
  {
    gamme: "Maike", page: 156,
    cle: "coloris", nom: "Coloris",
    racine: /^KE[AH]0[04]/,          // KEA00…, KEA04…, KEH00…, KEH04…
    codes: {
      30: "Rose Corail", R: "Rose Poudré", 40: "Bleu Pastel", V: "Vert Menthol",
      70: "Beige Sable", 80: "Orange Mandarine", 90: "Blanc Neige",
      B0: "Bleu océan", P0: "Gris perle", L0: "Gris lave", LO: "Gris lave", PO: "Gris perle",
    },
    couleurs: {
      "Rose Corail": "#e8836f", "Rose Poudré": "#dcb2b0", "Bleu Pastel": "#8fb4d4",
      "Vert Menthol": "#9dc5a8", "Beige Sable": "#d6c6a8", "Orange Mandarine": "#e8842a",
      "Blanc Neige": "#f4f4f0", "Bleu océan": "#2f4a63", "Gris perle": "#b8b8b4",
      "Gris lave": "#5a5a58",
    },
  },
  {
    gamme: "Rhune", page: 129,
    cle: "orientation", nom: "Orientation",
    racine: /^RU[YZQR]/,
    // Ici le code est la lettre qui suit « RUY »/« RUZ », avant la barre.
    depuisReference: (ref) => {
      const m = /^RU[YZQR]([DG])/.exec(ref);
      return m ? (m[1] === "D" ? "À droite" : "À gauche") : null;
    },
    ordre: ["À droite", "À gauche"],
  },
  // ── Deux gammes où l'axe caché est le MÉCANISME, et où il déplace le
  //    prix : chez Alaia, 269 € en contact permanent contre 324 € en synchro
  //    automatique. Ce sont donc des choix tarifaires, pas des finitions.
  {
    gamme: "Alaia by Sokoa", page: 52,
    cle: "mecanisme", nom: "Mécanisme", nature: "tarifaire",
    // IA = dossier tapissé (p. 52), IR = dossier résille (p. 53). Le chiffre
    // veut dire la même chose des deux côtés ; le résille ajoute seulement la
    // translation d'assise, que le tarif abrège « + TA » et facture +28 € —
    // le prix exact de l'option « Translation assise » de la page 48.
    racine: /^I[AR]\d/,
    depuisReference: (ref) => ({
      3: "Contact permanent",
      5: "Synchro",
      7: "Synchro + translation d'assise",
      6: "Synchro automatique",
      8: "Synchro automatique + translation d'assise",
    })[ref[2]] || null,
    ordre: [
      "Contact permanent",
      "Synchro", "Synchro + translation d'assise",
      "Synchro automatique", "Synchro automatique + translation d'assise",
    ],
  },
  {
    gamme: "Tertio", page: 48,
    cle: "mecanisme", nom: "Mécanisme", nature: "tarifaire",
    racine: /^R[TRZ]\d/,
    depuisReference: (ref) => ({
      3: "Contact permanent", 4: "Contact permanent Plus",
      5: "Synchrone", 7: "Synchrone + translation d'assise",
    })[ref[2]] || null,
    ordre: ["Contact permanent", "Contact permanent Plus", "Synchrone", "Synchrone + translation d'assise"],
  },
];

/** Le code d'une référence, pour une table donnée. */
function valeurDe(table, refBrute) {
  const ref = String(refBrute || "").trim().toUpperCase().split(/[\s*+]/)[0];
  if (!table.racine.test(ref)) return null;
  if (table.depuisReference) return table.depuisReference(ref);
  const m = table.racine.exec(ref);
  const suffixe = ref.slice(m[0].length).replace(/^\//, "");
  return table.codes[suffixe] || null;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const plans = [];
  const refuses = [];

  for (const table of TABLES) {
    const vitrines = await prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { nom: table.gamme } },
      select: {
        id: true, nom: true,
        choix: { select: { id: true, cle: true, nom: true } },
        combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true } },
      },
    });

    for (const v of vitrines) {
      const modele = v.choix.find((c) => /mod[èe]le|r[ée]f[ée]rence/i.test(c.nom));
      if (!modele) continue;

      const combos = [];
      let manque = null;
      for (const k of v.combinaisons) {
        const mot = valeurDe(table, k.referenceBase);
        if (!mot) { manque = k.referenceBase; break; }
        // On remplace la clé « modele » par la nouvelle, on garde le reste.
        const { [modele.cle]: _, ...reste } = k.valeurs || {};
        const valeurs = { ...reste, [table.cle]: mot };
        combos.push({ id: k.id, valeurs, empreinte: empreinteDe(valeurs), mot });
      }
      if (manque) { refuses.push(`${v.nom} — « ${manque} » absente de la table ${table.gamme}`); continue; }

      const empreintes = new Set(combos.map((c) => c.empreinte));
      if (empreintes.size !== combos.length) {
        refuses.push(`${v.nom} — deux variantes aboutiraient aux mêmes réponses`);
        continue;
      }

      plans.push({ vitrine: v, table, modele, combos });
    }
  }

  titre(`${plans.length} FICHES À CORRIGER`);
  const parGamme = new Map();
  for (const p of plans) {
    if (!parGamme.has(p.table.gamme)) parGamme.set(p.table.gamme, []);
    parGamme.get(p.table.gamme).push(p);
  }
  for (const [g, liste] of parGamme) {
    console.log(`\n   ── ${g} → question « ${liste[0].table.nom} »`);
    for (const p of liste) {
      const mots = [...new Set(p.combos.map((c) => c.mot))];
      console.log(`      ${p.vitrine.nom.replace(/ - .*$/, "").slice(0, 44).padEnd(46)} ${mots.length} valeurs : ${mots.join(" · ").slice(0, 58)}`);
    }
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches · ${plans.reduce((n, p) => n + p.combos.length, 0)} variantes renommées`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plans) {
    for (const c of p.combos) {
      await prisma.combinaison.update({
        where: { id: c.id }, data: { valeurs: c.valeurs, empreinte: c.empreinte },
      });
    }
    await prisma.choix.delete({ where: { id: p.modele.id } });

    const mots = [...new Set(p.combos.map((c) => c.mot))];
    const ordonnes = p.table.ordre
      ? p.table.ordre.filter((m) => mots.includes(m))
      : Object.values(p.table.codes).filter((m, i, a) => a.indexOf(m) === i && mots.includes(m));
    await prisma.choix.create({
      data: {
        vitrineId: p.vitrine.id, cle: p.table.cle, nom: p.table.nom,
        nature: p.table.nature || "finition",
        rendu: p.table.couleurs ? "pastilles" : "boutons",
        ordre: 1, origine: "tarif",
        valeurs: {
          create: ordonnes.map((libelle, i) => ({
            libelle, ordre: i, suffixeReference: "",
            ...(p.table.couleurs?.[libelle] ? { couleur: p.table.couleurs[libelle] } : {}),
          })),
        },
      },
    });
  }
  console.log(`   ${plans.length} fiches corrigées.`);

  titre("CONTRÔLE");
  for (const g of parGamme.keys()) {
    const reste = await prisma.choix.count({
      where: { vitrine: { publie: true, gamme: { nom: g } }, nom: { contains: "odèle" } },
    });
    console.log(`   ${g.padEnd(10)} questions « Modèle » restantes : ${reste}`);
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
