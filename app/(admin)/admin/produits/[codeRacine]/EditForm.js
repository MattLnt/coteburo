"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { FormSelect } from "@/components/dashboard/FormSelect";
import { StatutBadge } from "@/components/dashboard/StatutBadge";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { updateProduit } from "../actions";
import { CATEGORIES, sousCategoriesDe } from "@/lib/categories";

const CAT_OPTIONS = CATEGORIES.map((c) => ({ value: c.slug, label: c.label }));

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };

export function EditForm({ produit }) {
  const router = useRouter();
  const [form, setForm] = useState({
    designation: produit.designation || "",
    categorie: produit.categorie || "",
    sousCategorie: produit.sousCategorie || "",
    descriptionWeb: produit.descriptionWeb || "",
    prixAchatHT: produit.prixAchatHT ?? "",
    prixVenteHT: produit.prixVenteHT ?? "",
    prixVerrouille: !!produit.prixVerrouille,
    publie: !!produit.publie,
    bestSeller: !!produit.bestSeller,
    enAvant: !!produit.enAvant,
    images: produit.images || [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  // Quand on change la catégorie, on réinitialise la sous-catégorie si elle n'appartient plus à la nouvelle catégorie
  const changerCategorie = (v) => {
    setForm((f) => {
      const sousCatsValides = sousCategoriesDe(v).map((s) => s.slug);
      const sousCategorie = sousCatsValides.includes(f.sousCategorie) ? f.sousCategorie : "";
      return { ...f, categorie: v, sousCategorie };
    });
    setSaved(false);
  };

  const sousCatOptions = sousCategoriesDe(form.categorie).map((s) => ({ value: s.slug, label: s.label }));

  const achat = parseFloat(String(form.prixAchatHT).replace(",", ".")) || null;
  const vente = parseFloat(String(form.prixVenteHT).replace(",", ".")) || null;
  const marge = achat != null && vente != null ? vente - achat : null;
  const margePct = marge != null && vente ? (marge / vente) * 100 : null;

  const handleSave = async () => {
    setSaving(true);
    await updateProduit(produit.codeRacine, form);
    setSaving(false);
    setSaved(true);
    router.refresh();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }} className="edit-grid">
      <style>{`@media (max-width: 900px){ .edit-grid { grid-template-columns: 1fr !important; } }`}</style>

      {/* Colonne principale */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={card}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: "0 0 18px" }}>Informations</h3>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Désignation</label>
            <input style={inputStyle} value={form.designation} onChange={(e) => set("designation", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <FormSelect label="Catégorie" value={form.categorie} onChange={changerCategorie} options={CAT_OPTIONS} placeholder="Choisir une catégorie" />
            <FormSelect label="Sous-catégorie" value={form.sousCategorie} onChange={(v) => set("sousCategorie", v)} options={sousCatOptions} placeholder={form.categorie ? "Choisir une sous-catégorie" : "Choisir d'abord une catégorie"} />
          </div>

          <div>
            <label style={labelStyle}>Description web</label>
            <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} value={form.descriptionWeb} onChange={(e) => set("descriptionWeb", e.target.value)} placeholder="Description affichée sur la fiche produit du site…" />
          </div>
        </div>

        {/* Galerie d'images */}
        <div style={card}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: "0 0 4px" }}>Galerie</h3>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 18px" }}>La première image est l'image principale affichée dans le catalogue.</p>
          <ImageUploader images={form.images} onChange={(imgs) => set("images", imgs)} />
        </div>

        <div style={card}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: "0 0 4px" }}>Tarification</h3>
          <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 18px" }}>Prix public catalogue : <strong style={{ color: "#5c616a" }}>{produit.prixPublicHT?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT</strong></p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Prix d'achat HT (€)</label>
              <input style={inputStyle} value={form.prixAchatHT} onChange={(e) => set("prixAchatHT", e.target.value)} placeholder="ex : 180.00" inputMode="decimal" />
            </div>
            <div>
              <label style={labelStyle}>Prix de vente HT (€)</label>
              <input style={inputStyle} value={form.prixVenteHT} onChange={(e) => set("prixVenteHT", e.target.value)} placeholder="ex : 263.20" inputMode="decimal" />
            </div>
          </div>

          {marge != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: marge >= 0 ? "rgba(36,158,124,0.1)" : "rgba(217,85,26,0.1)" }}>
              <Icon name="euro" size={17} color={marge >= 0 ? "#1f7a52" : "#d9551a"} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: marge >= 0 ? "#1f7a52" : "#d9551a" }}>
                Marge : {marge.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € {margePct != null && `(${margePct.toFixed(1)} %)`}
              </span>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={form.prixVerrouille} onChange={(e) => set("prixVerrouille", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
            <span style={{ fontSize: 13.5, color: "#23262a" }}>Verrouiller le prix (ne pas écraser lors d'un ré-import)</span>
          </label>
        </div>
      </div>

      {/* Colonne latérale */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 90 }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={labelStyle}>Statut</span>
            <StatutBadge publie={form.publie} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0ece4", background: "#faf8f4" }}>
            <input type="checkbox" checked={form.publie} onChange={(e) => set("publie", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a" }}>Publier sur le site</span>
          </label>

          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", marginTop: 16, padding: "12px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>

        {/* Mise en avant sur la home */}
        <div style={card}>
          <span style={labelStyle}>Mise en avant (page d'accueil)</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0ece4", background: "#faf8f4" }}>
              <input type="checkbox" checked={form.bestSeller} onChange={(e) => set("bestSeller", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
              <span style={{ fontSize: 13.5, color: "#23262a" }}>Meilleure vente</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0ece4", background: "#faf8f4" }}>
              <input type="checkbox" checked={form.enAvant} onChange={(e) => set("enAvant", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
              <span style={{ fontSize: 13.5, color: "#23262a" }}>Dans la sélection</span>
            </label>
          </div>
          <p style={{ fontSize: 12, color: "#9aa0a8", margin: "12px 0 0" }}>Contrôle l'affichage du produit dans les sections de la page d'accueil.</p>
        </div>

        <div style={card}>
          <span style={labelStyle}>Détails</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, fontSize: 13 }}>
            <Row label="Code racine" value={produit.codeRacine} />
            <Row label="Marque" value={produit.marque?.nom} />
            <Row label="Gamme" value={produit.gamme} />
            <Row label="Variantes" value={`${produit._count?.variantes ?? 0}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#9aa0a8" }}>{label}</span>
      <span style={{ color: "#23262a", fontWeight: 600, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}