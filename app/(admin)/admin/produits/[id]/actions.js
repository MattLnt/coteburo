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
  if (!Object.keys(data).length) return { ok: true };

  await prisma.produitVitrine.update({ where: { id: vitrineId }, data });
  rafraichir(vitrineId);
  return { ok: true };
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
