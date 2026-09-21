"use client";

// components/FicheProduitModele.jsx — la fiche produit du modèle à choix.
//
// Elle pose UNE question à la fois, dans l'ordre, et montre au client ce que
// chaque réponse change. Deux natures d'étape, deux traitements visibles :
//
//   tarifaire   ferme des possibilités et fait bouger le prix
//   finition    ne ferme rien et ne coûte rien — elle change la référence
//               commandée et le visuel
//
// Tout le raisonnement vit dans lib/modeleProduit.js, qui est pur : ce
// composant ne fait qu'afficher ce qu'il en reçoit. C'est ce qui permet au
// serveur de refaire le même calcul au moment de la commande.

import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useDevis } from "@/components/devis/DevisContext";
import FavoriButton from "@/components/FavoriButton";
import {
  prochaineEtape, etapesDe, etapesRestantes, prixDe,
  detailReference, visuelsPour, commandable, libelleChoix, identiteCommande,
} from "@/lib/modeleProduit";

const euros = (n) =>
  n == null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/** Une pastille de finition : la pastille du nuancier, sinon la couleur. */
function Pastille({ valeur, choisie, taille = 56 }) {
  const style = { width: taille, height: taille };
  if (valeur.imageUrl) {
    return (
      <span
        className={`block rounded-full bg-cover bg-center ${choisie ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "ring-1 ring-line"}`}
        style={{ ...style, backgroundImage: `url(${valeur.imageUrl})` }}
      />
    );
  }
  return (
    <span
      className={`block rounded-full ${choisie ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "ring-1 ring-line"}`}
      // Sans couleur ni pastille, le beige neutre dit « teinte inconnue »
      // plutôt que de mentir avec une couleur inventée.
      style={{ ...style, background: valeur.couleur || "#e8e3da" }}
    />
  );
}

