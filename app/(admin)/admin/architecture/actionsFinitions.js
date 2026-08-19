"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────
// Bibliothèque de finitions partagée : palettes + finitions modèles.
// Réutilisable par tous les produits (aucune duplication d'image).
// ─────────────────────────────────────────────────────────────

// ---- Lecture ----
export async function getFinitionsAdmin() {
  const [palettes, orphelines] = await Promise.all([
    prisma.paletteFinition.findMany({
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
      include: { finitions: { orderBy: [{ ordre: "asc" }, { nom: "asc" }] } },
    }),
    prisma.finitionModele.findMany({
      where: { paletteId: null },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    }),
  ]);
  return { palettes, orphelines };
}

// Liste plate (pour le sélecteur côté produit)
export async function getFinitionsModeles() {
  return prisma.finitionModele.findMany({
    orderBy: [{ paletteId: "asc" }, { ordre: "asc" }, { nom: "asc" }],
    include: { palette: { select: { nom: true, marque: true } } },
  });
}

// ---- Palettes ----
export async function creerPalette({ nom, marque }) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };
  const max = await prisma.paletteFinition.aggregate({ _max: { ordre: true } });
  const palette = await prisma.paletteFinition.create({
    data: { nom: nomPropre, marque: (marque || "").trim() || null, ordre: (max._max.ordre ?? -1) + 1 },
  });
  revalidatePath("/admin/architecture");
  return { ok: true, id: palette.id };
}

export async function renommerPalette(id, { nom, marque }) {
  await prisma.paletteFinition.update({
    where: { id },
    data: { nom: (nom || "").trim(), marque: (marque || "").trim() || null },
  });
  revalidatePath("/admin/architecture");
  return { ok: true };
}

export async function supprimerPalette(id) {
  // Les finitions de la palette ne sont pas supprimées : elles deviennent "orphelines"
  // (paletteId = null grâce à onDelete: SetNull).
  await prisma.paletteFinition.delete({ where: { id } });
  revalidatePath("/admin/architecture");
  return { ok: true };
}

// ---- Finitions modèles ----
export async function creerFinition({ nom, couleur, imageUrl, paletteId }) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return { ok: false, error: "Le nom est obligatoire." };
  const max = await prisma.finitionModele.aggregate({
    where: { paletteId: paletteId || null },
    _max: { ordre: true },
  });
  const finition = await prisma.finitionModele.create({
    data: {
      nom: nomPropre,
      couleur: (couleur || "").trim() || null,
      imageUrl: (imageUrl || "").trim() || null,
      paletteId: paletteId || null,
      ordre: (max._max.ordre ?? -1) + 1,
    },
  });
  revalidatePath("/admin/architecture");
  return { ok: true, id: finition.id };
}

export async function majFinition(id, { nom, couleur, imageUrl, paletteId }) {
  const data = {};
  if (nom !== undefined) data.nom = (nom || "").trim();
  if (couleur !== undefined) data.couleur = (couleur || "").trim() || null;
  if (imageUrl !== undefined) data.imageUrl = (imageUrl || "").trim() || null;
  if (paletteId !== undefined) data.paletteId = paletteId || null;
  await prisma.finitionModele.update({ where: { id }, data });
  revalidatePath("/admin/architecture");
  return { ok: true };
}

export async function supprimerFinition(id) {
  await prisma.finitionModele.delete({ where: { id } });
  revalidatePath("/admin/architecture");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Import vers un produit : crée un groupe de finitions sur la vitrine
// en COPIANT les finitions choisies (nom + couleur + imageUrl réutilisée,
// donc aucun réupload). Le nom de la palette d'origine est conservé dans
// paletteNom, pour pouvoir sous-grouper les coloris par nuancier
// (ex. « Tissu BeSoft » / « Tissu chiné Step Mélange ») à l'intérieur
// d'une même option, en admin comme sur la fiche publique.
// ─────────────────────────────────────────────────────────────
export async function importerFinitionsVersProduit(vitrineId, { groupeNom, finitionModeleIds }) {
  if (!vitrineId) return { ok: false, error: "Produit manquant." };
  const ids = Array.isArray(finitionModeleIds) ? finitionModeleIds : [];
  if (ids.length === 0) return { ok: false, error: "Sélectionne au moins une finition." };

  const modeles = await prisma.finitionModele.findMany({
    where: { id: { in: ids } },
    include: { palette: { select: { nom: true } } },
  });
  if (modeles.length === 0) return { ok: false, error: "Finitions introuvables." };
  // conserve l'ordre de sélection
  const parId = new Map(modeles.map((m) => [m.id, m]));
  const choisies = ids.map((id) => parId.get(id)).filter(Boolean);

  const maxG = await prisma.groupeFinition.aggregate({ where: { vitrineId }, _max: { ordre: true } });

  await prisma.groupeFinition.create({
    data: {
      nom: (groupeNom || "Finitions").trim() || "Finitions",
      vitrineId,
      ordre: (maxG._max.ordre ?? -1) + 1,
      finitions: {
        create: choisies.map((m, i) => ({
          nom: m.nom,
          couleur: m.couleur || null,
          imageUrl: m.imageUrl || null, // même URL Cloudinary → pas de réupload
          paletteNom: m.palette?.nom || null,
          ordre: i,
        })),
      },
    },
  });

  return { ok: true, count: choisies.length };
}

// Réordonne les finitions d'un produit (ou d'une palette) : ordre = position dans la liste.
export async function reordonnerFinitionsProduit(orderedIds) {
  const ids = Array.isArray(orderedIds) ? orderedIds : [];
  if (ids.length === 0) return { ok: true };
  await prisma.$transaction(ids.map((id, i) => prisma.finition.update({ where: { id }, data: { ordre: i } })));
  return { ok: true };
}

// Importe des finitions de la bibliothèque DANS un groupe existant (copie nom+couleur+imageUrl).
export async function importerFinitionsDansGroupe(groupeId, finitionModeleIds) {
  if (!groupeId) return { ok: false, error: "Groupe manquant." };
  const ids = Array.isArray(finitionModeleIds) ? finitionModeleIds : [];
  if (ids.length === 0) return { ok: false, error: "Sélectionne au moins une finition." };
  const modeles = await prisma.finitionModele.findMany({
    where: { id: { in: ids } },
    include: { palette: { select: { nom: true } } },
  });
  const parId = new Map(modeles.map((m) => [m.id, m]));
  const choisies = ids.map((id) => parId.get(id)).filter(Boolean);
  if (choisies.length === 0) return { ok: false, error: "Finitions introuvables." };
  const maxF = await prisma.finition.aggregate({ where: { groupeId }, _max: { ordre: true } });
  let ordre = (maxF._max.ordre ?? -1) + 1;
  await prisma.finition.createMany({
    data: choisies.map((m) => ({
      nom: m.nom,
      couleur: m.couleur || null,
      imageUrl: m.imageUrl || null,
      paletteNom: m.palette?.nom || null,
      ordre: ordre++,
      groupeId,
    })),
  });
  return { ok: true, count: choisies.length };
}