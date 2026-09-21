"use server";

// Les actions de la fiche produit en administration.
//
// Elles écrivent dans le modèle à choix, valeurs, combinaisons et visuels.
// Chacune renvoie { ok } ou { ok: false, error } : l'écran affiche le motif
// plutôt qu'un échec muet.
//
// LA RÈGLE QUI LES TIENT
//   Ce qui tient dans un champ s'édite en ligne ; tout le reste ouvre la
//   fiche. Ces actions sont donc courtes et nombreuses, plutôt qu'une grosse
//   sauvegarde qui réécrirait tout et ferait perdre le travail d'un autre.

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { empreinteDe } from "@/lib/empreinteCombinaison";

const nb = (v) => {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

const rafraichir = (id) => {
  revalidatePath(`/admin/produits/${id}`);
  revalidatePath("/admin/produits");
};

const cleDepuis = (nom, prises) => {
  const base = String(nom || "")
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "choix";
  let cle = base;
  let i = 2;
  while (prises.has(cle)) { cle = `${base}-${i}`; i += 1; }
  return cle;
};

// ── Identité ──────────────────────────────────────────────────────────────

export async function majIdentite(vitrineId, champs) {
  await exigerAdmin();
  const data = {};
  if (typeof champs.nom === "string") {
    const nom = champs.nom.trim();
    if (!nom) return { ok: false, error: "Le nom ne peut pas être vide." };
    data.nom = nom;
  }
  if (typeof champs.descriptif === "string") data.descriptif = champs.descriptif.trim() || null;
  if (typeof champs.publie === "boolean") data.publie = champs.publie;
  if (typeof champs.venteSurDevis === "boolean") data.venteSurDevis = champs.venteSurDevis;
  if (typeof champs.accessoireSeul === "boolean") data.accessoireSeul = champs.accessoireSeul;
  if (typeof champs.bestSeller === "boolean") data.bestSeller = champs.bestSeller;
  if (typeof champs.enAvant === "boolean") data.enAvant = champs.enAvant;
  if (champs.prixAPartir !== undefined) data.prixAPartir = nb(champs.prixAPartir);
  if (Array.isArray(champs.sectionsDevis)) data.sectionsDevis = champs.sectionsDevis;

  // L'adresse publique. La changer casse les liens déjà partagés et ce que
  // les moteurs ont indexé : elle ne bouge qu'à la demande, jamais en
  // conséquence d'un renommage.
  if (typeof champs.slug === "string") {
    const slug = champs.slug.trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!slug) return { ok: false, error: "L'adresse ne peut pas être vide." };
    data.slug = slug;
  }

  // Déplacer la fiche dans une autre gamme ; son adresse doit y rester unique.
  if (typeof champs.gammeId === "string" && champs.gammeId) data.gammeId = champs.gammeId;

  if (!Object.keys(data).length) return { ok: true };

  try {
    await prisma.produitVitrine.update({ where: { id: vitrineId }, data });
  } catch (e) {
    if (e?.code === "P2002") {
      return { ok: false, error: "Une autre fiche de cette gamme porte déjà cette adresse." };
    }
    throw e;
  }
  rafraichir(vitrineId);
  return { ok: true };
}

/**
 * Les rayons où la fiche paraît.
 *
 * La catégorie suit la sous-catégorie : une fiche rangée dans « Fauteuils de
 * direction » appartient à « Sièges ». Laisser les deux se saisir séparément
 * produit des fiches visibles dans un rayon dont la catégorie les ignore.
 */
export async function majRayons(vitrineId, sousCategorieIds = []) {
  await exigerAdmin();
  const sous = await prisma.sousCategorie.findMany({
    where: { id: { in: sousCategorieIds } },
    select: { id: true, categorieId: true },
  });
  const categorieIds = [...new Set(sous.map((s) => s.categorieId))];

  await prisma.produitVitrine.update({
    where: { id: vitrineId },
    data: {
      sousCategories: { set: sous.map((s) => ({ id: s.id })) },
      categories: { set: categorieIds.map((id) => ({ id })) },
      // Le rayon principal, qui porte l'adresse publique, ne peut pas désigner
      // un rayon dont la fiche vient de sortir.
      ...(sous.length ? {} : { sousCategoriePrincipaleId: null, categoriePrincipaleId: null }),
    },
  });
  rafraichir(vitrineId);
  revalidatePath("/", "layout");
  return { ok: true, rayons: sous.length };
}