export default function FicheProduitModele({
  produit, marge = 0, surDevis = false, favori = false, connecte = false,
  categorieSlug = null, sousCategorieSlug = null,
}) {
  const { addItem } = useCart();
  const { addDevis } = useDevis();
  const [reponses, setReponses] = useState({});
  const [qte, setQte] = useState(1);
  const [ajoute, setAjoute] = useState(false);

  const etapes = useMemo(() => etapesDe(produit), [produit]);
  const etape = useMemo(() => prochaineEtape(produit, reponses), [produit, reponses]);
  const restantes = useMemo(() => etapesRestantes(produit, reponses), [produit, reponses]);
  const prix = useMemo(() => prixDe(produit, reponses, marge), [produit, reponses, marge]);
  const reference = useMemo(() => detailReference(produit, reponses), [produit, reponses]);
  const visuels = useMemo(() => visuelsPour(produit, reponses), [produit, reponses]);
  const verdict = useMemo(() => commandable(produit, reponses), [produit, reponses]);

  // Les réponses déjà données, dans l'ordre où on les a posées.
  const repondues = etapes.filter((c) => reponses[c.cle] != null);
  const total = repondues.length + restantes;
  const rang = repondues.length + (etape ? 1 : 0);

  const repondre = (cle, libelle) => setReponses((r) => ({ ...r, [cle]: libelle }));
  const defaire = (cle) => setReponses((r) => {
    const suite = { ...r };
    delete suite[cle];
    // Revenir sur une étape tarifaire peut rendre impossibles les réponses
    // suivantes : on efface ce qui en dépend plutôt que de laisser une
    // configuration qui n'existe pas.
    const apres = etapes.slice(etapes.findIndex((c) => c.cle === cle) + 1);
    for (const c of apres) if (c.nature === "tarifaire") delete suite[c.cle];
    return suite;
  });

  const principal = visuels[0] || null;
  const principalUrl = principal?.url ?? null;

  // Ce que le panier et le devis reçoivent. La combinaison porte « ancienId »,
  // l'identifiant de l'ancienne déclinaison : c'est le pont qui permet au
  // paiement, qui n'a pas encore basculé, de retrouver sa ligne et son prix.
  const versPanier = () => {
    const identite = identiteCommande(produit, reponses, marge);
    addItem(
      {
        type: "nouveau",
        vitrineId: produit.id,
        declinaisonId: prix.combinaison?.ancienId ?? null,
        combinaisonId: identite.combinaisonId,
        referenceComplete: identite.referenceComplete,
        fournisseur: identite.fournisseur,
        choix: identite.choix,
        slug: produit.slug,
        categorieSlug,
        sousCategorieSlug,
        designation: produit.nom,
        // La marque vient de la gamme, jamais d'une valeur écrite en dur :
        // tout partait chez Buronomic, Sokoa et OfficePro compris.
        marque: identite.fournisseur,
        image: principalUrl,
        prix: prix.montant,
      },
      identite.finition,
      qte,
    );
    setAjoute(true);
    setTimeout(() => setAjoute(false), 2000);
  };

  const versDevis = () => {
    const identite = identiteCommande(produit, reponses, marge);
    addDevis({
      vitrineId: produit.id,
      combinaisonId: identite.combinaisonId,
      referenceComplete: identite.referenceComplete,
      fournisseur: identite.fournisseur,
      choix: identite.choix,
      codeRacine: identite.referenceComplete,
      gammeSlug: produit.gamme?.slug,
      carteSlug: produit.slug,
      designation: produit.nom,
      gammeNom: produit.gamme?.nom,
      image: principalUrl,
      config: identite.finition,
      finitions: [],
      prixIndicatif: prix.montant,
      quantite: qte,
    });
    setAjoute(true);
    setTimeout(() => setAjoute(false), 2000);
  };

  const teinteDe = (cle) => {
    const c = etapes.find((x) => x.cle === cle);
    const v = c?.valeurs.find((x) => x.libelle === reponses[cle]);
    return v?.couleur || null;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">

      {/* ── La galerie ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface">
          {principal ? (
            <img
              src={principal.url}
              alt={produit.nom}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-sm text-ink-soft">Visuel à venir</span>
          )}
        </div>
        {visuels.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {visuels.slice(0, 6).map((v, i) => (
              <span
                key={v.id}
                className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border bg-surface ${i === 0 ? "border-ink" : "border-line"}`}
              >
                <img src={v.url} alt="" className="h-full w-full object-contain" />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Le configurateur ───────────────────────────────────────── */}
      <div className="flex flex-col gap-5">

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-orange">
            {produit.gamme?.nom}
          </div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-bold leading-tight lg:text-3xl">{produit.nom}</h1>
            <FavoriButton vitrineId={produit.id} initial={favori} connecte={connecte} variant="inline" />
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i < repondues.length ? "bg-orange" : "bg-line"}`}
                />
              ))}
            </div>
            <span className="whitespace-nowrap text-xs font-medium text-ink-soft">
              {etape ? `${rang} / ${total}` : "configuration complète"}
            </span>
          </div>
        )}

        {/* Les réponses déjà données, cliquables pour revenir dessus. */}
        {repondues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {repondues.map((c) => (
              <button
                key={c.cle}
                type="button"
                onClick={() => defaire(c.cle)}
                className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink hover:border-ink"
              >
                {teinteDe(c.cle) && (
                  <span className="h-3 w-3 rounded-full" style={{ background: teinteDe(c.cle) }} />
                )}
                {reponses[c.cle]}
                <span className="text-ink-soft" aria-hidden="true">×</span>
                <span className="sr-only">Revenir sur {c.nom}</span>
              </button>
            ))}
          </div>
        )}

        {/* L'étape courante. */}
        {etape && (
          <div className="rounded-2xl border border-orange bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">{etape.choix.nom}</h2>
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  etape.nature === "tarifaire"
                    ? "bg-orange-tint text-orange-dark"
                    : "bg-surface-2 text-ink-soft"
                }`}
              >
                {etape.nature === "tarifaire" ? "agit sur le prix" : "sans effet sur le prix"}
              </span>
            </div>

            {etape.nature === "tarifaire" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {etape.valeurs.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => repondre(etape.choix.cle, v.libelle)}
                    className="min-w-[130px] rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-ink"
                  >
                    <span className="block text-base font-semibold">{v.libelle}</span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {(() => {
                        const p = prixDe(produit, { ...reponses, [etape.choix.cle]: v.libelle }, marge);
                        return p.montant == null ? " " : `dès ${euros(p.montant)}`;
                      })()}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-wrap gap-5">
                  {etape.valeurs.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => repondre(etape.choix.cle, v.libelle)}
                      className="flex w-[76px] flex-col items-center gap-2"
                      title={v.libelle}
                    >
                      <Pastille valeur={v} choisie={reponses[etape.choix.cle] === v.libelle} />
                      <span className="text-center text-[11px] leading-tight text-ink">{v.libelle}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-soft">
                  Toutes les teintes restent disponibles : ce choix ne change pas le prix,
                  seulement la référence commandée.
                </p>
              </>
            )}
          </div>
        )}

        {/* Les étapes à venir, annoncées sans être ouvertes. */}
        {etape && restantes > 1 && (
          <div className="overflow-hidden rounded-2xl border border-line">
            {etapes
              .filter((c) => reponses[c.cle] == null && c.cle !== etape.choix.cle)
              .map((c, i) => (
                <div
                  key={c.cle}
                  className={`flex items-center justify-between gap-3 bg-surface px-4 py-3 ${i ? "border-t border-line" : ""}`}
                >
                  <span className="text-sm text-ink-soft">{c.nom}</span>
                  <span className="text-xs text-ink-soft/70">
                    {c.nature === "finition" ? "sans effet sur le prix" : `${c.valeurs.length} choix`}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Le récapitulatif, une fois tout répondu. */}
        {!etape && (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg font-semibold">Votre configuration</h2>
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              {etapes
                .filter((c) => reponses[c.cle] != null)
                .map((c) => (
                  <div key={c.cle} className="flex justify-between gap-4">
                    <dt className="text-ink-soft">{c.nom}</dt>
                    <dd className="font-semibold">{reponses[c.cle]}</dd>
                  </div>
                ))}
            </dl>
            {reference.complete && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-ink-soft">Référence commandée</span>
                  <span className="font-display text-base font-bold tracking-wide">
                    {reference.base}
                    <span className="text-orange">{reference.complete.slice(reference.base.length)}</span>
                  </span>
                </div>
              </div>
            )}
            {prix.combinaison?.ecoContribution ? (
              <div className="mt-3 flex justify-between gap-4 text-sm">
                <span className="text-ink-soft">Éco-contribution</span>
                <span>{euros(prix.combinaison.ecoContribution)}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Le prix et l'action. */}
        <div className="mt-auto flex flex-wrap items-end gap-4 border-t border-line pt-5">
          <div className="flex flex-col">
            <span className="text-xs text-ink-soft">
              {surDevis ? "estimation" : prix.ferme ? "votre prix" : "à partir de"}
            </span>
            <span className="font-display text-2xl font-bold">
              {euros(prix.montant)} <span className="text-sm font-medium text-ink-soft">HT</span>
            </span>
            {!prix.ferme && prix.possibles > 1 && (
              <span className="text-xs text-ink-soft">{prix.possibles} configurations possibles</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQte((q) => Math.max(1, q - 1))}
              className="h-11 w-11 rounded-xl border border-line bg-surface text-lg"
              aria-label="Diminuer la quantité"
            >
              −
            </button>
            <span className="w-8 text-center text-base font-semibold">{qte}</span>
            <button
              type="button"
              onClick={() => setQte((q) => q + 1)}
              className="h-11 w-11 rounded-xl border border-line bg-surface text-lg"
              aria-label="Augmenter la quantité"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={surDevis ? versDevis : versPanier}
            disabled={!verdict.ok}
            className={`h-12 flex-1 rounded-xl px-6 text-[15px] font-semibold ${
              verdict.ok
                ? "bg-orange text-white hover:bg-orange-dark"
                : "cursor-not-allowed bg-surface-2 text-ink-soft"
            }`}
          >
            {ajoute
              ? "Ajouté ✓"
              : verdict.ok
              ? surDevis ? "Demander un devis" : "Ajouter au panier"
              : etape ? `Choisissez ${etape.choix.nom.toLowerCase()}` : verdict.motif}
          </button>
        </div>

        {!verdict.ok && !etape && (
          // L'invariant du modèle, dit au client plutôt que découvert au
          // moment de passer la commande au fournisseur.
          <p className="text-[13px] text-orange-dark">
            Cette configuration ne peut pas être commandée en ligne : {verdict.motif}.
            Demandez-nous un devis, nous la traiterons à la main.
          </p>
        )}

        {libelleChoix(produit, reponses) && (
          <p className="sr-only">Configuration : {libelleChoix(produit, reponses)}</p>
        )}
      </div>
    </div>
  );
}
