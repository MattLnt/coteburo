"use client";

export default function PrixProduit({ surDevis, gammeForceDevis, venteSurDevis, onChangeVenteSurDevis, axes, lignes, onChangeLignes, prixAPartir, onChangePrixAPartir, prixMiniAuto, promoPct, promoDebut, promoFin, onChangePromo }) {
  const majPrix = (ligneId, val) => {
    onChangeLignes(lignes.map((l) => (l.id === ligneId ? { ...l, prixVenteHT: val } : l)));
  };

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

  // Sélecteur du mode de vente — masqué si la gamme force le devis pour tous ses produits
  // (dans ce cas, le réglage individuel du produit n'a aucun effet).
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
        <label style={{ ...label, marginBottom: 4 }}>Prix par combinaison</label>
        <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 16px" }}>
          Un prix HT pour chaque combinaison définie dans l'onglet « Déclinaisons ».
        </p>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 150px`, gap: 8, marginBottom: 8, padding: "0 4px" }}>
          {axes.map((a) => <span key={a.id} style={label}>{a.nom || "(sans nom)"}</span>)}
          <span style={label}>Prix HT €</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lignes.map((l) => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: `repeat(${axes.length}, 1fr) 150px`, gap: 8, alignItems: "center", padding: "6px 4px", borderRadius: 10, background: "#faf8f4" }}>
              {axes.map((a) => (
                <span key={a.id} style={{ fontSize: 13.5, color: "#23262a", padding: "8px 10px" }}>{l.valeurs[a.id] || "—"}</span>
              ))}
              <input value={l.prixVenteHT} onChange={(e) => majPrix(l.id, e.target.value)} placeholder="620" style={{ ...inputSm, fontWeight: 700 }} />
            </div>
          ))}
        </div>
      </div>
      {blocPromo}
    </div>
  );
}