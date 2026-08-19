"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SelecteurIcone from "./SelecteurIcone";
import {
  creerCategorie, renommerCategorie, changerIconeCategorie, supprimerCategorie, basculerOptionCategorie,
  creerSousCategorie, renommerSousCategorie, supprimerSousCategorie,
} from "./actionsCategories";

// Tri alphabétique français, insensible aux accents et à la casse.
const parNom = (a, b) => (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" });

export default function CategoriesManager({ categories }) {
  const router = useRouter();
  const [depliees, setDepliees] = useState(() => new Set());
  const [nouvelleCatNom, setNouvelleCatNom] = useState("");
  const [nouvelleCatIcone, setNouvelleCatIcone] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [confirmationSuppr, setConfirmationSuppr] = useState(null); // { type: "cat"|"sous", id, nom }
  const [erreurSuppr, setErreurSuppr] = useState("");

  // Catégories triées alphabétiquement, et sous-catégories de chacune triées aussi.
  const categoriesTriees = [...categories]
    .map((c) => ({ ...c, sousCategories: [...(c.sousCategories || [])].sort(parNom) }))
    .sort(parNom);

  const toggleDeplier = (id) => {
    setDepliees((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const ajouterCategorie = () => {
    if (!nouvelleCatNom.trim()) return;
    startTransition(async () => {
      const res = await creerCategorie(nouvelleCatNom, nouvelleCatIcone);
      if (res.ok) { setNouvelleCatNom(""); setNouvelleCatIcone(null); router.refresh(); }
    });
  };

  const confirmerSuppression = () => {
    setErreurSuppr("");
    startTransition(async () => {
      const res = confirmationSuppr.type === "cat"
        ? await supprimerCategorie(confirmationSuppr.id)
        : await supprimerSousCategorie(confirmationSuppr.id);
      if (!res.ok) { setErreurSuppr(res.error); return; }
      setConfirmationSuppr(null);
      router.refresh();
    });
  };

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" };
  const inputStyle = { flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none" };

  return (
    <div>
      {/* Ajouter une catégorie principale */}
      <div style={{ ...card, padding: 18, marginBottom: 18 }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 }}>Nouvelle catégorie principale</p>
        <div style={{ display: "flex", gap: 10 }}>
          <SelecteurIcone valeur={nouvelleCatIcone} onChange={setNouvelleCatIcone} />
          <input value={nouvelleCatNom} onChange={(e) => setNouvelleCatNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouterCategorie()}
            placeholder="Ex : Luminaires" style={inputStyle} />
          <button onClick={ajouterCategorie} disabled={isPending || !nouvelleCatNom.trim()}
            style={{ padding: "11px 22px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", opacity: !nouvelleCatNom.trim() ? 0.6 : 1 }}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* Liste des catégories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {categoriesTriees.map((cat) => (
          <CategorieBloc
            key={cat.id}
            categorie={cat}
            deplie={depliees.has(cat.id)}
            onToggle={() => toggleDeplier(cat.id)}
            onRenommer={(nom) => startTransition(async () => { await renommerCategorie(cat.id, nom); router.refresh(); })}
            onChangerIcone={(icone) => startTransition(async () => { await changerIconeCategorie(cat.id, icone); router.refresh(); })}
            onBasculerOption={(val) => startTransition(async () => { await basculerOptionCategorie(cat.id, val); router.refresh(); })}
            onSupprimer={() => setConfirmationSuppr({ type: "cat", id: cat.id, nom: cat.nom })}
            onAjouterSousCat={(nom) => startTransition(async () => { await creerSousCategorie(cat.id, nom); router.refresh(); })}
            onRenommerSousCat={(id, nom) => startTransition(async () => { await renommerSousCategorie(id, nom); router.refresh(); })}
            onSupprimerSousCat={(id, nom) => setConfirmationSuppr({ type: "sous", id, nom })}
            isPending={isPending}
          />
        ))}
        {categoriesTriees.length === 0 && (
          <div style={{ ...card, padding: 40, textAlign: "center", color: "#9aa0a8", fontSize: 14 }}>Aucune catégorie pour l'instant.</div>
        )}
      </div>

      {confirmationSuppr && (
        <ModaleConfirmationSuppr
          nom={confirmationSuppr.nom}
          erreur={erreurSuppr}
          isPending={isPending}
          onAnnuler={() => { setConfirmationSuppr(null); setErreurSuppr(""); }}
          onConfirmer={confirmerSuppression}
        />
      )}
    </div>
  );
}

function CategorieBloc({ categorie, deplie, onToggle, onRenommer, onChangerIcone, onBasculerOption, onSupprimer, onAjouterSousCat, onRenommerSousCat, onSupprimerSousCat, isPending }) {
  const [edition, setEdition] = useState(false);
  const [nomEdite, setNomEdite] = useState(categorie.nom);
  const [nouvelleSousCatNom, setNouvelleSousCatNom] = useState("");

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" };
  const inputStyle = { flex: 1, padding: "9px 12px", borderRadius: 9, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 13.5, color: "#23262a", outline: "none" };

  const validerRenommage = () => {
    if (nomEdite.trim() && nomEdite.trim() !== categorie.nom) onRenommer(nomEdite.trim());
    setEdition(false);
  };

  const estOption = !!categorie.estOption;

  return (
    <div style={{ ...card, ...(estOption ? { borderColor: "#f0c4a0" } : null) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px" }}>
        <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", color: "#9aa0a8", display: "flex" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: deplie ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="M9 6l6 6-6 6" /></svg>
        </button>

        <SelecteurIcone valeur={categorie.icone} onChange={onChangerIcone} />

        {edition ? (
          <input value={nomEdite} onChange={(e) => setNomEdite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && validerRenommage()} onBlur={validerRenommage}
            autoFocus style={{ ...inputStyle, fontWeight: 700, fontSize: 15 }} />
        ) : (
          <p onClick={() => setEdition(true)} style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "#23262a", margin: 0, cursor: "text" }}>{categorie.nom}</p>
        )}

        {/* Toggle : catégorie d'accessoires (ses produits deviennent sélectionnables comme options) */}
        <button onClick={() => onBasculerOption(!estOption)} disabled={isPending}
          title="Marquer comme catégorie d'accessoires — ses produits pourront être ajoutés comme options d'autres produits"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer", flexShrink: 0,
            fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            border: "1.5px solid " + (estOption ? "#f0661b" : "#ece8e0"),
            background: estOption ? "#fef4ee" : "#fff",
            color: estOption ? "#d9551a" : "#9aa0a8",
          }}>
          {estOption ? "✓ " : ""}Accessoires
        </button>

        <span style={{ fontSize: 12, color: "#9aa0a8", whiteSpace: "nowrap" }}>{categorie.sousCategories.length} sous-cat. · {categorie.nbProduits} produit{categorie.nbProduits > 1 ? "s" : ""}</span>

        <button onClick={onSupprimer} disabled={isPending} title="Supprimer"
          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", flexShrink: 0 }}>🗑</button>
      </div>

      {deplie && (
        <div style={{ borderTop: "1px solid #f2efe9", padding: "14px 18px 16px 46px", background: "#faf8f4" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {categorie.sousCategories.map((sc) => (
              <SousCategorieLigne key={sc.id} sousCategorie={sc} onRenommer={(nom) => onRenommerSousCat(sc.id, nom)} onSupprimer={() => onSupprimerSousCat(sc.id, sc.nom)} isPending={isPending} />
            ))}
            {categorie.sousCategories.length === 0 && (
              <p style={{ fontSize: 13, color: "#9aa0a8", fontStyle: "italic", margin: 0 }}>Aucune sous-catégorie.</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={nouvelleSousCatNom} onChange={(e) => setNouvelleSousCatNom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && nouvelleSousCatNom.trim()) { onAjouterSousCat(nouvelleSousCatNom.trim()); setNouvelleSousCatNom(""); } }}
              placeholder="Nouvelle sous-catégorie…" style={inputStyle} />
            <button onClick={() => { if (nouvelleSousCatNom.trim()) { onAjouterSousCat(nouvelleSousCatNom.trim()); setNouvelleSousCatNom(""); } }} disabled={isPending || !nouvelleSousCatNom.trim()}
              style={{ padding: "9px 16px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
              + Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SousCategorieLigne({ sousCategorie, onRenommer, onSupprimer, isPending }) {
  const [edition, setEdition] = useState(false);
  const [nomEdite, setNomEdite] = useState(sousCategorie.nom);

  const validerRenommage = () => {
    if (nomEdite.trim() && nomEdite.trim() !== sousCategorie.nom) onRenommer(nomEdite.trim());
    setEdition(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #ece8e0", borderRadius: 10, padding: "8px 12px" }}>
      {edition ? (
        <input value={nomEdite} onChange={(e) => setNomEdite(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && validerRenommage()} onBlur={validerRenommage}
          autoFocus style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 13.5, outline: "none" }} />
      ) : (
        <p onClick={() => setEdition(true)} style={{ flex: 1, fontSize: 13.5, color: "#23262a", margin: 0, cursor: "text" }}>{sousCategorie.nom}</p>
      )}
      <span style={{ fontSize: 11.5, color: "#9aa0a8", whiteSpace: "nowrap" }}>{sousCategorie.nbProduits} produit{sousCategorie.nbProduits > 1 ? "s" : ""}</span>
      <button onClick={onSupprimer} disabled={isPending} title="Supprimer"
        style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 12, flexShrink: 0 }}>🗑</button>
    </div>
  );
}

function ModaleConfirmationSuppr({ nom, erreur, isPending, onAnnuler, onConfirmer }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" style={{ position: "fixed" }}>
      <div onClick={onAnnuler} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 420, borderRadius: 20, background: "#fff", border: "1px solid #ece8e0", padding: 26, boxShadow: "0 30px 70px -20px rgba(0,0,0,0.35)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 10px" }}>Supprimer « {nom} » ?</h2>
        <p style={{ fontSize: 13.5, color: "#5c616a", lineHeight: 1.6, marginBottom: erreur ? 14 : 20 }}>Cette action est irréversible.</p>
        {erreur && (
          <p style={{ fontSize: 13, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "11px 16px", borderRadius: 10, marginBottom: 18 }}>{erreur}</p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onAnnuler} style={{ flex: 1, padding: "12px", borderRadius: 11, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 13.5, fontWeight: 600 }}>Annuler</button>
          <button onClick={onConfirmer} disabled={isPending} style={{ flex: 1, padding: "12px", borderRadius: 11, background: "#c4451f", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 13.5, fontWeight: 700 }}>
            {isPending ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}