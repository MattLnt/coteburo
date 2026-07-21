"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Liste légère de toutes les gammes, pour la recherche à la volée
export async function getGammesPourRecherche() {
  return prisma.gamme.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });
}

// Crée un produit directement, sans étape séparée — réutilise une gamme existante
// (gammeId fourni) ou en crée une nouvelle à la volée (nouvelleGammeNom fourni).
// Le mode de vente est désormais choisi ici, produit par produit — plus au niveau de la gamme.
export async function creerProduitRapide({ nomProduit, gammeId, nouvelleGammeNom, venteSurDevis }) {
  const nomProduitPropre = (nomProduit || "").trim();
  if (!nomProduitPropre) return { ok: false, error: "Le nom du produit est obligatoire." };

  let gammeIdFinal = gammeId || null;

  if (!gammeIdFinal) {
    const nomGammePropre = (nouvelleGammeNom || "").trim();
    if (!nomGammePropre) return { ok: false, error: "Choisis une gamme existante ou indique le nom d'une nouvelle gamme." };

    const marque = (await prisma.marque.findFirst({ where: { slug: "buronomic" } })) || (await prisma.marque.findFirst());
    if (!marque) return { ok: false, error: "Aucune marque trouvée en base." };

    const slugGamme = slugify(nomGammePropre);
    const gammeExistante = await prisma.gamme.findUnique({ where: { slug: slugGamme } });

    if (gammeExistante) {
      // Une gamme avec ce nom existe déjà — on la réutilise plutôt que d'échouer
      gammeIdFinal = gammeExistante.id;
    } else {
      const nouvelleGamme = await prisma.gamme.create({
        data: { nom: nomGammePropre, slug: slugGamme, marqueId: marque.id, publie: false, venteSurDevis: false },
      });
      gammeIdFinal = nouvelleGamme.id;
    }
  }

  const slugBase = slugify(nomProduitPropre);
  let slugFinal = slugBase;
  let i = 1;
  while (await prisma.produitVitrine.findUnique({ where: { gammeId_slug: { gammeId: gammeIdFinal, slug: slugFinal } } })) {
    slugFinal = `${slugBase}-${i++}`;
  }

  const dernier = await prisma.produitVitrine.findFirst({
    where: { gammeId: gammeIdFinal },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });

  const vitrine = await prisma.produitVitrine.create({
    data: {
      nom: nomProduitPropre,
      slug: slugFinal,
      gammeId: gammeIdFinal,
      ordre: (dernier?.ordre ?? -1) + 1,
      publie: false,
      venteSurDevis: !!venteSurDevis,
    },
  });

  revalidatePath("/admin/produits");
  revalidatePath(`/admin/architecture/${gammeIdFinal}`);
  return { ok: true, id: vitrine.id, gammeId: gammeIdFinal };
}