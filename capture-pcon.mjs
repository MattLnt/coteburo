import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

// Capture les visuels produits depuis le configurateur pCon de Buronomic.
//
// Le configurateur est une application web : le rendu se fait en WebGL sur
// un canvas, et chaque produit d'une grille porte son identifiant dans
// l'attribut data-testid. Les boutons n'ont aucun texte visible, c'est
// donc cet attribut qui sert de repère.
//
// Chaque propriété configurable est un li.MuiListItem-container. Le menu
// ne s'ouvre pas en cliquant sur le li mais sur le div[role="button"]
// qu'il contient, et les options apparaissent dans un popover flottant.
//
// Stratégie de capture : on ne croise pas tous les axes — sept plateaux
// sur trois piétements donneraient vingt-et-une images du même bureau.
// On prend plutôt trois décors par piétement, en tournant sur la liste
// des décors pour qu'ils apparaissent tous.
//
// Tout est consigné dans capture-pcon.md : le terminal Windows perd les
// premières lignes d'une longue sortie, et ce sont justement les libellés
// non reconnus qui disent quoi ajouter aux listes d'axes.
//
// Usage :
//    node capture-pcon.mjs --cache                  toutes les gammes
//    node capture-pcon.mjs --cache Comfort          une seule
//    node capture-pcon.mjs --cache "Astrolite Haute"  nom composé
//
// Buronomic a confirmé que l'usage est toléré. Le configurateur ralentit
// si on l'interroge trop vite : en cas d'échecs en série, attendre un
// quart d'heure avant de relancer.

const RACINE = "C:\\Users\\pages\\Bureau\\Matt\\projets\\COTEBURO-MEDIAS\\Buronomic";

