// Donne leur pastille aux quarante-huit teintes Sokoa qui n'en avaient pas,
// en les découpant dans le nuancier fournisseur.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/pastilles-sokoa.mjs
//   node prisma/pastilles-sokoa.mjs --appliquer
//
// D'OÙ VIENNENT LES PASTILLES
//   catalogue-2026/Sokoa_Nuancier_2026.pdf. Ses libellés sont des tracés
//   vectoriels, pas du texte : rien ne s'en extrait. Les pastilles, elles,
//   sont des images posées à des coordonnées connues. On rend donc la page,
//   on découpe au rectangle, et l'appariement se fait par la table ci-dessous,
//   établie en regardant les pages une à une.
//
// POURQUOI UNE IMAGE ET PAS SEULEMENT UNE COULEUR
//   Un tissu ne se résume pas à un aplat : le Spazio est gaufré, le Bouclé
//   est bouclé, le Runner est piqué. La couleur dominante est calculée en
//   plus, pour les affichages qui n'ont pas la place d'une vignette.
//
// LA GARDE
//   Le script vérifie que chaque teinte visée existe, qu'elle est bien sans
//   pastille, et qu'elle n'en reçoit qu'une. Il refuse d'écrire si un seul
//   appariement manque : mieux vaut zéro pastille que la mauvaise.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

const PAGES = ".tmp-nuancier/pages";
const PLACES = ".tmp-nuancier/places.json";
const ECHELLE = 2;   // les pages ont été rendues à 2×

// Les pastilles du nuancier dont nous avons besoin, relevées page par page.
// L'index est celui des rectangles de la page, dédoublonnés puis lus par
// rangée : une même image y est parfois peinte deux fois.
const NUANCIER = {
  // page 4 — C BLEND
  BLV: { page: 4, i: 15, nom: "Vert" },
  BLJ: { page: 4, i: 16, nom: "Jaune" },
  BLC: { page: 4, i: 17, nom: "Corail" },
  BLG: { page: 4, i: 18, nom: "Gris" },
  BLT: { page: 4, i: 19, nom: "Terracotta" },
  BLZ: { page: 4, i: 20, nom: "Bronze" },
  BLX: { page: 4, i: 21, nom: "Bordeaux" },
  BLN: { page: 4, i: 22, nom: "Nuit" },
  // page 5 — C SPAZIO puis C BOUCLE F.R.
  SPJ: { page: 5, i: 0, nom: "Jaune" },
  SPL: { page: 5, i: 1, nom: "Blanc" },
  SPV: { page: 5, i: 2, nom: "Canard" },
  SPG: { page: 5, i: 3, nom: "Orange" },
  SPT: { page: 5, i: 4, nom: "Taupe" },
  SPR: { page: 5, i: 5, nom: "Rose" },
  BCC: { page: 5, i: 6, nom: "Crème" },
  BCT: { page: 5, i: 7, nom: "Taupe" },
  BCM: { page: 5, i: 8, nom: "Noisette" },
  BCJ: { page: 5, i: 9, nom: "Jaune" },
  BCB: { page: 5, i: 10, nom: "Brique" },
  BCV: { page: 5, i: 11, nom: "Olive" },
  // page 6 — D GRAIN
  GRB: { page: 6, i: 9, nom: "Blanc gris" },
  GRG: { page: 6, i: 10, nom: "Gris" },
  GRL: { page: 6, i: 11, nom: "Lin" },
  GRJ: { page: 6, i: 12, nom: "Jaune" },
  GRC: { page: 6, i: 13, nom: "Corail" },
  GRT: { page: 6, i: 14, nom: "Terracotta" },
  GRV: { page: 6, i: 15, nom: "Vert" },
  GRN: { page: 6, i: 16, nom: "Nuit" },
  // page 7 — B NAPEL, E CUIR, H CUIR, puis C RUNNER
  NN0: { page: 7, i: 0, nom: "Noir" },
  CN0: { page: 7, i: 1, nom: "Noir" },
  CCR: { page: 7, i: 2, nom: "Blanc crème" },
  CTA: { page: 7, i: 3, nom: "Taupe" },
  CCA: { page: 7, i: 4, nom: "Caramel" },
  CHL: { page: 7, i: 5, nom: "Chocolat" },
  R4E: { page: 7, i: 6, nom: "Beige" },
  R4G: { page: 7, i: 7, nom: "Gris foncé" },
  R4N: { page: 7, i: 8, nom: "Noir" },
  R4Q: { page: 7, i: 9, nom: "Gris moyen" },
  R4T: { page: 7, i: 10, nom: "Terre" },
  R4V: { page: 7, i: 11, nom: "Vert" },
  R4W: { page: 7, i: 12, nom: "Bleu" },
};

