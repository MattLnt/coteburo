"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const nb = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Calcule les totaux à partir des lignes et des frais.
// Non exportée : dans un fichier "use server", tout export doit être une
// fonction asynchrone. L'admin refait le même calcul côté client pour
// l'affichage en direct ; c'est celui-ci qui est enregistré.
function calculerTotaux({ lignes, remiseType, remiseValeur, fraisLivraison, fraisInstallation }) {
  const sousTotal = (lignes || []).reduce((s, l) => s + nb(l.prixHT) * (parseInt(l.quantite, 10) || 0), 0);
  const remise = remiseType === "montant"
    ? Math.min(nb(remiseValeur), sousTotal)
    : sousTotal * (nb(remiseValeur) / 100);
  const totalHT = sousTotal - remise + nb(fraisLivraison) + nb(fraisInstallation);
  const totalTVA = totalHT * 0.2;
  return {
    sousTotal,
    remise,
    totalHT: Math.round(totalHT * 100) / 100,
    totalTVA: Math.round(totalTVA * 100) / 100,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
  };
}

export async function enregistrerDevis(id, data) {
  const lignes = Array.isArray(data.lignes) ? data.lignes : [];
  const totaux = calculerTotaux({
    lignes,
    remiseType: data.remiseType,
    remiseValeur: data.remiseValeur,
    fraisLivraison: data.fraisLivraison,
    fraisInstallation: data.fraisInstallation,
  });

  // Les lignes sont remplacées en bloc : plus simple et plus sûr que de
  // les comparer une à une, le volume reste petit.
  await prisma.$transaction([
    prisma.ligneDevis.deleteMany({ where: { devisId: id } }),
    prisma.devis.update({
      where: { id },
      data: {
        adresse: data.adresse?.trim() || null,
        complement: data.complement?.trim() || null,
        codePostal: data.codePostal?.trim() || null,
        ville: data.ville?.trim() || null,
        remiseType: data.remiseType === "montant" ? "montant" : "pourcentage",
        remiseValeur: nb(data.remiseValeur),
        fraisLivraison: nb(data.fraisLivraison),
        fraisInstallation: nb(data.fraisInstallation),
        noteClient: data.noteClient?.trim() || null,
        noteInterne: data.noteInterne?.trim() || null,
        totalHT: totaux.totalHT,
        totalTVA: totaux.totalTVA,
        totalTTC: totaux.totalTTC,
        // Une demande qu'on chiffre passe automatiquement en cours : évite
        // d'oublier de changer le statut à la main.
        statut: data.statut || undefined,
        lignes: {
          create: lignes.map((l, i) => ({
            codeRacine: l.codeRacine || null,
            vitrineId: l.vitrineId || null,
            designation: (l.designation || "").trim() || "Ligne sans nom",
            marque: l.marque || null,
            gammeNom: l.gammeNom || null,
            config: l.config || null,
            imageUrl: l.imageUrl || null,
            prixHT: nb(l.prixHT),
            quantite: parseInt(l.quantite, 10) || 1,
            ordre: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true, totaux };
}

export async function changerStatutDevis(id, statut) {
  const data = { statut };
  if (["accepte", "refuse"].includes(statut)) data.dateReponse = new Date();
  await prisma.devis.update({ where: { id }, data });
  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true };
}

export async function supprimerDevis(id) {
  await prisma.devis.delete({ where: { id } });
  revalidatePath("/admin/devis");
  return { ok: true };
}

// Recherche dans le catalogue pour le panneau d'ajout de produits.
// Renvoie les déclinaisons avec leur prix : c'est la déclinaison qui
// détermine le montant, pas le produit.
export async function chercherProduits(q) {
  const recherche = (q || "").trim();
  if (recherche.length < 2) return [];

  const vitrines = await prisma.produitVitrine.findMany({
    where: {
      publie: true,
      gamme: { publie: true },
      nom: { contains: recherche, mode: "insensitive" },
    },
    include: {
      gamme: { select: { nom: true } },
      categories: { select: { slug: true }, take: 1 },
      sousCategories: { select: { slug: true }, take: 1 },
    },
    orderBy: { nom: "asc" },
    take: 20,
  });

  return vitrines.map((v) => {
    const decl = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];

    // Libellé lisible d'une déclinaison : "180 cm / Avec retour"
    const libelle = (d) => {
      if (!d.valeurs) return d.reference || "Variante";
      return axes.map((a) => d.valeurs[a.id]).filter(Boolean).join(" / ") || (d.reference || "Variante");
    };

    return {
      id: v.id,
      nom: v.nom,
      gammeNom: v.gamme.nom,
      imageUrl: (v.images && v.images[0]) || v.imageUrl || null,
      slug: v.slug,
      categorieSlug: v.categories[0]?.slug || null,
      sousCategorieSlug: v.sousCategories[0]?.slug || null,
      // Produit à prix unique : une seule entrée, pas de choix à faire
      prixUnitaire: v.prixUnitaireHT ?? null,
      declinaisons: decl.map((d) => ({
        id: d.id,
        libelle: libelle(d),
        prixHT: Number(d.prixVenteHT) || 0,
      })),
    };
  });
}