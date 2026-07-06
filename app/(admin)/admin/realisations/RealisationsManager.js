"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { StatutBadge } from "@/components/dashboard/StatutBadge";
import { createRealisation, updateRealisation, deleteRealisation, toggleRealisationPublie } from "./actions";

const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#5c616a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e8e3da", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

function RealisationForm({ realisation, onDone, onCancel }) {
  const router = useRouter();
  const [form, setForm] = useState({
    titre: realisation?.titre || "",
    client: realisation?.client || "",
    secteur: realisation?.secteur || "",
    surface: realisation?.surface || "",
    imageUrl: realisation?.imageUrl || "",
    publie: realisation?.publie ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.titre.trim()) return;
    setSaving(true);
    if (realisation) await updateRealisation(realisation.id, form);
    else await createRealisation(form);
    setSaving(false);
    router.refresh();
    onDone();
  };

  return (
    <div style={card}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#23262a", margin: "0 0 18px" }}>
        {realisation ? "Modifier la réalisation" : "Nouvelle réalisation"}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Titre *</label>
            <input style={inputStyle} value={form.titre} onChange={(e) => set("titre", e.target.value)} placeholder="ex : Aménagement open space – Cabinet Martin" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Client</label>
              <input style={inputStyle} value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="Nom du client" />
            </div>
            <div>
              <label style={labelStyle}>Secteur</label>
              <input style={inputStyle} value={form.secteur} onChange={(e) => set("secteur", e.target.value)} placeholder="ex : Avocats, Tech…" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Surface / détail</label>
            <input style={inputStyle} value={form.surface} onChange={(e) => set("surface", e.target.value)} placeholder="ex : 250 m² · 20 postes" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.publie} onChange={(e) => set("publie", e.target.checked)} style={{ width: 17, height: 17, accentColor: "#f0661b" }} />
            <span style={{ fontSize: 13.5, color: "#23262a" }}>Publier sur le site</span>
          </label>
        </div>

        <div>
          <label style={labelStyle}>Photo</label>
          <ImageUploader images={form.imageUrl ? [form.imageUrl] : []} onChange={(imgs) => set("imageUrl", imgs[0] || "")} max={1} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={save} disabled={saving || !form.titre.trim()} style={{ padding: "11px 20px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving || !form.titre.trim() ? 0.6 : 1 }}>
          {saving ? "Enregistrement…" : realisation ? "Enregistrer" : "Créer la réalisation"}
        </button>
        <button onClick={onCancel} style={{ padding: "11px 20px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

export function RealisationsManager({ realisations }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState(null); // null | "new" | id en cours d'édition

  const supprimer = (id) => {
    if (!confirm("Supprimer cette réalisation ?")) return;
    startTransition(async () => { await deleteRealisation(id); router.refresh(); });
  };
  const togglePublie = (id, publie) => {
    startTransition(async () => { await toggleRealisationPublie(id, !publie); router.refresh(); });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {mode === "new" ? (
        <RealisationForm onDone={() => setMode(null)} onCancel={() => setMode(null)} />
      ) : (
        <button onClick={() => setMode("new")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>
          <Icon name="plus" size={17} /> Nouvelle réalisation
        </button>
      )}

      {realisations.length === 0 && mode !== "new" && (
        <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
          <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>Aucune réalisation pour l'instant. Créez la première !</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {realisations.map((r) => (
          mode === r.id ? (
            <div key={r.id} style={{ gridColumn: "1 / -1" }}>
              <RealisationForm realisation={r} onDone={() => setMode(null)} onCancel={() => setMode(null)} />
            </div>
          ) : (
            <div key={r.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ height: 160, background: "#f7f4ef", position: "relative" }}>
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#c4c0b6" }}><Icon name="image" size={32} /></div>
                )}
                <div style={{ position: "absolute", top: 10, right: 10 }}><StatutBadge publie={r.publie} /></div>
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#23262a", margin: "0 0 4px" }}>{r.titre}</p>
                <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: 0 }}>
                  {[r.client, r.secteur, r.surface].filter(Boolean).join(" · ") || "—"}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={() => setMode(r.id)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: "#23262a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <Icon name="edit" size={14} /> Éditer
                  </button>
                  <button onClick={() => togglePublie(r.id, r.publie)} disabled={isPending} title={r.publie ? "Dépublier" : "Publier"} style={{ padding: "8px 11px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: r.publie ? "#1f7a52" : "#9aa0a8", cursor: "pointer" }}>
                    <Icon name="eye" size={15} />
                  </button>
                  <button onClick={() => supprimer(r.id)} disabled={isPending} title="Supprimer" style={{ padding: "8px 11px", borderRadius: 9, border: "1px solid #e8e3da", background: "#fff", color: "#d9551a", cursor: "pointer" }}>
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}