import { NextResponse } from "next/server";
import { calculerTousLesFrais } from "@/lib/frais";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const totalTTC = parseFloat(searchParams.get("totalTTC") || "0");
  if (Number.isNaN(totalTTC) || totalTTC < 0) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }
  const frais = await calculerTousLesFrais(totalTTC);
  return NextResponse.json(frais);
}