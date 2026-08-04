"use client";
import { prixVenteEffectif } from "@/lib/prixDeclinaison";

const fmt2 = (n) => (n == null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function PrixProduit({ surDevis, gammeForceDevis, venteSurDevis, onChangeVenteSurDevis, axes, lignes, onChangeLignes, prixAPartir, onChangePrixAPartir, prixMiniAuto, promoPct, promoDebut, promoFin, onChangePromo, margeGlobale, sansDeclinaisons, prixUnitaireTarifHT, onChangePrixUnitaireTarif, prixUnitaireHT, onChangePrixUnitaire, prixUnitaireVerrouille, onChangePrixUnitaireVerrouille }) {
  const majPrixTarif = (ligneId, val) => {
    onChangeLignes(lignes.map((l) => (l.id === ligneId ? { ...l, prixTarifHT: val } : l)));
  };
  const majPrixVente = (ligneId, val) => {
    onChangeLignes(lignes.map((l) => (l.id === ligneId ? { ...l, prixVenteHT: val } : l)));
  };

  // Verrouille une ligne : fige le prix de vente sur sa valeur calculée actuelle, pour
  // qu'elle devienne modifiable sans être écrasée par un futur changement de marge.
  const verrouiller = (ligneId) => {
    onChangeLignes(lignes.map((l) => {
      if (l.id !== ligneId) return l;
      const valeurActuelle = prixVenteEffectif(l, margeGlobale);
      return { ...l, prixVerrouille: true, prixVenteHT: valeurActuelle != null ? String(valeurActuelle) : l.prixVenteHT };
    }));
  };
  // Déverrouille : repasse en calcul automatique (fournisseur × marge), à la prochaine
  // ouverture le champ redevient grisé et suit la marge globale.
  const deverrouiller = (ligneId) => {
    onChangeLignes(lignes.map((l) => (l.id === ligneId ? { ...l, prixVerrouille: false } : l)));
  };
  const deverrouillerTout = () => {
    onChangeLignes(lignes.map((l) => ({ ...l, prixVerrouille: false })));
  };

  const nbVerrouillees = lignes.filter((l) => l.prixVerrouille).length;

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };
  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 4 };
  const input = { width: "100%", padding: "12px 14px", borderRadius: 11, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 15, color: "#23262a", outline: "none" };
  const inputSm = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 13, color: "#23262a", outline: "none" };

  const promoActive = !!promoPct && (() => {
    const now = new Date();
    const debutOk = !promoDebut || new Date(promoDebut) <= now;
    const finOk = !promoFin || new Date(promoFin) >= now;
    return debutOk && finOk;
  })();

  const blocPromo = (
    <div style={{ ...card, marginTop: 20 }}>
      <label style={{ ...label, marginBottom: 4 }}>Promotion</label>
      <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>
        Optionnelle. Si un pourcentage est renseigné, le produit apparaît dans le carrousel « En promotion » de la page d'accueil pendant la période choisie (ou en permanence si aucune date n'est fixée).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div>
          <label style={{ ...label, marginBottom: 6 }}>Réduction (%)</label>
          <input value={promoPct} onChange={(e) => onChangePromo({ promoPct: e.target.value })} placeholder="ex : 15" inputMode="decimal" style={input} />
        </div>
        <div>
          <label style={{ ...label, marginBottom: 6 }}>Début</label>
          <input type="date" value={promoDebut} onChange={(e) => onChangePromo({ promoDebut: e.target.value })} style={input} />
        </div>
        <div>
          <label style={{ ...label, marginBottom: 6 }}>Fin</label>
          <input type="date" value={promoFin} onChange={(e) => onChangePromo({ promoFin: e.target.value })} style={input} />
        </div>
      </div>
      {promoPct && (
        <p style={{ fontSize: 12.5, marginTop: 12, color: promoActive ? "#1f7a52" : "#9aa0a8", fontWeight: 600 }}>
          {promoActive ? "✓ Promotion actuellement active" : "○ Promotion définie mais hors période (ou pas encore commencée)"}
        </p>
      )}
    </div>
  );

  const selecteurMode = !gammeForceDevis && (
    <div style={{ ...card, marginBottom: 20 }}>
      <label style={{ ...label, marginBottom: 10 }}>Mode de vente de ce produit</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button type="button" onClick={() => onChangeVenteSurDevis(true)}
          style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
            border: "1.5px solid " + (venteSurDevis ? "#f0661b" : "#ece8e0"),
            background: venteSurDevis ? "#fef4ee" : "#faf8f4",
            color: venteSurDevis ? "#d9551a" : "#5c616a" }}>
          Sur devis
          <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: venteSurDevis ? "#b45528" : "#9aa0a8", marginTop: 3 }}>Pas de prix ni de panier</span>
        </button>
        <button type="button" onClick={() => onChangeVenteSurDevis(false)}
          style={{ padding: "13px 14px", borderRadius: 12, cursor: "pointer", fontSize: 13.5, fontWeight: 600, textAlign: "left",
            border: "1.5px solid " + (!venteSurDevis ? "#f0661b" : "#ece8e0"),
            background: !venteSurDevis ? "#fef4ee" : "#faf8f4",
            color: !venteSurDevis ? "#d9551a" : "#5c616a" }}>
          Boutique
          <span style={{ display: "block", fontSize: 11.5, fontWeight: 400, color: !venteSurDevis ? "#b45528" : "#9aa0a8", marginTop: 3 }}>Prix + panier direct</span>
        </button>
      </div>
    </div>
  );

  if (surDevis) {
    return (
      <div>
        {selecteurMode}
        <div style={{ background: "#fef4ee", border: "1px solid #f7d9c6", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#b45528" }}>
          ⓘ Cette carte est <strong>sur devis</strong>{gammeForceDevis ? " (forcé par la gamme)" : ""}. Le client verra le prix ci-dessous (indicatif) + un bouton « Demander un devis » — pas de panier.
        </div>
        <div style={card}>
          <label style={label}>Prix « à partir de » (indicatif, optionnel)</label>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>
            Ce produit est sur devis — aucun prix exact n'est fixé. Ce champ affiche juste un ordre de grandeur sur la fiche.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input value={prixAPartir} onChange={(e) => onChangePrixAPartir(e.target.value)}
              placeholder="ex : 490" inputMode="decimal" style={{ ...input, maxWidth: 200 }} />
            <span style={{ fontSize: 13.5, color: "#5c616a" }}>€ HT</span>
            {prixMiniAuto != null && (
              <button type="button" onClick={() => onChangePrixAPartir(String(Math.round(prixMiniAuto)))}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ece8e0", background: "#faf8f4", cursor: "pointer", fontSize: 12.5, color: "#f0661b", fontWeight: 600 }}>
                Suggérer {Math.round(prixMiniAuto)} € (prix mini)
              </button>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "10px 0 0" }}>Laisser vide pour n'afficher aucun prix sur la fiche.</p>
        </div>
        {blocPromo}
      </div>
    );
  }

  // ─── Mode "prix unique" : produit sans déclinaisons ───
  if (sansDeclinaisons) {
    const tarifNum = (() => { const n = parseFloat(String(prixUnitaireTarifHT).replace(",", ".")); return Number.isNaN(n) ? null : n; })();
    const venteAuto = tarifNum != null ? Math.round(tarifNum * (1 + margeGlobale) * 100) / 100 : null;
    return (
      <div>
        {selecteurMode}
        <div style={card}>
          <label style={label}>Prix unique</label>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 18px" }}>
            Ce produit n'a pas de déclinaisons : un seul prix, identique quelles que soient les couleurs/options (gérées dans « Finitions »).
            <strong> Auto</strong> = fournisseur × marge ({Math.round(margeGlobale * 100)}%). <strong>Verrouillé</strong> = tu fixes le prix de vente à la main.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr", gap: 12, alignItems: "end", maxWidth: 520 }}>
            <div>
              <label style={{ ...label, marginBottom: 6 }}>Prix fournisseur €</label>
              <input value={prixUnitaireTarifHT ?? ""} onChange={(e) => onChangePrixUnitaireTarif(e.target.value)}
                placeholder="ex : 220" inputMode="decimal" style={input} />
            </div>
            <button
              type="button"
              onClick={() => {
                if (prixUnitaireVerrouille) { onChangePrixUnitaireVerrouille(false); }
                else { onChangePrixUnitaireVerrouille(true); if ((prixUnitaireHT ?? "") === "" && venteAuto != null) onChangePrixUnitaire(String(venteAuto)); }
              }}
              title={prixUnitaireVerrouille ? "Verrouillé — cliquer pour repasser en Auto" : "Auto — cliquer pour verrouiller et modifier à la main"}
              style={{ height: 46, borderRadius: 10, border: "1px solid " + (prixUnitaireVerrouille ? "#f0d9a6" : "#ece8e0"), background: prixUnitaireVerrouille ? "#fef4ee" : "#fff", cursor: "pointer", fontSize: 16 }}>
              {prixUnitaireVerrouille ? "🔒" : "🔓"}
            </button>
            <div>
              <label style={{ ...label, marginBottom: 6 }}>Prix vente €</label>
              {prixUnitaireVerrouille ? (
                <input value={prixUnitaireHT ?? ""} onChange={(e) => onChangePrixUnitaire(e.target.value)}
                  placeholder="ex : 345" inputMode="decimal" style={{ ...input, fontWeight: 700, color: "#d9551a" }} />
              ) : (
                <div style={{ ...input, fontWeight: 700, color: "#5c616a", background: "#f0ece4", display: "flex", alignItems: "center" }} title="Calculé automatiquement — verrouille pour modifier">
                  {venteAuto != null ? fmt2(venteAuto) : "—"}
                </div>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "12px 0 0" }}>
            C'est le prix de vente qui s'affiche sur la fiche et permet l'ajout au panier. En mode Auto, il suit la marge globale des Réglages.
          </p>
        </div>
        {blocPromo}
      </div>
    );
  }

  if (axes.length === 0 || lignes.length === 0) {
    return (
      <div>
        {selecteurMode}
        <div style={card}>
          <div style={{ padding: 28, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12 }}>
            Définis d'abord les axes et les combinaisons dans l'onglet « Déclinaisons » avant de fixer les prix.
          </div>
        </div>
        {blocPromo}
      </div>
    );
  }

  return (
    <div>
      {selecteurMode}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <label style={{ ...label, marginBottom: 4 }}>Prix par combinaison</label>
            <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>
              <strong>Auto</strong> = prix fournisseur × marge actuelle des Réglages ({Math.round(margeGlobale * 100)}%), recalculé en direct.
              <strong> Verrouillé</strong> = prix figé, modifiable à la main, ignore les futurs changements de marge.
            </p>
          </div>
          {nbVerrouillees > 0 && (
            <button type="button" onClick={deverrouillerTout}
              style={{ padding: "9px 16px", borderRadius: 9, background: "#fff", color: "#5c616a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
              🔓 Tout repasser en Auto ({nbVerrouillees})
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 120px 34px 120px`, gap: 8, marginBottom: 8, padding: "0 4px" }}>
          {axes.map((a) => <span key={a.id} style={label}>{a.nom || "(sans nom)"}</span>)}
          <span style={label}>Prix fournisseur €</span>
          <span></span>
          <span style={label}>Prix vente €</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lignes.map((l) => {
            const venteCalcule = prixVenteEffectif(l, margeGlobale);
            return (
              <div key={l.id} style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 120px 34px 120px`, gap: 8, alignItems: "center", padding: "6px 4px", borderRadius: 10, background: "#faf8f4" }}>
                {axes.map((a) => (
                  <span key={a.id} style={{ fontSize: 13.5, color: "#23262a", padding: "8px 10px" }}>{l.valeurs[a.id] || "—"}</span>
                ))}
                <input value={l.prixTarifHT ?? ""} onChange={(e) => majPrixTarif(l.id, e.target.value)} placeholder="620" style={inputSm} />
                <button
                  type="button"
                  onClick={() => (l.prixVerrouille ? deverrouiller(l.id) : verrouiller(l.id))}
                  title={l.prixVerrouille ? "Verrouillé — cliquer pour repasser en Auto" : "Auto — cliquer pour verrouiller et modifier à la main"}
                  style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid " + (l.prixVerrouille ? "#f0d9a6" : "#ece8e0"), background: l.prixVerrouille ? "#fef4ee" : "#fff", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center" }}>
                  {l.prixVerrouille ? "🔒" : "🔓"}
                </button>
                {l.prixVerrouille ? (
                  <input value={l.prixVenteHT ?? ""} onChange={(e) => majPrixVente(l.id, e.target.value)} placeholder="805" style={{ ...inputSm, fontWeight: 700, color: "#d9551a" }} />
                ) : (
                  <div style={{ ...inputSm, fontWeight: 700, color: "#5c616a", background: "#f0ece4", cursor: "default", display: "flex", alignItems: "center" }} title="Calculé automatiquement — verrouille pour modifier">
                    {fmt2(venteCalcule)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: "#9aa0a8", margin: "12px 0 0" }}>
          Change la marge dans <strong>Réglages → Tarification</strong> pour ajuster tout le catalogue d'un coup — seules les lignes verrouillées ne bougeront pas.
        </p>
      </div>
      {blocPromo}
    </div>
  );
}