// Relève les coloris OfficePro dans le catalogue fournisseur et les donne aux
// finitions qui n'ont pas de pastille.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/pastilles-officepro.mjs
//   node prisma/pastilles-officepro.mjs --appliquer
//
// OÙ SONT LES COULEURS
//   Le catalogue OfficePro n'a pas de planche de nuancier. Chaque page
//   produit porte son tableau de coloris : un carré sous son nom, puis la
//   grille des références. Les carrés ne sont pas des images mais des aplats
//   vectoriels — le PDF en donne la valeur exacte, il n'y a rien à
//   échantillonner. Les noms sont du vrai texte.
//
// COMMENT ON APPARIE
//   Un carré prend le nom écrit juste au-dessus de lui, dans sa colonne. On
//   ne garde que les carrés de la taille d'une pastille, et l'on exige que le
//   même nom donne la même couleur d'une page à l'autre : un coloris relevé
//   sur six pages avec six valeurs différentes n'est pas un coloris, c'est du
//   décor mal filtré.
//
// LES NOMS NE COÏNCIDENT PAS TOUJOURS
//   Le catalogue écrit « Vert menthe », la base « MENTHE ». On apparie donc
//   sur les mots, accents et casse ignorés, et l'on refuse toute
//   correspondance ambiguë plutôt que de peindre une finition au hasard.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const PDF = process.argv.find((a) => a.endsWith(".pdf"))
  || "catalogue-2026/Catalogue_Officepro_Seating_2026.pdf";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Une pastille de coloris mesure une douzaine de points ; en dessous c'est un
// filet, au-dessus un aplat de mise en page.
const MIN = 9;
const MAX = 40;

const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

/**
 * Les points d'un chemin, tels que pdfjs les empile : une suite de commandes
 * entrelacées — 0 pour se déplacer, 1 pour tracer, 4 pour refermer.
 */
function pointsDe(brut) {
  // pdfjs enveloppe les coordonnées dans un tableau d'un seul élément.
  const c = Array.from(Array.isArray(brut) && brut.length === 1 ? brut[0] : brut);
  const pts = [];
  for (let i = 0; i < c.length;) {
    const cmd = c[i];
    if (cmd === 0 || cmd === 1) { pts.push([c[i + 1], c[i + 2]]); i += 3; }
    else if (cmd === 4) i += 1;
    else return null;   // courbes et autres : ce n'est pas un rectangle
  }
  return pts;
}

/** Le rectangle d'un chemin, s'il en est un et qu'il est droit. */
function rectangleDe(pts) {
  if (!pts || pts.length !== 4) return null;
  const xs = [...new Set(pts.map((p) => Math.round(p[0] * 100)))];
  const ys = [...new Set(pts.map((p) => Math.round(p[1] * 100)))];
  if (xs.length !== 2 || ys.length !== 2) return null;
  return {
    x: Math.min(...xs) / 100, y: Math.min(...ys) / 100,
    l: Math.abs(xs[1] - xs[0]) / 100, h: Math.abs(ys[1] - ys[0]) / 100,
  };
}