/** Les rayons et les gammes, pour les sélecteurs de l'onglet Identité. */
export async function listerRangements() {
  await exigerAdmin();
  const [categories, gammes] = await Promise.all([
    prisma.categorie.findMany({
      orderBy: { ordre: "asc" },
      select: {
        id: true, nom: true,
        sousCategories: { orderBy: { ordre: "asc" }, select: { id: true, nom: true } },
      },
    }),
    prisma.gamme.findMany({
      orderBy: [{ marque: { nom: "asc" } }, { nom: "asc" }],
      select: { id: true, nom: true, marque: { select: { nom: true } } },
    }),
  ]);
  return { categories, gammes };
}

// ── Choix ─────────────────────────────────────────────────────────────────

export async function creerChoix(vitrineId, { nom, nature }) {
  await exigerAdmin();
  const propre = (nom || "").trim();
  if (!propre) return { ok: false, error: "Donnez un nom à ce choix." };
  if (!["tarifaire", "finition", "option"].includes(nature)) {
    return { ok: false, error: "Nature inconnue." };
  }

  const existants = await prisma.choix.findMany({
    where: { vitrineId }, select: { cle: true, ordre: true },
  });
  const cle = cleDepuis(propre, new Set(existants.map((c) => c.cle)));
  const ordre = existants.reduce((m, c) => Math.max(m, c.ordre), -1) + 1;

  await prisma.choix.create({
    data: {
      vitrineId, cle, nom: propre, nature, ordre,
      rendu: nature === "finition" ? "pastilles" : nature === "option" ? "cases" : "boutons",
      // Ce que l'admin crée lui appartient : le réimport du tarif n'y touchera
      // pas, à la différence de ce qui vient du fournisseur.
      origine: "editorial",
    },
  });
  rafraichir(vitrineId);
  return { ok: true };
}

export async function majChoix(choixId, champs) {
  await exigerAdmin();
  const choix = await prisma.choix.findUnique({ where: { id: choixId }, select: { vitrineId: true } });
  if (!choix) return { ok: false, error: "Choix introuvable." };

  const data = {};
  if (typeof champs.nom === "string") {
    const nom = champs.nom.trim();
    if (!nom) return { ok: false, error: "Le nom ne peut pas être vide." };
    data.nom = nom;
  }
  if (typeof champs.rendu === "string") data.rendu = champs.rendu;
  if (typeof champs.obligatoire === "boolean") data.obligatoire = champs.obligatoire;
  if (champs.rangReference !== undefined) {
    data.rangReference = champs.rangReference === "" || champs.rangReference == null
      ? null : parseInt(champs.rangReference, 10);
  }
  if (!Object.keys(data).length) return { ok: true };

  await prisma.choix.update({ where: { id: choixId }, data });
  rafraichir(choix.vitrineId);
  return { ok: true };
}

export async function supprimerChoix(choixId) {
  await exigerAdmin();
  const choix = await prisma.choix.findUnique({
    where: { id: choixId },
    select: { vitrineId: true, cle: true, nature: true, nom: true },
  });
  if (!choix) return { ok: false, error: "Choix introuvable." };

  // Un choix tarifaire cité par des combinaisons ne peut pas partir sans
  // emporter le prix avec lui : on refuse, en disant combien de lignes
  // seraient concernées.
  if (choix.nature === "tarifaire") {
    const combinaisons = await prisma.combinaison.findMany({
      where: { vitrineId: choix.vitrineId }, select: { valeurs: true },
    });
    const citees = combinaisons.filter((c) => c.valeurs && c.valeurs[choix.cle] != null).length;
    if (citees) {
      return { ok: false, error: `« ${choix.nom} » est cité par ${citees} combinaison(s). Retirez-les d'abord.` };
    }
  }

  await prisma.choix.delete({ where: { id: choixId } });
  rafraichir(choix.vitrineId);
  return { ok: true };
}

export async function reordonnerChoix(vitrineId, idsDansLOrdre) {
  await exigerAdmin();
  await prisma.$transaction(
    idsDansLOrdre.map((id, ordre) => prisma.choix.update({ where: { id }, data: { ordre } })),
  );
  rafraichir(vitrineId);
  return { ok: true };
}

// ── Valeurs ───────────────────────────────────────────────────────────────

