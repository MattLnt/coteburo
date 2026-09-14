"use server";

import { exigerAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getArticles() {
  await exigerAdmin();
  return prisma.article.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getArticle(id) {
  await exigerAdmin();
  return prisma.article.findUnique({ where: { id } });
}

export async function createArticle(data) {
  await exigerAdmin();
  const base = slugify(data.titre || "article");
  let slug = base;
  let i = 1;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  const a = await prisma.article.create({
    data: {
      titre: data.titre?.trim() || "Sans titre",
      slug,
      extrait: data.extrait?.trim() || null,
      contenu: data.contenu || "",
      imageUrl: data.imageUrl || null,
      categorie: data.categorie?.trim() || null,
      auteur: data.auteur?.trim() || null,
      publie: !!data.publie,
    },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/conseils");
  return { ok: true, id: a.id };
}

export async function updateArticle(id, data) {
  await exigerAdmin();
  await prisma.article.update({
    where: { id },
    data: {
      titre: data.titre?.trim() || undefined,
      extrait: data.extrait?.trim() || null,
      contenu: data.contenu ?? undefined,
      imageUrl: data.imageUrl || null,
      categorie: data.categorie?.trim() || null,
      auteur: data.auteur?.trim() || null,
      publie: !!data.publie,
    },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/conseils");
  revalidatePath(`/conseils/${data.slug || ""}`);
  return { ok: true };
}

export async function deleteArticle(id) {
  await exigerAdmin();
  await prisma.article.delete({ where: { id } });
  revalidatePath("/admin/articles");
  revalidatePath("/conseils");
  return { ok: true };
}

export async function toggleArticlePublie(id, publie) {
  await exigerAdmin();
  await prisma.article.update({ where: { id }, data: { publie: !!publie } });
  revalidatePath("/admin/articles");
  revalidatePath("/conseils");
  return { ok: true };
}