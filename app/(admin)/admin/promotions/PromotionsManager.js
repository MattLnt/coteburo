"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { PromotionForm } from "./PromotionForm";
import { createPromotion, updatePromotion, deletePromotion, togglePromotion } from "./actions";

const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };

const CAT_LABELS = {
  sieges: "Sièges", bureaux: "Bureaux", tables: "Tables", rangements: "Rangements", acoustique: "Acoustique", accueil: "Accueil",
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : null;

function etatCampagne(promo) {
  if (!promo.actif) return { label: "Inactive", color: "#9aa0a8", bg: "#f0ece4" };
  const now = new Date();
  if (promo.dateDebut && new Date(promo.dateDebut) > now) return { label: "Programmée", color: "#b8860b", bg: "#fdf3d8" };
  if (promo.dateFin && new Date(promo.dateFin) < now) return { label: "Terminée", color: "#9aa0a8", bg: "#f0ece4" };
  return { label: "En cours", color: "#1f7a52", bg: "#d8f0e4" };
}

function PromoCard({ promo, produits, onEdit }) {
  const router = useRouter();
  const etat = etatCampagne(promo);
  const remise = promo.typeRemise === "montant" ? `−${promo.valeur} €` : `−${promo.valeur} %`;
  const nbProduits = promo.produits?.length || 0;

  const toggle = async () => { await togglePromotion(promo.id, !promo.actif); router.refresh(); };
  const remove = async () => {
    if (!confirm(`Supprimer la campagne "${promo.nom}" ?`)) return;
    await deletePromotion(promo.id);
    router.refresh();
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
            {remise}
          </span>
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#23262a", margin: 0 }}>{promo.nom}</p>
            <span style={{ display: "inline-block", marginTop: 4, padding: "2px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: etat.color, background: etat.bg }}>{etat.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onEdit} title="Modifier" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: "#5c616a", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="edit" size={16} />
          </button>
          <button onClick={remove} title="Supprimer" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #f0d9d0", background: "#fff", color: "#d9551a", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" /></svg>
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {promo.categories?.map((c) => (
          <span key={c} style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#f0ece4", color: "#5c616a" }}>{CAT_LABELS[c] || c}</span>
        ))}
        {nbProduits > 0 && (
          <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#f0ece4", color: "#5c616a" }}>{nbProduits} produit{nbProduits > 1 ? "s" : ""}</span>
        )}
        {(!promo.categories?.length && !nbProduits) && (
          <span style={{ fontSize: 12.5, color: "#9aa0a8" }}>Aucune cible</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid #f2efe9" }}>
        <span style={{ fontSize: 12.5, color: "#9aa0a8" }}>
          {promo.dateDebut || promo.dateFin
            ? `${fmtDate(promo.dateDebut) || "…"} → ${fmtDate(promo.dateFin) || "…"}`
            : "Permanente"}
        </span>
        <button onClick={toggle} style={{ fontSize: 12.5, fontWeight: 600, color: promo.actif ? "#d9551a" : "#1f7a52", background: "none", border: "none", cursor: "pointer" }}>
          {promo.actif ? "Désactiver" : "Activer"}
        </button>
      </div>
    </div>
  );
}

export function PromotionsManager({ promotions, produits }) {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null | "create" | promo.id (edit)

  const handleCreate = async (data) => {
    const res = await createPromotion(data);
    if (res.ok) { setMode(null); router.refresh(); }
    return res;
  };

  const handleUpdate = (id) => async (data) => {
    const res = await updatePromotion(id, data);
    if (res.ok) { setMode(null); router.refresh(); }
    return res;
  };

  // Formulaire de création
  if (mode === "create") {
    return (
      <PromotionForm produits={produits} onSubmit={handleCreate} onCancel={() => setMode(null)} submitLabel="Créer la campagne" />
    );
  }

  // Formulaire d'édition
  if (mode) {
    const promo = promotions.find((p) => p.id === mode);
    if (promo) {
      return (
        <PromotionForm initial={promo} produits={produits} onSubmit={handleUpdate(promo.id)} onCancel={() => setMode(null)} submitLabel="Enregistrer les modifications" />
      );
    }
  }

  // Liste
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <button onClick={() => setMode("create")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          <Icon name="plus" size={18} /> Nouvelle campagne
        </button>
      </div>

      {promotions.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 48 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, background: "#fce6d6", color: "#d9551a", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon name="tag" size={26} />
          </span>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#23262a", margin: "0 0 6px" }}>Aucune campagne</p>
          <p style={{ fontSize: 13.5, color: "#9aa0a8", margin: "0 0 20px" }}>Créez votre première campagne promotionnelle.</p>
          <button onClick={() => setMode("create")} style={{ padding: "11px 24px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Créer une campagne</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {promotions.map((p) => (
            <PromoCard key={p.id} promo={p} produits={produits} onEdit={() => setMode(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}