export async function creerValeur(choixId, { libelle }) {
  await exigerAdmin();
  const choix = await prisma.choix.findUnique({
    where: { id: choixId },
    select: { vitrineId: true, valeurs: { select: { libelle: true, ordre: true } } },
  });
  if (!choix) return { ok: false, error: "Choix introuvable." };

  const propre = (libelle || "").trim();
  if (!propre) return { ok: false, error: "Donnez un libellé à cette valeur." };
  if (choix.valeurs.some((v) => v.libelle === propre)) {
    return { ok: false, error: `« ${propre} » existe déjà dans ce choix.` };
  }

  await prisma.valeurChoix.create({
    data: {
      choixId, libelle: propre,
      ordre: choix.valeurs.reduce((m, v) => Math.max(m, v.ordre), -1) + 1,
    },
  });
  rafraichir(choix.vitrineId);
  return { ok: true };
}

export async function majValeur(valeurId, champs) {
  await exigerAdmin();
  const valeur = await prisma.valeurChoix.findUnique({
    where: { id: valeurId }, select: { libelle: true, choix: { select: { vitrineId: true, cle: true } } },
  });
  if (!valeur) return { ok: false, error: "Valeur introuvable." };

  const data = {};
  if (typeof champs.libelle === "string") {
    const libelle = champs.libelle.trim();
    if (!libelle) return { ok: false, error: "Le libellé ne peut pas être vide." };
    data.libelle = libelle;
  }
  if (champs.couleur !== undefined) data.couleur = champs.couleur || null;
  if (champs.imageUrl !== undefined) data.imageUrl = champs.imageUrl || null;
  // Trois états, et il faut les trois : un jeton, un jeton vide — le groupe
  // n'ajoute rien à la référence — et l'absence de jeton, qui dit que le
  // tarif ne décline pas cette valeur. La chaîne vide n'est donc pas « null ».
  if (champs.suffixeReference !== undefined) {
    data.suffixeReference = champs.suffixeReference === null ? null : String(champs.suffixeReference);
  }
  if (champs.supplementHT !== undefined) data.supplementHT = nb(champs.supplementHT);
  if (champs.modeleId !== undefined) data.modeleId = champs.modeleId || null;
  if (!Object.keys(data).length) return { ok: true };

  // Renommer une valeur tarifaire casserait le lien avec les combinaisons,
  // qui la désignent par son libellé. On répercute dans le même mouvement.
  if (data.libelle && data.libelle !== valeur.libelle) {
    const cle = valeur.choix.cle;
    const combinaisons = await prisma.combinaison.findMany({
      where: { vitrineId: valeur.choix.vitrineId }, select: { id: true, valeurs: true },
    });
    const aReecrire = combinaisons.filter((c) => c.valeurs?.[cle] === valeur.libelle);
    await prisma.$transaction([
      prisma.valeurChoix.update({ where: { id: valeurId }, data }),
      ...aReecrire.map((c) => prisma.combinaison.update({
        where: { id: c.id }, data: { valeurs: { ...c.valeurs, [cle]: data.libelle } },
      })),
    ]);
  } else {
    await prisma.valeurChoix.update({ where: { id: valeurId }, data });
  }

  rafraichir(valeur.choix.vitrineId);
  return { ok: true };
}

export async function supprimerValeur(valeurId) {
  await exigerAdmin();
  const valeur = await prisma.valeurChoix.findUnique({
    where: { id: valeurId },
    select: { libelle: true, choix: { select: { vitrineId: true, cle: true, nature: true, nom: true } } },
  });
  if (!valeur) return { ok: false, error: "Valeur introuvable." };

  if (valeur.choix.nature === "tarifaire") {
    const combinaisons = await prisma.combinaison.findMany({
      where: { vitrineId: valeur.choix.vitrineId }, select: { valeurs: true },
    });
    const citees = combinaisons.filter((c) => c.valeurs?.[valeur.choix.cle] === valeur.libelle).length;
    if (citees) {
      return { ok: false, error: `« ${valeur.libelle} » est cité par ${citees} combinaison(s). Retirez-les d'abord.` };
    }
  }

  await prisma.valeurChoix.delete({ where: { id: valeurId } });
  rafraichir(valeur.choix.vitrineId);
  return { ok: true };
}