// Chaque dossier du configurateur, avec son URL et le nom de gamme
// correspondant dans le catalogue.
//
// Certaines URL portent « cep= » là où d'autres ont « crp= » : c'est bien
// la forme fournie par le configurateur, pas une coquille.
export const DOSSIERS = [
  {
    gamme: "Astro Direction",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1750%24default%2C%40FOLDER1136%24default&lang=fr",
  },
  {
    gamme: "Alto",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER2690%24default%2C%40FOLDER2777%24default&lang=fr",
  },
  {
    // Premier dossier Alto Réunion, qui ne contenait aucune des
    // références du catalogue Côté BURO.
    gamme: "Alto Réunion",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&cep=brmc%3A0%2Ccat%3A%40FOLDER1750%24default%2C%40FOLDER2931%24default&lang=fr",
  },
  {
    // Le vrai dossier Alto Réunion, sous la catégorie Réunion : il porte
    // les tables carrée et rectangle — DT70, DT72, DT86, DT89.
    gamme: "Alto Réunion Tables",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1758%24default%2C%40FOLDER2665%24default&lang=fr",
  },
  {
    gamme: "Astro",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1736%24default%2C%40FOLDER1123%24default&lang=fr",
  },
  {
    // Astrolite collaboratif : plans à hauteur fixe.
    gamme: "Astrolite",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1736%24default%2C%40FOLDER1124%24default&lang=fr",
  },
  {
    // Astrolite ergonomique : les plans à hauteur réglable — BM79, BT67.
    gamme: "Astrolite Réglable",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER2690%24default%2C%40FOLDER2691%24default&lang=fr",
  },
  {
    gamme: "Comfort",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1756%24default%2C%40FOLDER1138%24default&lang=fr",
  },
  {
    gamme: "Quiétude",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1756%24default%2C%40FOLDER1139%24default&lang=fr",
  },
  {
    // Les armoires à portes coulissantes forment un dossier distinct de
    // Quiétude dans le configurateur.
    gamme: "Quiétude Coulissantes",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&cep=brmc%3A0%2Ccat%3A%40FOLDER1756%24default%2C%40FOLDER2942%24default&lang=fr",
  },
  {
    gamme: "Classif",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1756%24default%2C%40FOLDER1141%24default&lang=fr",
  },
  {
    gamme: "Essentiel",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1734%24default%2C%40FOLDER2759%24default&lang=fr",
  },
  {
    // Les cabines acoustiques Essentielle. Comme Modul'Up, ce dossier
    // affiche une page de conditions avant la grille : il lui faut plus
    // de temps pour se peupler. Les identifiants sont des tailles —
    // « cat/S/default », « cat/XL/default » — et non des références.
    gamme: "Essentielle",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&cep=brmc%3A0%2Ccat%3A%40FOLDER2765%24default%2C%40FOLDER2822%24default&lang=fr",
    attenteGrille: 45000,
  },
  {
    // Le plan d'angle Essentiel est rangé dans « Extensions », aux côtés
    // de produits que Côté BURO n'a pas importés — le rattachement par
    // référence les écartera d'office.
    gamme: "Extensions Bureaux Classiques",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1734%24default%2C%40FOLDER1129%24default&lang=fr",
  },
  {
    gamme: "Partage",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1736%24default%2C%40FOLDER1674%24default&lang=fr",
  },
  {
    gamme: "Rétro",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1734%24default%2C%40FOLDER1128%24default&lang=fr",
  },
  {
    gamme: "Cohésion",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1727%24default%2C%40FOLDER1675%24default&lang=fr",
  },
  {
    // La table haute forme un dossier distinct dans le configurateur :
    // « Cohésion haute ».
    gamme: "Cohésion Haute",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1727%24default%2C%40FOLDER1762%24default&lang=fr",
  },
  {
    gamme: "Bewall",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&cep=brmc%3A0%2Ccat%3A%40FOLDER2765%24default%2C%40FOLDER2956%24default&lang=fr",
  },
  {
    // Les séparateurs sont rangés sous « Compléments & Accessoires »,
    // pas avec les cloisons Bewall qui sont en Confidentialité.
    gamme: "Bewall Séparateurs",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1737%24default%2C%40FOLDER2440%24default&lang=fr",
  },
  {
    gamme: "Astrolite Haute",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1727%24default%2C%40FOLDER2555%24default&lang=fr",
  },
  {
    gamme: "Envol One",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER2690%24default%2C%40FOLDER2516%24default&lang=fr",
  },
  {
    gamme: "Ergonomie",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&cep=brmc%3A0%2Ccat%3A%40FOLDER1737%24default%2C%40FOLDER2882%24default&lang=fr",
  },
  {
    gamme: "Prestige Réunion",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&cep=brmc%3A0%2Ccat%3A%40FOLDER1758%24default%2C%40FOLDER1143%24default&lang=fr",
  },
  {
    gamme: "Rencontre",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1758%24default%2C%40FOLDER1151%24default&lang=fr",
  },
  {
    gamme: "Stricto Direction",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1750%24default%2C%40FOLDER1374%24default&lang=fr",
  },
  {
    // Seules les tables pliantes sont au catalogue Côté BURO : les
    // abattantes n'ont pas été importées.
    gamme: "Solution",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&crp=brmc%3A0%2Ccat%3A%40FOLDER1758%24default%2C%40FOLDER2810%24default&lang=fr",
  },
  {
    // Ce dossier affiche une page de conditions spécifiques avant la
    // grille : il lui faut plus de temps que les autres pour se peupler.
    gamme: "Modul Up",
    url: "https://ui.pcon-solutions.com/#GATEKEEPER_ID=66c70800b49f8&cep=brmc%3A0%2Ccat%3A%40FOLDER1727%24default%2C%40FOLDER2973%24default&lang=fr",
    attenteGrille: 45000,
  },
];

// L'axe « matière » : ce qu'on voit en premier sur le produit.
// Le premier libellé trouvé est retenu, d'où l'ordre.
//
// Les libellés commençant par « Finition » passent avant « Façade » :
// sur les caissons Comfort, « Façade » ne propose que des configurations
// de tiroirs — « caisson structurex 3T+1DS » — alors que « Finition
// caisson » porte les huit décors.
export const AXE_MATIERE = [
  "tissu écran",
  // Les modules Modul'Up ont quatre coussins numérotés ; le premier
  // suffit à montrer le tissu retenu.
  "tissu coussin 1",
  "tissu",
  "finition structurex plateau",
  "plateau",
  "finition caisson",
  "finition plateau",
  "finition top box",
  "finition top",
  // Sur les armoires à portes coulissantes Quiétude, « Finition intérieure »
  // gouverne les portes et « Finition structure » le caisson. Le libellé
  // trompe : c'est bien la façade qu'on voit. Elle passe donc devant, les
  // portes étant l'essentiel visuel du produit.
  "finition intérieure",
  "finition structure",
  "finition voile de fond suspendu",
  "finition écran",
  "finition séparateur",
  "finition extérieure",
  "revêtement",
  "finition b-box",
  "finition",
  "couleur colonne",
  "intérieur et portes",
  "rideaux",
  "structure métal et rideaux",
  "corps",
  "façade",
];

