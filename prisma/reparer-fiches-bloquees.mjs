// Débloque les fiches qu'un client ne pouvait ni commander ni faire chiffrer.
//
//   node prisma/reparer-fiches-bloquees.mjs
//   node prisma/reparer-fiches-bloquees.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// CE QUE LE BALAYAGE A TROUVÉ
//   Onze fiches publiées sur cinq cent quatre-vingts ne passaient pas
//   commandable(). Neuf étaient de fausses alertes — les cabines Essentielle
//   et les tisaneries Oasys sont vendues sur devis et n'ont donc pas de prix.
//   Le moteur en exigeait un et désactivait leur bouton, qui affichait « prix
//   absent du tarif » au lieu de « Demander un devis » : corrigé dans
//   lib/modeleProduit.js, pas ici.
//
//   Restent deux vrais défauts.
//
// 1. « Canapé sur piétement arche - Alto » — l'axe à une seule valeur
//   Page 344, le tarif vend le canapé en deux temps : l'élément de DÉPART
//   (DZ89, L 120 cm, 1095 €) et l'ÉLÉMENT SUIVANT (DZ91, L 117,5 cm, 955 €)
//   qui vient s'y accoler en partageant un piétement.
//
//   La fiche porte bien un axe « Élément »… avec une seule valeur, « Suivant ».
//   Les quarante-huit combinaisons de départ expriment leur nature par
//   l'ABSENCE de la clé. Le moteur ne peut pas s'en sortir : une étape à une
//   seule valeur atteignable n'est pas posée, la clé reste sans réponse, le
//   filtrage ne s'applique pas, et deux combinaisons restent en lice. La
//   fiche se déclarait « aucune combinaison ne correspond » — bouton mort.
//
//   On rend sa première valeur à l'axe et on la pose sur les combinaisons qui
//   l'exprimaient par le silence.
//
// 2. « Coussins - Arco » — un produit qui n'en est pas un
//   Le tarif OfficePro, page 2, vend « BANQUETTE ARCO TISSU NON FEU — inclus
//   2 coussins ARCO 45x45 au choix » à 420 €. Les références KOUS05BE-ARC,
//   KOUS05BL-ARC… n'ont pas de prix parce qu'elles ne se vendent pas : ce
//   sont les coloris des coussins FOURNIS avec la banquette.
//
//   La fiche sort donc du catalogue — accessoireSeul, pas de suppression :
//   elle reste joignable par son adresse et le choix reste disponible là où
//   il a un sens.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);

