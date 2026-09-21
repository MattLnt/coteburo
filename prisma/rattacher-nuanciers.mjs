// Rattache les nuanciers Sokoa aux catégories de revêtement, et fait tomber
// les groupes de pastilles vides qui les doublaient.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/rattacher-nuanciers.mjs --apercu="…"
//   node prisma/rattacher-nuanciers.mjs --appliquer
//
// LE SYMPTÔME
//   Sur une fiche Wi-Max, le bloc « Finitions » aligne quatre pastilles
//   beiges identiques, légendées « Tissu B+ », « Tissu C », « Tissu D ».
//   Aucune ne montre de couleur, parce qu'aucune n'en porte : ce ne sont pas
//   des teintes mais des CATÉGORIES TARIFAIRES. Le tarif Sokoa ne fait pas
//   payer une couleur, il fait payer une gamme de tissu ; le client choisit
//   sa teinte dans le nuancier de la gamme retenue.
//
// LE MÉCANISME QUI CONVIENT
//   « finitionsParValeur », porté par l'axe. C'est son emploi d'origine, et
//   le seul : une valeur d'axe qui est une catégorie y désigne l'ensemble
//   des teintes qu'elle ouvre. L'ancienne base s'en servait ainsi sur
//   quarante-cinq axes — « Fauteuil de direction - Azkar », axe revêtement,
//   valeurs B / B+ / C / D / E / H, chacune tirant son nuancier.
//
//   Cent soixante-dix-neuf fiches Sokoa portent des valeurs de finition qui
//   sont exactement des noms de palette en base : six cent quinze valeurs.
//
// LES LIBELLÉS À RESTRICTION
//   Le tarif écrit souvent « Tissu C — Spazio exclu », « Tissu B — Xtrevira
//   uniquement ». On rattache la palette de base, celle qui précède le tiret,
//   et on laisse la restriction s'afficher telle quelle dans le libellé de la
//   valeur : le client la lit.
//
//   Cela ne montre jamais une gamme exclue : Spazio, Runner, Blend, Bouclé
//   et Grain sont des palettes distinctes, sans un seul nom commun avec
//   « Tissu C ». La restriction porte sur des gammes que la palette de base
//   ne contient pas.
//
// LE GROUPE FANTÔME
//   L'import avait créé, faute de mieux, un groupe « Finitions » reprenant
//   les mêmes catégories en pastilles sans couleur. Une fois le nuancier
//   rattaché, il fait double emploi et ne montre que du beige. On ne le
//   supprime que s'il est bien ce fantôme-là : toutes ses finitions sans
//   couleur NI image, et chacune portant le nom d'une valeur de l'axe.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const APERCU = (process.argv.find((a) => a.startsWith("--apercu=")) || "").slice(9) || null;

const titre = (t) => console.log(`\n${"═".repeat(70)}\n${t}\n${"═".repeat(70)}`);
const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/\s+/g, " ").trim();

