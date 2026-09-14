// Relève, sans rien capturer, toutes les propriétés configurables d'un
// dossier pCon et les options de chacune.
//
// Le script de capture ne retient qu'un axe « matière », le premier de sa
// liste de priorité qui existe sur le produit. Quand ce choix est mauvais
// — « Finition structure » sur les armoires coulissantes, qui porte le
// caisson et non les portes — les captures ne montrent qu'une finition du
// détail qui compte. Pour corriger la liste, encore faut-il voir ce que le
// configurateur propose vraiment.
//
//   node diagnostic-pcon.mjs "Quiétude Coulissantes"
//   node diagnostic-pcon.mjs "Quiétude Coulissantes" --visible
//
// Le rapport est écrit dans diagnostic-pcon.md.
import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";
import { DOSSIERS, AXE_MATIERE, AXE_STRUCTURE } from "./capture-pcon.mjs";

const VISIBLE = process.argv.includes("--visible");
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const ATTENTE_RENDU = 5000;
const ATTENTE_CLIC = 1500;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const normalise = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Rang de la propriété dans la liste de priorité du script de capture :
// c'est le plus petit qui l'emporte, d'où l'intérêt de le montrer.
const rangDans = (liste, libelle) => {
  const i = liste.findIndex((c) => normalise(c) === normalise(libelle));
  return i < 0 ? null : i;
};

async function main() {
  const aTraiter = DEMANDEES.length
    ? DOSSIERS.filter((d) => DEMANDEES.some((n) => normalise(d.gamme).includes(normalise(n))))
    : [];

  if (!aTraiter.length) {
    console.log("Usage : node diagnostic-pcon.mjs \"<gamme>\"\n");
    console.log("Gammes connues :\n  " + DOSSIERS.map((d) => d.gamme).join("\n  "));
    return;
  }

  const navigateur = await puppeteer.launch({
    headless: !VISIBLE,
    defaultViewport: null,
    args: ["--window-size=2560,1440"],
  });
  const page = await navigateur.newPage();
  await page.setViewport({ width: 2560, height: 1440 });

  const rapport = [`# Diagnostic pCon`, ``, `Lancé le ${new Date().toLocaleString("fr-FR")}`, ``];
  const noter = (s = "") => rapport.push(s);

  const lireProprietes = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('li[class*="MuiListItem-container"]')].map((li, i) => ({
        index: i,
        libelle: (li.innerText || "").split("\n")[0].trim(),
        valeur: (li.innerText || "").split("\n")[1]?.trim() || "",
      }))
    );

  const ouvrirMenu = async (index) => {
    const ok = await page.evaluate((idx) => {
      const b = document.querySelectorAll('li[class*="MuiListItem-container"]')[idx]?.querySelector('[role="button"]');
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
        .map((el) => (el.innerText || "").trim())
        .filter((n) => n && n.length < 40);
    });

  for (const dossier of aTraiter) {
    console.log(`\n═══ ${dossier.gamme} ═══`);
    noter(`\n## ${dossier.gamme}\n`);
    noter(`${dossier.url}\n`);

    try {
      await page.goto(dossier.url, { waitUntil: "networkidle2", timeout: 60000 });
      await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
      await pause(ATTENTE_RENDU);
      await page.waitForFunction(
        () => document.querySelectorAll('button[class*="CatalogGridItem"]').length > 0,
        { timeout: dossier.attenteGrille || 25000 }
      );
    } catch (e) {
      console.log(`   ✗ grille non chargée : ${e.message.split("\n")[0]}`);
      noter(`✗ grille non chargée.`);
      continue;
    }

    const produits = await page.evaluate(() =>
      [...document.querySelectorAll('button[class*="CatalogGridItem"]')]
        .map((b) => {
          const id = b.getAttribute("data-testid") || b.getAttribute("aria-label") || "";
          const m = id.match(/^cat\/(.+)\/[^/]*$/);
          return m ? m[1].trim() : null;
        })
        .filter(Boolean)
    );
    console.log(`   ${produits.length} produit(s) : ${produits.join(", ")}`);
    noter(`${produits.length} produit(s) : ${produits.join(", ")}`);

    for (let i = 0; i < produits.length; i++) {
      const ref = produits[i];

      if (i > 0) {
        await page.goto(dossier.url, { waitUntil: "networkidle2" });
        await page.reload({ waitUntil: "networkidle2" });
        await pause(ATTENTE_RENDU);
        await page
          .waitForFunction(() => document.querySelectorAll('button[class*="CatalogGridItem"]').length > 0, { timeout: 20000 })
          .catch(() => {});
      }

      const ouvert = await page.evaluate((r) => {
        const b = [...document.querySelectorAll('button[class*="CatalogGridItem"]')].find((x) => {
          const m = (x.getAttribute("data-testid") || "").match(/^cat\/(.+)\/[^/]*$/);
          return m && m[1].trim() === r;
        });
        if (!b) return false;
        b.click();
        return true;
      }, ref);

      if (!ouvert) {
        console.log(`   ✗ ${ref} — bouton introuvable`);
        noter(`\n### ${ref}\n\n✗ bouton introuvable`);
        continue;
      }
      await pause(ATTENTE_RENDU);

      const infos = await page.evaluate(() => {
        const m = document.body.innerText.match(/BURONOMIC\s*\|\s*([^|]+)\|\s*([^\n]+)/i);
        const titre = document.querySelector("h1, h2, [class*='ArticleHeader']")?.innerText || "";
        return { refComplete: m ? m[2].trim() : null, titre: titre.trim().split("\n")[0] };
      });

      console.log(`\n   ── ${infos.refComplete || ref} — ${infos.titre}`);
      noter(`\n### ${infos.refComplete || ref} — ${infos.titre}\n`);

      try {
        await page.waitForFunction(
          () => document.querySelectorAll('li[class*="MuiListItem-container"]').length > 0,
          { timeout: 15000 }
        );
      } catch {
        console.log("      aucune propriété configurable");
        noter(`Aucune propriété configurable.`);
        continue;
      }

      const proprietes = await lireProprietes();
      noter(`| # | Propriété | Valeur courante | Options | Axe capture |`);
      noter(`|---|---|---|---|---|`);

      for (const p of proprietes) {
        let options = [];
        if (await ouvrirMenu(p.index)) {
          options = await lireOptions();
          await page.keyboard.press("Escape");
          await pause(500);
        }

        const rM = rangDans(AXE_MATIERE, p.libelle);
        const rS = rangDans(AXE_STRUCTURE, p.libelle);
        const axe = rM !== null ? `matière #${rM}` : rS !== null ? `structure #${rS}` : "—";

        console.log(`      [${String(p.index).padStart(2)}] ${p.libelle.padEnd(34)} ${String(options.length).padStart(3)} opt.  ${axe}`);
        console.log(`           ${options.join(" · ") || "(aucune)"}`);
        noter(`| ${p.index} | **${p.libelle}** | ${p.valeur || "—"} | ${options.length ? options.join(" · ") : "(aucune)"} | ${axe} |`);
      }
    }
  }

  await writeFile("diagnostic-pcon.md", rapport.join("\n"), "utf8");
  console.log(`\nRapport écrit dans diagnostic-pcon.md`);
  if (VISIBLE) console.log("Le navigateur reste ouvert — fermer la fenêtre pour terminer.");
  else await navigateur.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