const DEPART = "Élément de départ";
const SUIVANT = "Élément suivant";

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // ── 1. Le canapé Alto ────────────────────────────────────────────────
  titre("CANAPÉ SUR PIÉTEMENT ARCHE - ALTO");
  const alto = await prisma.produitVitrine.findFirst({
    where: { nom: "Canapé sur piétement arche - Alto" },
    select: { id: true, nom: true,
      choix: { select: { id: true, cle: true, nom: true, valeurs: { select: { id: true, libelle: true } } } },
      combinaisons: { select: { id: true, valeurs: true, referenceBase: true, prixTarifHT: true } } },
  });
  let planAlto = null;
  if (!alto) {
    console.log("   fiche introuvable");
  } else {
    const axe = alto.choix.find((c) => c.cle === "element");
    if (!axe) console.log("   pas d'axe « element »");
    else {
      const sans = alto.combinaisons.filter((k) => k.valeurs?.element == null);
      const avec = alto.combinaisons.filter((k) => k.valeurs?.element != null);
      // Le garde-fou : les combinaisons SANS clé doivent toutes porter la
      // racine du départ, et celles AVEC celle du suivant. Sinon on ne
      // comprend pas ce qu'on répare.
      const racine = (k) => String(k.referenceBase || "").slice(0, 4);
      const racinesSans = [...new Set(sans.map(racine))];
      const racinesAvec = [...new Set(avec.map(racine))];
      console.log(`   sans clé « element » : ${sans.length} combinaisons · racines ${racinesSans.join(", ")}`);
      console.log(`   avec clé « element » : ${avec.length} combinaisons · racines ${racinesAvec.join(", ")}`);
      const croisement = racinesSans.filter((r) => racinesAvec.includes(r));
      if (croisement.length) {
        console.log(`   ✗ les racines se croisent (${croisement.join(", ")}) — on ne touche à rien`);
      } else if (!sans.length) {
        console.log("   rien à faire : toutes les combinaisons portent déjà la clé");
      } else {
        const combos = sans.map((k) => {
          const valeurs = { ...(k.valeurs || {}), element: DEPART };
          return { id: k.id, valeurs, empreinte: empreinteDe(valeurs) };
        });
        const toutes = [...combos.map((c) => c.empreinte),
          ...avec.map((k) => empreinteDe(k.valeurs))];
        if (new Set(toutes).size !== toutes.length) {
          console.log("   ✗ deux combinaisons se confondraient — on ne touche à rien");
        } else {
          const prixDepart = sans.map((k) => k.prixTarifHT).filter((x) => x != null);
          const prixSuivant = avec.map((k) => k.prixTarifHT).filter((x) => x != null);
          console.log(`\n   « ${axe.nom} » : « ${SUIVANT} »  →  « ${DEPART} » · « ${SUIVANT} »`);
          console.log(`      ${DEPART.padEnd(20)} ${racinesSans.join(", ")}  ${Math.min(...prixDepart)}→${Math.max(...prixDepart)} €`);
          console.log(`      ${SUIVANT.padEnd(20)} ${racinesAvec.join(", ")}  ${Math.min(...prixSuivant)}→${Math.max(...prixSuivant)} €`);
          planAlto = { vitrineId: alto.id, axe, combos, ancienne: axe.valeurs.find((v) => v.libelle === "Suivant") };
        }
      }
    }
  }

  // ── 2. Les coussins Arco ─────────────────────────────────────────────
  titre("COUSSINS - ARCO");
  const arco = await prisma.produitVitrine.findFirst({
    where: { nom: "Coussins - Arco" },
    select: { id: true, nom: true, publie: true, accessoireSeul: true,
      combinaisons: { select: { referenceBase: true, prixTarifHT: true } } },
  });
  let planArco = null;
  if (!arco) console.log("   fiche introuvable");
  else if (arco.accessoireSeul) console.log("   déjà hors catalogue");
  else {
    const avecPrix = arco.combinaisons.filter((k) => k.prixTarifHT != null);
    if (avecPrix.length) {
      console.log(`   ✗ ${avecPrix.length} combinaisons ONT un prix — ce n'est pas le cas décrit, on ne touche à rien`);
    } else {
      console.log(`   ${arco.combinaisons.length} combinaison(s), aucune avec prix : ${arco.combinaisons.map((k) => k.referenceBase).join(", ")}`);
      console.log("   → sort du catalogue (accessoireSeul), les coussins sont fournis avec la banquette");
      planArco = arco;
    }
  }

  if (!APPLIQUER) { console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire."); return; }

  if (planAlto) {
    // La valeur « Suivant » prend son nom complet, et « Départ » la rejoint.
    if (planAlto.ancienne) {
      await prisma.valeurChoix.update({ where: { id: planAlto.ancienne.id }, data: { libelle: SUIVANT, ordre: 1 } });
    }
    await prisma.valeurChoix.create({ data: { choixId: planAlto.axe.id, libelle: DEPART, ordre: 0 } });
    for (const c of planAlto.combos) {
      await prisma.combinaison.update({ where: { id: c.id }, data: { valeurs: c.valeurs, empreinte: c.empreinte } });
    }
    // Les combinaisons « suivant » citaient « Suivant » : on suit le renommage.
    // Filtré sur LA fiche : sans ce vitrineId, findMany rendrait toutes les
    // combinaisons du catalogue et le renommage déborderait très loin.
    const restantes = await prisma.combinaison.findMany({
      where: { vitrineId: planAlto.vitrineId }, select: { id: true, valeurs: true },
    });
    for (const k of restantes) {
      if (k.valeurs?.element !== "Suivant") continue;
      const valeurs = { ...k.valeurs, element: SUIVANT };
      await prisma.combinaison.update({ where: { id: k.id }, data: { valeurs, empreinte: empreinteDe(valeurs) } });
    }
  }
  if (planArco) {
    await prisma.produitVitrine.update({ where: { id: planArco.id }, data: { accessoireSeul: true } });
  }
  console.log("\nÉcrit.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