// « Tissu C — Spazio exclu » → « Tissu C ». Le tiret cadratin sépare la
// catégorie de sa restriction ; le tarif emploie aussi l'astérisque pour
// renvoyer à une note.
const categorieDe = (valeur) => String(valeur).split(/\s+—\s+|\s+\*\s*/)[0].trim();

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const palettes = await prisma.paletteFinition.findMany({
    select: {
      nom: true,
      finitions: {
        select: { id: true, nom: true, couleur: true, imageUrl: true },
        orderBy: { ordre: "asc" },
      },
    },
  });
  const parNom = new Map(palettes.map((p) => [nu(p.nom), p]));

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, axesDeclinaisons: true,
      groupesFinition: {
        select: { id: true, nom: true, finitions: { select: { nom: true, couleur: true, imageUrl: true } } },
      },
    },
  });

  const plan = [];
  const sansPalette = {};
  for (const v of vitrines) {
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    const axeFin = axes.find((a) => a.id === "finition");
    if (!axeFin) continue;
    const valeurs = axeFin.valeurs || [];

    const fpv = {};
    let rattachees = 0;
    for (const valeur of valeurs) {
      const pal = parNom.get(nu(categorieDe(valeur)));
      if (!pal) { sansPalette[valeur] = (sansPalette[valeur] || 0) + 1; continue; }
      // L'identifiant est celui du modèle de nuancier : une même teinte
      // présente dans deux catégories ne s'affichera donc qu'une fois.
      fpv[valeur] = pal.finitions.map((f) => ({
        id: f.id, nom: f.nom, couleur: f.couleur,
        imageUrl: f.imageUrl, paletteNom: pal.nom,
      }));
      rattachees += 1;
    }
    if (!rattachees) continue;

    // Le groupe fantôme : des pastilles sans couleur ni image, qui ne font
    // que répéter les valeurs de l'axe.
    const nomsAxe = new Set(valeurs.map(nu));
    const fantomes = v.groupesFinition.filter((g) => g.finitions.length
      && g.finitions.every((f) => !f.couleur && !f.imageUrl && nomsAxe.has(nu(f.nom))));

    plan.push({
      id: v.id, nom: v.nom, rattachees, fantomes,
      nbTeintes: new Set(Object.values(fpv).flat().map((f) => f.id)).size,
      axes: axes.map((a) => (a.id === "finition" ? { ...a, finitionsParValeur: fpv } : a)),
      fpv,
    });
  }

  titre("CE QUI SERAIT FAIT");
  const nRatt = plan.reduce((n, p) => n + p.rattachees, 0);
  const nFant = plan.reduce((n, p) => n + p.fantomes.length, 0);
  console.log(`\n   fiches recevant leur nuancier              ${String(plan.length).padStart(4)}`);
  console.log(`   valeurs de finition rattachées             ${String(nRatt).padStart(4)}`);
  console.log(`   groupes fantômes supprimés                 ${String(nFant).padStart(4)}`);
  const dist = {};
  for (const p of plan) dist[p.rattachees] = (dist[p.rattachees] || 0) + 1;
  console.log(`   catégories par fiche : ${Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([k, c]) => `${k} → ${c}`).join("  ")}`);

  const O = Object.entries(sansPalette).sort((a, b) => b[1] - a[1]);
  if (O.length) {
    console.log(`\n   valeurs sans palette connue, laissées telles quelles (${O.length}) :`);
    for (const [k, c] of O.slice(0, 12)) console.log(`      ${String(c).padStart(4)}  ${k}`);
    if (O.length > 12) console.log(`      … et ${O.length - 12} autres`);
  }

  if (APERCU) {
    const p = plan.find((x) => x.nom === APERCU) || plan.find((x) => x.nom.includes(APERCU));
    titre(`APERÇU — ${p ? p.nom : APERCU}`);
    if (!p) console.log("\n   fiche hors du périmètre");
    else {
      console.log("\n   AVANT — un groupe de pastilles sans couleur :");
      for (const g of p.fantomes) {
        console.log(`      ${g.nom} : ${g.finitions.map((f) => f.nom).join(" · ")}`);
      }
      console.log("\n   APRÈS — chaque catégorie tire son nuancier :");
      for (const [valeur, L] of Object.entries(p.fpv)) {
        const avecImage = L.filter((f) => f.imageUrl).length;
        console.log(`      ${valeur}`);
        console.log(`         ${L.length} teintes, ${avecImage} avec pastille — ${L.slice(0, 5).map((f) => f.nom).join(" · ")} …`);
      }
      console.log(`\n   ${p.nbTeintes} teintes distinctes au total sur la fiche`);
    }
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let n = 0;
  for (const p of plan) {
    await prisma.produitVitrine.update({
      where: { id: p.id }, data: { axesDeclinaisons: p.axes },
    });
    if (p.fantomes.length) {
      await prisma.groupeFinition.deleteMany({
        where: { id: { in: p.fantomes.map((g) => g.id) } },
      });
    }
    n += 1;
    if (n % 25 === 0) console.log(`   ${n} / ${plan.length} fiches`);
  }
  console.log(`   ${n} fiches rattachées`);

  titre("CONTRÔLE");
  const apres = await prisma.produitVitrine.findMany({
    select: { axesDeclinaisons: true, groupesFinition: { select: { finitions: { select: { couleur: true, imageUrl: true } } } } },
  });
  let avecFpv = 0;
  for (const v of apres) {
    if ((Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : []).some((a) => a.finitionsParValeur)) avecFpv += 1;
  }
  const beiges = apres.reduce((n, v) => n + v.groupesFinition
    .filter((g) => g.finitions.length && g.finitions.every((f) => !f.couleur && !f.imageUrl)).length, 0);
  console.log(`   fiches portant « finitionsParValeur »       ${String(avecFpv).padStart(4)}`);
  console.log(`   groupes encore tout beiges                  ${String(beiges).padStart(4)}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
