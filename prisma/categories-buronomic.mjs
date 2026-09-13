import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rattache les produits Buronomic aux bonnes sous-catégories.
//
// Les imports avaient tout rangé en « Bureaux ergonomiques » et laissé
// les rangements sans sous-catégorie : la navigation par sous-catégorie
// affichait des compteurs à zéro sur la plupart des entrées.
//
// Le rattachement dépend du produit, pas seulement de la gamme : Alto
// contient des bureaux, des tables de réunion et des rangements. On
// reconnaît la nature du produit à son nom.

const APPLIQUER = process.argv.includes("--appliquer");

const normalise = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const slugify = (s) =>
  normalise(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Deux sous-catégories manquent à la taxonomie. Une cabine acoustique
// n'est pas une cloison — c'est un volume fermé, avec ventilation et
// éclairage. Un gradin n'est ni un siège ni une table.
const SOUS_CATEGORIES_A_CREER = [
  { categorie: "Acoustique", nom: "Cabines" },
  { categorie: "Mobilier d'accueil", nom: "Gradins et estrades" },
];

// Chaque règle s'applique aux produits d'une gamme dont le nom contient
// l'un des mots-clés. L'ordre compte : la première règle qui correspond
// l'emporte, les suivantes sont ignorées.
//
// Sans « contient », la règle vaut pour tous les produits de la gamme.
const REGLES = [
  // ── Bureaux ──
  // Astrolite en version réglable est le seul vrai bureau ergonomique :
  // les autres sont des plans à hauteur fixe, collaboratifs ou classiques.
  { gammes: ["Astrolite"], contient: ["multiposte", "console"], cat: "Bureaux", sous: "Bureaux collaboratifs" },
  { gammes: ["Astrolite"], contient: ["plan droit", "plan compact"], cat: "Bureaux", sous: "Bureaux ergonomiques" },
  { gammes: ["Astro", "Partage"], contient: ["bureau"], cat: "Bureaux", sous: "Bureaux collaboratifs" },
  { gammes: ["Alto"], contient: ["bureau"], cat: "Bureaux", sous: "Bureaux ergonomiques" },
  { gammes: ["Envol One"], cat: "Bureaux", sous: "Bureaux ergonomiques" },
  { gammes: ["Essentiel"], contient: ["bureau", "plan"], cat: "Bureaux", sous: "Bureaux classiques" },
  { gammes: ["Retro", "Rétro"], cat: "Bureaux", sous: "Bureaux classiques" },
  { gammes: ["Astro Direction", "Stricto Direction"], contient: ["bureau", "console"], cat: "Bureaux", sous: "Bureaux direction" },

  // ── Tables ──
  { gammes: ["Astrolite Haute", "Cohésion"], cat: "Tables", sous: "Tables polyvalentes" },
  { gammes: ["Solution"], cat: "Rangements", sous: "Tables pliantes/abattantes" },
  { gammes: ["Alto Réunion", "Prestige réunion", "Rencontre"], cat: "Tables", sous: "Tables de réunion" },
  { gammes: ["Alto", "Astro", "Astrolite", "Partage"], contient: ["table"], cat: "Tables", sous: "Tables de réunion" },

  // ── Rangements ──
  // Quiétude mélange armoires et bibliothèques : la hauteur fait la
  // différence, et elle est dans le nom du produit.
  { gammes: ["Quietude", "Quiétude"], contient: ["bibliothèque"], cat: "Rangements", sous: "Bibliothèques" },
  { gammes: ["Quietude", "Quiétude"], contient: ["console"], cat: "Rangements", sous: "Caissons" },
  { gammes: ["Quietude", "Quiétude"], cat: "Rangements", sous: "Armoires" },
  { gammes: ["Comfort"], cat: "Rangements", sous: "Caissons" },
  { gammes: ["Classif"], cat: "Rangements", sous: "Archivage" },
  { gammes: ["Alto"], contient: ["caisson"], cat: "Rangements", sous: "Caissons" },
  { gammes: ["Alto"], contient: ["rangement"], cat: "Rangements", sous: "Armoires" },

  // ── Acoustique ──
  // Les cloisons Bewall existent en piétement fixe ou mobile selon la
  // déclinaison : le choix se fait dans la fiche, pas au catalogue.
  { gammes: ["Bewall"], contient: ["cloison"], cat: "Acoustique", sous: "Cloisons fixes" },
  { gammes: ["Bewall"], contient: ["séparateur"], cat: "Acoustique", sous: "Accessoires" },
  { gammes: ["Essentielle"], cat: "Acoustique", sous: "Cabines" },

  // ── Mobilier d'accueil ──
  { gammes: ["Modul Up", "Modul'Up"], cat: "Mobilier d'accueil", sous: "Gradins et estrades" },
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  // ── Création des sous-catégories manquantes ──
  for (const sc of SOUS_CATEGORIES_A_CREER) {
    const cat = await prisma.categorie.findFirst({
      where: { nom: sc.categorie },
      include: { sousCategories: { select: { nom: true, ordre: true } } },
    });

    if (!cat) { console.log(`⚠ Catégorie « ${sc.categorie} » introuvable.`); continue; }

    const existe = cat.sousCategories.some((s) => normalise(s.nom) === normalise(sc.nom));
    if (existe) continue;

    console.log(`+ ${sc.categorie} › ${sc.nom}${APPLIQUER ? "" : "  (à créer)"}`);

    if (!APPLIQUER) continue;

    const dernier = Math.max(-1, ...cat.sousCategories.map((s) => s.ordre ?? 0));
    await prisma.sousCategorie.create({
      data: {
        // Le modèle n'a pas de valeur par défaut sur l'identifiant :
        // il faut le fournir, comme le fait l'admin à la création.
        id: crypto.randomUUID(),
        nom: sc.nom,
        slug: slugify(sc.nom),
        categorieId: cat.id,
        ordre: dernier + 1,
      },
    });
  }

  // Relecture après création, pour que les nouvelles entrées soient vues.
  const categories = await prisma.categorie.findMany({
    include: { sousCategories: { select: { id: true, nom: true } } },
  });

  const marque = await prisma.marque.findFirst({
    where: { slug: "buronomic" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Buronomic introuvable."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: {
      gamme: { marqueId: marque.id },
      // Les accessoires gardent leur catégorie « Accessoires », qui porte
      // le drapeau estOption : c'est elle qui les rend sélectionnables
      // dans l'onglet Options.
      categories: { none: { estOption: true } },
    },
    include: {
      gamme: { select: { nom: true } },
      categories: { select: { nom: true } },
      sousCategories: { select: { nom: true } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  let traites = 0, changes = 0;
  const nonTraites = [];
  let gammeCourante = null;

  for (const v of vitrines) {
    const nomGamme = normalise(v.gamme.nom);
    const nomProduit = normalise(v.nom);

    const regle = REGLES.find((r) => {
      const gammeOk = r.gammes.some((g) => normalise(g) === nomGamme);
      if (!gammeOk) return false;
      if (!r.contient) return true;
      return r.contient.some((mot) => nomProduit.includes(normalise(mot)));
    });

    if (!regle) {
      nonTraites.push(`${v.gamme.nom} — ${v.nom}`);
      continue;
    }

    const cat = categories.find((c) => normalise(c.nom) === normalise(regle.cat));
    if (!cat) { nonTraites.push(`${v.gamme.nom} — ${v.nom} (catégorie « ${regle.cat} » introuvable)`); continue; }

    const sous = cat.sousCategories.find((s) => normalise(s.nom) === normalise(regle.sous));
    if (!sous) { nonTraites.push(`${v.gamme.nom} — ${v.nom} (sous-catégorie « ${regle.sous} » introuvable)`); continue; }

    // Rien à faire si le produit est déjà au bon endroit.
    const dejaBon =
      v.categories.length === 1 && normalise(v.categories[0].nom) === normalise(cat.nom) &&
      v.sousCategories.length === 1 && normalise(v.sousCategories[0].nom) === normalise(sous.nom);

    traites++;
    if (dejaBon) continue;

    if (v.gamme.nom !== gammeCourante) {
      gammeCourante = v.gamme.nom;
      console.log(`\n${gammeCourante}`);
    }

    const actuel = v.sousCategories.map((s) => s.nom).join(", ") || "aucune";
    console.log(`   ${v.nom.slice(0, 46).padEnd(46)} ${actuel} → ${sous.nom}`);
    changes++;

    if (!APPLIQUER) continue;

    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: {
        // set remplace les rattachements existants plutôt que d'accumuler.
        categories: { set: [{ id: cat.id }] },
        sousCategories: { set: [{ id: sous.id }] },
        // Les principales déterminent l'URL publique du produit.
        categoriePrincipaleId: cat.id,
        sousCategoriePrincipaleId: sous.id,
      },
    });
  }

  console.log(`\n═══ ${changes} changement(s) sur ${traites} produit(s) ═══`);

  if (nonTraites.length) {
    console.log(`\n${nonTraites.length} produit(s) sans règle :`);
    nonTraites.forEach((l) => console.log(`   ${l}`));
  }

  if (!APPLIQUER) {
    console.log("\nnode prisma\\categories-buronomic.mjs --appliquer");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());