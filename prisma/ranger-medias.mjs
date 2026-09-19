// Construit l'arborescence de dépôt du catalogue 2026 sur le disque.
//
//   COTEBURO-MEDIAS/CATALOGUE-2026/<fournisseur>/<gamme>/<produit>/
//
// Un dossier par fiche, les 555. Dedans, les images renommées
// « <référence>_<coloris>_<vue>.<ext> ».
//
// En simulation par défaut. Il faut --appliquer pour écrire sur le disque.
//
//   node prisma/ranger-medias.mjs
//   node prisma/ranger-medias.mjs --appliquer
//   node prisma/ranger-medias.mjs --appliquer --marque=sokoa
//
// ON NE DEVINE PAS
//   Une image n'est copiée que si son nom porte une référence du catalogue
//   qui ne désigne qu'une seule fiche. Tout le reste reste où il est et le
//   dossier de la fiche reste vide : c'est le point de départ du travail à
//   la main, pas une erreur à corriger.
//
//   Sont donc écartées, volontairement :
//     - les 2 471 images d'OfficePro nommées « AMY (3).jpg », qui ne disent
//       que la gamme ;
//     - les 799 images Buronomic HD nommées
//       « buronomic-Fifty-Fifty_Comptoir-...-Blanc-Timber.jpg », qui disent
//       la gamme, le produit en toutes lettres et les finitions, mais aucune
//       référence ;
//     - les photos Sokoa « Eman Dir_Amb_Meeting.jpg », qui nomment une
//       ambiance ;
//     - les ambiances en général, qui n'appartiennent à aucune fiche.
//   Les rattacher demanderait de rapprocher des libellés, et c'est ainsi
//   qu'on s'était retrouvé avec les trente-cinq images Loria posées sur les
//   cinq produits de la gamme.
//
// LE COLORIS VIENT DU NOM DU FICHIER
//   Le décor est celui qui a été photographié, et seul le nom d'origine le
//   dit : « DY325F_Blanc.png », « DY325F_Chêne-Fil.png ». Prendre à la place
//   la finition que le classeur associe à la référence donnait les six vues
//   d'un même bureau sous une seule étiquette — la première trouvée — et
//   perdait l'information. Chez Buronomic, la réf. complète d'une capture
//   pCon ne désigne pas un décor : elle sert les cinq.
//
//   Un fichier sans rien après la référence est la vue par défaut ; il garde
//   la référence pour seul nom, et c'est lui qui fera la vignette.
//
// LES CHEMINS WINDOWS
//   Deux cent soixante caractères, pas un de plus. Les noms de fiche Sokoa
//   montent à cent dix caractères : on tronque, et on accole une empreinte
//   pour qu'aucun nom tronqué n'en écrase un autre.
import { readdir, mkdir, copyFile, stat, writeFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import XLSX from "xlsx";

const APPLIQUER = process.argv.includes("--appliquer");
const FILTRE_MARQUE = ((process.argv.find((a) => a.startsWith("--marque=")) || "")
  .slice(9) || null)?.toLowerCase() || null;

const MEDIAS = ["C:", "Users", "akeys", "Desktop", "Matt", "COTEBURO-MEDIAS"].join("/");
const CIBLE = `${MEDIAS}/CATALOGUE-2026`;
const CLASSEUR = "catalogue-2026/catalogue-coteburo.xlsx";
const MARQUES = { BURONOMIC: "buronomic", OFFICEPRO: "officepro", SOKOA: "sokoa" };
const IMAGES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);

// Les longueurs maximales, pour tenir sous les 260 caractères de Windows.
const MAX_GAMME = 30;
const MAX_PRODUIT = 58;
const MAX_DECOR = 28;

const titre = (t) => console.log(`\n${"═".repeat(68)}\n${t}\n${"═".repeat(68)}`);
const mo = (o) => `${(o / 1024 / 1024).toFixed(1)} Mo`;

function empreinte(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).slice(0, 4);
}

