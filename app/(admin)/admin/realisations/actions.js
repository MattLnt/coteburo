"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getRealisations() {
  return prisma.realisation.findMany({ orderBy: [{ ordre: "asc" }, { createdAt: "desc" }] });
}

export async function getRealisation(id) {
  return prisma.realisation.findUnique({ where: { id } });
}

export async function createRealisation(data) {
  const base = slugify(data.titre || "realisation");
  let slug = base;
  let i = 1;
  while (await prisma.realisation.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  const count = await prisma.realisation.count();
  const r = await prisma.realisation.create({
    data: {
      titre: data.titre?.trim() || "Sans titre",
      client: data.client?.trim() || null,
      secteur: data.secteur?.trim() || null,
      surface: data.surface?.trim() || null,
      imageUrl: data.imageUrl || null,
      slug,
      publie: !!data.publie,
      ordre: count,
    },
  });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true, id: r.id };
}

export async function updateRealisation(id, data) {
  await prisma.realisation.update({
    where: { id },
    data: {
      titre: data.titre?.trim() || undefined,
      client: data.client?.trim() || null,
      secteur: data.secteur?.trim() || null,
      surface: data.surface?.trim() || null,
      imageUrl: data.imageUrl || null,
      publie: !!data.publie,
    },
  });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true };
}

export async function deleteRealisation(id) {
  await prisma.realisation.delete({ where: { id } });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true };
}

export async function toggleRealisationPublie(id, publie) {
  await prisma.realisation.update({ where: { id }, data: { publie: !!publie } });
  revalidatePath("/admin/realisations");
  revalidatePath("/realisations");
  return { ok: true };
}