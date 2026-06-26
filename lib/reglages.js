import { prisma } from "@/lib/prisma";

export async function getReglagesPublic() {
  const r = await prisma.reglages.findUnique({ where: { id: 1 } });
  return r || {};
}

// Formate un numéro français en paires : "0651484358" -> "06 51 48 43 58"
export function formatTel(tel) {
  if (!tel) return "";
  const digits = tel.replace(/\D/g, ""); // ne garde que les chiffres
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}