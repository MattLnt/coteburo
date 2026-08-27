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
  const [formOuvert, setFormOuvert] = useState(false);
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
      if (res.ok) { setNouvelleCatNom(""); setNouvelleCatIcone(null); setFormOuvert(false); router.refresh(); }
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
  const inputStyle = { flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 10, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <style>{`
        /* Mobile : le formulaire de création se déplie, la ligne de catégorie passe
           sur deux lignes (infos puis actions). Desktop : tout sur une ligne. */
        .cat-form-bouton { display: flex; }
        .cat-form { display: none; }
        .cat-form.ouvert { display: block; }
        .cat-form-champs { display: flex; flex-direction: column; gap: 10px; }
        .cat-actions { display: flex; gap: 6px; padding: 0 18px 14px; }
        .cat-actions-desktop { display: none; }
        .cat-compteur { display: block; font-size: 11.5px; color: #9aa0a8; margin-top: 2px; }
        @media (min-width: 1024px) {
          .cat-form-bouton { display: none; }
          .cat-form { display: block; }
          .cat-form-champs { flex-direction: row; align-items: center; }
          .cat-actions { display: none; }
          .cat-actions-desktop { display: inline-flex; gap: 8px; align-items: center; }
          .cat-compteur { display: inline; margin: 0; white-space: nowrap; }
        }
      `}</style>

      {/* Ajouter une catégorie principale */}
      <button
        type="button"
        className="cat-form-bouton"
        onClick={() => setFormOuvert((v) => !v)}
        style={{
          width: "100%", alignItems: "center", justifyContent: "center", gap: 8,
          padding: 12, borderRadius: 12, border: "1.5px dashed #e0dacf", background: "#faf8f4",
          cursor: "pointer", color: "#5c616a", marginBottom: 12, fontFamily: "inherit",
        }}
      >
        <span style={{ color: "#d9551a", fontSize: 17, lineHeight: 1 }}>+</span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{formOuvert ? "Annuler" : "Nouvelle catégorie"}</span>
      </button>

      <div className={`cat-form${formOuvert ? " ouvert" : ""}`} style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#5c616a", marginBottom: 10 }}>Nouvelle catégorie principale</p>
        <div className="cat-form-champs" style={{ gap: 10 }}>
          <SelecteurIcone valeur={nouvelleCatIcone} onChange={setNouvelleCatIcone} />
          <input value={nouvelleCatNom} onChange={(e) => setNouvelleCatNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouterCategorie()}
            placeholder="Ex : Luminaires" style={inputStyle} />
          <button onClick={ajouterCategorie} disabled={isPending || !nouvelleCatNom.trim()}
            style={{ padding: "11px 22px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", opacity: !nouvelleCatNom.trim() ? 0.6 : 1, fontFamily: "inherit" }}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* Liste des catégories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
  const inputStyle = { flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 9, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 13.5, color: "#23262a", outline: "none", boxSizing: "border-box" };

  const validerRenommage = () => {
    if (nomEdite.trim() && nomEdite.trim() !== categorie.nom) onRenommer(nomEdite.trim());
    setEdition(false);
  };

  const estOption = !!categorie.estOption;

  const boutonAccessoires = (compact = false) => (
    <button onClick={() => onBasculerOption(!estOption)} disabled={isPending}
      title="Marquer comme catégorie d'accessoires — ses produits pourront être ajoutés comme options d'autres produits"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
        padding: compact ? "8px 10px" : "6px 12px", borderRadius: compact ? 9 : 999,
        cursor: "pointer", flexShrink: 0, flex: compact ? 1 : "none",
        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit",
        border: "1.5px solid " + (estOption ? "#f0661b" : "#ece8e0"),
        background: estOption ? "#fef4ee" : (compact ? "#faf8f4" : "#fff"),
        color: estOption ? "#d9551a" : "#9aa0a8",
      }}>
      {estOption ? "✓ " : ""}Accessoires
    </button>
  );

  const boutonRenommer = (
    <button onClick={() => { setEdition(true); setNomEdite(categorie.nom); }} title="Renommer"
      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 10px", borderRadius: 9, border: "1px solid #ece8e0", background: "#faf8f4", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#5c616a", fontFamily: "inherit" }}>
      ✎ Renommer
    </button>
  );

  const boutonSupprimer = (compact = false) => (
    <button onClick={onSupprimer} disabled={isPending} title="Supprimer"
      style={{
        width: compact ? 42 : 32, height: compact ? "auto" : 32, padding: compact ? "8px" : 0,
        borderRadius: compact ? 9 : 8, border: "1px solid #ece8e0", background: "#fff",
        cursor: "pointer", color: "#c4735a", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 14,
      }}>🗑</button>
  );

  return (
    <div style={{ ...card, ...(estOption ? { borderColor: "#f0c4a0" } : null) }}>
      {/* Ligne principale */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", color: "#9aa0a8", display: "flex", flexShrink: 0, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: deplie ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="M9 6l6 6-6 6" /></svg>
        </button>

        <SelecteurIcone valeur={categorie.icone} onChange={onChangerIcone} />

        {edition ? (
          <input value={nomEdite} onChange={(e) => setNomEdite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && validerRenommage()} onBlur={validerRenommage}
            autoFocus style={{ ...inputStyle, fontWeight: 700, fontSize: 14.5 }} />
        ) : (
          <div onClick={onToggle} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
            <p style={{ fontWeight: 700, fontSize: 14.5, color: "#23262a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{categorie.nom}</p>
            <span className="cat-compteur" style={{ fontSize: 11.5, color: "#9aa0a8" }}>
              {categorie.sousCategories.length} sous-cat. · {categorie.nbProduits} produit{categorie.nbProduits > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {!edition && (
          <div className="cat-actions-desktop">
            {boutonAccessoires()}
            {boutonSupprimer()}
          </div>
        )}
      </div>

      {/* Actions sur une seconde ligne (mobile) */}
      {!edition && (
        <div className="cat-actions">
          {boutonRenommer}
          {boutonAccessoires(true)}
          {boutonSupprimer(true)}
        </div>
      )}

      {deplie && (
        <div style={{ borderTop: "1px solid #f2efe9", padding: "14px 16px 16px", background: "#faf8f4" }}>
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
              style={{ padding: "9px 16px", borderRadius: 9, background: "#23262a", color: "#fff", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}>
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #ece8e0", borderRadius: 10, padding: "9px 12px" }}>
      {edition ? (
        <input value={nomEdite} onChange={(e) => setNomEdite(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && validerRenommage()} onBlur={validerRenommage}
          autoFocus style={{ flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: 7, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
      ) : (
        <p onClick={() => setEdition(true)} style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#23262a", margin: 0, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sousCategorie.nom}</p>
      )}
      <span style={{ fontSize: 11.5, color: "#9aa0a8", whiteSpace: "nowrap", flexShrink: 0 }}>{sousCategorie.nbProduits}</span>
      <button onClick={onSupprimer} disabled={isPending} title="Supprimer"
        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #ece8e0", background: "#fff", cursor: "pointer", color: "#c4735a", fontSize: 12, flexShrink: 0, display: "grid", placeItems: "center" }}>🗑</button>
    </div>
  );
}

function ModaleConfirmationSuppr({ nom, erreur, isPending, onAnnuler, onConfirmer }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4" role="dialog" aria-modal="true" style={{ position: "fixed" }}>
      <div onClick={onAnnuler} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 420, borderRadius: 20, background: "#fff", border: "1px solid #ece8e0", padding: 24, boxShadow: "0 30px 70px -20px rgba(0,0,0,0.35)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#23262a", margin: "0 0 10px" }}>Supprimer « {nom} » ?</h2>
        <p style={{ fontSize: 13.5, color: "#5c616a", lineHeight: 1.6, marginBottom: erreur ? 14 : 20 }}>Cette action est irréversible.</p>
        {erreur && (
          <p style={{ fontSize: 13, color: "#b45528", background: "#fef4ee", border: "1px solid #f7d9c6", padding: "11px 16px", borderRadius: 10, marginBottom: 18 }}>{erreur}</p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onAnnuler} style={{ flex: 1, padding: "12px", borderRadius: 11, background: "#fff", color: "#23262a", border: "1px solid #ece8e0", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}>Annuler</button>
          <button onClick={onConfirmer} disabled={isPending} style={{ flex: 1, padding: "12px", borderRadius: 11, background: "#c4451f", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit" }}>
            {isPending ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}