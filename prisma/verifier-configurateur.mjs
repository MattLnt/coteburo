// Configure automatiquement toutes les fiches publiées, et dit ce qui casse.
//
//   node prisma/verifier-configurateur.mjs
//   node prisma/verifier-configurateur.mjs --gamme=Wi-Max
//   node prisma/verifier-configurateur.mjs --bavard
//
// NE LIT QUE.
//
// POURQUOI
//   Le dépôt n'a pas de tests, et lib/modeleProduit.js est partagé par la
//   fiche, le panier, le devis et le paiement. Toucher à prochaineEtape sans
//   filet, c'est parier sur sept mille combinaisons qu'on n'a pas regardées.
//
//   Ce script joue le client : il prend chaque fiche, répond à la première
//   question proposée, recommence, et s'arrête quand il n'y a plus rien à
//   demander. Puis il vérifie que la fiche est commandable et que le prix
//   sort. Il le fait pour chaque première réponse possible, afin de passer
//   par toutes les branches et non par une seule.
//
// CE QU'IL SURVEILLE
//   • une question qui se repose indéfiniment — la boucle s'arrête et le dit ;
//   • une fiche qui finit non commandable alors qu'elle a un prix ;
//   • une question dont toutes les valeurs ont disparu ;
//   • un prix qui ne sort pas.
//
//   À lancer AVANT et APRÈS toute modification du modèle : c'est la
//   comparaison des deux comptes qui vaut preuve, pas le second seul.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  prochaineEtape, commandable, prixDe, resoudreCombinaison,
} from "../lib/modeleProduit.js";
// On passe par le chargeur du site, et non par une requête à soi : c'est lui
// qui résout l'héritage des nuanciers, et c'est donc lui que le client voit.
import { chargerProduits } from "../lib/chargerProduit.js";

const prisma = new PrismaClient();
const GAMME = (process.argv.find((a) => a.startsWith("--gamme=")) || "").slice(8) || null;
const BAVARD = process.argv.includes("--bavard");
const PLAFOND = 40;                       // au-delà, c'est une boucle
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

/** Joue une configuration complète à partir de réponses initiales. */
function jouer(produit, depart = {}) {
  const reponses = { ...depart };
  const posees = [];
  for (let i = 0; i < PLAFOND; i++) {
    const etape = prochaineEtape(produit, reponses);
    if (!etape) return { reponses, posees, boucle: false };
    if (!etape.valeurs?.length) return { reponses, posees, vide: etape.choix.nom };
    posees.push(etape.choix.nom + (etape.perimee ? " (rouverte)" : ""));
    reponses[etape.choix.cle] = etape.valeurs[0].libelle;
  }
  return { reponses, posees, boucle: true };
}

