"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getReglages() {
  let r = await prisma.reglages.findUnique({ where: { id: 1 } });
  if (!r) {
    r = await prisma.reglages.create({ data: { id: 1, tva: 0.2, remiseGlobale: 0.2 } });
  }
  return r;
}

export async function updateReglages(data) {
  const toPct = (v) => {
    if (v === "" || v == null) return 0;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? 0 : n / 100;
  };
  const toNum = (v) => {
    if (v === "" || v == null) return null;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? null : n;
  };
  const str = (v) => (v?.trim() ? v.trim() : null);

  await prisma.reglages.update({
    where: { id: 1 },
    data: {
      tva: toPct(data.tva),
      remiseGlobale: toPct(data.remiseGlobale),
      telephone: str(data.telephone),
      email: str(data.email),
      adresse: str(data.adresse),
      horaires: str(data.horaires),
      zoneLivraison: str(data.zoneLivraison),
      delaiLivraison: str(data.delaiLivraison),
      francoPort: toNum(data.francoPort),
      bandeauActif: !!data.bandeauActif,
      bandeauTexte: str(data.bandeauTexte),
      instagram: str(data.instagram),
      facebook: str(data.facebook),
      linkedin: str(data.linkedin),
    },
  });

  revalidatePath("/admin/reglages");
  revalidatePath("/", "layout");
  return { ok: true };
}