// L'axe « structure » : ce qui porte le produit. Capturé en croisement
// avec la matière.
//
// « Type de support » n'y figure pas : sur les caissons Comfort, il
// propose des configurations de tiroirs, pas des teintes. Le croiser
// coûtait deux décors sur huit sans montrer de finition supplémentaire.
export const AXE_STRUCTURE = [
  // Quand « Finition intérieure » a pris la matière, « Finition structure »
  // reste disponible comme second axe : on croise alors les portes et le
  // caisson. Là où elle est seule, elle est retenue comme matière et ne peut
  // plus être candidate ici — choisirCandidat écarte la propriété déjà prise.
  "finition structure",
  "piétement",
  "piètement",
  "finition pieds",
  "finition pied",
  "pieds",
  "type de pieds",
  "structure métal",
  "structure",
  "support",
];

// Un produit peut porter deux propriétés du même nom : sur le multiposte
// Partage, le premier « Plateau » propose des configurations — « avec
// obturateurs », « Top access » — et le second les vrais décors. On
// reconnaît les décors à leurs noms, qui reviennent d'une gamme à l'autre.
export const DECORS_CONNUS = [
  "chene fil", "chene de fil", "chene nebraska", "hetre", "blanc", "noir",
  "timber", "yukon", "argile", "cedre", "aluminium", "sauge", "peche",
  "ombre", "horizon", "gris clair", "chrome",
];

// Nombre de décors capturés par teinte de structure.
const DECORS_PAR_STRUCTURE = 3;

const CACHE = process.argv.includes("--cache");

// Sans argument, toutes les gammes sont traitées. Avec des noms en
// argument, seules celles-là — pratique pour reprendre une gamme qui a
// échoué sans rejouer les heures précédentes. La comparaison ignore
// accents et casse : « quietude » trouve « Quiétude ».
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const ATTENTE_RENDU = 5000;
const ATTENTE_CLIC = 1500;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Windows refuse ces caractères dans un nom de fichier.
const propre = (s) =>
  (s || "").replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-").trim().slice(0, 60);

const normalise = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Renvoie toutes les propriétés portant l'un des libellés cherchés,
// dans l'ordre de la liste. Plusieurs peuvent correspondre : c'est le
// cas du multiposte Partage, où deux propriétés s'appellent « Plateau ».
function trouverAxes(proprietes, libelles) {
  const trouves = [];
  for (const cle of libelles) {
    const cible = normalise(cle);
    for (const p of proprietes) {
      if (normalise(p.libelle) === cible && !trouves.includes(p)) trouves.push(p);
    }
  }
  return trouves;
}

// Une liste d'options ressemble-t-elle à des décors ?
const ressembleADecors = (options) => {
  if (!options.length) return false;
  const n = options.filter((o) => DECORS_CONNUS.includes(normalise(o.nom))).length;
  return n >= Math.min(2, options.length);
};

