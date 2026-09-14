"use client";
import { useState, useMemo, useRef } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useDevis } from "@/components/devis/DevisContext";
import { resoudreDeclinaison, prochainAxe, compterAxesRestants } from "@/lib/declinaisonsLibres";
import GalerieProduit from "@/components/GalerieProduit";
import FavoriButton from "@/components/FavoriButton";
import { useOptionsAcheteur } from "@/components/OptionsAcheteur";
import { useTauxTva } from "@/components/TauxTvaContext";
import { ajouterTVA } from "@/lib/tva";

// Pastilles montrees quand une categorie de coloris est repliee. Assez pour
// donner le ton de la palette, pas assez pour noyer la fiche : certaines
// categories comptent 85 coloris, et une fiche en cumule jusqu a 157.
const APERCU_COLORIS = 6;

// Agrandissement du coloris au survol. Une pastille de 42 px donne la teinte
// mais rien de la matiere : un tisse, un grain, un cuir s y ressemblent tous.
//
// Les sources ne se valent pas : les coloris de la table Finition font
// 1000 px de cote et passent sans peine, les 144 tissus Sokoa portes par les
// axes font 96 px de mediane et sont donc etires. Taille choisie a 200 px.
const APERCU_TAILLE = 200;
const APERCU_LIBELLE = 26;
// Au doigt, il n y a pas de survol : l apercu vient au maintien. Assez long
// pour ne pas se declencher sur un appui ordinaire, assez court pour qu on
// ne croie pas l ecran fige.
const APPUI_LONG = 350;
// Fenetre pendant laquelle les evenements souris qui suivent un toucher sont
// tenus pour de la compatibilite, et non pour un vrai survol.
const DELAI_SOURIS = 700;

// Apercu ancre en position fixe et borne a l ecran. Centre sans borne sur une
// pastille de bord, il deborderait — la fiche s est deja fait reprendre pour
// un debordement horizontal sur mobile.
function ApercuColoris({ apercu }) {
  if (!apercu) return null;

  const MARGE = 8;
  const hauteur = APERCU_TAILLE + APERCU_LIBELLE;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const x = Math.min(Math.max(MARGE, apercu.x - APERCU_TAILLE / 2), Math.max(MARGE, vw - APERCU_TAILLE - MARGE));
  // Au-dessus par defaut : le doigt ou le curseur masquerait un apercu pose
  // dessous. En bas d ecran, on bascule.
  const dessus = apercu.haut - hauteur - 12 >= MARGE;
  const y = dessus ? apercu.haut - hauteur - 12 : Math.min(apercu.bas + 12, Math.max(MARGE, vh - hauteur - MARGE));

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-2xl border border-line bg-surface overflow-hidden shadow-[0_8px_28px_rgba(33,36,40,0.18)]"
      style={{ left: x, top: y, width: APERCU_TAILLE }}>
      {apercu.imageUrl ? (
        <img src={apercu.imageUrl} alt="" className="block w-full object-cover" style={{ height: APERCU_TAILLE }} />
      ) : (
        <span className="block w-full" style={{ height: APERCU_TAILLE, background: apercu.couleur || "#e8e3da" }} />
      )}
      <span className="block px-2.5 text-[11.5px] font-semibold text-ink text-center truncate leading-[26px]">{apercu.nom}</span>
    </div>
  );
}

const fmt0 = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`);
const fmt = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

// Découpe les finitions d'un groupe en sous-blocs par palette d'origine,
// en conservant l'ordre. Les finitions sans palette forment un bloc sans titre.
function sousBlocsPalette(finitions) {
  const blocs = [];
  let courant = null;
  (finitions || []).forEach((f) => {
    const cle = f.paletteNom || "__sans__";
    if (!courant || courant.cle !== cle) {
      courant = { cle, nom: f.paletteNom || null, items: [] };
      blocs.push(courant);
    }
    courant.items.push(f);
  });
  return blocs;
}

// Bloc de configuration — carte blanche qui isole chaque choix sur mobile.
function Bloc({ titre, aChoisir, children }) {
  return (
    <div className="rounded-2xl bg-surface border border-line lg:border-transparent lg:bg-transparent p-4 lg:p-0 lg:mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-ink text-[13.5px] lg:text-[15px]">{titre}</p>
        {aChoisir && <span className="text-[10.5px] lg:text-[11.5px] text-orange-dark font-semibold">À choisir</span>}
      </div>
      {children}
    </div>
  );
}

// Section descriptive repliable sur mobile.
function SectionRepliable({ titre, contenu, ouvertParDefaut }) {
  const [ouvert, setOuvert] = useState(!!ouvertParDefaut);
  return (
    <div className="rounded-2xl bg-surface border border-line overflow-hidden lg:border-none lg:bg-transparent lg:rounded-none">
      <button type="button" onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 lg:hidden">
        <span className="font-semibold text-ink text-[13.5px] text-left">{titre}</span>
        <span className={`text-ink-soft shrink-0 transition-transform ${ouvert ? "rotate-180 text-orange-dark" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      <div className={`${ouvert ? "block" : "hidden"} lg:block px-4 pb-4 pt-0 border-t border-line lg:p-0 lg:border-none`}>
        <h2 className="hidden lg:block font-display font-bold text-2xl mb-4">{titre}</h2>
        {contenu && <div className="prose prose-sm max-w-none text-ink-soft leading-relaxed mt-3 lg:mt-0 text-[13px] lg:text-base" dangerouslySetInnerHTML={{ __html: contenu }} />}
      </div>
    </div>
  );
}

