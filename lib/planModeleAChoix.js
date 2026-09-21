import { empreinteDe } from "./empreinteCombinaison.js";

// Écrire le modèle à choix d'une fiche à partir de ce que l'import a lu du
// tarif fournisseur.
//
// POURQUOI CE MODULE EXISTE
//   L'import écrivait `axesDeclinaisons`, `declinaisons` et `groupesFinition`
//   — les champs JSON du modèle d'avant. La boutique ne les lit plus. Une
//   gamme importée arrivait donc muette : aucune question posée au client,
//   aucun prix, une fiche vide. En silence.
//
//   Plutôt que de récrire le lecteur de tarif, qui marche, on traduit ce
//   qu'il a lu. La traduction est directe parce que l'import EST la source :
//   il n'a rien à deviner, là où la migration devait retrouver dans le tarif
//   à quoi correspondaient des données déjà en base.
//
// CE QU'ELLE PRODUIT
//   Un Choix tarifaire par axe, une ValeurChoix par valeur, une Combinaison
//   par déclinaison. Un Choix finition par groupe de finitions.
//
// LA RÉFÉRENCE
//   Chaque déclinaison du tarif porte sa référence complète. Aucun choix ne
//   reçoit donc de rang d'assemblage : la référence vient de la combinaison,
//   pas d'une somme de suffixes. C'est le plus simple des trois cas que
//   docs/modele-produit.md décrit, et le seul que l'import sache produire
//   sans interpréter le codage du fournisseur.
//
// POURQUOI LE PLAN EST SÉPARÉ DE L'ÉCRITURE
//   Pour qu'il se vérifie. prisma/verifier-import-modele.mjs rejoue le plan
//   sur les cinq cent cinquante-cinq fiches déjà migrées et compare ce qu'il
//   produirait à ce qu'elles portent — sans rien écrire.
//
// CE MODULE NE PARLE PAS À LA BASE
//   Il calcule le plan, et rien d'autre — comme modeleProduit raisonne quand
//   chargerProduit interroge. C'est ce qui permet de le rejouer sur les cinq
//   cent cinquante-cinq fiches déjà migrées pour voir s'il retombe dessus,
//   sans rien écrire.

const slug = (s) => String(s || "")
  .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const nombre = (v) => {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

/** Une clé qui n'est pas déjà prise sur cette fiche. */
function cleLibre(base, prises) {
  const racine = base || "choix";
  let cle = racine;
  let i = 2;
  while (prises.has(cle)) { cle = `${racine}-${i}`; i += 1; }
  prises.add(cle);
  return cle;
}

/**
 * Le plan, sans rien écrire.
 *
 * @param source { axesDeclinaisons, declinaisons, groupesFinition }
 * @returns { choix: [...], combinaisons: [...], ignorees }
 */
export function planModeleAChoix(source = {}) {
  const axes = Array.isArray(source.axesDeclinaisons) ? source.axesDeclinaisons : [];
  const declinaisons = Array.isArray(source.declinaisons) ? source.declinaisons : [];
  const groupes = Array.isArray(source.groupesFinition) ? source.groupesFinition : [];

  const prises = new Set();
  const choix = [];
  let ordre = 0;

  // ── Les questions qui font le prix ───────────────────────────────────
  //
  // Les valeurs viennent de l'axe ET des déclinaisons : un tarif déclare
  // parfois un axe dont il n'emploie qu'une partie des valeurs, et parfois
  // l'inverse. Prendre la réunion évite une combinaison qui cite une valeur
  // que le choix ignore — la fiche ne saurait plus quoi en faire.
  const cleParAxe = new Map();
  for (const axe of axes) {
    if (!axe?.nom) continue;
    const axeId = axe.id || slug(axe.nom);
    const declarees = Array.isArray(axe.valeurs) ? axe.valeurs : [];
    const employees = declinaisons.map((d) => d.valeurs?.[axeId]);
    // Le tri vient avant la conversion en texte : sans cela un axe qui ne
    // porte qu'un `null` — « Référence », sur les fiches à prix unique —
    // devient une question dont l'unique réponse s'appelle « null ».
    const valeurs = [...new Set(
      [...declarees, ...employees].filter((x) => x != null && x !== "").map(String),
    )];
    if (!valeurs.length) continue;

    // La clé est celle de l'axe, pas celle de son nom : les déclinaisons
    // désignent leurs valeurs par elle. « Passage des câbles » a pour clé
    // `passage`, et bâtir `passage-des-cables` détacherait la combinaison de
    // la question qu'elle répond.
    const cle = cleLibre(axeId || slug(axe.nom), prises);
    cleParAxe.set(axeId, cle);
    choix.push({
      cle, nom: axe.nom, nature: "tarifaire", rendu: "boutons", ordre: ordre++,
      valeurs: valeurs.map((libelle, i) => ({ libelle, ordre: i })),
    });
  }

  // ── Les variantes et leurs prix ──────────────────────────────────────
  //
  // Les clés de `valeurs` sont celles des Choix, pas celles du JSON : un axe
  // dont le nom a été normalisé change de clé, et une combinaison qui garde
  // l'ancienne ne se rattache plus à rien.
  const vues = new Set();
  const combinaisons = [];
  let ignorees = 0;
  for (const d of declinaisons) {
    const valeurs = {};
    for (const [axeId, valeur] of Object.entries(d.valeurs || {})) {
      const cle = cleParAxe.get(axeId);
      if (cle && valeur != null && valeur !== "") valeurs[cle] = String(valeur);
    }

    // Une variante sans aucune réponse n'est pas une anomalie : c'est un
    // produit vendu tel quel, qui porte son prix et sa référence sans que
    // rien ne se choisisse. La jeter le laissait sans prix.

    const empreinte = empreinteDe(valeurs);
    // Deux lignes du tarif pour la même variante : on garde la première et on
    // laisse la seconde, plutôt que de faire échouer tout l'import sur une
    // contrainte d'unicité.
    if (vues.has(empreinte)) { ignorees += 1; continue; }
    vues.add(empreinte);

    combinaisons.push({
      valeurs, empreinte,
      prixTarifHT: nombre(d.prixTarifHT),
      ecoContribution: nombre(d.ecoContribution),
      referenceBase: (d.referenceFournisseur || "").trim() || null,
      ancienId: d.id || null,
    });
  }

  // ── Les finitions, qui ne touchent ni au prix ni à la référence ──────
  for (const g of groupes) {
    if (!g?.nom) continue;
    const finitions = (Array.isArray(g.finitions) ? g.finitions : []).filter((f) => f?.nom);
    choix.push({
      cle: cleLibre(slug(g.nom), prises),
      nom: g.nom, nature: "finition", rendu: "pastilles", ordre: ordre++,
      valeurs: finitions.map((f, i) => ({
        libelle: f.nom,
        couleur: f.couleur || null,
        imageUrl: f.imageUrl || null,
        ordre: i,
        // Sans jeton : le tarif porte la référence entière sur la
        // déclinaison, la finition n'y ajoute rien.
        suffixeReference: null,
      })),
    });
  }

  return { choix, combinaisons, ignorees };
}
