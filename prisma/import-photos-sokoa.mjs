import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Import des photos Sokoa vers Cloudinary, puis rattachement aux fiches.
//
// Les fichiers portent la référence du produit en préfixe : Klik_KLA00
// désigne la chaise à pieds métal, Rhune_RUZ10 le canapé trois places.
// C'est cette référence qui permet le rattachement automatique.
//
// Le nettoyage du catalogue avait posé sur chaque fiche le jeu complet
// des photos de sa gamme — les 35 images Loria sur les cinq produits.
// Ce script remplace cet à-peu-près par les bonnes images.
//
// Les dossiers contiennent aussi des références non importées (chauffeuses
// Klik, Tertio collaboratifs). Elles sont ignorées : aucune fiche à
// alimenter.

const APPLIQUER = process.argv.includes("--appliquer");

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const RACINE = "C:\\Users\\akeys\\Desktop\\Matt\\COTEBURO-MEDIAS\\Sokoa\\fichiers_sokoa";

// Pour chaque produit : le dossier, les fragments de nom qui identifient
// ses photos, et ceux qui servent d'ambiance. La première correspondance
// devient la vignette.
//
// « refs » cherche une sous-chaîne dans le nom de fichier, sans tenir
// compte de la casse. L'ordre compte : il fixe l'ordre de la galerie.
const PRODUITS = [
  // ───────────────────────── ADELA ─────────────────────────
  {
    nom: "Chaise tapissée - Adela",
    dossier: "ADELA",
    refs: ["ALA00", "ALA10", "ALE00", "ALE10", "ALG00", "ALJ10"],
    ambiances: ["Amb hôtel", "ambiance salle de conférence"],
  },
  {
    nom: "Chaise assise tapissée dos résille - Adela",
    dossier: "ADELA",
    refs: ["ALB00", "ALB10", "ALF00", "ALF10", "ALH00", "ALK10"],
    ambiances: ["Amb coworking"],
  },
  {
    nom: "Chaise assise tapissée dos polypropylène - Adela",
    dossier: "ADELA",
    refs: ["ALB00", "ALB10", "ALF00", "ALF10"],
    ambiances: ["ADELA_Amb bureau de direction"],
  },
  {
    nom: "Chaise tout polypropylène - Adela",
    dossier: "ADELA",
    refs: ["ALA00", "ALA10", "ALE00", "ALE10"],
    ambiances: ["Ambiance_Poutres"],
  },

  // ───────────────────────── ARCHIKIT ─────────────────────────
  // Pas de référence dans les noms : le dossier n'existe pas.
  // Les rayonnages gardent les photos posées au nettoyage.

  // ───────────────────────── AZKAR ─────────────────────────
  {
    nom: "Fauteuil de direction - Azkar",
    dossier: "AZKAR",
    refs: ["AK77055", "AK77051", "AK77050", "AK76055", "AK76051", "AK76050",
           "zoom_ têtière", "zoom_ réglages", "zoom_mécanisme", "zoom_poche rangement"],
    ambiances: ["Amb direction", "Amb salle de contrôle"],
  },

  // ───────────────────────── BATBI ─────────────────────────
  {
    nom: "Chauffeuse 1 place - Batbi",
    dossier: "BATBI",
    refs: ["BBX00", "BBX0000", "BBX0001", "Anse cuir", "Zip séparation", "Repose-pieds", "Empilabilité"],
    ambiances: ["Amb_Relaxation1", "Amb_Coworking", "Amb_Bibliothèque", "Amb_Salle de repos"],
  },

  // ───────────────────────── BERO ─────────────────────────
  {
    nom: "Siège coque bois - Bero",
    dossier: "BERO",
    refs: ["ER05031", "ER05030", "ER05071", "ER05070",
           "Quadricolore", "Tricolore", "Bicolore", "Monocolore", "Basculant", "Bois"],
    ambiances: ["Amb_Réunion", "Amb_Coworking", "Amb_Home office 02", "Amb_Hôtel"],
  },

  // ───────────────────────── EMAN ─────────────────────────
  // Déjà traité par import-photos-eman.mjs, on n'y touche pas.

  // ───────────────────────── EMEKI ─────────────────────────
  {
    nom: "Fauteuil, canapé et pouf - Emeki",
    dossier: "EMEKI",
    refs: ["EEX00", "EEY00", "EEP0000", "Echantillons tissus", "zoom face", "zoom dos"],
    ambiances: ["Amb lounge", "Ambiance bibliotheque", "Ambiance hall accueil", "Amb pause"],
  },

  // ───────────────────────── ILDO ─────────────────────────
  {
    nom: "Fauteuil lounge - Ildo",
    dossier: "ILDO",
    refs: ["DOA10", "DOB00", "DOC10", "DOD00", "DOB20",
           "Base plate aluminium poli", "Base plate noire",
           "Base pyramidale blanche", "Base pyramidale noire",
           "retour automatique", "Zoom_Couture", "Zoom_zip"],
    ambiances: ["Amb_Réception", "Amb_Détente", "Amb_Hôtel", "Amb_Bodegon"],
  },

  // ───────────────────────── KANPOA ─────────────────────────
  {
    nom: "Assise outdoor aluminium - Kanpoa",
    dossier: "KANPOA",
    refs: ["KPA04", "KPA14", "KPB02", "KPX12", "détail_bras", "faut_empil", "coloris"],
    ambiances: ["amb_chaise_moutarde", "amb_fauteuil", "amb_lounge_bleu", "amb_banc"],
  },
  {
    nom: "Table outdoor métal - Kanpoa",
    dossier: "KANPOA",
    refs: ["KPFC0", "KPFR0", "KPDC0", "KPDR0", "Tables_coloris", "KPFR_Moutarde"],
    ambiances: ["amb_tab_bleu", "amb_table_bdx", "amb_tab_noir"],
  },

  // ───────────────────────── KLIK ─────────────────────────
  {
    nom: "Chaise pieds métal - Klik",
    dossier: "KLIK",
    refs: ["Klik_KLA00", "Klik_KLB00", "Klik_KLC00",
           "1-Klik_KLA0", "2-Klik_KLA0", "3-Klik_KLA0", "4-Klik_KLA0", "5-Klik_KLA0",
           "6-Klik_KLB0", "7-Klik_KLB0", "8-Klik_KLA0"],
    ambiances: ["Amb_compo famille_metal", "Amb_réunion", "Amb_cafétéria"],
  },
  {
    nom: "Tabouret pieds métal - Klik",
    dossier: "KLIK",
    refs: ["Klik_KLH00", "Klik_KLHB0", "Klik_KLM00", "Klik_KLMB0",
           "13-Klik_KLH0", "14-Klik_KLH0", "Klik Metal_Tab"],
    ambiances: ["Amb_bureau", "Amb_restaurant"],
  },
  {
    nom: "Chaise pieds bois - Klik",
    dossier: "KLIK",
    refs: ["Klik_KBA00", "Klik_KBB00", "Klik_KBC00",
           "9-KlikB_KBA0", "10-KlikB_KBA0", "11-KlikB_KBB0", "12-KlikB_KBC0"],
    ambiances: ["Amb_compo famille_bois", "Amb_hôtel"],
  },
  {
    nom: "Tabouret pieds bois - Klik",
    dossier: "KLIK",
    refs: ["Klik_KBH00", "Klik_KBHB0", "Klik_KBM00", "Klik_KBMB0",
           "15-KlikB_KBH0", "16-KlikB_KBH0", "17-KlikB_KBH0", "Klik Bois_Tab"],
    ambiances: ["Amb_bibliothèque"],
  },
  {
    nom: "Chaise giratoire - Klik",
    dossier: "KLIK",
    refs: ["Klik_.KLJ00", "Klik_KLK00", "Klik_KLL00",
           "24-KlikG_KLJ0", "25-KlikG_KLJ0", "26-KlikG_KLK0", "27-KlikG_KLK0",
           "29-KlikG_KLK0", "30-KlikG_KLL0"],
    ambiances: ["Amb_Workspace1", "Amb_coworking"],
  },
  {
    nom: "Chaise giratoire haute - Klik",
    dossier: "KLIK",
    refs: ["Klik_KLJH0", "Klik_KLKH0", "Klik_KLLH0",
           "31-KlikGH_KLJH", "32-KlikGH_KLJH", "33-KlikGH_KLKH",
           "34-KlikGH_KLKH", "35-KlikGH_KLLH", "36-KlikGH_KLLH", "37-KlikGH_KLLH"],
    ambiances: ["Amb_Giratoires hauts"],
  },
  {
    nom: "Chaise étudiant - Klik",
    dossier: "KLIK",
    refs: ["Klik_KLRT0", "Klik_KLST0", "Klik_KLTT0",
           "Klik_KLJT0", "Klik_KLKT0", "Klik_KLLT0", "Klik étudiant PP dos"],
    ambiances: ["Amb Education_base compact", "Amb Education_base basique",
                "Amb_Etudiant panier PP", "Amb Education_Tablette écritoire"],
  },

  // ───────────────────────── KULBU ─────────────────────────
  {
    nom: "Pouf - Kulbu",
    dossier: "KULBU",
    refs: ["KUA0", "KUB0", "KUC0", "Kulbu zoom", "position OK"],
    ambiances: ["Amb_Bodegon 05", "ambiance 02", "ambiance 04", "ambiance 07"],
  },
  {
    nom: "Meuble de rangement et tableau blanc - Kulbu",
    dossier: "KULBU",
    refs: ["KUM6", "Meuble verso"],
    ambiances: ["ambiance 10", "ambiance 12"],
  },

  // ───────────────────────── LORIA ─────────────────────────
  {
    nom: "Chaise et fauteuil 4 pieds métal - Loria",
    dossier: "LORIA",
    refs: ["LCA00", "LCB00", "Loria_LOA10", "Loria_LOB10", "Loria_LOC10",
           "LCA001", "LCA004", "LCB004", "LCB007",
           "Chaise_Empilabilité", "Zoom coque chaise"],
    ambiances: ["Amb_Cafétéria_chaise métal", "Amb_Meeting", "Amb visiteur"],
  },
  {
    nom: "Chaise et fauteuil 4 pieds bois - Loria",
    dossier: "LORIA",
    refs: ["Loria_LCAB0", "Loria_LCBB0", "LCAB0B", "LCAB0P", "LCAB0T", "LCBB0A", "LCBB0B"],
    ambiances: ["Amb_Bois", "Amb attente_pieds bois", "Amb_Cafétéria_chaise bois"],
  },
  {
    nom: "Chaise et fauteuil 4 pieds polypropylène - Loria",
    dossier: "LORIA",
    refs: ["L0A101", "L0A10W", "Polypropylène", "Outdoor_Couleurs"],
    ambiances: ["Amb_outdoor", "Ambiance_Outdoor_2", "Ambiance_Outdoor_3", "Amb_Terrasse"],
  },
  {
    nom: "Chaise et fauteuil giratoire - Loria",
    dossier: "LORIA",
    refs: ["LCJ00", "LCK00", "Loria_LOJ10", "Loria_LOK10", "Loria_LOL10",
           "LCJ001", "LCJ007", "LCK001", "Zoom_Giratoire"],
    ambiances: ["Amb giratoire tapissé", "Amb coworking visio", "Amb_Patins"],
  },
  {
    nom: "Chaise haute et tabouret - Loria",
    dossier: "LORIA",
    refs: ["LCHA0", "LCHB0", "Loria_LOHA0", "Loria_LOHB0",
           "L0HA01", "L0HA04"],
    ambiances: ["Amb_Tabourets", "Amb_Restauration"],
  },

  // ───────────────────────── LUMA ─────────────────────────
  {
    nom: "Fauteuil visiteur - Luma",
    dossier: "LUMA",
    refs: ["LM050_noir", "LM050_gris", "LM950_RA", "Luma résille", "Luma basculant", "Luma accoudoirs"],
    ambiances: ["ambiance workspace", "ambiance manager"],
  },

  // ───────────────────────── LUZ ─────────────────────────
  {
    nom: "Siège de travail - Luz",
    dossier: "LUZ",
    refs: ["LU7615", "LU7617", "LU7610", "Luz_LU760"],
    ambiances: ["Amb_Coworking"],
  },

  // ───────────────────────── MAIKE ─────────────────────────
  {
    nom: "Chaise 4 pieds - Maike",
    dossier: "MAIKE",
    refs: ["KEA04", "KEA00"],
    ambiances: ["Amb_cafétéria 02", "Amb restaurant", "Amb_outdoor", "Amb_terrasse"],
  },
  {
    nom: "Tabouret 4 pieds - Maike",
    dossier: "MAIKE",
    refs: ["KEH00"],
    ambiances: ["Amb bar lounge", "Amb_conf"],
  },

  // ───────────────────────── PUNTA ─────────────────────────
  {
    nom: "Fauteuil et canapé - Punta",
    dossier: "Punta",
    refs: ["PNX10", "PNY10", "PNZ10", "PBX10", "PBY10", "PBZ10",
           "détail couture accoudoir", "détail couture assise",
           "lignes tendues", "piètement bois biseauté", "piètement tube carré"],
    ambiances: ["Amb_Direction", "Amb_Convivialité", "Amb_Bureau"],
  },
  {
    nom: "Table basse Punta",
    dossier: "Punta",
    refs: ["PNTC0", "PNTR0", "PBTC0", "PBTR0"],
    ambiances: [],
  },

  // ───────────────────────── RHUNE ─────────────────────────
  {
    nom: "Fauteuil - Rhune",
    dossier: "RHUNE",
    refs: ["RUX10", "RUXB0", "Détail coussin lombaire 01", "Détail couture"],
    ambiances: ["Amb studio", "amb_convivialité"],
  },
  {
    nom: "Canapé 2 places - Rhune",
    dossier: "RHUNE",
    refs: ["RUY10", "RUYB0", "RUYC0", "RUY1010_new électrification"],
    ambiances: ["Amb canapé", "amb_coworking"],
  },
  {
    nom: "Canapé 3 places - Rhune",
    dossier: "RHUNE",
    refs: ["RUZ10", "RUZB0", "RUZC0", "RU500", "Détail coussin lombaire 02"],
    ambiances: ["Amb détente", "amb_hotel"],
  },
  {
    nom: "Méridienne 2 places - Rhune",
    dossier: "RHUNE",
    refs: ["RUYD0", "RUYG0"],
    ambiances: ["Amb galerie"],
  },
  {
    nom: "Méridienne 3 places - Rhune",
    dossier: "RHUNE",
    refs: ["RUZD0", "RUZG0", "RUZE0", "RUZF0"],
    ambiances: ["amb_ convivialité2", "amb_hôtel_jaune et bleu"],
  },
  {
    nom: "Composition 3 places - Rhune",
    dossier: "RHUNE",
    refs: ["RUZM0", "RUZT0"],
    ambiances: ["amb_ convivialité3"],
  },
  {
    nom: "Banc - Rhune",
    dossier: "RHUNE",
    refs: ["RUQ00", "RUQD0", "RUQG0", "RUR00", "RURD0", "RURG0"],
    ambiances: ["Rhune_bodegon"],
  },
  {
    nom: "Table basse gigogne Rhune",
    dossier: "RHUNE",
    refs: ["LTAC0", "LTAR0"],
    ambiances: [],
  },
  {
    nom: "Coussin latéral cylindrique Rhune",
    dossier: "RHUNE",
    refs: ["RU500"],
    ambiances: [],
  },
  {
    nom: "Kit d'électrification Rhune",
    dossier: "RHUNE",
    refs: ["Caisson électrifié 01", "Caisson électrifié 02", "Zoom_Système élec"],
    ambiances: [],
  },

  // ───────────────────────── SIÈGES HAUTS ─────────────────────────
  {
    nom: "Chaise multimédia Tertio - Sièges Hauts",
    dossier: "TERTIO",
    refs: ["RT32020", "Tertio_RT32_gris", "Tertio T avec bras fixes",
           "Translation assise", "Réglage lombaire", "Base ergonomique"],
    ambiances: ["Amb_Ergonomie", "Amb_Coworking"],
  },
  {
    nom: "Chaise multimédia Alaia - Sièges Hauts",
    dossier: "ALAIA",
    refs: ["IA320", "IA350", "IA360", "IA550", "IA560"],
    ambiances: ["Amb_Ergonomie", "ALAIA_Amb3_TapBench", "Amb_meeting"],
  },
  // Torino n'a pas de dossier — la fiche garde ses photos de gamme.

  // ───────────────────────── WI-MAX ─────────────────────────
  {
    nom: "Fauteuil dossier tapissé - Wi-Max",
    dossier: "WI-MAX",
    refs: ["WM650", "WM660", "WM670", "WH650", "WH660", "WH670",
           "Wimax_accotoirs_3D", "Wimax_accotoirs_fixes", "Wi-Max acc 4d",
           "Wimax_DetRenfortlombaire"],
    ambiances: ["Wi-MaxT_Amb_Workspace1", "Wi-MaxT_Amb_Workspace2",
                "Wimax_Amb_bureau", "Wimax_Amb_open space"],
  },
  {
    nom: "Fauteuil dossier résille - Wi-Max",
    dossier: "WI-MAX",
    refs: ["WR060", "WR070", "WL660", "WL670", "WW660", "WW670", "WX060", "WX070",
           "Wi-MaxBlancRes_DetAcc3D", "Wi-MaxBlancRes_DetRL", "Wi-MaxBlancRes_DetTet"],
    ambiances: ["Wi-MaxR_Amb_Workspace1", "Wi-MaxR_Amb_Workspace2",
                "Wimax_Amb_bureau_résille"],
  },

  // ───────────────────────── WI-MAX ERGO ─────────────────────────
  {
    nom: "Fauteuil dossier tapissé - Wi-Max Ergo",
    dossier: "WI-MAX_ERGO",
    refs: ["WE37F58", "WE37F5P", "WE36F58", "WE34F58", "WE34F5P",
           "Wi-Max_WE37F", "Wi-Max_WE36F", "Wi-Max_WE34F",
           "poche kangourou", "Tap_FLEX", "Réglage lombaire"],
    ambiances: [],
  },
  {
    nom: "Fauteuil dossier résille - Wi-Max Ergo",
    dossier: "WI-MAX_ERGO",
    refs: ["WI37F58", "WI37F5P", "WI36F58", "Wi-Max_WI37F", "Wi-Max_WI36F",
           "WI37F58_Housse", "Housse RL"],
    ambiances: [],
  },
  {
    nom: "Paire d'accotoirs 4D manchette cuir éventail",
    dossier: "WI-MAX_ERGO",
    refs: ["Acc 4D eventail cuir noir", "Acc 4D_reglage largeur"],
    ambiances: [],
  },
  {
    nom: "Paire d'accotoirs 4D manchette PU fût aluminium",
    dossier: "WI-MAX_ERGO",
    refs: ["acc 4D manchette Pu"],
    ambiances: [],
  },
  {
    nom: "Housse têtière avec coussin pour poche chaud-froid",
    dossier: "WI-MAX_ERGO",
    refs: ["Housse Têtière 01", "Housse Têtière 02", "Housse Têtière 03"],
    ambiances: [],
  },
  {
    nom: "Housse têtière pour poche chaud-froid",
    dossier: "WI-MAX_ERGO",
    refs: ["Housse Têtière 04", "Housse Têtière 05", "Housse Têtière 06"],
    ambiances: [],
  },

  // ───────────────────────── ACCESSOIRES ─────────────────────────
  {
    nom: "Chariot de transport 6 roues Adela",
    dossier: "ADELA",
    refs: ["Adela chariot", "Chariot Stockage"],
    ambiances: [],
  },
  {
    nom: "Diable de transport Adela",
    dossier: "ADELA",
    refs: ["Adela_Diable"],
    ambiances: [],
  },
  {
    nom: "Tablette écritoire amovible Adela",
    dossier: "ADELA",
    refs: ["Adela tablette", "Adela_tablette"],
    ambiances: [],
  },
  {
    nom: "Système d'accroche amovible Adela",
    dossier: "ADELA",
    refs: ["Système d'accroche Adela", "Système d'accroche bras Adela", "Adela_Accroches"],
    ambiances: [],
  },
  {
    nom: "Barre inter-rangées Adela",
    dossier: "ADELA",
    refs: ["Adela_Barre"],
    ambiances: [],
  },
  {
    nom: "Paire d'accotoirs 1D Tertio",
    dossier: "TERTIO",
    refs: ["Zoom_Bras 1D"],
    ambiances: [],
  },
  {
    nom: "Paire d'accotoirs fixes Tertio",
    dossier: "TERTIO",
    refs: ["Zoom_Bras fixes"],
    ambiances: [],
  },
  {
    nom: "Système de retour automatique à point fixe Ildo",
    dossier: "ILDO",
    refs: ["retour automatique à point fixe"],
    ambiances: [],
  },
  {
    nom: "Système de retour automatique à point fixe Luma",
    dossier: "LUMA",
    refs: ["LM950_RA"],
    ambiances: [],
  },
];

