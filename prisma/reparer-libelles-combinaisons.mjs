// Raccroche les combinaisons aux libellés qu'on a renommés sous elles.
//
//   node prisma/reparer-libelles-combinaisons.mjs
//   node prisma/reparer-libelles-combinaisons.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Une valeur tarifaire est nommée à deux endroits : sur le choix, où le
//   client la lit, et dans le JSON de chaque combinaison, où le prix la
//   retrouve. Les deux se raccordent par la CHAÎNE DE CARACTÈRES, et rien
//   d'autre — combinaisonsCompatibles() compare comb.valeurs[cle] au libellé.
//
//   Renommer le libellé sans réécrire le JSON les décroche. Le libellé reste
//   proposé, aucune combinaison ne lui répond, et la valeur disparaît de
//   l'écran. La fiche se configure toujours, par les autres réponses : rien
//   ne casse, et c'est bien le problème.
//
//   prisma/decouper-wimax.mjs a fait exactement cela sur les cinq fiches
//   Wi-Max Ergo. « XF3/B » n'est pas un tissu mais l'en-tête d'une colonne de
//   prix, et « Tissu C » cachait la restriction de la page 57 ; les deux ont
//   été renommées, et deux catégories sur quatre sont devenues inatteignables.
//   La moins chère en faisait partie.
//
// COMMENT ON LE SAIT
//   prisma/verifier-configurateur.mjs compare désormais, pour chaque choix
//   tarifaire, les libellés proposés et les valeurs stockées, et nomme les
//   deux côtés qui ne se répondent pas. C'est ce qui a trouvé celles-ci.
//
// CE QU'IL REFUSE DE FAIRE
//   Deviner l'appariement. Deux libellés muets et deux valeurs orphelines ne
//   disent pas lequel va avec lequel : la table ci-dessous est écrite à la
//   main, et une fiche dont la réécriture créerait deux combinaisons
//   identiques est laissée telle quelle.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

// ── Ce qui a été renommé sur le choix, et pas dessous ─────────────────
const RENOMMAGES = [
  {
    gamme: "Wi-Max Ergo", cle: "finition",
    couples: {
      "XF3/B": "Tissu B ou X-Trevira XF3",
      "Tissu C": "Tissu C — Boucle FR, Runner et Spazio exclus",
    },
  },
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const plans = [];
  const refuses = [];

  for (const r of RENOMMAGES) {
    const vitrines = await prisma.produitVitrine.findMany({
      where: { publie: true, gamme: { nom: r.gamme } },
      orderBy: { nom: "asc" },
      select: {
        id: true, nom: true,
        choix: { select: { cle: true, nom: true, nature: true, valeurs: { select: { libelle: true } } } },
        combinaisons: { select: { id: true, valeurs: true } },
      },
    });

    for (const v of vitrines) {
      const choix = v.choix.find((c) => c.cle === r.cle);
      if (!choix) { refuses.push(`${v.nom} — pas de question « ${r.cle} »`); continue; }
      const declares = new Set(choix.valeurs.map((x) => x.libelle));

      const mouvements = [];
      for (const k of v.combinaisons) {
        const val = (k.valeurs || {})[r.cle];
        const apres = r.couples[val];
        if (apres == null) continue;
        // Le libellé d'arrivée doit exister sur le choix, sinon on remplacerait
        // une valeur muette par une autre.
        if (!declares.has(apres)) { refuses.push(`${v.nom} — « ${apres} » n'est pas une réponse de « ${choix.nom} »`); mouvements.length = 0; break; }
        const valeurs = { ...(k.valeurs || {}), [r.cle]: apres };
        mouvements.push({ id: k.id, avant: val, apres, valeurs, empreinte: empreinteDe(valeurs) });
      }
      if (!mouvements.length) continue;

      // Aucune empreinte ne doit en heurter une autre, réécrite ou non.
      const finales = new Map();
      for (const k of v.combinaisons) finales.set(k.id, empreinteDe(k.valeurs || {}));
      for (const m of mouvements) finales.set(m.id, m.empreinte);
      if (new Set(finales.values()).size !== finales.size) {
        refuses.push(`${v.nom} — la réécriture ferait deux combinaisons identiques`);
        continue;
      }

      plans.push({ v, r, choix, mouvements });
    }
  }

  titre(`${plans.length} FICHES À RACCROCHER`);
  console.log("");
  for (const p of plans) {
    const paires = new Map();
    for (const m of p.mouvements) paires.set(`${m.avant} → ${m.apres}`, (paires.get(`${m.avant} → ${m.apres}`) || 0) + 1);
    console.log(`   ${p.v.nom.slice(0, 54)}   « ${p.choix.nom} »`);
    for (const [k, n] of paires) console.log(`      ${String(n).padStart(2)} variantes   ${k}`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches · ${plans.reduce((n, p) => n + p.mouvements.length, 0)} variantes raccrochées`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plans) {
    for (const m of p.mouvements) {
      await prisma.combinaison.update({
        where: { id: m.id }, data: { valeurs: m.valeurs, empreinte: m.empreinte },
      });
    }
  }
  console.log(`   ${plans.length} fiches raccrochées.`);
  console.log(`\n   Contrôler avec : node prisma/verifier-configurateur.mjs`);
}

main()
  .catch((e) => { console.error(e.stack || e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