// Les gammes dont les teintes portent un nom de couleur et non un code : on
// les apparie dans l'ordre, celui du nuancier comme celui de la base.
const PAR_RANG = {
  Blend: ["BLV", "BLJ", "BLC", "BLG", "BLT", "BLZ", "BLX", "BLN"],
  "Bouclé F.R.": ["BCC", "BCT", "BCM", "BCJ", "BCB", "BCV"],
  Grain: ["GRB", "GRG", "GRL", "GRJ", "GRC", "GRT", "GRV", "GRN"],
  Runner: ["R4E", "R4G", "R4N", "R4Q", "R4T", "R4V", "R4W"],
  Spazio: ["SPJ", "SPL", "SPV", "SPG", "SPT", "SPR"],
};

/** Les rectangles d'une page, dédoublonnés et lus par rangée. */
function rectanglesDe(places, page) {
  const p = places.find((x) => x.page === page);
  const vus = new Set();
  const out = [];
  for (const im of p.images.filter((x) => x.l > 20)) {
    const k = `${im.x},${im.y}`;
    if (vus.has(k)) continue;
    vus.add(k);
    out.push(im);
  }
  return out;
}

const hex = ({ r, g, b }) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

async function envoyer(buffer, nom) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("Cloudinary n'est pas configuré.");
  const fd = new FormData();
  fd.append("file", new Blob([buffer], { type: "image/png" }), `${nom}.png`);
  fd.append("upload_preset", preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Cloudinary a refusé (${res.status})`);
  return data.secure_url;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  if (!existsSync(PLACES)) {
    console.error("Les pages du nuancier ne sont pas préparées (.tmp-nuancier).");
    process.exitCode = 1;
    return;
  }
  const places = JSON.parse(readFileSync(PLACES, "utf8"));

  const palettes = await prisma.paletteFinition.findMany({
    where: { marque: "Sokoa" },
    select: {
      nom: true,
      finitions: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, couleur: true, imageUrl: true } },
    },
  });

  // ── Apparier ────────────────────────────────────────────────────────
  const plan = [];
  const orphelines = [];
  for (const pal of palettes) {
    const sans = pal.finitions.filter((f) => !f.couleur && !f.imageUrl);
    if (!sans.length) continue;
    const rangs = PAR_RANG[pal.nom];
    sans.forEach((f, rang) => {
      // Une teinte dont le libellé porte un code du nuancier — « R4E — Beige »,
      // « B NN0 — Napel » — s'apparie par ce code, jamais par son rang : la
      // base et le nuancier ne les rangent pas dans le même ordre.
      const code = Object.keys(NUANCIER).find((c) => new RegExp(`\\b${c}\\b`).test(f.nom));
      const retenu = code || (rangs ? rangs[rang] : null);
      if (!retenu || !NUANCIER[retenu]) { orphelines.push(`${pal.nom} › ${f.nom}`); return; }
      plan.push({ palette: pal.nom, id: f.id, libelle: f.nom, code: retenu, ...NUANCIER[retenu] });
    });
  }

  if (orphelines.length) {
    titre("SANS CORRESPONDANCE — RIEN NE SERA ÉCRIT");
    for (const o of orphelines) console.log(`   ${o}`);
    console.log("\n   Mieux vaut zéro pastille que la mauvaise.");
    process.exitCode = 1;
    return;
  }

  // ── Découper et mesurer ─────────────────────────────────────────────
  const parPage = new Map();
  for (const p of plan) {
    if (!parPage.has(p.page)) parPage.set(p.page, rectanglesDe(places, p.page));
  }

  const vignettes = [];
  for (const p of plan) {
    const r = parPage.get(p.page)[p.i];
    if (!r) throw new Error(`${p.code} : rectangle ${p.i} absent de la page ${p.page}`);
    const src = `${PAGES}/p${String(p.page).padStart(2, "0")}.png`;
    // On rogne de six pour cent : les pastilles du PDF ont un filet clair sur
    // leur bord, qui tirerait la couleur dominante vers le blanc.
    const marge = Math.round(r.l * ECHELLE * 0.06);
    const buf = await sharp(src).extract({
      left: Math.round(r.x * ECHELLE) + marge,
      top: Math.round(r.y * ECHELLE) + marge,
      width: Math.round(r.l * ECHELLE) - 2 * marge,
      height: Math.round(r.h * ECHELLE) - 2 * marge,
    }).resize(256, 256, { fit: "cover" }).png().toBuffer();

    // La moyenne, et non la couleur dominante : celle-ci est quantifiée sur
    // un histogramme grossier et tire vers le sombre — le Spazio blanc en
    // ressortait gris. Le tissu est d'une seule teinte sous sa texture, la
    // moyenne le représente mieux.
    const { channels } = await sharp(buf).stats();
    p.couleur = hex({
      r: Math.round(channels[0].mean),
      g: Math.round(channels[1].mean),
      b: Math.round(channels[2].mean),
    });
    p.image = buf;
    vignettes.push(p);
  }

  titre("CE QUI SERAIT ÉCRIT");
  let palette = null;
  for (const p of plan) {
    if (p.palette !== palette) { console.log(`\n   ${p.palette}`); palette = p.palette; }
    console.log(`      ${p.couleur}  ${p.libelle.padEnd(22)} ← ${p.code.padEnd(4)} ${p.nom} (p${p.page})`);
  }
  console.log(`\n   ${plan.length} pastille(s)`);

  // Une planche pour vérifier l'appariement à l'œil avant d'écrire.
  const CASE = 130;
  const COLS = 8;
  const calques = [];
  for (let i = 0; i < vignettes.length; i += 1) {
    const v = vignettes[i];
    const x = (i % COLS) * CASE;
    const y = Math.floor(i / COLS) * (CASE + 30);
    calques.push({ input: await sharp(v.image).resize(CASE - 10, CASE - 10).png().toBuffer(), left: x + 5, top: y + 5 });
    const etiquette = `${v.palette} · ${v.libelle}`.replace(/&/g, "&amp;").slice(0, 26);
    calques.push({
      input: Buffer.from(`<svg width="${CASE}" height="28"><text x="4" y="11" font-family="sans-serif" font-size="9" fill="#111">${etiquette}</text><text x="4" y="23" font-family="sans-serif" font-size="9" fill="#777">${v.code} · ${v.couleur}</text></svg>`),
      left: x, top: y + CASE,
    });
  }
  const sortie = ".tmp-nuancier/verification.png";
  await sharp({ create: { width: COLS * CASE, height: Math.ceil(vignettes.length / COLS) * (CASE + 30), channels: 3, background: "#fff" } })
    .composite(calques).png().toFile(sortie);
  console.log(`\n   planche de vérification : ${sortie}`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plan) {
    const url = await envoyer(p.image, `sokoa-${p.code.toLowerCase()}`);
    await prisma.finitionModele.update({
      where: { id: p.id },
      data: { couleur: p.couleur, imageUrl: url },
    });
    process.stdout.write(`${p.code} `);
  }
  console.log(`\n   ${plan.length} pastille(s) écrite(s)`);

  titre("CONTRÔLE");
  const reste = await prisma.finitionModele.count({
    where: { couleur: null, imageUrl: null },
  });
  console.log(`   teintes de la bibliothèque encore sans pastille : ${reste}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