/** Crée un choix de finition à partir d'un nuancier entier, valeurs liées. */
export async function tirerDUnNuancier(vitrineId, paletteId, nomChoix) {
  await exigerAdmin();
  const palette = await prisma.paletteFinition.findUnique({
    where: { id: paletteId },
    select: { nom: true, finitions: { orderBy: { ordre: "asc" }, select: { id: true, nom: true, couleur: true, imageUrl: true } } },
  });
  if (!palette) return { ok: false, error: "Nuancier introuvable." };
  if (!palette.finitions.length) return { ok: false, error: "Ce nuancier est vide." };

  const existants = await prisma.choix.findMany({ where: { vitrineId }, select: { cle: true, ordre: true } });
  const nom = (nomChoix || "").trim() || palette.nom;
  const cle = cleDepuis(nom, new Set(existants.map((c) => c.cle)));

  await prisma.choix.create({
    data: {
      vitrineId, cle, nom, nature: "finition", rendu: "nuancier",
      ordre: existants.reduce((m, c) => Math.max(m, c.ordre), -1) + 1,
      origine: "editorial",
      valeurs: {
        // Les valeurs POINTENT vers les modèles au lieu d'en copier la
        // couleur : corriger une pastille dans le nuancier la corrigera ici.
        create: palette.finitions.map((f, i) => ({
          libelle: f.nom, modeleId: f.id, paletteId, ordre: i,
        })),
      },
    },
  });
  rafraichir(vitrineId);
  return { ok: true, ajoutees: palette.finitions.length };
}

// ── Combinaisons ──────────────────────────────────────────────────────────

export async function majCombinaison(combinaisonId, champs) {
  await exigerAdmin();
  const comb = await prisma.combinaison.findUnique({
    where: { id: combinaisonId }, select: { vitrineId: true },
  });
  if (!comb) return { ok: false, error: "Combinaison introuvable." };

  const data = {};
  // Le prix de VENTE ne se saisit jamais : il naît de prixCatalogue, à partir
  // du tarif et de la marge des Réglages. Un prix stocké finirait par
  // diverger du panier.
  if (champs.prixTarifHT !== undefined) data.prixTarifHT = nb(champs.prixTarifHT);
  if (champs.ecoContribution !== undefined) data.ecoContribution = nb(champs.ecoContribution);
  if (champs.poids !== undefined) data.poids = nb(champs.poids);
  if (champs.ean !== undefined) data.ean = champs.ean || null;
  if (champs.referenceBase !== undefined) data.referenceBase = champs.referenceBase || null;
  if (!Object.keys(data).length) return { ok: true };

  await prisma.combinaison.update({ where: { id: combinaisonId }, data });
  rafraichir(comb.vitrineId);
  return { ok: true };
}

export async function supprimerCombinaison(combinaisonId) {
  await exigerAdmin();
  const comb = await prisma.combinaison.findUnique({
    where: { id: combinaisonId }, select: { vitrineId: true },
  });
  if (!comb) return { ok: false, error: "Combinaison introuvable." };
  await prisma.combinaison.delete({ where: { id: combinaisonId } });
  rafraichir(comb.vitrineId);
  return { ok: true };
}

// ── Visuels ───────────────────────────────────────────────────────────────

export async function majVisuel(visuelId, champs) {
  await exigerAdmin();
  const visuel = await prisma.visuel.findUnique({ where: { id: visuelId }, select: { vitrineId: true } });
  if (!visuel) return { ok: false, error: "Visuel introuvable." };

  const data = {};
  if (typeof champs.role === "string") data.role = champs.role;
  if (champs.ordre !== undefined) data.ordre = parseInt(champs.ordre, 10) || 0;
  if (Object.keys(data).length) {
    await prisma.visuel.update({ where: { id: visuelId }, data });
  }

  // Le rattachement est une liste : un visuel montre souvent un piétement ET
  // un plateau. On remplace l'ensemble plutôt que d'ajouter au coup par coup.
  if (Array.isArray(champs.valeurIds)) {
    await prisma.visuelValeur.deleteMany({ where: { visuelId } });
    if (champs.valeurIds.length) {
      await prisma.visuelValeur.createMany({
        data: champs.valeurIds.filter(Boolean).map((valeurChoixId) => ({ visuelId, valeurChoixId })),
        skipDuplicates: true,
      });
    }
  }

  rafraichir(visuel.vitrineId);
  return { ok: true };
}

export async function reordonnerVisuels(vitrineId, idsDansLOrdre) {
  await exigerAdmin();
  await prisma.$transaction(
    idsDansLOrdre.map((id, ordre) => prisma.visuel.update({ where: { id }, data: { ordre } })),
  );
  rafraichir(vitrineId);
  return { ok: true };
}