async function main() {
  // La correspondance exacte l'emporte : demander « Cohésion » ne doit
  // pas relancer « Cohésion Haute » par la même occasion.
  const aTraiter = DEMANDEES.length
    ? (() => {
        const exacts = DOSSIERS.filter((d) =>
          DEMANDEES.some((n) => normalise(d.gamme) === normalise(n)));
        if (exacts.length === DEMANDEES.length) return exacts;
        return DOSSIERS.filter((d) =>
          DEMANDEES.some((n) => normalise(d.gamme).includes(normalise(n))));
      })()
    : DOSSIERS;

  if (DEMANDEES.length) {
    const noms = aTraiter.map((d) => d.gamme).join(", ");
    console.log(`Gammes demandées : ${noms || "aucune correspondance"}\n`);
    if (!aTraiter.length) return;
  }

  // Le canvas WebGL se dimensionne sur la place que lui laisse la page.
  // Une fenêtre large donne donc un rendu plus grand — et le facteur de
  // densité le double encore, comme sur un écran haute résolution.
  const navigateur = await puppeteer.launch({
    headless: CACHE,
    defaultViewport: null,
    args: ["--window-size=2560,1440", "--start-maximized"],
  });

  const page = await navigateur.newPage();
  await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 2 });

  let totalImages = 0;

  const rapport = [
    `# Captures pCon`,
    ``,
    `Lancé le ${new Date().toLocaleString("fr-FR")}`,
    DEMANDEES.length ? `Gammes : ${aTraiter.map((d) => d.gamme).join(", ")}` : `Toutes les gammes`,
    ``,
  ];
  const noter = (s = "") => rapport.push(s);

  const inconnus = new Map();

  // ── Fonctions de pilotage ──

  const lireProprietes = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('li[class*="MuiListItem-container"]')]
        .map((li, i) => ({
          index: i,
          libelle: (li.innerText || "").split("\n")[0].trim(),
          valeur: (li.innerText || "").split("\n")[1]?.trim() || "",
        }))
    );

  const ouvrirMenu = async (index) => {
    const ok = await page.evaluate((idx) => {
      const li = document.querySelectorAll('li[class*="MuiListItem-container"]')[idx];
      const b = li?.querySelector('[role="button"]');
      if (!b) return false;
      b.click();
      return true;
    }, index);
    if (ok) await pause(ATTENTE_CLIC);
    return ok;
  };

  const lireOptions = () =>
    page.evaluate(() => {
      const popover = document.querySelector(".MuiPopover-root");
      if (!popover) return [];
      return [...popover.querySelectorAll('[role="button"]')]
        .map((el, i) => ({ i, nom: (el.innerText || "").trim() }))
        .filter((x) => x.nom && x.nom.length < 40);
    });

  const choisirOption = async (i) => {
    const ok = await page.evaluate((idx) => {
      const popover = document.querySelector(".MuiPopover-root");
      if (!popover) return false;
      const items = [...popover.querySelectorAll('[role="button"]')];
      if (!items[idx]) return false;
      items[idx].click();
      return true;
    }, i);
    if (ok) await pause(ATTENTE_RENDU);
    return ok;
  };

  // Ouvre le menu, relève les options, referme.
  const sonder = async (index) => {
    if (!(await ouvrirMenu(index))) return [];
    const opts = await lireOptions();
    await page.keyboard.press("Escape");
    await pause(500);
    return opts;
  };

  // Parmi plusieurs propriétés candidates, retient celle dont les options
  // ressemblent à des décors — sinon la première qui en a.
  const choisirCandidat = async (candidats) => {
    let repli = null;
    for (const c of candidats) {
      const opts = await sonder(c.index);
      if (!opts.length) continue;
      if (ressembleADecors(opts)) return { prop: c, options: opts };
      if (!repli) repli = { prop: c, options: opts };
    }
    return repli;
  };

  const capturer = async (chemin) => {
    const png = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      if (!c) return null;

      // Un rendu qui n'a pas eu lieu donne un canvas uniformément noir.
      const test = document.createElement("canvas");
      test.width = 40;
      test.height = 40;
      const ctx = test.getContext("2d");
      ctx.drawImage(c, 0, 0, 40, 40);
      const pixels = ctx.getImageData(0, 0, 40, 40).data;

      let clair = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 40 || pixels[i + 1] > 40 || pixels[i + 2] > 40) clair++;
      }
      if (clair < 20) return "NOIR";

      return c.toDataURL("image/png");
    });

    if (!png || png === "NOIR") return false;

    await writeFile(chemin, Buffer.from(png.split(",")[1], "base64"));
    totalImages++;
    return true;
  };

  // ── Parcours ──

  for (const dossier of aTraiter) {
    console.log(`\n═══ ${dossier.gamme} ═══`);
    noter(`\n## ${dossier.gamme}\n`);

    // Deux URL du configurateur ne diffèrent que par leur fragment : le
    // navigateur considère alors qu'il est déjà au bon endroit et ne
    // recharge rien. On force donc le rechargement à chaque gamme.
    try {
      await page.goto(dossier.url, { waitUntil: "networkidle2", timeout: 60000 });
      await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
      await pause(ATTENTE_RENDU);

      // Certains dossiers affichent une page intermédiaire — conditions
      // spécifiques, avertissement — avant la grille des produits.
      await page.waitForFunction(
        () => document.querySelectorAll('button[class*="CatalogGridItem"]').length > 0,
        { timeout: dossier.attenteGrille || 25000 }
      );
    } catch (e) {
      const msg = `grille non chargée : ${e.message.split("\n")[0]}`;
      console.log(`   ✗ ${msg}`);
      noter(`✗ ${msg}\n`);
      continue;
    }

    // La plupart des identifiants portent une référence courte —
    // « cat/ED733/default » — mais certains dossiers utilisent le nom du
    // produit : « cat/MODULE BAS/default » chez Modul'Up, « cat/XL/default »
    // pour les cabines Essentielle.
    const produits = await page.evaluate(() => {
      const boutons = [...document.querySelectorAll('button[class*="CatalogGridItem"]')];
      return boutons.map((b) => {
        const id = b.getAttribute("data-testid") || b.getAttribute("aria-label") || "";
        const m = id.match(/^cat\/(.+)\/[^/]*$/);
        return { ref: m ? m[1].trim() : null };
      }).filter((x) => x.ref);
    });

    if (!produits.length) {
      console.log("   Aucun produit trouvé — vérifier l'URL ou le sélecteur.");
      noter(`Aucun produit trouvé — URL à vérifier.\n`);
      continue;
    }

    console.log(`   ${produits.length} produit(s)\n`);
    noter(`${produits.length} produit(s) : ${produits.map((p) => p.ref).join(", ")}\n`);

    for (let i = 0; i < produits.length; i++) {
      const { ref } = produits[i];

      if (i > 0) {
        await page.goto(dossier.url, { waitUntil: "networkidle2" });
        await page.reload({ waitUntil: "networkidle2" });
        await pause(ATTENTE_RENDU);
        try {
          await page.waitForFunction(
            () => document.querySelectorAll('button[class*="CatalogGridItem"]').length > 0,
            { timeout: dossier.attenteGrille || 20000 }
          );
        } catch {
          console.log(`   ⚠ grille non revenue avant ${ref}`);
          noter(`⚠ grille non revenue avant ${ref}`);
        }
      }

      const ouvert = await page.evaluate((r) => {
        const boutons = [...document.querySelectorAll('button[class*="CatalogGridItem"]')];
        const b = boutons.find((x) => {
          const id = x.getAttribute("data-testid") || "";
          const m = id.match(/^cat\/(.+)\/[^/]*$/);
          return m && m[1].trim() === r;
        });
        if (!b) return false;
        b.click();
        return true;
      }, ref);

      if (!ouvert) {
        console.log(`   ✗ ${ref} — bouton introuvable`);
        noter(`✗ ${ref} — bouton introuvable`);
        continue;
      }
      await pause(ATTENTE_RENDU);

      // La référence suit la gamme dans le fil « BURONOMIC | Alto | ED25 ».
      // Elle est le plus souvent alphanumérique, mais certains dossiers y
      // mettent un libellé avec des espaces — « MODULE BAS » chez Modul'Up.
      const infos = await page.evaluate(() => {
        const m = document.body.innerText.match(/BURONOMIC\s*\|\s*([^|]+)\|\s*([^\n]+)/i);
        const titre = document.querySelector("h1, h2, [class*='ArticleHeader']")?.innerText || "";
        return { refComplete: m ? m[2].trim() : null, titre: titre.trim().split("\n")[0] };
      });

      if (!infos.refComplete && !infos.titre) {
        console.log(`   ✗ ${ref} — fiche non chargée`);
        noter(`✗ ${ref} — fiche non chargée, produit ignoré`);
        continue;
      }

      // Chez Modul'Up, les trois modules partagent la référence
      // « MODULE BAS » : sans le titre, ils s'écraseraient entre eux.
      const base = propre(infos.refComplete || ref);
      const memeRef = produits.filter((p) => p.ref === ref).length > 1;
      const refFichier = infos.titre && (memeRef || base.length < 6)
        ? `${base}_${propre(infos.titre)}`
        : base;

      const dossierProduit = join(RACINE, propre(dossier.gamme), "_captures");
      await mkdir(dossierProduit, { recursive: true });

      const prise = await capturer(join(dossierProduit, `${refFichier}.png`));
      if (!prise) {
        console.log(`   ✗ ${refFichier} — rendu vide`);
        noter(`✗ ${refFichier} — rendu vide`);
        continue;
      }

      console.log(`   ✓ ${refFichier}  ${infos.titre.slice(0, 40)}`);
      noter(`\n### ${refFichier} — ${infos.titre}\n`);

      try {
        await page.waitForFunction(
          () => document.querySelectorAll('li[class*="MuiListItem-container"]').length > 0,
          { timeout: 15000 }
        );
      } catch {
        console.log(`      aucune propriété configurable`);
        noter(`Aucune propriété configurable.`);
        continue;
      }

      const proprietes = await lireProprietes();
      noter(`Propriétés : ${proprietes.map((p) => p.libelle).join(" · ")}`);

      for (const p of proprietes) {
        const connu =
          AXE_MATIERE.some((c) => normalise(c) === normalise(p.libelle)) ||
          AXE_STRUCTURE.some((c) => normalise(c) === normalise(p.libelle));
        if (connu) continue;
        if (!inconnus.has(p.libelle)) inconnus.set(p.libelle, { n: 0, gammes: new Set() });
        const stat = inconnus.get(p.libelle);
        stat.n++;
        stat.gammes.add(dossier.gamme);
      }

      // On sonde les candidats pour départager les homonymes.
      const candidatsMatiere = trouverAxes(proprietes, AXE_MATIERE);
      const matiere = await choisirCandidat(candidatsMatiere);

      if (!matiere) {
        console.log(`      aucun axe de matière`);
        noter(`⚠ Aucun axe de matière exploitable.`);
        continue;
      }

      const candidatsStructure = trouverAxes(proprietes, AXE_STRUCTURE)
        .filter((p) => p.index !== matiere.prop.index);
      const structure = await choisirCandidat(candidatsStructure);

      const decors = matiere.options;
      const structures = structure ? structure.options : [];

      // Un axe de structure à option unique ne vaut pas d'être croisé :
      // sur les plans Stricto, le piétement n'existe qu'en noir, et le
      // croisement ramenait sept décors à trois. Mieux vaut parcourir
      // tous les décors.
      if (structures.length < 2) {
        console.log(`      ${matiere.prop.libelle} — ${decors.length} option(s)`);
        noter(`Axe retenu : **${matiere.prop.libelle}** — ${decors.length} option(s)`);
        for (const d of decors) {
          await ouvrirMenu(matiere.prop.index);
          if (!(await choisirOption(d.i))) continue;
          if (await capturer(join(dossierProduit, `${refFichier}_${propre(d.nom)}.png`))) {
            noter(`   ${d.nom}`);
          }
        }
        continue;
      }

      // Avec les deux axes : trois décors par structure, en tournant sur
      // la liste pour que tous les décors finissent par apparaître.
      console.log(`      ${structure.prop.libelle} ${structures.length} × ${matiere.prop.libelle} ${decors.length}`);
      noter(`Axes retenus : **${structure.prop.libelle}** (${structures.length}) × **${matiere.prop.libelle}** (${decors.length})`);

      let curseur = 0;
      for (const s of structures) {
        await ouvrirMenu(structure.prop.index);
        if (!(await choisirOption(s.i))) continue;

        for (let n = 0; n < DECORS_PAR_STRUCTURE; n++) {
          const d = decors[curseur % decors.length];
          curseur++;

          await ouvrirMenu(matiere.prop.index);
          if (!(await choisirOption(d.i))) continue;

          const nom = `${refFichier}_${propre(s.nom)}_${propre(d.nom)}.png`;
          if (await capturer(join(dossierProduit, nom))) {
            noter(`   ${s.nom} · ${d.nom}`);
          }
        }
      }
    }
  }

  // ── Synthèse ──
  noter(`\n---\n`);
  noter(`## Bilan\n`);
  noter(`${totalImages} image(s) capturée(s).\n`);

  if (inconnus.size) {
    noter(`## Libellés non reconnus\n`);
    const tries = [...inconnus.entries()].sort((a, b) => b[1].n - a[1].n);
    for (const [nom, stat] of tries) {
      noter(`- **${nom}** — ${stat.n} produit(s), gammes : ${[...stat.gammes].join(", ")}`);
    }
  } else {
    noter(`Tous les libellés rencontrés sont couverts par les listes d'axes.`);
  }

  await writeFile("capture-pcon.md", rapport.join("\n"), "utf8");

  console.log(`\n═══ ${totalImages} image(s) capturée(s) ═══`);
  console.log(`Rapport détaillé dans capture-pcon.md`);

  if (!CACHE) {
    console.log("\nLe navigateur reste ouvert — fermer la fenêtre pour terminer.");
  } else {
    await navigateur.close();
  }
}

// Ce module est aussi importé par diagnostic-pcon.mjs, qui réutilise les URL
// des dossiers et les listes d'axes : on ne lance le parcours que si le
// fichier est appelé directement.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => { console.error(e); process.exit(1); });
}