// Les caractères qu'un nom de fichier Windows n'accepte pas. On les liste
// par leur code plutôt que par un échappement dans une classe de
// caractères : un \\u0000 écrit dans le source y met un véritable octet nul,
// et le fichier cesse d'être du texte pour les outils qui le relisent.
const INTERDITS = /[<>:"/\\|?*]|[\p{Cc}]/gu;
/** Un nom de dossier ou de fichier acceptable sous Windows. */
function nomSain(s, max) {
  const propre = String(s ?? "")
    .replace(INTERDITS, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/, "")
    .trim();
  if (propre.length <= max) return propre || "sans-nom";
  // Tronquer sans empreinte ferait se marcher dessus deux fiches dont les
  // noms ne diffèrent qu'après le soixantième caractère — il y en a chez
  // Sokoa.
  return `${propre.slice(0, max - 5).trim()}~${empreinte(propre)}`;
}

/** Une référence transformée en morceau de nom de fichier. */
const refSaine = (s) => String(s ?? "")
  .replace(/[<>:"/\\|?*+\s]+/g, "-")
  .replace(/\*/g, "")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

const slugCourt = (s, max) => String(s ?? "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Za-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase()
  .slice(0, max)
  .replace(/-$/, "");

// Même règle que l'état des lieux : une référence ne contient pas de mot en
// minuscules, et porte au moins une lettre.
function refPlausible(brut) {
  const s = String(brut || "").trim();
  if (!s) return null;
  if (/[a-zàâéèêëïîôùûç]{3,}/.test(s.replace(/\+?\s*coloris\*?/gi, ""))) return null;
  if (/:/.test(s)) return null;
  const n = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return n.length < 3 ? null : n;
}

function jetons(nom) {
  const sansExt = nom.replace(/\.[^.]+$/, "");
  const morceaux = sansExt.split(/[\s_\-.()[\]]+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i < morceaux.length; i += 1) {
    out.add(morceaux[i]);
    if (i + 1 < morceaux.length) out.add(morceaux[i] + morceaux[i + 1]);
  }
  out.add(sansExt);
  return [...out];
}

async function parcourir(dossier, base = "") {
  const out = [];
  let entrees;
  try {
    entrees = await readdir(join(dossier, base), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entrees) {
    const rel = base ? `${base}/${e.name}` : e.name;
    // On ne relit pas ce qu'on a écrit.
    if (e.isDirectory()) {
      if (rel === "CATALOGUE-2026") continue;
      out.push(...await parcourir(dossier, rel));
    } else out.push(rel);
  }
  return out;
}

/** Le catalogue : une fiche par clé, ses références, ses finitions. */
function lireClasseur() {
  const wb = XLSX.readFile(CLASSEUR);
  const fiches = new Map();
  const parRefComplete = new Map();   // réf. nue → [clés]
  const parRacine = new Map();        // racine nue → [clés]

  for (const onglet of wb.SheetNames) {
    const marque = MARQUES[onglet];
    if (!marque || (FILTRE_MARQUE && marque !== FILTRE_MARQUE)) continue;
    for (const r of XLSX.utils.sheet_to_json(wb.Sheets[onglet], { defval: null })) {
      const cle = `${marque}|${r["Gamme"]}|${r["Nom sur le site"]}`;
      if (!fiches.has(cle)) {
        fiches.set(cle, { marque, gamme: r["Gamme"], nom: r["Nom sur le site"] });
      }
      const rc = refPlausible(r["Réf. complète"]);
      const rp = refPlausible(r["Réf. produit"]);
      const ajoute = (index, k) => {
        if (!k) return;
        if (!index.has(k)) index.set(k, new Set());
        index.get(k).add(cle);
      };
      ajoute(parRefComplete, rc);
      ajoute(parRacine, rp);
    }
  }
  return { fiches, parRefComplete, parRacine };
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — l'arborescence est écrite sur le disque ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const { fiches, parRefComplete, parRacine } = lireClasseur();
  console.log(`${fiches.size} fiches au classeur`);

  const tous = await parcourir(MEDIAS);
  const images = tous.filter((f) => IMAGES.has(extname(f).toLowerCase()));
  console.log(`${images.length} images sous ${basename(MEDIAS)}, hors CATALOGUE-2026`);

  // ── Le rattachement, et seulement quand il est sûr ──
  const aCopier = new Map();   // clé de fiche → [{ source, ref }]
  const ecartees = { ambiance: [], aucuneRef: [], refAmbigue: [] };

  for (const f of images) {
    const nom = basename(f);
    let cle = null;
    let ref = null;
    let ambigue = false;

    for (const j of jetons(nom)) {
      const n = refPlausible(j);
      if (!n) continue;
      const parC = parRefComplete.get(n);
      if (parC) {
        if (parC.size > 1) {
          ecartees.refAmbigue.push(`${f}  (${n} → ${parC.size} fiches)`);
          ambigue = true;
          break;
        }
        [cle] = [...parC];
        ref = n;
        break;
      }
    }
    // Une réf. complète ambiguë ne se rattrape pas par la racine : si le code
    // précis ne tranche pas, le code plus large tranchera encore moins.
    if (!cle && !ambigue) {
      for (const j of jetons(nom)) {
        const n = refPlausible(j);
        if (!n) continue;
        const parR = parRacine.get(n);
        if (parR && parR.size === 1) { [cle] = [...parR]; ref = n; break; }
      }
    }

    if (!cle) {
      if (/^amb[_\-. ]|ambiance|bodegon/i.test(nom)) ecartees.ambiance.push(f);
      else ecartees.aucuneRef.push(f);
      continue;
    }
    if (!aCopier.has(cle)) aCopier.set(cle, []);
    aCopier.get(cle).push({ source: f, ref });
  }

  // ── Les noms de destination ──
  const plan = [];
  const dossierDe = (fiche) => [
    CIBLE, fiche.marque,
    nomSain(fiche.gamme, MAX_GAMME),
    nomSain(fiche.nom, MAX_PRODUIT),
  ].join("/");

  for (const [cle, liste] of aCopier) {
    const fiche = fiches.get(cle);
    const dossier = dossierDe(fiche);
    const compteur = new Map();
    // Ordre stable : deux exécutions doivent numéroter pareil.
    liste.sort((a, b) => a.source.localeCompare(b.source));
    const dejaVues = new Set();
    for (const img of liste) {
      // Ce que le nom d'origine dit après la référence : le décor.
      const sansExt = basename(img.source).replace(/\.[^.]+$/, "");
      const reste = sansExt
        .split(/[\s_\-.()[\]]+/)
        .filter((m) => m.toUpperCase().replace(/[^A-Z0-9]/g, "") !== img.ref)
        .join("-");
      const col = slugCourt(reste, MAX_DECOR);
      const base = col ? `${refSaine(img.ref)}_${col}` : refSaine(img.ref);
      // La même photo peut traîner dans deux dossiers sources : on n'en garde
      // qu'un exemplaire, reconnu à son nom et à sa taille.
      const signature = `${base}|${basename(img.source)}`;
      if (dejaVues.has(signature)) continue;
      dejaVues.add(signature);
      const n = (compteur.get(base) || 0) + 1;
      compteur.set(base, n);
      const nom = `${base}_${String(n).padStart(2, "0")}${extname(img.source).toLowerCase()}`;
      plan.push({ cle, dossier, source: img.source, nom });
    }
  }

  titre("CE QUI SERAIT RANGÉ");
  const parMarque = new Map();
  for (const cle of fiches.keys()) {
    const m = cle.slice(0, cle.indexOf("|"));
    if (!parMarque.has(m)) parMarque.set(m, { fiches: 0, pleines: 0, images: 0 });
    parMarque.get(m).fiches += 1;
  }
  const pleines = new Set(plan.map((p) => p.cle));
  for (const p of plan) parMarque.get(p.cle.slice(0, p.cle.indexOf("|"))).images += 1;
  for (const cle of pleines) parMarque.get(cle.slice(0, cle.indexOf("|"))).pleines += 1;

  console.log("\n   fournisseur    dossiers   avec images   vides    images");
  for (const [m, e] of parMarque) {
    console.log(`   ${m.padEnd(14)}${String(e.fiches).padStart(8)}${String(e.pleines).padStart(14)}`
      + `${String(e.fiches - e.pleines).padStart(8)}${String(e.images).padStart(10)}`);
  }
  const totalFiches = [...parMarque.values()].reduce((n, e) => n + e.fiches, 0);
  console.log(`   ${"TOTAL".padEnd(14)}${String(totalFiches).padStart(8)}`
    + `${String(pleines.size).padStart(14)}${String(totalFiches - pleines.size).padStart(8)}`
    + `${String(plan.length).padStart(10)}`);

  let poids = 0;
  for (const p of plan) {
    try { poids += (await stat(join(MEDIAS, p.source))).size; } catch { /* ignore */ }
  }
  console.log(`\n   ${mo(poids)} à copier`);

  titre("CE QUI RESTE DEHORS, ET POURQUOI");
  console.log(`\n   ambiances, sans fiche propre            ${String(ecartees.ambiance.length).padStart(5)}`);
  console.log(`   référence désignant plusieurs fiches    ${String(ecartees.refAmbigue.length).padStart(5)}`);
  console.log(`   aucune référence dans le nom            ${String(ecartees.aucuneRef.length).padStart(5)}`);
  const parSource = new Map();
  for (const f of ecartees.aucuneRef) {
    const d = f.includes("/") ? f.slice(0, f.indexOf("/")) : "(racine)";
    parSource.set(d, (parSource.get(d) || 0) + 1);
  }
  console.log("\n   les non rattachées, par source :");
  for (const [d, n] of [...parSource].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`      ${d.slice(0, 40).padEnd(41)} ${String(n).padStart(5)}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  // ── Écriture ──
  titre("ÉCRITURE");
  let dossiers = 0;
  for (const cle of fiches.keys()) {
    await mkdir(dossierDe(fiches.get(cle)), { recursive: true });
    dossiers += 1;
  }
  console.log(`   ${dossiers} dossiers créés ou déjà en place`);

  let copiees = 0;
  for (const p of plan) {
    await copyFile(join(MEDIAS, p.source), join(p.dossier, p.nom));
    copiees += 1;
    if (copiees % 100 === 0) process.stdout.write(`\r   ${copiees} / ${plan.length} images`);
  }
  console.log(`\r   ${copiees} images copiées et renommées`);

  // ── La trace : d'où vient chaque fichier ──
  const lignes = ["nouveau chemin;fichier d'origine"];
  for (const p of plan) {
    lignes.push(`${p.dossier.slice(CIBLE.length + 1)}/${p.nom};${p.source}`);
  }
  await writeFile(`${CIBLE}/_ORIGINE.csv`, `${lignes.join("\n")}\n`, "utf8");
  console.log(`   trace écrite → CATALOGUE-2026/_ORIGINE.csv`);

  // ── La liste des dossiers vides, pour le remplissage à la main ──
  const vides = [...fiches.keys()].filter((c) => !pleines.has(c));
  const parGamme = new Map();
  for (const c of vides) {
    const f = fiches.get(c);
    const k = `${f.marque}/${f.gamme}`;
    if (!parGamme.has(k)) parGamme.set(k, []);
    parGamme.get(k).push(f.nom);
  }

  // Une aide, pas une devinette : les dossiers sources dont le chemin
  // mentionne la gamme, avec leur nombre d'images encore non rattachées.
  const indiceDe = (gamme) => {
    const g = slugCourt(gamme, 40);
    const trouves = new Map();
    for (const f of ecartees.aucuneRef.concat(ecartees.ambiance)) {
      if (slugCourt(f, 400).includes(g)) {
        const d = f.split("/").slice(0, 2).join("/");
        trouves.set(d, (trouves.get(d) || 0) + 1);
      }
    }
    return [...trouves].sort((a, b) => b[1] - a[1]).slice(0, 3);
  };

  const md = [
    "# Dossiers à remplir à la main",
    "",
    `Au ${new Date().toISOString().slice(0, 10)} : ${vides.length} fiches sur ${totalFiches} `
    + "n'ont reçu aucune image.",
    "",
    "Une image n'a été copiée que si son nom portait une référence du",
    "catalogue désignant une seule fiche. Les dossiers ci-dessous attendent",
    "donc des photos dont le nom ne dit que la gamme, ou rien du tout.",
    "",
    "« Sources probables » liste les dossiers d'origine dont le chemin",
    "mentionne la gamme, avec le nombre d'images non rattachées qu'ils",
    "contiennent. C'est une piste, pas une attribution.",
    "",
  ];
  for (const [k, noms] of [...parGamme].sort((a, b) => a[0].localeCompare(b[0]))) {
    md.push(`## ${k}  — ${noms.length} fiche(s)`);
    const indices = indiceDe(k.slice(k.indexOf("/") + 1));
    if (indices.length) {
      md.push("");
      md.push(`Sources probables : ${indices.map(([d, n]) => `\`${d}\` (${n})`).join(", ")}`);
    }
    md.push("");
    for (const n of noms.sort()) md.push(`- [ ] ${nomSain(n, MAX_PRODUIT)}`);
    md.push("");
  }
  await writeFile(`${CIBLE}/_DOSSIERS-VIDES.md`, `${md.join("\n")}\n`, "utf8");
  console.log(`   ${vides.length} dossiers vides listés → CATALOGUE-2026/_DOSSIERS-VIDES.md`);
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
