"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getReglages() {
  let r = await prisma.reglages.findUnique({ where: { id: 1 } });
  if (!r) {
    r = await prisma.reglages.create({ data: { id: 1, tva: 0.2, remiseGlobale: 0.2, margeGlobale: 0.3 } });
  }
  return r;
}

export async function getPaliersInstallation() {
  return prisma.palierInstallation.findMany({ orderBy: { seuilMax: "asc" } });
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
  const toNumRequis = (v, defaut) => {
    if (v === "" || v == null) return defaut;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? defaut : n;
  };
  const str = (v) => (v?.trim() ? v.trim() : null);

  await prisma.reglages.update({
    where: { id: 1 },
    data: {
      tva: toPct(data.tva),
      remiseGlobale: toPct(data.remiseGlobale),
      margeGlobale: toPct(data.margeGlobale),
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
      seuilLivraisonGratuite: toNumRequis(data.seuilLivraisonGratuite, 500),
      fraisLivraison: toNumRequis(data.fraisLivraison, 59),
    },
  });

  revalidatePath("/admin/reglages");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Remplace intégralement la liste des paliers (suppression + recréation) — simple et sûr,
// aucun autre modèle ne référence PalierInstallation.id.
export async function sauverPaliersInstallation(paliers) {
  const propres = (paliers || [])
    .map((p) => ({
      seuilMax: parseFloat(String(p.seuilMax).replace(",", ".")),
      prix: parseFloat(String(p.prix).replace(",", ".")),
    }))
    .filter((p) => !Number.isNaN(p.seuilMax) && !Number.isNaN(p.prix) && p.seuilMax > 0)
    .sort((a, b) => a.seuilMax - b.seuilMax)
    .map((p, i) => ({ ...p, ordre: i }));

  await prisma.$transaction([
    prisma.palierInstallation.deleteMany({}),
    prisma.palierInstallation.createMany({ data: propres }),
  ]);

  revalidatePath("/admin/reglages");
  return { ok: true };
}