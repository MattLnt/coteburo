// Combien de fiches sont le même produit décliné ?
//
//   node prisma/analyser-doublons-variantes.mjs
//   node prisma/analyser-doublons-variantes.mjs --gamme=Eman
//
// N'ÉCRIT RIEN. Il compte, il montre, il ne touche à rien.
//
// CE QU'IL CHERCHE
//   Le tarif Sokoa donne une référence par combinaison : NL86/D pour la
//   chaise blanche à dossier résille, NR86/A pour la même en noir. L'import
//   a fait une fiche par ligne de tarif, si bien que la gamme Eman compte
//   vingt-sept pages pour quatre ou cinq chaises.
//
//   Pour un client, c'est une chaise et deux questions. Pour le catalogue,
//   ce sont vingt-sept fiches à photographier, à décrire et à ranger.
//
// COMMENT IL REGROUPE
//   On retire du nom les mots qui désignent une variante — une couleur, un
//   type de dossier, un diamètre de roulette — et l'on voit ce qui reste.
//   Deux fiches dont le reste est identique sont le même produit.
//
//   Les mots retirés viennent d'une liste explicite, et le script AFFICHE ce
//   qu'il a retiré pour chaque groupe. Un regroupement qu'on ne peut pas
//   relire n'est pas un regroupement, c'est un pari.
//
// CE QU'IL NE PRÉTEND PAS
//   Décider. Deux fiches peuvent porter le même nom réduit et rester deux
//   produits : un bureau de 120 et un de 180 diffèrent par leur largeur, qui
//   est une variante légitime, mais aussi par leur encombrement, qui n'en est
//   pas une. C'est au catalogue de trancher, pas au script.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FILTRE = (process.argv.find((a) => a.startsWith("--gamme=")) || "").slice(8) || null;
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Les mots qui désignent une variante et non un produit. Lus dans l'ordre :
// une expression de plusieurs mots doit partir avant ses mots isolés.
const VARIANTES = [
  // Couleurs et finitions
  /\bfinition (blanc|noir|gris|blanche|aluminium|chrome|chromee)\b/g,
  /\b(blanc|blanche|noir|noire|gris|grise|aluminium|chrome|chromees?|alu poli)\b/g,
  // Dossiers et assises
  /\bdossier (resille|tapisse|toile|maille|polypropylene|pp)\b/g,
  /\b(resille|tapisse|tapissee|toile|maille)\b/g,
  // Roulettes et sols
  /\broulettes? [a-z0-9]* ?(o|0)?\s?\d+\b/g,
  /\bsol (dur|moquette|souple)\b/g,
  /\bpatins?\b/g,
  // Options courantes
  /\b(avec|sans) (tetiere|accoudoirs?|manchettes?|appui tete)\b/g,
  /\b(tetiere|rl|ta)\b/g,
  // Piétements
  /\bbase (alu poli|aluminium|nylon|noire?)\b/g,
  /\b(4 pieds|luge|arche|pietement) ?(bois|metal|chrome)?\b/g,
];

function reduire(nom) {
  let k = ` ${nu(nom)} `;
  const retires = [];
  for (const r of VARIANTES) {
    k = k.replace(r, (m) => { retires.push(m.trim()); return " "; });
  }
  return { cle: k.replace(/\s+/g, " ").trim(), retires };
}

async function main() {
  const gammes = await prisma.gamme.findMany({
    where: FILTRE ? { nom: { contains: FILTRE, mode: "insensitive" } } : {},
    select: {
      nom: true, marque: { select: { nom: true } },
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true,
          _count: { select: { visuels: true, combinaisons: true } },
        },
      },
    },
  });

  const rapport = [];
  let fichesTotal = 0;
  let apresTotal = 0;
  let videsEvitees = 0;

  for (const g of gammes) {
    if (g.vitrines.length < 2) { fichesTotal += g.vitrines.length; apresTotal += g.vitrines.length; continue; }
    const groupes = new Map();
    for (const v of g.vitrines) {
      const { cle, retires } = reduire(v.nom);
      if (!groupes.has(cle)) groupes.set(cle, { cle, fiches: [], retires: new Set() });
      groupes.get(cle).fiches.push(v);
      for (const r of retires) groupes.get(cle).retires.add(r);
    }
    fichesTotal += g.vitrines.length;
    apresTotal += groupes.size;

    const fusionnables = [...groupes.values()].filter((x) => x.fiches.length > 1);
    if (!fusionnables.length) continue;

    // Combien de fiches SANS image rejoindraient une fiche qui en a ?
    let sauvees = 0;
    for (const f of fusionnables) {
      const avec = f.fiches.filter((v) => v._count.visuels > 0).length;
      const sans = f.fiches.length - avec;
      if (avec > 0) sauvees += sans;
    }
    videsEvitees += sauvees;

    rapport.push({
      gamme: `${g.marque.nom} · ${g.nom}`,
      avant: g.vitrines.length,
      apres: groupes.size,
      sauvees,
      groupes: fusionnables,
    });
  }

  titre("CE QUE LE REGROUPEMENT DONNERAIT");
  console.log(`
   fiches aujourd'hui ................... ${fichesTotal}
   fiches après regroupement ............ ${apresTotal}
   fiches en moins ...................... ${fichesTotal - apresTotal}

   fiches sans image qui rejoindraient
   une fiche déjà illustrée ............. ${videsEvitees}`);

  titre("LES GAMMES LES PLUS CONCERNÉES");
  console.log("");
  for (const r of rapport.sort((a, b) => (b.avant - b.apres) - (a.avant - a.apres)).slice(0, 14)) {
    console.log(`   ${String(r.avant).padStart(3)} → ${String(r.apres).padEnd(3)}  ${r.gamme.padEnd(28)} ${r.sauvees ? `${r.sauvees} photo(s) économisée(s)` : ""}`);
  }

  if (FILTRE) {
    titre(`LE DÉTAIL DE « ${FILTRE} »`);
    for (const r of rapport) {
      for (const f of r.groupes) {
        console.log(`\n   ── ${f.cle}`);
        console.log(`      variantes retirées : ${[...f.retires].join(" · ")}`);
        for (const v of f.fiches) {
          console.log(`      ${v._count.visuels ? "📷" : "  "} ${v.nom}`);
        }
      }
    }
  } else {
    console.log("\n   Le détail d'une gamme : --gamme=Eman");
  }

  console.log("\nAucune fiche n'a été modifiée.");
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
