import Link from "next/link";
import { notFound } from "next/navigation";
import { getCarteFrontParCategorie, urlProduit } from "@/lib/catalogue";
import { getFavorisContext } from "@/lib/favoris";
import FicheProduit from "@/components/FicheProduit";
import FicheProduitLibre from "@/components/FicheProduitLibre";

export const dynamic = "force-dynamic";

// rest = [produit] → pas de sous-catégorie
// rest = [sousCategorie, produit] → avec sous-catégorie
function parseRest(rest) {
  const segs = rest || [];
  if (segs.length === 1) return { sousCategorie: null, produit: segs[0] };
  if (segs.length === 2) return { sousCategorie: segs[0], produit: segs[1] };
  return null; // profondeur invalide
}

export async function generateMetadata({ params }) {
  const { categorie, rest } = await params;
  const parsed = parseRest(rest);
  if (!parsed) return { title: "Page introuvable" };
  const data = await getCarteFrontParCategorie(categorie, parsed.sousCategorie, parsed.produit);
  if (!data) return { title: "Produit introuvable" };
  return { title: `${data.carte.nom}${data.carte.categorieNom ? ` · ${data.carte.categorieNom}` : ""}` };
}

export default async function ProduitPage({ params }) {
  const { categorie, rest } = await params;
  const parsed = parseRest(rest);
  if (!parsed) notFound();

  const data = await getCarteFrontParCategorie(categorie, parsed.sousCategorie, parsed.produit);
  if (!data) notFound();

  // Si l'URL ne mentionne pas de sous-catégorie mais que le produit en a une, c'est la mauvaise URL —
  // évite d'avoir 2 URLs valides pour le même produit (mauvais pour le SEO).
  if (!parsed.sousCategorie && data.carte.sousCategorieSlug) notFound();
  // Inversement : l'URL mentionne une sous-catégorie qui ne correspond pas à celle du produit.
  if (parsed.sousCategorie && parsed.sousCategorie !== data.carte.sousCategorieSlug) notFound();

  const favCtx = await getFavorisContext();
  const favori = favCtx.favorisVitrines.includes(data.carte.id);

  const payload = JSON.parse(JSON.stringify({ ...data, favori, connecte: favCtx.connecte }));
  const estDeclinaisonLibre = !payload.surDevis && (payload.carte.axesDeclinaisons || []).length > 0;

  return (
    <main>
      {/* Fil d'ariane — « Accueil » et « Catalogue » masqués sur mobile,
          la ligne débordait avec le nom du produit. */}
      <div className="lg:sticky lg:top-[168px] z-40 bg-bg border-b border-line/60 mx-auto max-w-[1400px] px-5 sm:px-7 pt-3 sm:pt-6 pb-3 sm:pb-4 mb-5 sm:mb-8 text-[11.5px] sm:text-sm text-ink-soft">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Link href="/" className="hidden sm:inline hover:text-orange">Accueil</Link>
          <span className="hidden sm:inline text-ink-soft/40">/</span>
          <Link href="/catalogue" className="hidden sm:inline hover:text-orange">Catalogue</Link>
          <span className="hidden sm:inline text-ink-soft/40">/</span>
          <Link href={`/catalogue?categorie=${payload.carte.categorieSlug}`} className="hover:text-orange whitespace-nowrap shrink-0">{payload.carte.categorieNom}</Link>
          {payload.carte.sousCategorieNom && (
            <>
              <span className="text-ink-soft/40 shrink-0">/</span>
              <Link href={`/catalogue?categorie=${payload.carte.categorieSlug}&sousCategorie=${payload.carte.sousCategorieSlug}`} className="hover:text-orange whitespace-nowrap shrink-0">{payload.carte.sousCategorieNom}</Link>
            </>
          )}
          <span className="text-ink-soft/40 shrink-0">/</span>
          <span className="text-ink truncate min-w-0">{payload.carte.nom}</span>
        </div>
      </div>

      {/* pb : place laissée à la barre d'achat fixe en bas d'écran */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-[120px] lg:pb-16">
        {estDeclinaisonLibre ? (
          <FicheProduitLibre data={payload} />
        ) : (
          <FicheProduit data={payload} />
        )}
      </section>

      {/* Vous aimerez aussi — autres produits de la même catégorie, jamais "de la même gamme" */}
      {payload.autresCartes?.length > 0 && (
        <section>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-8 sm:py-14 border-t border-line">
            <h2 className="font-display font-bold text-[19px] sm:text-2xl mb-4 sm:mb-6">Vous aimerez aussi</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {payload.autresCartes.map((c) => (
                <Link key={c.id} href={urlProduit({ categorieSlug: c.categorieSlug, sousCategorieSlug: c.sousCategorieSlug, slug: c.slug })}
                  className="group rounded-2xl border border-line bg-white overflow-hidden hover:border-orange/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition">
                  <div className="aspect-[4/3] bg-[radial-gradient(120%_120%_at_60%_20%,#fff,#f4f1ec)] overflow-hidden">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.nom} className="w-full h-full object-contain p-3 sm:p-4 group-hover:scale-[1.03] transition" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-charcoal/15">
                        <svg width="35%" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="3"><rect x="12" y="30" width="96" height="10" rx="2" /><path d="M22 40v34M98 40v34" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="font-semibold text-ink text-[12.5px] sm:text-[15px] leading-snug group-hover:text-orange-dark transition line-clamp-2">{c.nom}</p>
                    {c.prixMini != null ? (
                      <p className="text-[11.5px] sm:text-[13px] text-ink-soft mt-1.5">dès <span className="font-display font-bold text-ink text-[12.5px] sm:text-[15px]">{Math.round(c.prixMini).toLocaleString("fr-FR")} €</span> HT</p>
                    ) : (
                      <p className="text-[11.5px] sm:text-[13px] text-ink-soft mt-1.5">Sur devis</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}