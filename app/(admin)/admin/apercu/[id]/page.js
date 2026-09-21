import { notFound } from "next/navigation";
import Link from "next/link";
import { chargerProduit, surDevis } from "@/lib/chargerProduit";
import { getMargeGlobale } from "@/lib/catalogue";
import { etapesDe, choixTarifaires, choixFinition } from "@/lib/modeleProduit";
import FicheProduitModele from "@/components/FicheProduitModele";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aperçu fiche · Admin" };

// Aperçu de la fiche produit lue dans le NOUVEAU modèle, avant de basculer la
// route publique dessus. Il vit dans l'administration pour qu'on puisse le
// regarder sans rien changer pour les visiteurs, et il affiche à côté ce que
// le modèle contient — choix, rangs de référence, combinaisons — afin qu'un
// écart entre la donnée et l'écran se voie tout de suite.
export default async function ApercuFichePage({ params }) {
  const { id } = await params;
  const [produit, marge] = await Promise.all([chargerProduit(id), getMargeGlobale()]);
  if (!produit) notFound();

  const tarifaires = choixTarifaires(produit);
  const finitions = choixFinition(produit);
  const rangs = etapesDe(produit)
    .filter((c) => c.rangReference != null)
    .sort((a, b) => a.rangReference - b.rangReference);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Aperçu — {produit.nom}</h1>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-soft">
          {produit.gamme?.marque?.nom} · {produit.gamme?.nom}
        </span>
        <Link href="/admin/produits" className="ml-auto text-sm text-orange-dark hover:underline">
          ← Tous les produits
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <FicheProduitModele produit={produit} marge={marge} surDevis={surDevis(produit)} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Ce que le modèle contient</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Choix tarifaires · {tarifaires.length}
            </div>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {tarifaires.map((c) => (
                <li key={c.cle}>
                  <span className="font-medium">{c.nom}</span>{" "}
                  <span className="text-ink-soft">{c.valeurs.length} valeurs</span>
                </li>
              ))}
              {!tarifaires.length && <li className="text-ink-soft">aucun</li>}
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Choix de finition · {finitions.length}
            </div>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {finitions.map((c) => (
                <li key={c.cle}>
                  <span className="font-medium">{c.nom}</span>{" "}
                  <span className="text-ink-soft">
                    {c.valeurs.length} valeurs
                    {c.rangReference != null ? ` · rang ${c.rangReference}` : " · hors référence"}
                  </span>
                </li>
              ))}
              {!finitions.length && <li className="text-ink-soft">aucun</li>}
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Combinaisons · {produit.combinaisons.length}
            </div>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
              <li>
                référence de base{" "}
                <span className="font-display font-semibold text-ink">
                  {produit.combinaisons[0]?.referenceBase || "—"}
                </span>
              </li>
              <li>
                assemblage :{" "}
                <span className="font-display text-ink">
                  base{rangs.map((c) => ` + ${c.nom.toLowerCase()}`).join("")}
                </span>
              </li>
              <li>{produit.exclusionsFinition.length} associations exclues</li>
              <li>{produit.visuels.length} visuels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