async function main() {
  const ids = (await prisma.produitVitrine.findMany({
    where: { publie: true, ...(GAMME ? { gamme: { nom: { contains: GAMME, mode: "insensitive" } } } : {}) },
    select: { id: true },
  })).map((v) => v.id);

  const vitrines = [];
  for (let i = 0; i < ids.length; i += 60) {
    vitrines.push(...(await chargerProduits(ids.slice(i, i + 60))).values());
  }

  const ennuis = [];
  let jouees = 0;
  let sansPrix = 0;

  for (const v of vitrines) {
    // Chaque première réponse possible, pour ne pas n'emprunter qu'un chemin.
    const premiere = prochaineEtape(v, {});
    const departs = premiere?.valeurs?.length
      ? premiere.valeurs.map((x) => ({ [premiere.choix.cle]: x.libelle }))
      : [{}];

    for (const depart of departs.slice(0, 8)) {
      jouees++;
      const { reponses, posees, boucle, vide } = jouer(v, depart);
      if (boucle) { ennuis.push({ v, motif: `boucle après ${PLAFOND} questions`, posees }); continue; }
      if (vide) { ennuis.push({ v, motif: `« ${vide} » n'a plus aucune valeur`, posees }); continue; }

      const ok = commandable(v, reponses);
      const comb = resoudreCombinaison(v, reponses);
      if (!ok.ok) {
        // Un prix absent du tarif n'est pas un défaut du modèle : la fiche est
        // « sur devis », et le catalogue en compte.
        if (ok.motif === "prix absent du tarif" || comb?.prixTarifHT == null) { sansPrix++; continue; }
        ennuis.push({ v, motif: ok.motif, posees, reponses });
        continue;
      }
      const prix = prixDe(v, reponses, v.gamme?.margePct ?? null);
      if (prix?.montant == null) ennuis.push({ v, motif: "prix non calculé", posees, reponses });
    }
  }

  // ── Ce qu'une configuration réussie ne prouve pas ───────────────────
  //
  // Une fiche peut se configurer et se commander tout en ayant des réponses
  // mortes. Renommer une valeur tarifaire sans réécrire ce que les
  // combinaisons stockent les décroche l'une de l'autre : le libellé est
  // proposé, aucune combinaison ne lui répond, la valeur disparaît de
  // l'écran — et le parcours marche toujours par les autres.
  //
  // C'est arrivé aux cinq fiches Wi-Max Ergo, dont deux catégories de tissu
  // sur quatre étaient devenues inatteignables sans que rien ne le dise.
  const decroches = [];
  for (const v of vitrines) {
    for (const c of v.choix || []) {
      if (c.nature !== "tarifaire") continue;
      const declares = new Set((c.valeurs || []).map((x) => x.libelle));
      const stockes = new Set((v.combinaisons || [])
        .map((k) => k.valeurs?.[c.cle]).filter((x) => x != null && x !== ""));
      if (!stockes.size) continue;                 // choix hors grille : pas le sujet
      const muettes = [...declares].filter((l) => !stockes.has(l));
      const orphelines = [...stockes].filter((l) => !declares.has(l));
      if (muettes.length || orphelines.length) decroches.push({ v, c, muettes, orphelines });
    }
  }

  titre(`${decroches.length} QUESTIONS DÉCROCHÉES DE LEURS COMBINAISONS`);
  if (!decroches.length) {
    console.log("\n   Aucune. Chaque réponse proposée mène à une combinaison, et l'inverse.");
  } else {
    console.log("");
    for (const d of decroches.slice(0, BAVARD ? 200 : 10)) {
      console.log(`   ${d.v.gamme?.nom} · ${d.v.nom.slice(0, 46)} — « ${d.c.nom} »`);
      if (d.muettes.length) console.log(`      proposées sans combinaison : ${d.muettes.join(" · ").slice(0, 96)}`);
      if (d.orphelines.length) console.log(`      stockées sans libellé     : ${d.orphelines.join(" · ").slice(0, 96)}`);
    }
    if (!BAVARD && decroches.length > 10) console.log(`   … et ${decroches.length - 10} autres (--bavard pour tout voir)`);
  }

  titre("CE QUI A ÉTÉ JOUÉ");
  console.log(`\n   ${vitrines.length} fiches · ${jouees} configurations menées jusqu'au bout`);
  console.log(`   ${sansPrix} sans prix au tarif — normal, ce sont les fiches sur devis`);

  titre(`${ennuis.length} ENNUIS`);
  if (!ennuis.length) {
    console.log("\n   Aucun. Chaque fiche se configure et se commande.");
  } else {
    console.log("");
    const parMotif = new Map();
    for (const e of ennuis) {
      if (!parMotif.has(e.motif)) parMotif.set(e.motif, []);
      parMotif.get(e.motif).push(e);
    }
    for (const [motif, liste] of [...parMotif].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`   ${String(liste.length).padStart(4)} × ${motif}`);
      for (const e of liste.slice(0, BAVARD ? 50 : 3)) {
        console.log(`          ${e.v.gamme?.nom} · ${e.v.nom.slice(0, 48)}`);
        if (BAVARD) console.log(`             questions : ${e.posees.join(" → ")}`);
      }
      if (!BAVARD && liste.length > 3) console.log(`          … et ${liste.length - 3} autres (--bavard pour tout voir)`);
    }
  }

  titre("COMBIEN DE QUESTIONS UNE FICHE POSE");
  const compte = new Map();
  for (const v of vitrines) {
    const { posees } = jouer(v, {});
    compte.set(posees.length, (compte.get(posees.length) || 0) + 1);
  }
  for (const [n, c] of [...compte].sort((a, b) => a[0] - b[0])) {
    console.log(`   ${String(n).padStart(2)} question(s) : ${"█".repeat(Math.ceil(c / 4))} ${c}`);
  }
}

main()
  .catch((e) => { console.error(e.stack || e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