/** Les coloris d'une page : un carré, le nom écrit au-dessus. */
async function colorisDe(page) {
  const vp = page.getViewport({ scale: 1 });
  const ops = await page.getOperatorList();

  let ctm = [1, 0, 0, 1, 0, 0];
  const pile = [];
  let couleur = null;
  let chemin = null;
  const carres = [];

  for (let k = 0; k < ops.fnArray.length; k += 1) {
    const fn = ops.fnArray[k];
    const args = ops.argsArray[k];
    if (fn === OPS.save) pile.push([...ctm]);
    else if (fn === OPS.restore) ctm = pile.pop() || ctm;
    else if (fn === OPS.transform) ctm = mul(ctm, args);
    else if (fn === OPS.setFillRGBColor) couleur = args[0];
    else if (fn === OPS.constructPath) {
      // Cette version de pdfjs ne produit pas d'opérateur `fill` : l'intention
      // de peinture voyage avec le chemin, dans son premier argument.
      if (args[0] !== OPS.fill || !couleur) { chemin = null; continue; }
      chemin = rectangleDe(pointsDe(args[1]));
      if (!chemin) continue;

      const l = Math.abs(ctm[0]) * chemin.l;
      const h = Math.abs(ctm[3]) * chemin.h;
      // Carrée, et de la taille d'une pastille.
      if (l >= MIN && l <= MAX && h >= MIN && h <= MAX && Math.abs(l - h) <= 4) {
        const x = ctm[0] * chemin.x + ctm[4];
        const y = ctm[3] * chemin.y + ctm[5];
        carres.push({ hex: couleur, l, x, yBas: vp.height - y - h, yHaut: vp.height - y });
      }
      chemin = null;
    }
  }
  if (!carres.length) return [];

  const { items } = await page.getTextContent();
  const textes = items
    .filter((t) => t.str.trim() && t.str.trim().length > 2)
    .map((t) => ({
      s: t.str.trim(),
      x: t.transform[4],
      y: vp.height - t.transform[5],
      l: t.width || 0,
    }));

  const out = [];
  for (const c of carres) {
    // Le nom d'une pastille est écrit juste au-dessus d'elle. Les pastilles
    // étant alignées en rangée, c'est l'écart HORIZONTAL qui désigne laquelle
    // porte quel nom : les prendre par proximité verticale attribuait
    // « Paprika » aux trois carrés de la rangée.
    const centre = c.x + c.l / 2;
    // Un nom trop long pour la colonne s'écrit sur deux lignes — « Vert »
    // au-dessus de « menthe ». On les recolle de haut en bas.
    const au_dessus = textes
      .map((t) => ({ t, dy: c.yBas - t.y, dx: Math.abs(t.x + t.l / 2 - centre) }))
      .filter((x) => x.dy >= -2 && x.dy < 24 && x.dx < 26)
      .sort((a, b) => b.dy - a.dy);
    if (au_dessus.length) {
      const nom = au_dessus.map((x) => x.t.s).join(" ");
      out.push({ nom, hex: c.hex });
      // Le dernier fragment seul vaut aussi : la base dit « MENTHE » là où le
      // catalogue écrit « Vert menthe ».
      if (au_dessus.length > 1) {
        out.push({ nom: au_dessus[au_dessus.length - 1].t.s, hex: c.hex });
      }
    }
  }
  return out;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const doc = await getDocument({
    data: new Uint8Array(readFileSync(PDF)), useSystemFonts: true, verbosity: 0,
  }).promise;

  // ── Relever ─────────────────────────────────────────────────────────
  const releve = new Map();   // nom normalisé -> Map(hex -> occurrences)
  const graphies = new Map(); // nom normalisé -> graphie du catalogue
  for (let i = 1; i <= doc.numPages; i += 1) {
    for (const c of await colorisDe(await doc.getPage(i))) {
      const k = nu(c.nom);
      if (!k) continue;
      if (!releve.has(k)) { releve.set(k, new Map()); graphies.set(k, c.nom); }
      const m = releve.get(k);
      m.set(c.hex, (m.get(c.hex) || 0) + 1);
    }
  }

  // Un nom qui change de couleur d'une page à l'autre n'est pas un coloris :
  // on garde la valeur dominante, et on écarte si elle ne l'emporte pas.
  const coloris = new Map();
  const douteux = [];
  for (const [k, m] of releve) {
    const tri = [...m].sort((a, b) => b[1] - a[1]);
    const total = tri.reduce((n, [, c]) => n + c, 0);
    if (tri[0][1] / total < 0.6) { douteux.push(`${graphies.get(k)} — ${tri.length} couleurs`); continue; }
    coloris.set(k, { hex: tri[0][0], graphie: graphies.get(k), vues: total });
  }
  console.log(`   ${coloris.size} coloris relevés sur ${doc.numPages} pages`
    + (douteux.length ? ` · ${douteux.length} écarté(s) pour incohérence` : ""));

  // ── Apparier ────────────────────────────────────────────────────────
  const cibles = await prisma.valeurChoix.findMany({
    where: {
      choix: { nature: "finition", vitrine: { gamme: { marque: { nom: "OfficePro" } } } },
      couleur: null, imageUrl: null, modeleId: null,
    },
    select: { id: true, libelle: true },
  });

  const parLibelle = new Map();
  for (const v of cibles) {
    if (!parLibelle.has(v.libelle)) parLibelle.set(v.libelle, []);
    parLibelle.get(v.libelle).push(v.id);
  }

  const plan = [];
  const sans = [];
  for (const [libelle, ids] of parLibelle) {
    const k = nu(libelle);
    // Exact, puis par inclusion des mots : « MENTHE » retrouve « Vert menthe ».
    let trouve = coloris.get(k);
    if (!trouve) {
      const candidats = [...coloris.entries()].filter(([c]) => {
        const mots = k.split(" ");
        return mots.every((m) => c.split(" ").includes(m));
      });
      // Une seule correspondance, sinon on ne tranche pas.
      if (candidats.length === 1) [, trouve] = candidats[0];
      else if (candidats.length > 1) { sans.push(`${libelle} — ${candidats.length} correspondances`); continue; }
    }
    if (!trouve) { sans.push(`${libelle} — absent du catalogue`); continue; }
    plan.push({ libelle, ids, ...trouve });
  }

  titre("CE QUI SERAIT ÉCRIT");
  console.log("");
  for (const p of plan.sort((a, b) => b.ids.length - a.ids.length)) {
    console.log(`   ${p.hex}  ${p.libelle.padEnd(20)} ${String(p.ids.length).padStart(3)} finition(s)  ← « ${p.graphie} » (vu ${p.vues}×)`);
  }
  console.log(`\n   ${plan.length} coloris · ${plan.reduce((n, p) => n + p.ids.length, 0)} finitions`);

  if (sans.length) {
    titre("LAISSÉS SANS PASTILLE");
    console.log("");
    for (const s of sans) console.log(`   ${s}`);
  }
  if (douteux.length) {
    titre("RELEVÉS ÉCARTÉS");
    console.log("");
    for (const d of douteux.slice(0, 12)) console.log(`   ${d}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let n = 0;
  for (const p of plan) {
    const r = await prisma.valeurChoix.updateMany({
      where: { id: { in: p.ids } }, data: { couleur: p.hex },
    });
    n += r.count;
  }
  console.log(`   ${n} finition(s) peinte(s)`);

  titre("CONTRÔLE");
  const reste = await prisma.valeurChoix.count({
    where: {
      choix: { nature: "finition", vitrine: { gamme: { marque: { nom: "OfficePro" } } } },
      couleur: null, imageUrl: null, modeleId: null,
    },
  });
  console.log(`   finitions OfficePro encore sans pastille : ${reste}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
