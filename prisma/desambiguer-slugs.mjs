// Rend une adresse propre aux fiches qui en partagent une.
//
//   node prisma/desambiguer-slugs.mjs
//   node prisma/desambiguer-slugs.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Une fiche est atteinte par son slug. Quand deux fiches portent le même,
//   une seule répond : l'autre existe en base, paraît dans les listes, et
//   mène chez sa voisine quand on clique. Trois fiches ALTO partagent
//   « tablette-d-extension-alto » — références DY21, DY23 et ED96, trois
//   produits, trois prix.
//
// CE QUI LES DISTINGUE DÉJÀ
//   Leur gamme : ALTO, ALTO ASSISE, ALTO COWORKING. Le catalogue le sait, le
//   titre ne le dit pas — toutes se terminent par « - Alto ». On remet donc
//   la vraie gamme dans le suffixe, et l'adresse suit.
//
//     Tablette d'extension - Alto            (gamme ALTO)
//     Tablette d'extension - Alto Assise     (gamme ALTO ASSISE)
//     Tablette d'extension - Alto Coworking  (gamme ALTO COWORKING)
//
//   Rien n'est inventé : le nom vient de la gamme telle qu'elle est écrite en
//   base. Si deux fiches de la MÊME gamme partageaient une adresse, le nom de
//   gamme n'y suffirait pas — le script le dit et n'y touche pas, parce qu'il
//   faudrait alors savoir ce qui les sépare, et ça se lit dans le tarif.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** « ALTO COWORKING » → « Alto Coworking ». */
const joli = (g) => g.toLowerCase().split(/\s+/)
  .map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" ");

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vs = await prisma.produitVitrine.findMany({
    where: { publie: true },
    select: { id: true, nom: true, slug: true, gamme: { select: { nom: true } } },
  });

  const parSlug = new Map();
  for (const v of vs) {
    if (!parSlug.has(v.slug)) parSlug.set(v.slug, []);
    parSlug.get(v.slug).push(v);
  }
  const partages = [...parSlug].filter(([, l]) => l.length > 1);

  if (!partages.length) {
    console.log("Aucune adresse partagée. Rien à faire.");
    return;
  }

  const plans = [];
  const bloques = [];
  const prisDejà = new Set(vs.map((v) => v.slug));

  for (const [s, liste] of partages) {
    const gammes = new Set(liste.map((v) => v.gamme.nom));
    if (gammes.size !== liste.length) {
      bloques.push({ s, liste, motif: "plusieurs fiches de la même gamme — le nom de gamme ne suffit pas" });
      continue;
    }
    for (const v of liste) {
      // Le suffixe actuel « - Xxx » cède la place au vrai nom de gamme.
      const tete = v.nom.replace(/\s+-\s+[^-]+$/, "").trim();
      const nouveau = `${tete} - ${joli(v.gamme.nom)}`;
      const nouveauSlug = slug(nouveau);
      if (nouveau === v.nom) continue;                 // déjà correct
      if (prisDejà.has(nouveauSlug) && nouveauSlug !== v.slug) {
        bloques.push({ s, liste: [v], motif: `l'adresse /${nouveauSlug} est déjà prise` });
        continue;
      }
      prisDejà.add(nouveauSlug);
      plans.push({ v, nouveau, nouveauSlug });
    }
  }

  titre(`${plans.length} FICHES À RENOMMER`);
  console.log("");
  for (const p of plans) {
    console.log(`   ${p.v.nom}`);
    console.log(`      → ${p.nouveau}   /${p.nouveauSlug}\n`);
  }

  if (bloques.length) {
    titre("ADRESSES QU'ON NE SAIT PAS DÉPARTAGER");
    console.log("");
    for (const b of bloques) {
      console.log(`   /${b.s} — ${b.motif}`);
      for (const v of b.liste) console.log(`      ${v.gamme.nom} · ${v.nom}`);
    }
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plans) {
    await prisma.produitVitrine.update({
      where: { id: p.v.id }, data: { nom: p.nouveau, slug: p.nouveauSlug },
    });
  }
  console.log(`   ${plans.length} fiches renommées.`);

  titre("CONTRÔLE");
  const apres = await prisma.produitVitrine.findMany({ where: { publie: true }, select: { slug: true } });
  const compte = new Map();
  for (const v of apres) compte.set(v.slug, (compte.get(v.slug) || 0) + 1);
  const reste = [...compte].filter(([, n]) => n > 1);
  console.log(`   adresses encore partagées : ${reste.length}`);
  for (const [s, n] of reste) console.log(`      ${n}×  /${s}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
