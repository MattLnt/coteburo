import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";
import sharp from "sharp";
import { DOSSIERS } from "./capture-pcon.mjs";
const d = DOSSIERS.find(x => x.gamme === "Quiétude Coulissantes");
const pause = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: true, defaultViewport: null, args: ["--window-size=2560,1440"] });
const page = await b.newPage();
await page.setViewport({ width: 2560, height: 1440 });
await page.goto(d.url, { waitUntil: "networkidle2", timeout: 60000 });
await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
await pause(5000);
await page.waitForFunction(() => document.querySelectorAll('button[class*="CatalogGridItem"]').length>0, {timeout:25000});
await page.evaluate(() => [...document.querySelectorAll('button[class*="CatalogGridItem"]')]
  .find(x => (x.getAttribute("data-testid")||"").includes("EG98"))?.click());
await pause(6000);
await page.waitForFunction(() => document.querySelectorAll('li[class*="MuiListItem-container"]').length>0, {timeout:15000});

const cap = async (f) => { const p = await page.evaluate(()=>document.querySelector("canvas")?.toDataURL("image/png"));
  if(!p) return false; await writeFile(f, Buffer.from(p.split(",")[1],"base64")); return true; };
const ouvrir = async (i)=>{const ok=await page.evaluate((x)=>{const btn=document.querySelectorAll('li[class*="MuiListItem-container"]')[x]?.querySelector('[role="button"]');if(!btn)return false;btn.click();return true;},i);if(ok)await pause(1800);return ok;};
const lireOpts = ()=>page.evaluate(()=>[...(document.querySelector(".MuiPopover-root")?.querySelectorAll('[role="button"]')||[])].map(e=>(e.innerText||"").trim()).filter(t=>t&&t.length<40));
const choisir = async (i)=>{const ok=await page.evaluate((x)=>{const pop=document.querySelector(".MuiPopover-root");if(!pop)return false;const it=[...pop.querySelectorAll('[role="button"]')];if(!it[x])return false;it[x].click();return true;},i);if(ok)await pause(6000);return ok;};

await cap("zz-a-defaut.png");
for (const [idx, nom] of [[3,"structure"],[4,"interieure"]]) {
  await ouvrir(idx);
  const o = await lireOpts();
  const i = o.findIndex(x=>/timber/i.test(x));
  console.log(`prop ${idx} (${nom}) options: ${o.join(" · ")}  -> Timber @${i}`);
  await choisir(i);
  await cap(`zz-b-${nom}-timber.png`);
  // on remet Blanc
  await ouvrir(idx);
  const o2 = await lireOpts();
  await choisir(o2.findIndex(x=>/^blanc$/i.test(x)));
}
await b.close();

// Comparaison : ou chaque propriete agit-elle ?
const lire = async (f) => { const {data,info} = await sharp(f).resize(160,160,{fit:"fill"}).raw().toBuffer({resolveWithObject:true}); return {data,info}; };
const ref = await lire("zz-a-defaut.png");
for (const nom of ["structure","interieure"]) {
  const x = await lire(`zz-b-${nom}-timber.png`);
  const ch = ref.info.channels; const bandes=[];
  for (let bd=0; bd<8; bd++){ let s=0,n=0;
    for(let y=bd*20;y<(bd+1)*20;y++) for(let px=0;px<160;px++){const i=(y*160+px)*ch;
      s+=Math.abs(x.data[i]-ref.data[i])+Math.abs(x.data[i+1]-ref.data[i+1])+Math.abs(x.data[i+2]-ref.data[i+2]);n++;}
    bandes.push((s/n/3).toFixed(1).padStart(6)); }
  console.log(`${nom.padEnd(12)} diff par bande (haut->bas): ${bandes.join(" ")}`);
}
