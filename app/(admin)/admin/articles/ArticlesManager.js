"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { StatutBadge } from "@/components/dashboard/StatutBadge";
import TiptapEditor from "@/components/dashboard/TiptapEditor";
import { createArticle, updateArticle, deleteArticle, toggleArticlePublie } from "./actions";

const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#23262a", margin: 0 }}>
          {article ? "Modifier l'article" : "Nouvel article"}
        </h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Annuler</button>
          <button onClick={save} disabled={saving || !form.titre.trim()} style={{ padding: "10px 20px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving || !form.titre.trim() ? 0.6 : 1 }}>
            {saving ? "Enregistrement…" : article ? "Enregistrer" : "Créer l'article"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
        {/* Colonne principale */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={card}>
            <div style={{ marginBottom: 16 }}>
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

        {/* Colonne latérale */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={labelStyle}>Statut</span>
              <StatutBadge publie={form.publie} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0ece4", background: "#faf8f4" }}>
              <input type="checkbox" checked={form.publie} onChange={(e) => set("publie", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#23262a" }}>Publier sur le site</span>
            </label>
          </div>

          <div style={card}>
            <label style={labelStyle}>Image de couverture</label>
            <ImageUploader images={form.imageUrl ? [form.imageUrl] : []} onChange={(imgs) => set("imageUrl", imgs[0] || "")} max={1} />
          </div>

          <div style={card}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Catégorie</label>
              <input style={inputStyle} value={form.categorie} onChange={(e) => set("categorie", e.target.value)} placeholder="ex : Conseils, Tendances…" />
            </div>
            <div>
              <label style={labelStyle}>Auteur</label>
              <input style={inputStyle} value={form.auteur} onChange={(e) => set("auteur", e.target.value)} placeholder="Nom de l'auteur" />
            </div>
          </div>
        </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <button onClick={() => setMode("new")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>
        <Icon name="plus" size={17} /> Nouvel article
      </button>

      {articles.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
          <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>Aucun article pour l'instant. Rédigez le premier !</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden" }}>
          {articles.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, borderTop: i === 0 ? "none" : "1px solid #f2efe9" }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, background: "#f7f4ef", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                {a.imageUrl ? <img src={a.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="edit" size={22} color="#c4c0b6" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#23262a" }}>{a.titre}</span>
                  <StatutBadge publie={a.publie} />
                </div>
                <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "3px 0 0" }}>
                  {[a.categorie, a.auteur, dateFR(a.createdAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => setMode(a.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: "#23262a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Icon name="edit" size={14} /> Éditer
                </button>
                <button onClick={() => togglePublie(a.id, a.publie)} disabled={isPending} title={a.publie ? "Dépublier" : "Publier"} style={{ padding: "8px 11px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: a.publie ? "#1f7a52" : "#9aa0a8", cursor: "pointer" }}>
                  <Icon name="eye" size={15} />
                </button>
                <button onClick={() => supprimer(a.id)} disabled={isPending} title="Supprimer" style={{ padding: "8px 11px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: "#d9551a", cursor: "pointer" }}>
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