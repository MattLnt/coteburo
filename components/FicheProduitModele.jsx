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
import GalerieProduit from "@/components/GalerieProduit";
import { useOptionsAcheteur } from "@/components/OptionsAcheteur";
import {
  prochaineEtape, etapesDe, etapesRestantes, prixDe,
  detailReference, visuelsPour, commandable, libelleChoix, identiteCommande,
  decomposerComposite, combinaisonsCompatibles, impactPrix,
  estComposee, elementsDe,
} from "@/lib/modeleProduit";
import RecapComposition from "@/components/RecapComposition";

/** Section descriptive : repliée sur mobile, dépliée sur desktop. */
function SectionRepliable({ titre, contenu, ouvertParDefaut }) {
  const [ouvert, setOuvert] = useState(!!ouvertParDefaut);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface lg:rounded-none lg:border-none lg:bg-transparent">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 lg:hidden"
      >
        <span className="text-left text-[13.5px] font-semibold text-ink">{titre}</span>
        <span className={`shrink-0 text-ink-soft transition-transform ${ouvert ? "rotate-180 text-orange-dark" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>
      <div className={`${ouvert ? "block" : "hidden"} border-t border-line px-4 pb-4 pt-0 lg:block lg:border-none lg:p-0`}>
        <h2 className="mb-4 hidden font-display text-2xl font-bold lg:block">{titre}</h2>
        {contenu && (
          <div
            className="prose prose-sm mt-3 max-w-none text-[13px] leading-relaxed text-ink-soft lg:mt-0 lg:text-base"
            dangerouslySetInnerHTML={{ __html: contenu }}
          />
        )}
      </div>
    </div>
  );
}

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
  categorieSlug = null, sousCategorieSlug = null, options = [],
}) {
  const { addItem } = useCart();
  const { addDevis } = useDevis();

  // Les accessoires vendus avec le produit. Cent quatre-vingt-seize fiches en
  // ont, sous forme de produits liés ; le crochet qui sait les configurer
  // existe déjà et marche, on le réutilise au lieu d'en écrire un second.
  const { optionsUI, totalOptions, optionsOK, ajouterOptions } = useOptionsAcheteur({
    options,
    carte: { id: produit.id, nom: produit.nom, marque: produit.gamme?.marque?.nom },
    addItem,
  });
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
  // Une fiche composée ne se commande pas par une référence mais par
  // plusieurs : page 241 du tarif Buronomic, un rangement, une alcôve, des
  // portes et des poignées.
  const composee = useMemo(() => estComposee(produit), [produit]);
  const elements = useMemo(
    () => (composee ? elementsDe(produit, reponses) : []),
    [composee, produit, reponses],
  );

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

    // Une fiche composée pose une ligne par élément : quatre vraies
    // références Buronomic, au lieu d'une qui n'existerait pas. La première
    // porte les suivantes par parentId — le mécanisme qui rattache déjà une
    // option à son produit — pour qu'elles se suppriment et s'affichent
    // ensemble.
    if (composee && identite.elements.length) {
      let racine = null;
      for (const [i, e] of identite.elements.entries()) {
        const id = addItem(
          {
            type: "nouveau",
            vitrineId: produit.id,
            declinaisonId: prix.combinaison?.ancienId ?? null,
            combinaisonId: identite.combinaisonId,
            referenceComplete: e.reference,
            fournisseur: identite.fournisseur,
            choix: i === 0 ? identite.choix : null,
            slug: produit.slug,
            categorieSlug,
            sousCategorieSlug,
            designation: e.designation,
            marque: identite.fournisseur,
            image: i === 0 ? principalUrl : null,
            prix: e.prixTarifHT == null ? null : e.prixTarifHT * (1 + marge),
            parentId: racine,
            // Sans elle, les quatre lignes partagent un identifiant et se
            // fondent en une seule dont la quantité monte.
            elementCle: e.cle,
          },
          i === 0 ? identite.finition : null,
          // Trois kits de portes pour un casier neuf cases, et autant de
          // fois la quantité commandée.
          qte * (e.quantite ?? 1),
        );
        if (i === 0) racine = id;
      }
      ajouterOptions(racine);
      setAjoute(true);
      setTimeout(() => setAjoute(false), 2000);
      return;
    }

    const parentId = addItem(
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
    ajouterOptions(parentId);
    setAjoute(true);
    setTimeout(() => setAjoute(false), 2000);
  };

  const versDevis = () => {
    const identite = identiteCommande(produit, reponses, marge);

    // Une fiche composée demande un devis comme elle remplit un panier : une
    // ligne par référence. Sans cela le devis portait UNE ligne sans
    // référence — une composition n'en a pas d'unique — et le commercial
    // devait tout retrouver.
    if (composee && identite.elements.length) {
      for (const [i, e] of identite.elements.entries()) {
        addDevis({
          vitrineId: produit.id,
          combinaisonId: identite.combinaisonId,
          elementCle: e.cle,
          referenceComplete: e.reference,
          fournisseur: identite.fournisseur,
          choix: i === 0 ? identite.choix : null,
          codeRacine: e.reference,
          gammeSlug: produit.gamme?.slug,
          carteSlug: produit.slug,
          designation: e.designation,
          gammeNom: produit.gamme?.nom,
          image: i === 0 ? principalUrl : null,
          config: i === 0 ? identite.finition : null,
          finitions: [],
          prixIndicatif: e.prixTarifHT == null ? null : e.prixTarifHT * (1 + marge),
          quantite: qte * (e.quantite ?? 1),
        });
      }
      setAjoute(true);
      setTimeout(() => setAjoute(false), 2000);
      return;
    }

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

  // Cette question coûte-t-elle quelque chose, ici et maintenant ? Un choix
  // tarifaire ne fait pas toujours bouger le prix aux dimensions déjà
  // retenues : l'annoncer quand ce n'est pas le cas trompe le client sur ce
  // qu'il décide.
  const impact = useMemo(
    () => impactPrix(produit, etape, reponses, marge),
    [produit, etape, reponses, marge],
  );

  // La décomposition du libellé composite de l'étape courante, s'il y en a un.
  const decompo = useMemo(
    () => (etape?.nature === "tarifaire" ? decomposerComposite(etape.choix, produit) : null),
    [etape, produit],
  );
  // Les parties déjà choisies dans ce libellé, par position.
  const [parties, setParties] = useState([]);

  const choisirPartie = (i, part) => {
    const suite = [...parties];
    suite[i] = part;
    // Une partie choisie peut rendre les suivantes impossibles : on efface
    // celles qui ne tiennent plus, plutôt que de laisser un choix mort.
    const possiblesApres = etape.valeurs.map((v) => v.libelle);
    for (let j = i + 1; j < (decompo?.positions.length || 0); j += 1) {
      const dispo = decompo.atteignables(j, suite, possiblesApres);
      if (suite[j] != null && !dispo.has(suite[j])) suite[j] = null;
    }
    setParties(suite);

    const libelle = decompo?.recomposer(suite);
    // On ne valide l'étape que lorsque TOUTES les positions qui font question
    // ont reçu une réponse : sinon on choisirait à la place du client.
    const complet = decompo.positions.every((p, j) => p.valeurs.length < 2 || suite[j] != null);
    if (libelle && complet) {
      setParties([]);
      repondre(etape.choix.cle, libelle);
    }
  };

  return (
    <>
    {/* Deux colonnes égales, comme avant : l'image occupait les deux tiers et
        écrasait le titre, le prix et les questions. */}
    <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-10">

      {/* ── La galerie ─────────────────────────────────────────────── */}
      {/* Celle du site, avec ses miniatures verticales à gauche et son
          cadrage qui distingue un packshot d'une photo d'ambiance. La
          remplacer par une bande de vignettes inertes était une régression. */}
      <GalerieProduit images={visuels.map((v) => v.url)} alt={produit.nom} />

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

          {/* La présentation du produit, sous son titre : c'est ce qu'on lit
              avant de configurer quoi que ce soit. */}
          {produit.descriptif && (
            <div
              className="prose prose-sm mt-3 max-w-none text-[13px] leading-relaxed text-ink-soft lg:text-[15px]"
              dangerouslySetInnerHTML={{ __html: produit.descriptif }}
            />
          )}
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
                  impact.varie
                    ? "bg-orange-tint text-orange-dark"
                    : "bg-surface-2 text-ink-soft"
                }`}
              >
                {impact.varie ? "agit sur le prix" : "sans effet sur le prix"}
              </span>
            </div>

            {etape.nature === "tarifaire" && decompo ? (
              // Un libellé composite se pose pièce par pièce, en pastilles.
              // « NOIR METAL / NEBRASKA / VERT EAU - VERT EAU » demandait au
              // client de lire quatre teintes dans une ligne de texte, sans
              // en voir aucune.
              <div className="mt-4 flex flex-col gap-5">
                {decompo.positions.map((position, i) => {
                  if (position.valeurs.length < 2) return null;
                  const possibles = decompo.atteignables(i, parties, etape.valeurs.map((v) => v.libelle));
                  return (
                    <div key={i}>
                      <div className="text-[12px] font-semibold text-ink-soft">{position.nom}</div>
                      <div className="mt-2.5 flex flex-wrap gap-4">
                        {position.valeurs.map((t) => {
                          const dispo = possibles.has(t.part);
                          const choisie = parties[i] === t.part;
                          return (
                            <button
                              key={t.part}
                              type="button"
                              disabled={!dispo}
                              onClick={() => choisirPartie(i, t.part)}
                              className={`flex w-[68px] flex-col items-center gap-1.5 ${dispo ? "" : "opacity-30"}`}
                              title={t.libelle}
                            >
                              <Pastille valeur={t} choisie={choisie} taille={46} />
                              <span className="text-center text-[10.5px] leading-tight text-ink">{t.libelle}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : etape.nature === "tarifaire" ? (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {etape.valeurs.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => repondre(etape.choix.cle, v.libelle)}
                    className="min-w-[118px] rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left hover:border-ink"
                  >
                    <span className="block text-[15px] font-semibold">{v.libelle}</span>
                    {impact.varie && (
                      // Répéter le même montant sous chaque bouton n'apprend
                      // rien et encombre : on ne l'écrit que s'il distingue.
                      <span className="mt-0.5 block text-[11.5px] text-ink-soft">
                        {impact.parValeur.get(v.libelle) == null
                          ? " "
                          : `dès ${euros(impact.parValeur.get(v.libelle))}`}
                      </span>
                    )}
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

        {/* Une fiche composée montre ses quatre références plutôt qu'une. */}
        {!etape && composee && <RecapComposition elements={elements} marge={marge} />}

        {/* Les accessoires, avant le prix : ils s'y ajoutent. */}
        {optionsUI}

        {/* Le prix et l'action. */}
        <div className="mt-auto flex flex-wrap items-end gap-4 border-t border-line pt-5">
          <div className="flex flex-col">
            <span className="text-xs text-ink-soft">
              {surDevis ? "estimation" : prix.ferme ? "votre prix" : "à partir de"}
            </span>
            <span className="font-display text-2xl font-bold">
              {euros(prix.montant == null ? null : prix.montant + (totalOptions || 0))}{" "}
              <span className="text-sm font-medium text-ink-soft">HT</span>
            </span>
            {totalOptions > 0 && (
              <span className="text-xs text-ink-soft">
                dont {euros(totalOptions)} d'accessoires
              </span>
            )}
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
            disabled={!verdict.ok || !optionsOK}
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

    {/* ── Les descriptions ───────────────────────────────────────────── */}
    {/* Garnissage, mécanisme, dimensions… Elles existaient en base et ne
        s'affichaient plus : c'est tout ce qui dit ce que le produit EST. */}
    {produit.sectionsDevis?.length > 0 && (
      <div className="mt-8 flex flex-col gap-3 lg:mt-14 lg:grid lg:grid-cols-2 lg:gap-x-14 lg:gap-y-10">
        {produit.sectionsDevis.map((s, i) => (
          <SectionRepliable
            key={s.id || i}
            titre={s.titre || "Détails"}
            contenu={s.contenu}
            ouvertParDefaut={i === 0}
          />
        ))}
      </div>
    )}
    </>
  );
}
