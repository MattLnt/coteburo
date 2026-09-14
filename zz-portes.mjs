import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";
import { DOSSIERS } from "./capture-pcon.mjs";
const d = DOSSIERS.find(x => x.gamme === "Quiétude Coulissantes");
const pause = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: true, defaultViewport: null, args: ["--window-size=2560,1440"] });
const page = await b.newPage();
await page.setViewport({ width: 2560, height: 1440 });
await page.goto(d.url, { waitUntil: "networkidle2", timeout: 60000 });
await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
await pause(5000);
await page.waitForFunction(() => document.querySelectorAll('button[class*="CatalogGridItem"]').length > 0, { timeout: 25000 });
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button[class*="CatalogGridItem"]')]
    .find(x => (x.getAttribute("data-testid")||"").includes("EG98"));
  btn?.click();
});
await pause(5000);
await page.waitForFunction(() => document.querySelectorAll('li[class*="MuiListItem-container"]').length > 0, { timeout: 15000 });

const capturer = async (nom) => {
  const png = await page.evaluate(() => document.querySelector("canvas")?.toDataURL("image/png"));
  if (png) { await writeFile(nom, Buffer.from(png.split(",")[1], "base64")); return true; }
  return false;
};
const ouvrir = async (i) => { const ok = await page.evaluate((idx) => {
  const btn = document.querySelectorAll('li[class*="MuiListItem-container"]')[idx]?.querySelector('[role="button"]');
  if (!btn) return false; btn.click(); return true; }, i); if (ok) await pause(1500); return ok; };
const choisir = async (i) => { const ok = await page.evaluate((idx) => {
  const pop = document.querySelector(".MuiPopover-root"); if (!pop) return false;
  const it = [...pop.querySelectorAll('[role="button"]')]; if (!it[idx]) return false; it[idx].click(); return true; }, i);
  if (ok) await pause(5000); return ok; };

await capturer("zz-p0-defaut.png");
// Propriete 4 = « Finition interieure ». Option 3 = Timber (index dans la liste lue).
await ouvrir(4);
const opts = await page.evaluate(() => [...(document.querySelector(".MuiPopover-root")?.querySelectorAll('[role="button"]')||[])].map(e=>e.innerText.trim()));
console.log("options Finition intérieure :", opts.join(" · "));
const iTimber = opts.findIndex(o => /timber/i.test(o));
await choisir(iTimber);
await capturer("zz-p1-interieur-timber.png");
console.log("capturé : défaut + intérieur Timber");
await b.close();
