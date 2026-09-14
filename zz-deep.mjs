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
await page.evaluate(() => [...document.querySelectorAll('button[class*="CatalogGridItem"]')]
  .find(x => (x.getAttribute("data-testid")||"").includes("EG98"))?.click());
await pause(6000);
await page.waitForFunction(() => document.querySelectorAll('li[class*="MuiListItem-container"]').length > 0, { timeout: 15000 });

const dump = await page.evaluate(() => {
  const out = {};
  out.listItems = [...document.querySelectorAll('li[class*="MuiListItem-container"]')].map((li,i)=>({i,txt:(li.innerText||"").replace(/\n/g," | ")}));
  out.tousLi = [...document.querySelectorAll('li')].length;
  out.tabs = [...document.querySelectorAll('[role="tab"]')].map(e=>e.innerText.trim());
  out.boutonsPanneau = [...document.querySelectorAll('[role="button"]')].map(e=>(e.innerText||"").trim()).filter(t=>t&&t.length<50);
  out.accordions = [...document.querySelectorAll('[class*="Accordion"],[class*="Expand"],[class*="Collapse"]')].map(e=>(e.innerText||"").split("\n")[0].trim()).filter(Boolean);
  // Texte integral du panneau lateral droit
  const panneaux = [...document.querySelectorAll('div')].filter(e=>{const r=e.getBoundingClientRect();return r.width>250&&r.width<800&&r.height>400&&r.right>window.innerWidth-900;});
  out.panneau = panneaux.length ? panneaux[panneaux.length-1].innerText.slice(0,3000) : null;
  return out;
});
await writeFile("zz-deep.json", JSON.stringify(dump,null,2), "utf8");
console.log("listItems:", dump.listItems.length, "| tous li:", dump.tousLi, "| tabs:", JSON.stringify(dump.tabs));
console.log("accordions:", JSON.stringify([...new Set(dump.accordions)].slice(0,20)));
console.log("\n--- panneau lateral ---\n" + (dump.panneau||"(non trouve)"));
await b.close();
