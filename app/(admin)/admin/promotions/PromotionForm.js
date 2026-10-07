"use client";
import { useState } from "react";
import { Icon } from "@/components/dashboard/Icon";
import { DatePicker } from "@/components/dashboard/DatePicker";

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18 };

const CATEGORIES = [
  { value: "sieges", label: "Sièges & fauteuils", court: "Sièges" },
  { value: "bureaux", label: "Bureaux", court: "Bureaux" },
  { value: "tables", label: "Tables de réunion", court: "Tables" },
  { value: "rangements", label: "Rangements", court: "Rangements" },
  { value: "acoustique", label: "Acoustique", court: "Acoustique" },
  { value: "accueil", label: "Mobilier d'accueil", court: "Accueil" },
];

const toInputDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return "";
  return date.toISOString().slice(0, 10);
};

export function PromotionForm({ initial, cibles, marques = [], onSubmit, onCancel, submitLabel, titre }) {
  const [nom, setNom] = useState(initial?.nom || "");
  const [messageBandeau, setMessageBandeau] = useState(initial?.messageBandeau || "");
  const [typeRemise, setTypeRemise] = useState(initial?.typeRemise || "pourcentage");
  const [valeur, setValeur] = useState(initial?.valeur?.toString() || "");
  const [dateDebut, setDateDebut] = useState(toInputDate(initial?.dateDebut));
  const [dateFin, setDateFin] = useState(toInputDate(initial?.dateFin));
  const [actif, setActif] = useState(initial?.actif ?? true);
  // ── Remise automatique, ou code promo ──
  // "auto" : la remise est déduite des prix du catalogue, pour ce que la
  //          campagne vise. "code" : rien ne bouge au catalogue, le client tape
  //          son code au panier et la remise porte sur le total.
  const [modeRemise, setModeRemise] = useState(initial?.modeRemise === "code" ? "code" : "auto");
  const estCode = modeRemise === "code";
  const [code, setCode] = useState(initial?.code || "");
  const [codeMinimumHT, setCodeMinimumHT] = useState(initial?.codeMinimumHT != null ? String(initial.codeMinimumHT) : "");
  const [codeMaxUtilisations, setCodeMaxUtilisations] = useState(initial?.codeMaxUtilisations != null ? String(initial.codeMaxUtilisations) : "");
  const [codeUneFoisParClient, setCodeUneFoisParClient] = useState(initial?.codeUneFoisParClient ?? false);
  // Une campagne d'un seul jour s'écrit avec la même date au début et à la fin ;
  // le formulaire ne demande alors qu'un seul sélecteur.
  const [modeDate, setModeDate] = useState(() => {
    const d = toInputDate(initial?.dateDebut);
    const f = toInputDate(initial?.dateFin);
    return d && d === f ? "jour" : "periode";
  });
  const [categories, setCategories] = useState(initial?.categories || []);
  // Taux par fournisseur, en texte le temps de la saisie : { buronomic: "25" }.
  const [remisesMarques, setRemisesMarques] = useState(() => {
    const brut = initial?.remisesMarques;
    if (!brut || typeof brut !== "object" || Array.isArray(brut)) return {};
    return Object.fromEntries(Object.entries(brut).map(([s, v]) => [s, String(v)]));
  });
  const [afficherBandeau, setAfficherBandeau] = useState(initial?.afficherBandeau ?? true);
  const marquesSel = Object.keys(remisesMarques);
  const [ciblesSel, setCiblesSel] = useState(initial?.cibles?.map((p) => p.vitrineId) || []);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Le sélecteur de cibles est optionnel et occupe beaucoup de hauteur : replié par défaut.
  const [ciblesOuvert, setCiblesOuvert] = useState(false);

  const toggleCat = (v) => setCategories((c) => c.includes(v) ? c.filter((x) => x !== v) : [...c, v]);
  const toggleMarque = (slug) => setRemisesMarques((r) => {
    const suite = { ...r };
    if (slug in suite) delete suite[slug]; else suite[slug] = "";
    return suite;
  });
  const setTauxMarque = (slug, v) => setRemisesMarques((r) => ({ ...r, [slug]: v }));
  const toggleProd = (code) => setCiblesSel((p) => p.includes(code) ? p.filter((x) => x !== code) : [...p, code]);

  const filtered = search.trim()
    ? cibles.filter((p) => (p.nom + " " + p.vitrineId + " " + (p.gammeNom || "")).toLowerCase().includes(search.toLowerCase())).slice(0, 60)
    : cibles.slice(0, 40);

  const submit = async () => {
    setError("");
    if (!nom.trim()) { setError("Le nom est requis."); return; }

    // Un seul jour : la même date au début et à la fin.
    const debut = dateDebut;
    const fin = modeDate === "jour" ? dateDebut : dateFin;

    if (estCode) {
      // Un code n'a pas de cible à vérifier : son code EST sa cible, et sa
      // remise porte sur le panier entier.
      if (!code.trim()) { setError("Écrivez le code que le client devra saisir."); return; }
      if (!valeur || parseFloat(String(valeur).replace(",", ".")) <= 0) { setError("Indiquez la remise accordée par le code."); return; }
      if (modeDate === "jour" && !dateDebut) { setError("Choisissez le jour de validité du code."); return; }
    } else {
      const generale = categories.length > 0 || ciblesSel.length > 0;
      if (marquesSel.length === 0 && !generale) { setError("Ciblez au moins un fournisseur, une catégorie ou un produit."); return; }
      // La remise générale ne sert qu'aux catégories et produits ; les
      // fournisseurs ont chacun leur taux.
      if (generale && (!valeur || parseFloat(String(valeur).replace(",", ".")) <= 0)) { setError("Indiquez la remise à appliquer aux catégories et produits ciblés."); return; }
      const sansTaux = marquesSel.find((s) => !(parseFloat(String(remisesMarques[s]).replace(",", ".")) > 0));
      if (sansTaux) { setError(`Indiquez le taux pour ${marques.find((m) => m.slug === sansTaux)?.nom || sansTaux}.`); return; }
    }

    setSaving(true);
    const res = await onSubmit({
      nom, messageBandeau, typeRemise, valeur,
      dateDebut: debut, dateFin: fin,
      actif, afficherBandeau,
      modeRemise,
      code, codeMinimumHT, codeMaxUtilisations, codeUneFoisParClient,
      // Les cibles d'un code ne veulent rien dire : il remise le panier entier.
      categories: estCode ? [] : categories,
      remisesMarques: estCode ? {} : remisesMarques,
      cibles: estCode ? [] : ciblesSel,
    });
    setSaving(false);
    if (res && !res.ok) setError(res.error || "Erreur lors de l'enregistrement.");
  };

  // Interrupteur, repris trois fois dans ce formulaire.
  const bascule = (valeurActuelle, basculer, titre, detail) => (
    <button type="button" onClick={basculer}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "11px 13px", borderRadius: 10, background: "#faf8f4", border: "1px solid #e8e3da",
        cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginTop: 8,
      }}>
      <span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#23262a" }}>{titre}</span>
        {detail && <span style={{ display: "block", fontSize: 11, color: "#9aa0a8", marginTop: 2 }}>{detail}</span>}
      </span>
      <span style={{
        width: 42, height: 24, borderRadius: 999, flexShrink: 0, padding: "0 3px",
        background: valeurActuelle ? "#f0661b" : "#d3d1c7",
        display: "flex", alignItems: "center", justifyContent: valeurActuelle ? "flex-end" : "flex-start",
        transition: "background .15s",
      }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
      </span>
    </button>
  );

  return (
    <div>
      <style>{`
        /* Mobile : tout empilé, cibles cibles repliables, boutons en fin de formulaire.
           Desktop : deux colonnes et sélecteur de cibles toujours ouvert. */
        .pf-grille { display: flex; flex-direction: column; gap: 10px; }
        .pf-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pf-cibles-entete { display: flex; }
        .pf-cibles-corps { display: none; }
        .pf-cibles-corps.ouvert { display: block; }
        .pf-liste { max-height: 320px; }
        @media (min-width: 1024px) {
          .pf-grille { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
          .pf-colonne { display: flex; flex-direction: column; gap: 20px; }
          .pf-cibles-entete { display: none; }
          .pf-cibles-corps { display: block; }
          .pf-liste { min-height: 420px; max-height: 640px; }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ marginBottom: 14 }}>
        {onCancel && (
          <button onClick={onCancel} type="button"
            style={{ fontSize: 12.5, color: "#f0661b", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 10, fontFamily: "inherit" }}>
            ← Retour aux campagnes
          </button>
        )}
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "#23262a", margin: 0 }}>{titre || "Campagne"}</h2>
      </div>

      <div className="pf-grille">
        {/* COLONNE GAUCHE — Réglages */}
        <div className="pf-colonne" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={card}>
            <label style={labelStyle}>Nom de la campagne</label>
            <input style={{ ...inputStyle, marginBottom: 16 }} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex : Soldes d'été" autoFocus />

            {/* Message du bandeau : rédigé ici, la campagne étant seule à savoir
                ce qu'elle annonce. Il disparaît du site avec elle. */}
            <label style={labelStyle}>Message du bandeau</label>
            <input style={inputStyle} value={messageBandeau} onChange={(e) => setMessageBandeau(e.target.value)}
              placeholder="ex : −10 % sur les cabines acoustiques jusqu'au 30 septembre" />
            <p style={{ fontSize: 11.5, color: "#5c616a", margin: "6px 0 16px", lineHeight: 1.45 }}>
              Affiché en haut du site tant que la campagne est en cours, si le bandeau est activé dans les Réglages.
              Laissé vide, c&apos;est la remise chiffrée qui s&apos;affiche.
            </p>

            {/* ── Comment la remise atteint le client ── */}
            <label style={labelStyle}>Comment la remise s&apos;applique</label>
            <div style={{ display: "grid", gap: 6, marginBottom: estCode ? 14 : 16 }}>
              {[
                ["auto", "Automatique au catalogue", "Les prix des produits visés baissent tout seuls, pour tout le monde."],
                ["code", "Code promo appliqué au panier", "Les prix ne bougent pas. Le client saisit le code et la remise porte sur le total de son panier."],
              ].map(([v, titre, detail]) => {
                const sel = modeRemise === v;
                return (
                  <button key={v} type="button" onClick={() => setModeRemise(v)}
                    style={{ textAlign: "left", padding: "11px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                      border: sel ? "1.5px solid #f0661b" : "1.5px solid #e8e3da",
                      background: sel ? "#fff6f0" : "#faf8f4" }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: sel ? "#d9551a" : "#23262a" }}>{titre}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 2, lineHeight: 1.4 }}>{detail}</span>
                  </button>
                );
              })}
            </div>

            {estCode && (
              <>
                <label style={labelStyle}>Code à saisir</label>
                {/* Rangé en majuscules dès la frappe : c'est sous cette forme
                    qu'il est comparé, la casse ne doit pas décider d'une remise. */}
                <input style={{ ...inputStyle, fontWeight: 700, letterSpacing: "0.06em" }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="BIENVENUE10" autoComplete="off" spellCheck={false} />
                <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "6px 0 16px" }}>
                  La casse et les espaces sont ignorés : « bienvenue10 » fonctionnera aussi.
                </p>
              </>
            )}

            <label style={labelStyle}>{estCode ? "Remise accordée par le code" : "Remise"}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {[["pourcentage", "%"], ["montant", "€"]].map(([v, l]) => (
                  <button key={v} onClick={() => setTypeRemise(v)} type="button"
                    style={{ width: 48, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      border: typeRemise === v ? "1.5px solid #f0661b" : "1.5px solid #e8e3da",
                      background: typeRemise === v ? "#fce6d6" : "#faf8f4",
                      color: typeRemise === v ? "#d9551a" : "#5c616a" }}>
                    {l}
                  </button>
                ))}
              </div>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={valeur} onChange={(e) => setValeur(e.target.value)} inputMode="decimal" placeholder={typeRemise === "montant" ? "50" : "20"} />
            </div>
          </div>

          <div style={card}>
            <label style={labelStyle}>{estCode ? "Validité du code" : "Période"}</label>
            {/* Une période, ou un seul jour — une journée portes ouvertes, un
                anniversaire. Le jour unique s'enregistre comme une période
                dont le début et la fin tombent le même jour, et vaut jusqu'au
                soir : un code valable « le 12 » doit servir toute la journée. */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[["periode", "Une période"], ["jour", "Un seul jour"]].map(([v, l]) => {
                const sel = modeDate === v;
                return (
                  <button key={v} type="button" onClick={() => setModeDate(v)}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12.5, fontWeight: sel ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      border: sel ? "1.5px solid #f0661b" : "1.5px solid #e8e3da",
                      background: sel ? "#fce6d6" : "#faf8f4",
                      color: sel ? "#d9551a" : "#5c616a" }}>
                    {l}
                  </button>
                );
              })}
            </div>
            {modeDate === "jour" ? (
              <div style={{ marginBottom: 8 }}>
                <DatePicker value={dateDebut} onChange={setDateDebut} placeholder="Jour de validité" />
              </div>
            ) : (
              <div className="pf-duo" style={{ marginBottom: 8 }}>
                <DatePicker value={dateDebut} onChange={setDateDebut} />
                <DatePicker value={dateFin} onChange={setDateFin} />
              </div>
            )}
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "0 0 16px" }}>
              {modeDate === "jour"
                ? "Valable toute la journée choisie, jusqu'à minuit."
                : "Laissez vide pour une promotion permanente. La date de fin est incluse."}
            </p>

            <button
              type="button"
              onClick={() => setActif((a) => !a)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "11px 13px", borderRadius: 10, background: "#faf8f4", border: "1px solid #e8e3da",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a" }}>Campagne active</span>
              <span style={{
                width: 42, height: 24, borderRadius: 999, flexShrink: 0, padding: "0 3px",
                background: actif ? "#f0661b" : "#d3d1c7",
                display: "flex", alignItems: "center", justifyContent: actif ? "flex-end" : "flex-start",
                transition: "background .15s",
              }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
              </span>
            </button>

            {/* Une campagne peut remiser sans s'annoncer : le bandeau du site
                ne montre que celles qui le veulent. */}
            <button
              type="button"
              onClick={() => setAfficherBandeau((a) => !a)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "11px 13px", borderRadius: 10, background: "#faf8f4", border: "1px solid #e8e3da",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginTop: 8,
              }}
            >
              <span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#23262a" }}>Annoncer dans le bandeau</span>
                <span style={{ display: "block", fontSize: 11, color: "#9aa0a8", marginTop: 2 }}>
                  {afficherBandeau ? "Visible en haut du site, si le bandeau est activé dans les Réglages" : "La remise s'applique sans être annoncée"}
                </span>
              </span>
              <span style={{
                width: 42, height: 24, borderRadius: 999, flexShrink: 0, padding: "0 3px",
                background: afficherBandeau ? "#f0661b" : "#d3d1c7",
                display: "flex", alignItems: "center", justifyContent: afficherBandeau ? "flex-end" : "flex-start",
                transition: "background .15s",
              }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
              </span>
            </button>
          </div>

          {/* ── Garde-fous du code ──
              Tous optionnels : laissés vides, le code vaut tant que la campagne
              est active et dans ses dates. */}
          {estCode && (
            <div style={card}>
              <label style={labelStyle}>Garde-fous</label>

              <p style={{ fontSize: 11, fontWeight: 700, color: "#5c616a", margin: "0 0 6px" }}>Montant minimum de commande</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={codeMinimumHT}
                  onChange={(e) => setCodeMinimumHT(e.target.value)} inputMode="decimal" placeholder="Aucun" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#5c616a", flexShrink: 0 }}>€ HT</span>
              </div>
              <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "6px 0 14px" }}>
                En dessous, le code est refusé et le panier dit ce qui manque.
              </p>

              <p style={{ fontSize: 11, fontWeight: 700, color: "#5c616a", margin: "0 0 6px" }}>Nombre d&apos;utilisations</p>
              <input style={inputStyle} value={codeMaxUtilisations}
                onChange={(e) => setCodeMaxUtilisations(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric" placeholder="Illimité" />
              <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "6px 0 0" }}>
                Compté sur les commandes payées : un panier abandonné ne consomme pas une place.
              </p>

              {bascule(codeUneFoisParClient, () => setCodeUneFoisParClient((v) => !v),
                "Une seule fois par client",
                codeUneFoisParClient
                  ? "Refusé si une commande payée avec la même adresse e-mail l'a déjà utilisé"
                  : "Le même client peut réutiliser le code autant de fois qu'il veut")}
            </div>
          )}

          {!estCode && marques.length > 0 && (
            <div style={card}>
              <label style={labelStyle}>Fournisseurs ciblés</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {marques.map((m) => {
                  const sel = m.slug in remisesMarques;
                  return (
                    <div key={m.slug} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => toggleMarque(m.slug)}
                        style={{ flex: 1, textAlign: "left", padding: "9px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: sel ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                          border: sel ? "1.5px solid #f0661b" : "1.5px solid #e8e3da",
                          background: sel ? "#fce6d6" : "#faf8f4",
                          color: sel ? "#d9551a" : "#5c616a" }}>
                        {m.nom}
                      </button>
                      {sel && (
                        <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#d9551a" }}>−</span>
                          <input value={remisesMarques[m.slug]} onChange={(e) => setTauxMarque(m.slug, e.target.value)} inputMode="decimal" placeholder="25"
                            aria-label={`Taux pour ${m.nom}`}
                            style={{ ...inputStyle, width: 72, padding: "9px 10px", textAlign: "right" }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#5c616a" }}>%</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "10px 0 0" }}>
                Tous les produits du fournisseur passent au taux indiqué. Plusieurs fournisseurs dans une même campagne, chacun à son taux, ne font qu&apos;un seul bandeau.
              </p>
            </div>
          )}

          {!estCode && (
          <div style={card}>
            <label style={labelStyle}>Catégories ciblées</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map((c) => {
                const sel = categories.includes(c.value);
                return (
                  <button key={c.value} type="button" onClick={() => toggleCat(c.value)}
                    style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: sel ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      border: sel ? "1.5px solid #f0661b" : "1.5px solid #e8e3da",
                      background: sel ? "#fce6d6" : "#faf8f4",
                      color: sel ? "#d9551a" : "#5c616a" }}>
                    {c.court}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "10px 0 0" }}>Toute la catégorie sera en promotion.</p>
          </div>
          )}
        </div>

        {/* COLONNE DROITE — Produits ciblés, ou rappel de ce que fait un code */}
        {estCode ? (
          <div style={card}>
            <label style={labelStyle}>Ce que fait ce code</label>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#5c616a", lineHeight: 1.7 }}>
              <li>Les prix du catalogue ne changent pas : aucune pastille de promotion n&apos;apparaît.</li>
              <li>Le client saisit <strong style={{ color: "#23262a" }}>{code || "son code"}</strong> dans le récapitulatif de son panier.</li>
              <li>
                La remise s&apos;applique au <strong style={{ color: "#23262a" }}>total du panier</strong>, tous produits confondus,
                puis la TVA et les frais de port se recalculent sur le montant remisé.
              </li>
              <li>Elle se <strong style={{ color: "#23262a" }}>cumule</strong> avec les remises déjà consenties au catalogue par les autres campagnes.</li>
              <li>Le paiement revérifie le code et recalcule la remise : un panier trafiqué n&apos;obtient rien.</li>
            </ol>
            <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "14px 0 0", lineHeight: 1.5 }}>
              Un code n&apos;a pas de cible : il remise le panier entier. Les fournisseurs, catégories et
              produits ne sont donc pas demandés.
            </p>
          </div>
        ) : (
        <div style={{ ...card, padding: 0, display: "flex", flexDirection: "column" }}>
          <button
            type="button"
            className="pf-cibles-entete"
            onClick={() => setCiblesOuvert((v) => !v)}
            style={{ width: "100%", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
          >
            <span>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#23262a" }}>Produits ciblés</span>
              <span style={{ display: "block", fontSize: 11, color: "#9aa0a8", marginTop: 2 }}>
                {ciblesSel.length} sélectionné{ciblesSel.length > 1 ? "s" : ""} · optionnel
              </span>
            </span>
            <span style={{ color: ciblesOuvert ? "#d9551a" : "#9aa0a8", display: "flex", flexShrink: 0, transform: ciblesOuvert ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
            </span>
          </button>

          <div className={`pf-cibles-corps${ciblesOuvert ? " ouvert" : ""}`} style={{ padding: 16, paddingTop: 0 }}>
            <p style={{ ...labelStyle, marginTop: 16 }}>
              Produits ciblés — {ciblesSel.length} sélectionné{ciblesSel.length > 1 ? "s" : ""}
            </p>
            <input style={{ ...inputStyle, marginBottom: 10 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…" />
            <div className="pf-liste" style={{ overflowY: "auto", border: "1px solid #ece8e0", borderRadius: 12, background: "#faf8f4" }}>
              {filtered.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9aa0a8", padding: 20, margin: 0, textAlign: "center" }}>Aucun produit trouvé.</p>
              ) : filtered.map((p) => {
                const sel = ciblesSel.includes(p.vitrineId);
                return (
                  <label key={p.vitrineId} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #f0ece4", background: sel ? "#fff6f0" : "transparent" }}>
                    <input type="checkbox" checked={sel} onChange={() => toggleProd(p.vitrineId)} style={{ width: 16, height: 16, accentColor: "#f0661b", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#23262a", lineHeight: 1.3 }}>{p.nom}</span>
                    <span style={{ fontSize: 11, color: "#9aa0a8", flexShrink: 0 }}>{p.vitrineId}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Actions en fin de formulaire */}
      {error && (
        <p style={{ fontSize: 13, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "11px 16px", borderRadius: 10, margin: "16px 0 0" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid #ece8e0" }}>
        {onCancel && (
          <button onClick={onCancel} type="button"
            style={{ padding: "13px 22px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 13.5, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
            Annuler
          </button>
        )}
        <button onClick={submit} disabled={saving}
          style={{ flex: 1, padding: "13px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(240,102,27,0.28)", fontFamily: "inherit" }}>
          {saving ? "Enregistrement…" : (submitLabel || "Enregistrer")}
        </button>
      </div>
    </div>
  );
}