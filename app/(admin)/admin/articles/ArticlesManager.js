"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { StatutBadge } from "@/components/dashboard/StatutBadge";
import TiptapEditor from "@/components/dashboard/TiptapEditor";
import { createArticle, updateArticle, deleteArticle, toggleArticlePublie } from "./actions";

const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18 };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

function ArticleForm({ article, onDone, onCancel }) {
  const router = useRouter();
  const [form, setForm] = useState({
    titre: article?.titre || "",
    extrait: article?.extrait || "",
    contenu: article?.contenu || "",
    imageUrl: article?.imageUrl || "",
    categorie: article?.categorie || "",
    auteur: article?.auteur || "",
    publie: article?.publie ?? false,
    slug: article?.slug || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.titre.trim()) return;
    setSaving(true);
    if (article) await updateArticle(article.id, form);
    else await createArticle(form);
    setSaving(false);
    router.refresh();
    onDone();
  };

  const boutons = (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onCancel} style={{ padding: "12px 20px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 13.5, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
        Annuler
      </button>
      <button onClick={save} disabled={saving || !form.titre.trim()} style={{ flex: 1, padding: "12px 20px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving || !form.titre.trim() ? 0.6 : 1, fontFamily: "inherit" }}>
        {saving ? "Enregistrement…" : article ? "Enregistrer" : "Créer l'article"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        /* Mobile : tout empilé, réglages (statut, image, catégorie) AVANT le contenu,
           boutons en fin de formulaire. Desktop : deux colonnes comme avant. */
        .ar-form { display: flex; flex-direction: column; gap: 14px; }
        .ar-lateral { order: -1; }
        .ar-entete-boutons { display: none; }
        .ar-pied-boutons { display: block; }
        .ar-duo { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 1024px) {
          .ar-form { display: grid; grid-template-columns: 1fr 320px; gap: 18px; align-items: start; }
          .ar-lateral { order: 1; }
          .ar-principal { order: 0; }
          .ar-entete-boutons { display: flex; }
          .ar-pied-boutons { display: none; }
          .ar-duo { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#23262a", margin: 0 }}>
          {article ? "Modifier l'article" : "Nouvel article"}
        </h3>
        <div className="ar-entete-boutons" style={{ gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={save} disabled={saving || !form.titre.trim()} style={{ padding: "10px 20px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving || !form.titre.trim() ? 0.6 : 1, fontFamily: "inherit" }}>
            {saving ? "Enregistrement…" : article ? "Enregistrer" : "Créer l'article"}
          </button>
        </div>
      </div>

      <div className="ar-form">
        {/* Colonne principale */}
        <div className="ar-principal" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={card}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Titre *</label>
              <input style={inputStyle} value={form.titre} onChange={(e) => set("titre", e.target.value)} placeholder="Titre de l'article" />
            </div>
            <div>
              <label style={labelStyle}>Extrait (résumé affiché dans la liste)</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} value={form.extrait} onChange={(e) => set("extrait", e.target.value)} placeholder="Un court résumé accrocheur…" />
            </div>
          </div>

          <div style={card}>
            <label style={labelStyle}>Contenu de l'article</label>
            <TiptapEditor value={form.contenu} onChange={(html) => set("contenu", html)} />
          </div>
        </div>

        {/* Colonne latérale — remontée en premier sur mobile */}
        <div className="ar-lateral" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={card}>
            <button
              type="button"
              onClick={() => set("publie", !form.publie)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "11px 13px", borderRadius: 10, background: "#faf8f4", border: "1px solid #e8e3da",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#23262a" }}>Publier sur le site</span>
                <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 1 }}>{form.publie ? "Visible par les visiteurs" : "Brouillon"}</span>
              </span>
              <span style={{
                width: 42, height: 24, borderRadius: 999, flexShrink: 0, padding: "0 3px",
                background: form.publie ? "#f0661b" : "#d3d1c7",
                display: "flex", alignItems: "center", justifyContent: form.publie ? "flex-end" : "flex-start",
                transition: "background .15s",
              }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
              </span>
            </button>
          </div>

          <div style={card}>
            <label style={labelStyle}>Image de couverture</label>
            <ImageUploader images={form.imageUrl ? [form.imageUrl] : []} onChange={(imgs) => set("imageUrl", imgs[0] || "")} max={1} />
          </div>

          <div style={card}>
            <div className="ar-duo">
              <div>
                <label style={labelStyle}>Catégorie</label>
                <input style={inputStyle} value={form.categorie} onChange={(e) => set("categorie", e.target.value)} placeholder="ex : Conseils" />
              </div>
              <div>
                <label style={labelStyle}>Auteur</label>
                <input style={inputStyle} value={form.auteur} onChange={(e) => set("auteur", e.target.value)} placeholder="Nom de l'auteur" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ar-pied-boutons" style={{ paddingTop: 14, borderTop: "1px solid #ece8e0" }}>
        {boutons}
      </div>
    </div>
  );
}

export function ArticlesManager({ articles }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState(null); // null | "new" | id

  const supprimer = (id) => {
    if (!confirm("Supprimer cet article ?")) return;
    startTransition(async () => { await deleteArticle(id); router.refresh(); });
  };
  const togglePublie = (id, publie) => {
    startTransition(async () => { await toggleArticlePublie(id, !publie); router.refresh(); });
  };

  if (mode === "new") return <ArticleForm onDone={() => setMode(null)} onCancel={() => setMode(null)} />;
  const editing = mode && articles.find((a) => a.id === mode);
  if (editing) return <ArticleForm article={editing} onDone={() => setMode(null)} onCancel={() => setMode(null)} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        /* Mobile : cartes séparées, actions sur une ligne dédiée sous le titre.
           Desktop : lignes serrées avec actions à droite, comme avant. */
        .ar-liste { display: flex; flex-direction: column; gap: 10px; }
        .ar-ligne { background: #fff; border: 1px solid #ece8e0; border-radius: 14px; padding: 13px 14px; }
        .ar-ligne-haut { display: flex; align-items: center; gap: 12px; }
        .ar-actions { display: flex; gap: 8px; margin-top: 12px; }
        .ar-bouton-new { width: 100%; justify-content: center; }
        @media (min-width: 1024px) {
          .ar-liste { background: #fff; border: 1px solid #ece8e0; border-radius: 16px; overflow: hidden; gap: 0; }
          .ar-ligne { border: none; border-radius: 0; padding: 16px; display: flex; align-items: center; gap: 16px; }
          .ar-ligne + .ar-ligne { border-top: 1px solid #f2efe9; }
          .ar-ligne-haut { flex: 1; min-width: 0; }
          .ar-actions { margin-top: 0; flex-shrink: 0; }
          .ar-bouton-new { width: auto; align-self: flex-start; }
        }
      `}</style>

      <button onClick={() => setMode("new")} className="ar-bouton-new"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
        <Icon name="plus" size={17} /> Nouvel article
      </button>

      {articles.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
          <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>Aucun article pour l'instant. Rédigez le premier !</p>
        </div>
      ) : (
        <div className="ar-liste">
          {articles.map((a) => (
            <div key={a.id} className="ar-ligne">
              <div className="ar-ligne-haut">
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: "#f7f4ef", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                    {a.imageUrl ? <img src={a.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="edit" size={20} color="#c4c0b6" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14.5, color: "#23262a" }}>{a.titre}</span>
                      <StatutBadge publie={a.publie} />
                    </div>
                    <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "3px 0 0" }}>
                      {[a.categorie, a.auteur, dateFR(a.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Libellés explicites : les icônes seules de 15px étaient trop petites
                  et l'œil ne disait pas s'il allait publier ou dépublier. */}
              <div className="ar-actions">
                <button onClick={() => setMode(a.id)}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 13px", borderRadius: 10, border: "1px solid #e8e3da", background: "#faf8f4", color: "#23262a", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <Icon name="edit" size={14} /> Éditer
                </button>
                <button onClick={() => togglePublie(a.id, a.publie)} disabled={isPending}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 13px", borderRadius: 10, border: "1px solid #e8e3da", background: "#faf8f4", color: a.publie ? "#5c616a" : "#1f7a52", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <Icon name="eye" size={14} /> {a.publie ? "Dépublier" : "Publier"}
                </button>
                <button onClick={() => supprimer(a.id)} disabled={isPending} title="Supprimer"
                  style={{ width: 42, display: "grid", placeItems: "center", padding: "9px", borderRadius: 10, border: "1px solid #f0d9d0", background: "#fff", color: "#d9551a", cursor: "pointer" }}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}