const IMAGES = [".jpg", ".jpeg", ".png", ".webp"];

// Cache des fichiers par dossier, pour ne lire chaque répertoire qu'une fois.
const fichiersParDossier = new Map();

async function fichiersDe(dossier) {
  if (fichiersParDossier.has(dossier)) return fichiersParDossier.get(dossier);
  try {
    const entrees = await readdir(join(RACINE, dossier), { withFileTypes: true });
    const liste = entrees
      .filter((e) => e.isFile() && IMAGES.includes(extname(e.name).toLowerCase()))
      .map((e) => e.name);
    fichiersParDossier.set(dossier, liste);
    return liste;
  } catch {
    fichiersParDossier.set(dossier, []);
    return [];
  }
}

// Un fichier peut servir plusieurs fiches : on ne l'envoie qu'une fois.
const urls = new Map();

async function uploader(dossier, fichier) {
  const cle = `${dossier}/${fichier}`;
  if (urls.has(cle)) return urls.get(cle);

  try {
    const contenu = await readFile(join(RACINE, dossier, fichier));
    const form = new FormData();
    form.append("file", new Blob([contenu]), fichier);
    form.append("upload_preset", PRESET);
    form.append("folder", `coteburo/sokoa/${dossier.toLowerCase()}`);

    const rep = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
      method: "POST",
      body: form,
    });
    const data = await rep.json();

    if (!rep.ok || !data.secure_url) {
      console.log(`      ✗ ${fichier} : ${data.error?.message || rep.statusText}`);
      urls.set(cle, null);
      return null;
    }
    urls.set(cle, data.secure_url);
    return data.secure_url;
  } catch (e) {
    console.log(`      ✗ ${fichier} : ${e.message}`);
    urls.set(cle, null);
    return null;
  }
}

