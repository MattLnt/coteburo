// Construit les nuanciers Buronomic à partir des teintes déjà en catalogue.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/nuancier-buronomic.mjs
//   node prisma/nuancier-buronomic.mjs --appliquer
//
// LE DÉFAUT
//   Buronomic n'a que deux nuanciers — BeSoft et Step Mélange, deux gammes de
//   tissu. Ses teintes de fond, celles qu'on retrouve partout, n'appartiennent
//   à aucun : Chêne fil cent quatre-vingt-huit fois, Nebraska cent
//   soixante-seize, Yukon cent cinquante-six, chacune portant sa propre copie
//   de la couleur.
//
//   Mille cinquante-neuf finitions dans ce cas. Corriger le chêne demandait
//   donc cent quatre-vingt-huit corrections, ou un script de plus.
//
// CE QU'IL FAIT — ET CE QU'IL N'INVENTE PAS
//   Aucune couleur n'est créée : chacune est déjà écrite sur les finitions.
//   On ne fait que la reconnaître comme une seule et même teinte, et lui
//   donner une place dans la bibliothèque.
//
//   Un libellé dont la couleur n'est PAS unanime est laissé de côté. « Sauge »
//   vaut #9aad8f sur cinq fiches et #4a6350 sur une sixième : c'est une erreur
//   de saisie ou deux teintes différentes, et il faut regarder avant de
//   trancher. Deux libellés sont dans ce cas.
//
// LES GRAPHIES
//   Le catalogue écrit « Nebraska » et « NEBRASKA », « Chêne fil » et
//   « CHENE FIL » — même couleur, même teinte. Elles se rangent sous une
//   entrée unique, dans la graphie que le catalogue emploie le plus souvent.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const MARQUE = "Buronomic";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Le rangement, par mots-clés lus dans l'ordre. Ce sont les mots du
// fournisseur, pas une classification inventée : « VERT EAU TISSU » dit sa
// matière, « NOIR METAL » aussi.
const FAMILLES = [
  [/\btissu\b|\bmaille\b/, "Tissus"],
  [/\bmetal\b|\bplastique\b|\balu\b/, "Métal et plastique"],
  [/\bchene\b|\bhetre\b|nebraska|yukon|\bnoyer\b|acacia|\bbois\b|\bchataignier\b/, "Bois"],
  [null, "Teintes unies"],
];
const familleDe = (libelle) => FAMILLES.find(([r]) => !r || r.test(nu(libelle)))[1];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const valeurs = await prisma.valeurChoix.findMany({
    where: {
      choix: { nature: "finition", vitrine: { gamme: { marque: { nom: MARQUE } } } },
      modeleId: null,
    },
    select: { id: true, libelle: true, couleur: true, imageUrl: true },
  });

  // ── Regrouper par teinte, graphies confondues ───────────────────────
  const teintes = new Map();   // clé normalisée -> { graphies, couleurs, images, ids }
  for (const v of valeurs) {
    const k = nu(v.libelle);
    if (!k) continue;
    if (!teintes.has(k)) {
      teintes.set(k, { graphies: new Map(), couleurs: new Map(), images: new Map(), ids: [] });
    }
    const t = teintes.get(k);
    t.graphies.set(v.libelle, (t.graphies.get(v.libelle) || 0) + 1);
    if (v.couleur) t.couleurs.set(v.couleur, (t.couleurs.get(v.couleur) || 0) + 1);
    if (v.imageUrl) t.images.set(v.imageUrl, (t.images.get(v.imageUrl) || 0) + 1);
    t.ids.push(v.id);
  }

  const retenues = [];
  const ecartees = [];
  for (const [k, t] of teintes) {
    if (t.couleurs.size > 1 || t.images.size > 1) {
      ecartees.push({ k, t, motif: [...t.couleurs].map(([c, n]) => `${c}×${n}`).join(" · ") });
      continue;
    }
    if (!t.couleurs.size && !t.images.size) {
      ecartees.push({ k, t, motif: "aucune pastille — rien à factoriser" });
      continue;
    }
    // La graphie la plus employée fait foi.
    const nom = [...t.graphies].sort((a, b) => b[1] - a[1])[0][0];
    retenues.push({
      nom,
      famille: familleDe(nom),
      couleur: [...t.couleurs.keys()][0] || null,
      imageUrl: [...t.images.keys()][0] || null,
      ids: t.ids,
      graphies: [...t.graphies.keys()],
    });
  }

  titre("LES NUANCIERS QUI SERAIENT CRÉÉS");
  const parFamille = new Map();
  for (const r of retenues) {
    if (!parFamille.has(r.famille)) parFamille.set(r.famille, []);
    parFamille.get(r.famille).push(r);
  }
  for (const [famille, liste] of parFamille) {
    const n = liste.reduce((s, r) => s + r.ids.length, 0);
    console.log(`\n   ${MARQUE} — ${famille}  ·  ${liste.length} teintes, ${n} finitions`);
    for (const r of liste.sort((a, b) => b.ids.length - a.ids.length)) {
      const autres = r.graphies.filter((g) => g !== r.nom);
      console.log(`      ${(r.couleur || "image").padEnd(9)} ${r.nom.padEnd(22)} ${String(r.ids.length).padStart(4)}`
        + (autres.length ? `   (aussi écrit ${autres.join(", ")})` : ""));
    }
  }
  console.log(`\n   ${retenues.length} teintes · ${retenues.reduce((n, r) => n + r.ids.length, 0)} finitions rattachées`);

  if (ecartees.length) {
    titre("LAISSÉES DE CÔTÉ");
    console.log("");
    for (const e of ecartees) {
      const nom = [...e.t.graphies.keys()][0];
      console.log(`   ${nom.padEnd(22)} ${String(e.t.ids.length).padStart(4)} finitions — ${e.motif}`);
    }
    console.log("\n   Une couleur qui n'est pas unanime se regarde avant de se trancher.");
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let rattachees = 0;
  for (const [famille, liste] of parFamille) {
    const nomPalette = famille;
    const palette = await prisma.paletteFinition.upsert({
      where: { id: `buronomic-${nu(famille).replace(/ /g, "-")}` },
      create: { id: `buronomic-${nu(famille).replace(/ /g, "-")}`, nom: nomPalette, marque: MARQUE },
      update: { nom: nomPalette, marque: MARQUE },
    });

    for (let i = 0; i < liste.length; i += 1) {
      const r = liste[i];
      const modele = await prisma.finitionModele.create({
        data: { nom: r.nom, couleur: r.couleur, imageUrl: r.imageUrl, ordre: i, paletteId: palette.id },
      });
      // Les finitions pointent vers le modèle et laissent tomber leur copie :
      // c'est ce lien qui fait qu'une correction du nuancier les corrige toutes.
      const maj = await prisma.valeurChoix.updateMany({
        where: { id: { in: r.ids } },
        data: { modeleId: modele.id, paletteId: palette.id, couleur: null, imageUrl: null },
      });
      rattachees += maj.count;
    }
    console.log(`   ${MARQUE} — ${famille} : ${liste.length} teintes`);
  }
  console.log(`   ${rattachees} finitions rattachées`);

  titre("CONTRÔLE");
  const nonLiees = await prisma.valeurChoix.count({
    where: {
      choix: { nature: "finition", vitrine: { gamme: { marque: { nom: MARQUE } } } },
      modeleId: null,
    },
  });
  const nues = await prisma.valeurChoix.count({
    where: {
      choix: { nature: "finition", vitrine: { gamme: { marque: { nom: MARQUE } } } },
      couleur: null, imageUrl: null, modele: null,
    },
  });
  console.log(`   finitions ${MARQUE} sans nuancier : ${nonLiees} · sans pastille : ${nues}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
