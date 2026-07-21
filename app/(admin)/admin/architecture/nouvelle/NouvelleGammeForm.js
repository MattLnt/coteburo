"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creerGamme, getCategoriesDeMarque } from "../actions";

export default function NouvelleGammeForm({ donnees }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [marqueId, setMarqueId] = useState(donnees.marqueParDefautId || "");
  const [categories, setCategories] = useState(donnees.categories);
  const [categorieIds, setCategorieIds] = useState([]);
  const [erreur, setErreur] = useState("");
  const [isPending, startTransition] = useTransition();

  const marqueNom = donnees.marques.find((m) => m.id === marqueId)?.nom || "";
  const categoriesChoisies = categories.filter((c) => categorieIds.includes(c.id));

  const changerMarque = async (id) => {
    setMarqueId(id);
    setCategorieIds([]);
    const cats = await getCategoriesDeMarque(id);
    setCategories(cats);
  };

  const toggleCat = (id) => {
    setCategorieIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const valider = () => {
    setErreur("");
    if (!nom.trim()) { setErreur("Le nom est obligatoire."); return; }
    startTransition(async () => {
      const res = await creerGamme({ nom, marqueId, categorieIds });
      if (res.ok) router.push(`/admin/architecture/${res.id}`);
      else setErreur(res.error || "Une erreur est survenue.");
    });
  };

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 18, padding: 28, marginBottom: 20 };
  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#5c616a", marginBottom: 12 };
  const input = { width: "100%", padding: "15px 18px", borderRadius: 13, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 17, color: "#23262a", outline: "none", transition: "border-color .15s" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 13.5, color: "#5c616a" }}>
        <Link href="/admin/architecture" style={{ color: "#f0661b", textDecoration: "none", fontWeight: 600 }}>← Gammes</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: "#23262a" }}>Nouvelle gamme</span>
      </div>

      <h1 style={{ fontSize: 30, fontWeight: 800, color: "#23262a", margin: "0 0 28px", letterSpacing: "-0.02em" }}>Créer une gamme</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
        {/* ── Colonne formulaire ── */}
        <div>
          <div style={card}>
            <label style={label}>Nom de la gamme</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Astro"
              style={{ ...input, fontWeight: 600 }}
              onFocus={(e) => (e.target.style.borderColor = "#f0661b")}
              onBlur={(e) => (e.target.style.borderColor = "#ece8e0")}
              autoFocus
            />
          </div>

          {donnees.marques.length > 1 && (
            <div style={card}>
              <label style={label}>Marque</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {donnees.marques.map((m) => {
                  const actif = m.id === marqueId;
                  return (
                    <button key={m.id} type="button" onClick={() => changerMarque(m.id)}
                      style={{ padding: "12px 20px", borderRadius: 13, cursor: "pointer", fontSize: 14.5, fontWeight: 600,
                        border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"),
                        background: actif ? "#fce6d6" : "#fff",
                        color: actif ? "#d9551a" : "#5c616a" }}>
                      {m.nom}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={card}>
            <label style={label}>Catégorie(s)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {categories.map((c) => {
                const actif = categorieIds.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                    style={{ padding: "12px 22px", borderRadius: 999, cursor: "pointer", fontSize: 14.5, fontWeight: 600,
                      border: "1.5px solid " + (actif ? "#f0661b" : "#ece8e0"),
                      background: actif ? "#fce6d6" : "#fff",
                      color: actif ? "#d9551a" : "#5c616a",
                      display: "inline-flex", alignItems: "center", gap: 8, transition: "all .15s" }}>
                    {actif && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                    {c.nom}
                  </button>
                );
              })}
            </div>
          </div>

          {erreur && (
            <p style={{ fontSize: 14, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "13px 18px", borderRadius: 13, marginBottom: 20 }}>
              {erreur}
            </p>
          )}

          <button onClick={valider} disabled={isPending}
            style={{ padding: "16px 34px", borderRadius: 14, background: isPending ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 15.5, fontWeight: 700, boxShadow: "0 8px 20px -6px rgba(240,102,27,0.5)" }}>
            {isPending ? "Création…" : "Créer la gamme →"}
          </button>
        </div>

        {/* ── Colonne aperçu ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ background: "linear-gradient(150deg, #23262a 0%, #33261f 100%)", borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />

            <p style={{ position: "relative", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#f0661b", margin: "0 0 14px" }}>Aperçu</p>

            <h2 style={{ position: "relative", fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 6px", minHeight: 34, letterSpacing: "-0.01em" }}>
              {nom.trim() || "Nom de la gamme"}
            </h2>
            {marqueNom && (
              <p style={{ position: "relative", fontSize: 13, color: "#9aa0a8", margin: "0 0 22px" }}>{marqueNom}</p>
            )}

            <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 7 }}>
              {categoriesChoisies.length > 0 ? categoriesChoisies.map((c) => (
                <span key={c.id} style={{ padding: "6px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)" }}>
                  {c.nom}
                </span>
              )) : (
                <span style={{ fontSize: 13, color: "#6b7178" }}>Aucune catégorie sélectionnée</span>
              )}
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: "#9aa0a8", marginTop: 14, lineHeight: 1.6, padding: "0 4px" }}>
            La gamme sera créée en brouillon. Tu pourras ajouter son image, sa description et ses cartes juste après.
          </p>
        </div>
      </div>
    </div>
  );
}