export async function supprimerVisuel(visuelId) {
  await exigerAdmin();
  const visuel = await prisma.visuel.findUnique({ where: { id: visuelId }, select: { vitrineId: true } });
  if (!visuel) return { ok: false, error: "Visuel introuvable." };
  await prisma.visuel.delete({ where: { id: visuelId } });
  rafraichir(visuel.vitrineId);
  return { ok: true };
}

/** Les nuanciers disponibles, pour le bouton « tirer d'un nuancier ». */
export async function listerNuanciers() {
  await exigerAdmin();
  return prisma.paletteFinition.findMany({
    orderBy: [{ marque: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, marque: true, _count: { select: { finitions: true } } },
  });
}

// ── La bibliothèque de finitions ──────────────────────────────────────────
//
// Une teinte du produit n'est qu'un libellé tant qu'elle ne pointe pas vers
// un modèle de la bibliothèque. Quand elle y pointe, sa pastille et sa
// couleur viennent de là : corriger le nuancier corrige toutes les fiches
// d'un coup, au lieu de rejouer un script sur deux mille finitions.

/** Les nuanciers ET leurs teintes, pour choisir à la pastille. */
export async function listerBibliotheque() {
  await exigerAdmin();
  return prisma.paletteFinition.findMany({
    orderBy: [{ marque: "asc" }, { nom: "asc" }],
    select: {
      id: true, nom: true, marque: true,
      finitions: {
        orderBy: { ordre: "asc" },
        select: { id: true, nom: true, couleur: true, imageUrl: true },
      },
    },
  });
}

/** Lie une valeur à un modèle du nuancier — ou l'en détache si modeleId est vide. */
export async function lierAuModele(valeurId, modeleId) {
  await exigerAdmin();
  const valeur = await prisma.valeurChoix.findUnique({
    where: { id: valeurId }, select: { choix: { select: { vitrineId: true } } },
  });
  if (!valeur) return { ok: false, error: "Valeur introuvable." };

  if (!modeleId) {
    await prisma.valeurChoix.update({
      where: { id: valeurId }, data: { modeleId: null, paletteId: null },
    });
    rafraichir(valeur.choix.vitrineId);
    return { ok: true };
  }

  const modele = await prisma.finitionModele.findUnique({
    where: { id: modeleId }, select: { id: true, paletteId: true },
  });
  if (!modele) return { ok: false, error: "Cette teinte n'est plus dans la bibliothèque." };

  // On ne recopie ni la couleur ni la pastille : elles s'héritent. Et on efface
  // la surcharge locale, sans quoi l'ancienne couleur masquerait la nouvelle.
  await prisma.valeurChoix.update({
    where: { id: valeurId },
    data: { modeleId: modele.id, paletteId: modele.paletteId, couleur: null, imageUrl: null },
  });
  rafraichir(valeur.choix.vitrineId);
  return { ok: true };
}

/**
 * Relie d'un coup toutes les teintes d'un choix qui portent le nom d'une
 * teinte du nuancier. C'est le geste courant : un groupe importé du tarif
 * a les bons libellés et aucune pastille.
 */
export async function apparierNuancier(choixId, paletteId) {
  await exigerAdmin();
  const [choix, palette] = await Promise.all([
    prisma.choix.findUnique({
      where: { id: choixId },
      select: { vitrineId: true, valeurs: { select: { id: true, libelle: true, modeleId: true } } },
    }),
    prisma.paletteFinition.findUnique({
      where: { id: paletteId },
      select: { id: true, finitions: { select: { id: true, nom: true } } },
    }),
  ]);
  if (!choix) return { ok: false, error: "Choix introuvable." };
  if (!palette) return { ok: false, error: "Nuancier introuvable." };

  const clef = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  const parNom = new Map(palette.finitions.map((f) => [clef(f.nom), f.id]));

  const aLier = choix.valeurs
    .map((v) => ({ v, modeleId: parNom.get(clef(v.libelle)) }))
    .filter((x) => x.modeleId && x.modeleId !== x.v.modeleId);

  if (!aLier.length) {
    return { ok: false, error: "Aucune teinte de ce choix ne porte le nom d'une teinte de ce nuancier." };
  }

  await prisma.$transaction(aLier.map(({ v, modeleId }) => prisma.valeurChoix.update({
    where: { id: v.id },
    data: { modeleId, paletteId: palette.id, couleur: null, imageUrl: null },
  })));
  rafraichir(choix.vitrineId);
  return { ok: true, liees: aLier.length, restantes: choix.valeurs.length - aLier.length };
}

/** Ajoute à un choix existant les teintes cochées dans la bibliothèque. */
export async function ajouterDuNuancier(choixId, modeleIds = []) {
  await exigerAdmin();
  const choix = await prisma.choix.findUnique({
    where: { id: choixId },
    select: { vitrineId: true, valeurs: { select: { libelle: true, ordre: true } } },
  });
  if (!choix) return { ok: false, error: "Choix introuvable." };
  if (!modeleIds.length) return { ok: false, error: "Cochez au moins une teinte." };

  const modeles = await prisma.finitionModele.findMany({
    where: { id: { in: modeleIds } },
    orderBy: { ordre: "asc" },
    select: { id: true, nom: true, paletteId: true },
  });

  const deja = new Set(choix.valeurs.map((v) => v.libelle));
  const nouvelles = modeles.filter((m) => !deja.has(m.nom));
  if (!nouvelles.length) {
    return { ok: false, error: "Ces teintes sont déjà dans ce choix." };
  }

  let ordre = choix.valeurs.reduce((m, v) => Math.max(m, v.ordre), -1) + 1;
  await prisma.$transaction(nouvelles.map((m) => prisma.valeurChoix.create({
    data: {
      choixId, libelle: m.nom, modeleId: m.id, paletteId: m.paletteId, ordre: ordre++,
      // Sans jeton : le tarif ne décline pas une teinte qu'on vient d'ajouter
      // à la main. À renseigner si le fournisseur la code dans sa référence.
      suffixeReference: null,
    },
  })));
  rafraichir(choix.vitrineId);
  return { ok: true, ajoutees: nouvelles.length, ignorees: modeles.length - nouvelles.length };
}

/** L'ordre des teintes, celui dans lequel le client les verra. */
export async function reordonnerValeurs(choixId, idsDansLOrdre) {
  await exigerAdmin();
  const choix = await prisma.choix.findUnique({ where: { id: choixId }, select: { vitrineId: true } });
  if (!choix) return { ok: false, error: "Choix introuvable." };
  await prisma.$transaction(
    idsDansLOrdre.map((id, ordre) => prisma.valeurChoix.update({ where: { id }, data: { ordre } })),
  );
  rafraichir(choix.vitrineId);
  return { ok: true };
}

// ── Créer un produit à la main ────────────────────────────────────────────
//
// Le tarif fournisseur arrive par l'import, et il apporte ses questions, ses
// paires et ses prix. Une fiche saisie à la main n'a rien de tout cela, et
// l'écran ne savait pas la construire : il fallait taper dix-sept libellés
// « NOIR METAL / NOIR », puis inventer soixante et onze combinaisons.
//
// Ces trois actions font le travail. Aucune n'invente de prix.

/**
 * Croise deux groupes de finition pour en faire une question tarifaire.
 *
 * C'est la forme qu'a le tarif quand la finition fait le prix : le
 * fournisseur ne vend pas « une structure » et « des portes », il vend la
 * paire, sous une référence unique. On part de toutes les paires ; celles
 * qui ne se vendent pas se décochent ensuite dans le tableau croisé.
 */
export async function croiserGroupes(vitrineId, { nom, groupeAId, groupeBId, separateur = " / " }) {
  await exigerAdmin();
  if (!groupeAId || !groupeBId || groupeAId === groupeBId) {
    return { ok: false, error: "Choisissez deux groupes différents." };
  }
  const groupes = await prisma.choix.findMany({
    where: { id: { in: [groupeAId, groupeBId] }, vitrineId, nature: "finition" },
    select: { id: true, nom: true, valeurs: { orderBy: { ordre: "asc" }, select: { libelle: true } } },
  });
  const A = groupes.find((g) => g.id === groupeAId);
  const B = groupes.find((g) => g.id === groupeBId);
  if (!A || !B) return { ok: false, error: "Groupe de finition introuvable sur cette fiche." };
  if (!A.valeurs.length || !B.valeurs.length) {
    return { ok: false, error: "Un groupe vide ne peut pas être croisé." };
  }

  const paires = [];
  for (const a of A.valeurs) {
    for (const b of B.valeurs) paires.push(`${a.libelle}${separateur}${b.libelle}`);
  }
  if (paires.length > 400) {
    return { ok: false, error: `${A.valeurs.length} × ${B.valeurs.length} ferait ${paires.length} paires. Réduisez les groupes d'abord.` };
  }

  const existants = await prisma.choix.findMany({ where: { vitrineId }, select: { cle: true, ordre: true } });
  const titre = (nom || "").trim() || `${A.nom} et ${B.nom}`;
  const cle = cleDepuis(titre, new Set(existants.map((c) => c.cle)));

  await prisma.choix.create({
    data: {
      vitrineId, cle, nom: titre, nature: "tarifaire", rendu: "boutons",
      ordre: existants.reduce((m, c) => Math.max(m, c.ordre), -1) + 1,
      origine: "editorial",
      valeurs: { create: paires.map((libelle, i) => ({ libelle, ordre: i })) },
    },
  });
  rafraichir(vitrineId);
  return { ok: true, paires: paires.length };
}

/**
 * Coche ou décoche une paire du tableau croisé.
 *
 * Cocher crée la ligne de tarif ; décocher la retire — mais jamais si une
 * combinaison la cite, faute de quoi le prix qui s'y rattache deviendrait
 * introuvable. supprimerValeur monte déjà cette garde.
 */
export async function basculerPaire(choixId, libelle) {
  await exigerAdmin();
  const propre = (libelle || "").trim();
  if (!propre) return { ok: false, error: "Paire vide." };

  const choix = await prisma.choix.findUnique({
    where: { id: choixId },
    select: { vitrineId: true, nature: true, valeurs: { select: { id: true, libelle: true, ordre: true } } },
  });
  if (!choix) return { ok: false, error: "Question introuvable." };
  if (choix.nature !== "tarifaire") return { ok: false, error: "Le tableau croisé ne vaut que pour une question tarifaire." };

  const deja = choix.valeurs.find((v) => v.libelle === propre);
  if (deja) return supprimerValeur(deja.id);

  await prisma.valeurChoix.create({
    data: {
      choixId, libelle: propre,
      ordre: choix.valeurs.reduce((m, v) => Math.max(m, v.ordre), -1) + 1,
    },
  });
  rafraichir(choix.vitrineId);
  return { ok: true };
}

/**
 * Les variantes qui manquent, c'est-à-dire tous les croisements de réponses
 * tarifaires que la fiche ne porte pas encore.
 *
 * Sans `appliquer`, ne fait que compter : on ne crée pas quatre-vingts lignes
 * sans prix par surprise.
 */
export async function genererCombinaisons(vitrineId, { appliquer = false } = {}) {
  await exigerAdmin();
  const produit = await prisma.produitVitrine.findUnique({
    where: { id: vitrineId },
    select: {
      choix: {
        where: { nature: "tarifaire" },
        orderBy: { ordre: "asc" },
        select: { cle: true, valeurs: { orderBy: { ordre: "asc" }, select: { libelle: true } } },
      },
      combinaisons: { select: { empreinte: true } },
    },
  });
  if (!produit) return { ok: false, error: "Fiche introuvable." };

  const axes = produit.choix.filter((c) => c.valeurs.length);
  if (!axes.length) {
    return { ok: false, error: "Aucune question tarifaire : il n'y a rien à croiser." };
  }

  let combos = [{}];
  for (const c of axes) {
    const suivant = [];
    for (const partiel of combos) {
      for (const v of c.valeurs) suivant.push({ ...partiel, [c.cle]: v.libelle });
    }
    combos = suivant;
    if (combos.length > 5000) {
      return { ok: false, error: `Le croisement dépasse cinq mille variantes. Vérifiez les questions avant de générer.` };
    }
  }

  const connues = new Set(produit.combinaisons.map((k) => k.empreinte));
  const manquantes = combos
    .map((valeurs) => ({ valeurs, empreinte: empreinteDe(valeurs) }))
    .filter((k) => !connues.has(k.empreinte));

  if (!appliquer) {
    return { ok: true, apercu: true, total: combos.length, existantes: connues.size, manquantes: manquantes.length };
  }
  if (!manquantes.length) return { ok: true, creees: 0, total: combos.length };

  await prisma.combinaison.createMany({
    data: manquantes.map((k) => ({ ...k, vitrineId })),
  });
  rafraichir(vitrineId);
  return { ok: true, creees: manquantes.length, total: combos.length };
}
