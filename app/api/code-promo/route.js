import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifierCodePromo, libelleRemise } from "@/lib/codePromo";

// Vérification d'un code promo saisi au panier.
//
// Ne fait qu'ANNONCER la remise : le montant facturé est recalculé par
// /api/commande/checkout, qui revérifie le code de son côté. Un panier
// trafiqué ne peut donc rien obtenir d'autre que l'affichage d'un faux
// montant chez lui.
//
// Le sous-total envoyé par le navigateur ne sert qu'au garde-fou du montant
// minimum ; il n'engage rien.
export async function POST(req) {
  try {
    const { code, sousTotalHT } = await req.json();
    const total = Number(sousTotalHT);

    // L'adresse du client connecté, pour que « une fois par client » se voie
    // dès le panier et pas seulement au paiement. Un visiteur non identifié
    // passera la vérification ici, et sera arrêté au paiement.
    const session = await auth();
    const email = session?.user?.email || null;

    const res = await verifierCodePromo({
      code,
      sousTotalHT: Number.isFinite(total) ? total : 0,
      email,
    });

    if (!res.ok) return NextResponse.json({ error: res.erreur }, { status: 200 });

    const c = res.campagne;
    return NextResponse.json({
      code: res.code,
      nom: c.nom,
      typeRemise: c.typeRemise,
      valeur: c.valeur,
      libelle: libelleRemise(c),
      minimumHT: c.codeMinimumHT ?? null,
      remise: res.remise,
    });
  } catch (err) {
    console.error("Erreur code promo:", err);
    return NextResponse.json({ error: "Vérification impossible pour le moment." }, { status: 500 });
  }
}