// Fiche produit unique — elle couvre les trois modes de vente :
//   • déclinaisons libres : des axes à choisir, un prix par combinaison
//   • prix fixe           : aucun axe, un seul prix (sansDeclinaisons)
//   • sur devis           : les axes servent à configurer, le prix reste indicatif
//
// Elle remplace le couple FicheProduit / FicheProduitLibre, qui divergeait :
// seul « Libre » savait lire les finitions rattachées aux valeurs d'axe
// (finitionsParValeur) et trier les coloris par leur champ ordre, seul
// « Classique » gérait le prix fixe et le sur-devis. Les deux moteurs sont ici.
export default function FicheProduit({ data }) {
  const { addItem } = useCart();
  const tauxTva = useTauxTva();
  const { addDevis } = useDevis();
  const { carte, groupesFinition, gammeNom, gammeSlug, surDevis, favori, connecte } = data;

  const images = carte.images?.length ? carte.images : [];
  const axes = carte.axesDeclinaisons || [];
  const declinaisons = carte.declinaisons || [];

  // Vendu à PRIX FIXE : sansDeclinaisons vient de l'admin et fait foi ; le repli
  // sur l'absence d'axes couvre les fiches qui n'ont rien à configurer.
  const sansDeclinaisons = !!carte.sansDeclinaisons;
  const prixFixe = sansDeclinaisons || axes.length === 0;

  const { optionsUI, totalOptions, optionsOK, ajouterOptions } = useOptionsAcheteur({
    options: carte.optionsAdditionnelles,
    carte,
    addItem,
  });

  const [historique, setHistorique] = useState([]);
  const [reponses, setReponses] = useState({});
  const [prefValeurs, setPrefValeurs] = useState({});
  const [finitionsSel, setFinitionsSel] = useState({});
  // config | recap — on démarre sur les axes s'il y en a, sinon directement
  // sur le récapitulatif.
  const [phase, setPhase] = useState(axes.length > 0 ? "config" : "recap");
  const [qte, setQte] = useState(1);
  const [ajoute, setAjoute] = useState(false);
  const [ajouteDevis, setAjouteDevis] = useState(false);
  // Une seule categorie de coloris depliee a la fois — en ouvrir une referme
  // la precedente.
  const [paletteOuverte, setPaletteOuverte] = useState(null);
  // Agrandissement du coloris survole ou maintenu.
  const [apercu, setApercu] = useState(null);
  const minuterieAppui = useRef(null);
  const appuiLongFait = useRef(false);
  const dernierToucher = useRef(0);

  // Coloris rattachés aux valeurs d'un axe (finitionsParValeur).
  //
  // La palette ENTIÈRE est montée dès l'ouverture, toutes valeurs confondues :
  // c'est elle qui donne envie, et l'attendre derrière une question d'axe la
  // rendait invisible sur la moitié des sièges. Chaque coloris garde la valeur
  // d'axe dont il vient ; une fois cette valeur choisie, les autres sont grisés
  // plutôt que retirés, pour que le client voie ce qu'il écarte.
  //
  // Ces valeurs sont des catégories tarifaires (« Tissu B », « Tissu C »…) :
  // paletteNom les sépare en sous-blocs étiquetés, si bien que le grisage porte
  // sur des blocs entiers et reste lisible.
  const groupesValeur = useMemo(() => {
    const out = [];
    for (const a of axes) {
      const fpv = a.finitionsParValeur || {};
      const valeurs = Object.keys(fpv).filter((k) => Array.isArray(fpv[k]) && fpv[k].length);
      if (!valeurs.length) continue;

      const finitions = [];
      const vus = new Set();
      for (const val of valeurs) {
        fpv[val].forEach((f, i) => {
          const id = f.id || `${a.id}:${val}:${i}`;
          if (vus.has(id)) return;
          vus.add(id);
          finitions.push({
            id, nom: f.nom,
            couleur: f.couleur || null,
            imageUrl: f.imageUrl || null,
            paletteNom: f.paletteNom || null,
            valeurAxe: val,
          });
        });
      }
      // « Coloris » et non le nom de l'axe : celui-ci titre déjà la question
      // juste en dessous, et deux blocs homonymes — l'un de pastilles, l'autre
      // de boutons — se lisent mal. Aucune fiche n'a deux axes porteurs de
      // coloris, le titre reste donc sans ambiguïté.
      out.push({ id: `axe:${a.id}`, nom: "Coloris", axeId: a.id, axeNom: a.nom, finitions });
    }
    return out;
  }, [axes]);

  const finitionsAVoter = useMemo(() => {
    const groupes = [...(groupesFinition || []), ...((carte.finitionsProduit) || []), ...groupesValeur];
    return groupes.map((g) => ({
      ...g,
      finitions: [...(g.finitions || [])]
        .map((f, i) => ({ f, i }))
        .sort((a, b) => ((a.f.ordre ?? a.i) - (b.f.ordre ?? b.i)))
        .map((x) => x.f),
    }));
  }, [groupesFinition, carte.finitionsProduit, groupesValeur]);

  // Prix « des » d une categorie de coloris : le plus bas des declinaisons qui
  // la portent, en tenant compte des autres axes deja repondus. Ces categories
  // sont tarifaires — les afficher evite que le client decouvre l ecart apres
  // avoir choisi sa couleur.
  const prixValeurAxe = (axeId, valeur) => {
    const prix = declinaisons
      .filter((d) => d.valeurs?.[axeId] === valeur
        && Object.entries(reponses).every(([k, v]) => k === axeId || d.valeurs?.[k] === v))
      .map((d) => d.prixHT)
      .filter((x) => x != null && x > 0);
    return prix.length ? Math.min(...prix) : null;
  };

  const dejaTraites = useMemo(() => new Set(historique.map((h) => h.axeId)), [historique]);

  const etapeCourante = useMemo(() => {
    if (phase === "config") return prochainAxe(axes, declinaisons, reponses, dejaTraites);
    return null;
  }, [phase, axes, declinaisons, reponses, dejaTraites]);

  useMemo(() => {
    if (phase === "config" && etapeCourante === null) setPhase("recap");
  }, [phase, etapeCourante]);

  const { match } = useMemo(() => resoudreDeclinaison(declinaisons, reponses), [declinaisons, reponses]);
  // Sans axe, aucune déclinaison n'est choisissable — et resoudreDeclinaison en
  // « résout » pourtant une dès qu'il n'en reste qu'une, y compris avant toute
  // question (filtrer sur zéro réponse laisse tout passer). Sans ce garde-fou,
  // une ligne résiduelle écraserait le prix unique.
  const declinaisonFinale =
    axes.length > 0 ? match || (declinaisons.length === 1 ? declinaisons[0] : null) : null;

  // Prix arrêtés par le serveur, promo comprise — la fiche lit, elle ne calcule
  // plus. Sur devis, le « à partir de » saisi par l'admin prime : la déclinaison
  // ne sert alors qu'à configurer, pas à engager.
  // « À partir de » resserré au fil des réponses : une fois le Tissu D choisi,
  // afficher encore le minimum global (celui du Tissu B) annoncerait un prix
  // devenu inatteignable. On prend le plus bas des déclinaisons encore
  // compatibles avec ce qui a déjà été répondu.
  const prixMiniCourant = useMemo(() => {
    const compat = declinaisons.filter((d) =>
      Object.entries(reponses).every(([k, v]) => d.valeurs?.[k] === v));
    const prix = compat.map((d) => d.prixHT).filter((x) => x != null && x > 0);
    return prix.length ? Math.min(...prix) : null;
  }, [declinaisons, reponses]);

  const prixDeclinaison = declinaisonFinale
    ? declinaisonFinale.prixHT
    : (prixMiniCourant ?? carte.prixMini);
  const prixAffiche = surDevis ? (carte.prixAPartir ?? prixDeclinaison) : prixDeclinaison;
  const prixBarre = surDevis
    ? null
    : declinaisonFinale
    ? (declinaisonFinale.enPromo ? declinaisonFinale.prixBase : null)
    : (carte.enPromo ? carte.prixMiniBase : null);
  const ttc = !surDevis && prixAffiche != null ? ajouterTVA(prixAffiche, tauxTva) : null;

  const referenceFinale = declinaisonFinale
    ? { codeRacine: declinaisonFinale.id, designation: carte.nom }
    : (prixFixe && prixAffiche != null)
    ? { codeRacine: carte.id, designation: carte.nom }
    : null;

  const nbRepondu = historique.length;
  const nbRestant = phase === "config" ? compterAxesRestants(axes, declinaisons, reponses, dejaTraites) : 0;
  const etapeActuelleNum = nbRepondu;
  const etapeTotalNum = nbRepondu + nbRestant;

  const choisirValeur = (axeId, nomAxe, valeur) => {
    // Le coloris deja choisi peut appartenir a une autre valeur d axe : on le
    // libere. choisirColoris le repose juste apres quand le choix vient d une
    // pastille, si bien que cliquer une couleur ne s annule pas lui-meme.
    const deja = historique.findIndex((e) => e.axeId === axeId);

    if (deja < 0) {
      setHistorique((h) => [...h, { axeId, nom: nomAxe, valeur }]);
      setReponses((r) => ({ ...r, [axeId]: valeur }));
      setPrefValeurs((p) => ({ ...p, [axeId]: valeur }));
      setFinitionsSel((f) => { const n = { ...f }; delete n[`axe:${axeId}`]; return n; });
      return;
    }

    // Axe deja repondu : on le rejoue sur place. Les reponses posterieures ont
    // ete prises sous l ancienne valeur et peuvent la contredire — on les
    // retire, comme un « Retour » jusqu a cet axe suivi d un autre choix.
    const posterieurs = historique.slice(deja + 1);
    const oublier = (obj, prefixe = "") => {
      const n = { ...obj };
      delete n[`${prefixe}${axeId}`];
      for (const e of posterieurs) delete n[`${prefixe}${e.axeId}`];
      return n;
    };
    setHistorique([...historique.slice(0, deja), { axeId, nom: nomAxe, valeur }]);
    setReponses((r) => ({ ...oublier(r), [axeId]: valeur }));
    setPrefValeurs((p) => ({ ...oublier(p), [axeId]: valeur }));
    setFinitionsSel((f) => oublier(f, "axe:"));
    // Un axe retire doit etre repose : l effet ne fait que config -> recap.
    if (posterieurs.length) setPhase("config");
  };

  const ouvrirApercu = (el, f) => {
    const r = el.getBoundingClientRect();
    setApercu({ nom: f.nom, imageUrl: f.imageUrl, couleur: f.couleur, x: r.left + r.width / 2, haut: r.top, bas: r.bottom });
  };

  const fermerApercu = () => {
    clearTimeout(minuterieAppui.current);
    minuterieAppui.current = null;
    setApercu(null);
  };

  // Apres un toucher, le navigateur emet des evenements souris de
  // compatibilite — dont un mouseenter qui rouvrait l apercu juste referme.
  // On ignore donc le survol dans la foulee d un toucher.
  const finToucher = () => {
    dernierToucher.current = Date.now();
    fermerApercu();
  };

  const survoler = (el, f) => {
    if (Date.now() - dernierToucher.current < DELAI_SOURIS) return;
    ouvrirApercu(el, f);
  };

  // Le maintien tient lieu de survol au doigt. Un balayage ou un appui bref
  // l annule — sans quoi l apercu s ouvrirait en faisant defiler la page.
  const demarrerAppui = (el, f) => {
    dernierToucher.current = Date.now();
    appuiLongFait.current = false;
    clearTimeout(minuterieAppui.current);
    minuterieAppui.current = setTimeout(() => {
      appuiLongFait.current = true;
      ouvrirApercu(el, f);
    }, APPUI_LONG);
  };

  const choisirFinition = (groupeId, finitionId) => {
    setFinitionsSel((f) => ({ ...f, [groupeId]: finitionId }));
  };

  // Un coloris n appartient qu a une seule valeur d axe : le choisir repond donc
  // a la question. Sans cela le client choisirait une couleur puis devrait
  // repondre un axe qui peut la contredire.
  const choisirColoris = (g, f) => {
    if (g.axeId && f.valeurAxe && reponses[g.axeId] !== f.valeurAxe) {
      // axeNom et non g.nom : le recapitulatif doit lire « Categorie de
      // revetement : C », pas « Coloris : C ».
      choisirValeur(g.axeId, g.axeNom || g.nom, f.valeurAxe);
    }
    choisirFinition(g.id, f.id);
  };

  const popDerniereReponse = () => {
    setHistorique((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setReponses((r) => { const n = { ...r }; delete n[last.axeId]; return n; });
      setPrefValeurs((p) => { const n = { ...p }; delete n[last.axeId]; return n; });
      setFinitionsSel((f) => { const n = { ...f }; delete n[`axe:${last.axeId}`]; return n; });
      return h.slice(0, -1);
    });
  };

  const reculer = () => {
    if (historique.length === 0) return;
    popDerniereReponse();
    setPhase("config");
  };

  const libelleConfig = () => {
    const parts = historique.map((h) => h.valeur);
    for (const g of finitionsAVoter) {
      const f = g.finitions.find((x) => x.id === finitionsSel[g.id]);
      if (f) parts.push(f.paletteNom ? `${f.paletteNom} ${f.nom}` : f.nom);
    }
    return parts.join(" / ");
  };

  const finitionsOK = finitionsAVoter.length === 0 || finitionsAVoter.every((g) => finitionsSel[g.id]);
  const peutAjouter = !!referenceFinale && finitionsOK && optionsOK;
  const peutDemanderDevis = finitionsOK;

  const ajouterPanier = () => {
    if (!peutAjouter) return;
    const parentId = addItem(
      {
        type: "nouveau",
        vitrineId: carte.id,
        declinaisonId: declinaisonFinale ? declinaisonFinale.id : null,
        slug: carte.slug,
        categorieSlug: carte.categorieSlug || null,
        sousCategorieSlug: carte.sousCategorieSlug || null,
        designation: carte.nom,
        marque: "Buronomic",
        image: images[0] || null,
        prix: prixAffiche,
      },
      libelleConfig() || null, qte
    );
    ajouterOptions(parentId);
    setAjoute(true); setTimeout(() => setAjoute(false), 2000);
  };

  const ajouterAuDevis = () => {
    if (!peutDemanderDevis) return;
    addDevis({
      codeRacine: referenceFinale?.codeRacine || null,
      vitrineId: carte.id,
      declinaisonId: declinaisonFinale ? declinaisonFinale.id : null,
      gammeSlug, carteSlug: carte.slug,
      designation: referenceFinale ? referenceFinale.designation : `${carte.nom} (${gammeNom})`,
      gammeNom,
      image: images[0] || null,
      config: libelleConfig() || null,
      finitions: [],
      prixIndicatif: prixAffiche,
    }, qte);
    setAjouteDevis(true); setTimeout(() => setAjouteDevis(false), 2000);
  };

  const gros = (actif) => `px-3.5 lg:px-4 py-2.5 rounded-xl border text-[12.5px] lg:text-[13.5px] font-medium transition ${
    actif ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange/50 hover:bg-surface-2"}`;

  const peutReculer = historique.length > 0;
  const totalGeneral = (prixAffiche != null ? prixAffiche * qte : 0) + totalOptions;

  const selecteurQte = (
    <div className="flex items-center border border-line rounded-full overflow-hidden shrink-0">
      <button onClick={() => setQte((q) => Math.max(1, q - 1))} className="w-9 h-9 lg:w-10 lg:h-11 grid place-items-center hover:bg-surface-2 text-ink-soft">−</button>
      <span className="w-7 lg:w-10 text-center font-semibold text-[14px]">{qte}</span>
      <button onClick={() => setQte((q) => q + 1)} className="w-9 h-9 lg:w-10 lg:h-11 grid place-items-center hover:bg-surface-2 text-ink-soft">+</button>
    </div>
  );

  return (
    <div>
      {/* min-w-0 sur les deux colonnes : un élément de grille vaut min-width:auto
          par défaut et refuse donc de descendre sous la largeur intrinsèque de
          son contenu. La photo principale imposait ainsi ~920 px de large à la
          colonne, sur un écran de 360 — toute la page défilait latéralement. */}
      <div className="grid lg:grid-cols-2 gap-5 lg:gap-10 items-start">
        <div className="min-w-0 lg:sticky lg:top-[260px]">
          <GalerieProduit images={images} alt={carte.nom} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.14em] text-orange">{gammeNom}</p>
          <h1 className="font-display font-bold text-[24px] sm:text-3xl lg:text-4xl mt-1.5 lg:mt-2 leading-tight">{carte.nom}</h1>

          {(!surDevis || prixAffiche != null) && (
            <div className="flex items-end gap-2.5 lg:gap-3 mt-3 lg:mt-5">
              {(surDevis || !referenceFinale) && <span className="text-ink-soft text-[13px] lg:text-[15px] mb-0.5 lg:mb-1">à partir de</span>}
              <span className="font-display font-bold text-[26px] lg:text-3xl">{surDevis ? fmt0(prixAffiche) : fmt(prixAffiche)}</span>
              {prixBarre != null && (
                <span className="text-ink-soft line-through text-[15px] lg:text-base mb-0.5 lg:mb-1">{fmt(prixBarre)}</span>
              )}
              <span className="text-ink-soft text-[13px] lg:text-base mb-0.5 lg:mb-1">HT</span>
            </div>
          )}
          {ttc != null && <p className="text-[11.5px] lg:text-[13px] text-ink-soft mt-1">{fmt(ttc)} TTC</p>}

          <div className="mt-3 lg:mt-4">
            <FavoriButton vitrineId={carte.id} initial={!!favori} connecte={!!connecte} variant="text" />
          </div>

          {/* ── Blocs de configuration ── */}
          <div className="flex flex-col gap-2 lg:gap-0 mt-4 lg:mt-6 lg:pt-6 lg:border-t lg:border-line">
            {finitionsAVoter.map((g) => {
              const selectionneeId = finitionsSel[g.id];
              const blocs = sousBlocsPalette(g.finitions);
              // Valeur d'axe retenue, s'il s'agit d'un groupe de coloris par valeur.
              const valeurRetenue = g.axeId ? reponses[g.axeId] : null;
              return (
                <Bloc key={g.id} titre={g.nom} aChoisir={!selectionneeId}>
                  {blocs.map((bloc, bi) => {
                    // Un sous-bloc passe en retrait dès que l'axe est tranché sur
                    // une autre catégorie, pour que le client voie ce qu'il a
                    // écarté — mais il reste cliquable : choisir un tissu d'une
                    // autre catégorie rebascule la sélection, sans imposer un
                    // « Retour » au préalable.
                    const valeurBloc = bloc.items[0]?.valeurAxe ?? null;
                    const blocEcarte = valeurRetenue != null && valeurBloc != null && valeurBloc !== valeurRetenue;

                    // Replié par défaut : une seule catégorie peut être ouverte,
                    // sinon on retombe sur les 157 pastilles d'un coup.
                    const clePalette = `${g.id}::${bloc.cle}`;
                    const ouvert = paletteOuverte === clePalette;
                    const repliable = valeurBloc != null && bloc.items.length > APERCU_COLORIS;
                    const visibles = repliable && !ouvert ? bloc.items.slice(0, APERCU_COLORIS) : bloc.items;
                    const prixCategorie = valeurBloc != null && g.axeId ? prixValeurAxe(g.axeId, valeurBloc) : null;

                    return (
                      <div key={`${g.id}-${bloc.cle}-${bi}`} className={bi > 0 ? "mt-4" : ""}>
                        {bloc.nom && (
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <span className={`text-[10.5px] lg:text-[11.5px] font-semibold uppercase tracking-[0.06em] ${blocEcarte ? "text-ink-soft/45" : "text-ink-soft"}`}>{bloc.nom}</span>
                            {prixCategorie != null && (
                              <span className={`text-[10.5px] lg:text-[11.5px] font-semibold normal-case tracking-normal shrink-0 ${blocEcarte ? "text-ink-soft/45" : "text-ink"}`}>
                                dès {fmt(prixCategorie)}
                              </span>
                            )}
                            {blocEcarte && <span className="text-[10px] text-ink-soft/45 normal-case tracking-normal">cliquer pour basculer</span>}
                            <span className="flex-1 h-px bg-line" />
                          </div>
                        )}
                        <div className={`flex flex-wrap gap-2.5 lg:gap-3 transition-opacity ${blocEcarte ? "opacity-50 hover:opacity-100" : ""}`}>
                          {visibles.map((f) => {
                            const actif = selectionneeId === f.id;
                            return (
                              <button key={f.id} type="button"
                                onClick={() => {
                                  // Un maintien sert à regarder la matière, pas
                                  // à choisir : le clic qui suit est ignoré.
                                  if (appuiLongFait.current) { appuiLongFait.current = false; return; }
                                  choisirColoris(g, f);
                                }}
                                onMouseEnter={(e) => survoler(e.currentTarget, f)}
                                onMouseLeave={fermerApercu}
                                onTouchStart={(e) => demarrerAppui(e.currentTarget, f)}
                                onTouchMove={finToucher}
                                onTouchEnd={finToucher}
                                onTouchCancel={finToucher}
                                onContextMenu={(e) => e.preventDefault()}
                                title={blocEcarte ? `${f.nom} — bascule sur « ${bloc.nom || valeurBloc} »` : f.nom}
                                style={{ WebkitTouchCallout: "none" }}
                                className="flex flex-col items-center gap-1.5 w-[52px] select-none">
                                <span className={`rounded-full border-2 overflow-hidden transition block w-[42px] h-[42px] ${actif ? "border-orange" : "border-line hover:border-orange/40"}`} style={{ background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                                  {f.imageUrl && <img src={f.imageUrl} alt={f.nom} className="w-full h-full object-cover rounded-full" />}
                                </span>
                                <span className={`text-[10px] lg:text-[11px] text-center leading-tight ${actif ? "text-orange-dark font-semibold" : "text-ink-soft"}`}>{f.nom}</span>
                              </button>
                            );
                          })}
                        </div>

                        {repliable && (
                          <button type="button"
                            onClick={() => setPaletteOuverte(ouvert ? null : clePalette)}
                            className="mt-2.5 text-[11.5px] lg:text-[12.5px] font-semibold text-orange-dark hover:text-orange">
                            {ouvert ? "Replier" : `Voir les ${bloc.items.length} coloris`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Bloc>
              );
            })}

            {phase === "config" && etapeCourante && (
              <Bloc titre={etapeCourante.axe.nom} aChoisir>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const ordre = etapeCourante.axe.valeurs || [];
                    const rang = (v) => { const i = ordre.indexOf(v); return i === -1 ? 9999 : i; };
                    return [...etapeCourante.valeurs].sort((a, b) => rang(a) - rang(b)).map((v) => {
                      const actif = prefValeurs[etapeCourante.axe.id] === v;
                      return (
                        <button key={v} onClick={() => choisirValeur(etapeCourante.axe.id, etapeCourante.axe.nom, v)} className={gros(actif)}>{v}</button>
                      );
                    });
                  })()}
                </div>
              </Bloc>
            )}

            {phase === "recap" && !surDevis && optionsUI}

            {phase === "recap" && (referenceFinale || surDevis) && (
              <Bloc titre="Votre configuration">
                <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                  <div className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] flex justify-between gap-4">
                    <span className="text-ink-soft">Modèle</span>
                    <span className="text-ink font-medium text-right">{carte.nom}</span>
                  </div>
                  {historique.map((h) => (
                    <div key={h.axeId} className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] flex justify-between gap-4">
                      <span className="text-ink-soft">{h.nom}</span>
                      <span className="text-ink font-medium">{h.valeur}</span>
                    </div>
                  ))}
                  {finitionsAVoter.map((g) => {
                    const f = g.finitions.find((x) => x.id === finitionsSel[g.id]);
                    return f ? (
                      <div key={g.id} className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] flex justify-between gap-4 items-center">
                        <span className="text-ink-soft">{g.nom}</span>
                        <span className="text-ink font-medium inline-flex items-center gap-2 text-right">
                          <span className="rounded-full border border-line overflow-hidden inline-block w-4 h-4 shrink-0" style={{ background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                            {f.imageUrl && <img src={f.imageUrl} alt="" className="w-full h-full object-cover rounded-full" />}
                          </span>
                          {f.paletteNom ? `${f.paletteNom} — ${f.nom}` : f.nom}
                        </span>
                      </div>
                    ) : null;
                  })}
                  {surDevis && historique.length === 0 && (
                    <div className="px-3.5 py-2.5 text-[12.5px] lg:text-[13.5px] text-ink-soft">Aucune préférence renseignée — un conseiller vous accompagnera.</div>
                  )}
                </div>
              </Bloc>
            )}

            {phase === "recap" && !referenceFinale && !surDevis && (
              <p className="text-[12.5px] text-ink-soft bg-surface-2 rounded-xl px-4 py-3">Configuration incomplète — revenez en arrière.</p>
            )}

            {!finitionsOK && phase === "recap" && (
              <p className="text-[12.5px] text-orange-dark bg-orange-tint rounded-xl px-4 py-3">Choisissez une finition dans chaque catégorie.</p>
            )}
            {!optionsOK && phase === "recap" && (
              <p className="text-[12.5px] text-orange-dark bg-orange-tint rounded-xl px-4 py-3">Terminez la configuration des options sélectionnées.</p>
            )}
          </div>

          {phase !== "recap" && etapeTotalNum > 0 && (
            <div className="mt-4 lg:mt-6">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: etapeTotalNum }).map((_, i) => (
                  <div key={i} className={`h-[5px] flex-1 rounded-full transition-all duration-300 ${i < etapeActuelleNum ? "bg-orange" : "bg-line"}`} />
                ))}
              </div>
              <p className="text-[11px] lg:text-[11.5px] text-ink-soft mt-2 text-right">Étape {etapeActuelleNum} sur {etapeTotalNum}</p>
            </div>
          )}

          {peutReculer && (
            <div className="mt-4 lg:mt-6">
              <button onClick={reculer} className="text-[13px] lg:text-[14px] font-semibold text-ink-soft hover:text-ink">← Retour</button>
            </div>
          )}

          {/* Actions — desktop uniquement, la barre fixe prend le relais sur mobile */}
          <div className="hidden lg:block mt-5">
            <div className="flex items-center gap-3 flex-wrap">
              {selecteurQte}
              {surDevis ? (
                <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis} className="flex-1 min-w-[200px] rounded-full bg-orange text-white font-semibold px-8 py-3.5 hover:bg-orange-dark transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {ajouteDevis ? "✓ Ajouté au devis" : "Ajouter au devis"}
                </button>
              ) : (
                <>
                  <button onClick={ajouterPanier} disabled={!peutAjouter} className="flex-1 min-w-[180px] rounded-full bg-orange text-white font-semibold px-8 py-3.5 hover:bg-orange-dark transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {ajoute ? "✓ Ajouté" : "Ajouter au panier"}
                  </button>
                  {referenceFinale && (
                    <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis} className="rounded-full bg-charcoal text-white font-semibold px-6 py-3.5 hover:bg-[#2d3035] transition whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">
                      {ajouteDevis ? "✓ Ajouté" : "+ Devis"}
                    </button>
                  )}
                </>
              )}
            </div>
            {surDevis && <p className="text-[12.5px] text-ink-soft mt-2.5">Sans engagement — nos experts vous recontactent avec un devis personnalisé.</p>}
          </div>

          <div className="grid grid-cols-3 gap-2 lg:gap-3 mt-5 lg:mt-8 text-center">
            <div className="rounded-xl bg-surface lg:bg-transparent border border-line py-2.5 lg:py-3 px-2">
              <span className="block font-display font-bold text-ink text-[11px] lg:text-[13px]">Livraison</span>
              <span className="text-ink-soft text-[10px] lg:text-[12px]">& montage</span>
            </div>
            <div className="rounded-xl bg-surface lg:bg-transparent border border-line py-2.5 lg:py-3 px-2">
              <span className="block font-display font-bold text-ink text-[11px] lg:text-[13px]">Garantie 7 ans</span>
              <span className="text-ink-soft text-[10px] lg:text-[12px]">offerte</span>
            </div>
            <div className="rounded-xl bg-surface lg:bg-transparent border border-line py-2.5 lg:py-3 px-2">
              <span className="block font-display font-bold text-ink text-[11px] lg:text-[13px]">Conseil 3D</span>
              <span className="text-ink-soft text-[10px] lg:text-[12px]">sur devis</span>
            </div>
          </div>

          {/* Le descriptif ferme la colonne : place avant la configuration, il
              repoussait la palette de coloris sous la ligne de flottaison sur
              telephone — 58 fiches publiees depassent 600 caracteres ici. */}
          {carte.descriptif && (
            <div className="text-ink-soft mt-5 lg:mt-8 leading-relaxed prose prose-sm max-w-none text-[13px] lg:text-base" dangerouslySetInnerHTML={{ __html: carte.descriptif }} />
          )}
        </div>
      </div>

      {/* Sections descriptives — repliables sur mobile */}
      {carte.sectionsDevis?.length > 0 && (
        <div className="mt-6 lg:mt-14 lg:pt-14 lg:border-t lg:border-line flex flex-col gap-2 lg:gap-0">
          {carte.sectionsDevis.map((s, i) => (
            <div key={s.id} className="lg:mb-10 lg:last:mb-0">
              <SectionRepliable titre={s.titre || "Détails"} contenu={s.contenu} ouvertParDefaut={i === 0} />
            </div>
          ))}
        </div>
      )}

      {/* ══ Barre d'achat fixe (mobile) ══
          Sans elle, il faut faire défiler toute la configuration avant de
          trouver le bouton d'ajout au panier. */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/96 backdrop-blur-md border-t border-line px-4 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <p className="text-[10.5px] text-ink-soft">{surDevis ? "Prix indicatif" : "Total HT"}</p>
            <p className="font-display font-bold text-[19px] text-ink leading-tight">
              {surDevis ? fmt0(prixAffiche) : fmt(totalGeneral)}
            </p>
          </div>
          {!surDevis && selecteurQte}
        </div>

        <div className="flex gap-2">
          {surDevis ? (
            <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis}
              className="flex-1 rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-40">
              {ajouteDevis ? "✓ Ajouté au devis" : "Ajouter au devis"}
            </button>
          ) : (
            <>
              <button onClick={ajouterPanier} disabled={!peutAjouter}
                className="flex-1 rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px] disabled:opacity-40">
                {ajoute ? "✓ Ajouté au panier" : "Ajouter au panier"}
              </button>
              {referenceFinale && (
                <button onClick={ajouterAuDevis} disabled={!peutDemanderDevis} aria-label="Ajouter au devis"
                  className="w-12 grid place-items-center rounded-full bg-charcoal text-white disabled:opacity-40">
                  {ajouteDevis ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <ApercuColoris apercu={apercu} />
    </div>
  );
}