async function main() {
  if (!CLOUD || !PRESET) { console.log("Clés Cloudinary absentes du .env."); return; }

  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  let produitsOk = 0, produitsVides = 0, introuvables = 0;

  for (const def of PRODUITS) {
    const vitrine = await prisma.produitVitrine.findFirst({
      where: { nom: def.nom },
      select: { id: true, nom: true },
    });

    if (!vitrine) {
      console.log(`✗ ${def.nom} — introuvable en base`);
      introuvables++;
      continue;
    }

    const fichiers = await fichiersDe(def.dossier);
    if (!fichiers.length) {
      console.log(`✗ ${def.nom} — dossier ${def.dossier} vide ou absent`);
      produitsVides++;
      continue;
    }

    // On suit l'ordre des fragments déclarés : il fixe l'ordre de la galerie.
    const retenus = [];
    const vus = new Set();

    for (const frag of [...def.refs, ...def.ambiances]) {
      const cible = frag.toLowerCase();
      for (const f of fichiers) {
        if (vus.has(f)) continue;
        if (f.toLowerCase().includes(cible)) {
          retenus.push(f);
          vus.add(f);
        }
      }
    }

    if (!retenus.length) {
      console.log(`⚠ ${def.nom} — aucune photo trouvée dans ${def.dossier}`);
      produitsVides++;
      continue;
    }

    console.log(`▸ ${def.nom}`);
    console.log(`   ${retenus.length} photo(s) : ${retenus.slice(0, 3).join(", ")}${retenus.length > 3 ? "…" : ""}`);

    if (!APPLIQUER) { produitsOk++; continue; }

    const liens = [];
    for (const f of retenus) {
      const u = await uploader(def.dossier, f);
      if (u) liens.push(u);
    }

    if (liens.length) {
      await prisma.produitVitrine.update({
        where: { id: vitrine.id },
        data: { imageUrl: liens[0], images: liens },
      });
      produitsOk++;
    }
  }

  const envoyees = [...urls.values()].filter(Boolean).length;
  console.log(`\n═══ ${produitsOk} produit(s) · ${produitsVides} sans photo · ${introuvables} introuvable(s) ═══`);
  if (APPLIQUER) console.log(`${envoyees} image(s) envoyée(s) sur Cloudinary.`);
  else console.log("\nnode prisma\\import-photos-sokoa.mjs --appliquer");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
