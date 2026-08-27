"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { StatutBadge } from "@/components/dashboard/StatutBadge";
import { createRealisation, updateRealisationInfos, deleteRealisation, toggleRealisationPublie } from "./actions";

const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 18 };
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
    if (realisation) await updateRealisationInfos(realisation.id, form);
    else await createRealisation(form);
    setSaving(false);
    router.refresh();
    onDone();
  };

  return (
    <div style={card}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#23262a", margin: "0 0 16px" }}>
        {realisation ? "Modifier les infos de base" : "Nouvelle réalisation"}
      </h3>

      {/* Mobile : la photo passe en premier (c'est souvent par là qu'on commence).
          Desktop : deux colonnes, photo à droite comme avant. */}
      <div className="rz-form">
        <div className="rz-photo">
          <label style={labelStyle}>Photo</label>
          <ImageUploader images={form.imageUrl ? [form.imageUrl] : []} onChange={(imgs) => set("imageUrl", imgs[0] || "")} max={1} />
        </div>

        <div className="rz-champs" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Titre *</label>
            <input style={inputStyle} value={form.titre} onChange={(e) => set("titre", e.target.value)} placeholder="ex : Aménagement open space – Cabinet Martin" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Client</label>
              <input style={inputStyle} value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="Nom" />
            </div>
            <div>
              <label style={labelStyle}>Secteur</label>
              <input style={inputStyle} value={form.secteur} onChange={(e) => set("secteur", e.target.value)} placeholder="ex : Avocats" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Surface / détail</label>
            <input style={inputStyle} value={form.surface} onChange={(e) => set("surface", e.target.value)} placeholder="ex : 250 m² · 20 postes" />
          </div>

          <button
            type="button"
            onClick={() => set("publie", !form.publie)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "11px 13px", borderRadius: 10, background: "#faf8f4", border: "1px solid #e8e3da",
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#23262a" }}>Publier sur le site</span>
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
      </div>

      {!realisation && (
        <p style={{ fontSize: 12, color: "#9aa0a8", margin: "14px 0 0", lineHeight: 1.5 }}>
          Une fois créée, vous pourrez ajouter le récit, la galerie, l'avant/après et les produits liés depuis sa page dédiée.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button onClick={onCancel} style={{ padding: "12px 20px", borderRadius: 10, background: "#fff", color: "#5c616a", border: "1px solid #e8e3da", fontWeight: 600, fontSize: 13.5, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
          Annuler
        </button>
        <button onClick={save} disabled={saving || !form.titre.trim()} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving || !form.titre.trim() ? 0.6 : 1, fontFamily: "inherit" }}>
          {saving ? "Enregistrement…" : realisation ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </div>
  );
}

export function RealisationsManager({ realisations }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState(null); // null | "new" | "infos:" + id

  const supprimer = (id) => {
    if (!confirm("Supprimer cette réalisation ?")) return;
    startTransition(async () => { await deleteRealisation(id); router.refresh(); });
  };
  const togglePublie = (id, publie) => {
    startTransition(async () => { await toggleRealisationPublie(id, !publie); router.refresh(); });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        /* Mobile : une colonne, bouton pleine largeur, photo du formulaire en premier.
           Desktop : grille de cartes et formulaire sur deux colonnes. */
        .rz-liste { display: flex; flex-direction: column; gap: 12px; }
        .rz-bouton-new { width: 100%; justify-content: center; }
        .rz-form { display: flex; flex-direction: column; gap: 16px; }
        .rz-photo { order: -1; }
        @media (min-width: 1024px) {
          .rz-liste { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
          .rz-bouton-new { width: auto; align-self: flex-start; }
          .rz-form { display: grid; grid-template-columns: 1fr 300px; gap: 20px; }
          .rz-photo { order: 1; }
          .rz-champs { order: 0; }
        }
      `}</style>

      {mode === "new" ? (
        <RealisationForm onDone={() => setMode(null)} onCancel={() => setMode(null)} />
      ) : (
        <button onClick={() => setMode("new")} className="rz-bouton-new"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, background: "#f0661b", color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
          <Icon name="plus" size={17} /> Nouvelle réalisation
        </button>
      )}

      {realisations.length === 0 && mode !== "new" && (
        <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
          <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>Aucune réalisation pour l'instant. Créez la première !</p>
        </div>
      )}

      <div className="rz-liste">
        {realisations.map((r) => (
          mode === `infos:${r.id}` ? (
            <div key={r.id} style={{ gridColumn: "1 / -1" }}>
              <RealisationForm realisation={r} onDone={() => setMode(null)} onCancel={() => setMode(null)} />
            </div>
          ) : (
            <div key={r.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ height: 140, background: "#f7f4ef", position: "relative" }}>
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.titre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#c4c0b6" }}><Icon name="image" size={30} /></div>
                )}
                <div style={{ position: "absolute", top: 10, right: 10 }}><StatutBadge publie={r.publie} /></div>
              </div>

              <div style={{ padding: 14 }}>
                <p style={{ fontWeight: 700, fontSize: 14.5, color: "#23262a", margin: "0 0 3px" }}>{r.titre}</p>
                <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: 0 }}>
                  {[r.client, r.secteur, r.surface].filter(Boolean).join(" · ") || "—"}
                </p>

                {/* Action principale en pleine largeur, secondaires en dessous avec libellés :
                    les icônes seules de 15px étaient trop petites et ambiguës au doigt. */}
                <Link href={`/admin/realisations/${r.id}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 10, border: "1px solid #f0661b", background: "#fef4ee", color: "#d9551a", fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: 12 }}>
                  <Icon name="edit" size={15} /> Contenu complet
                </Link>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => setMode(`infos:${r.id}`)}
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: "1px solid #e8e3da", background: "#faf8f4", color: "#5c616a", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>
                    <Icon name="settings" size={14} /> Infos
                  </button>
                  <button onClick={() => togglePublie(r.id, r.publie)} disabled={isPending}
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: "1px solid #e8e3da", background: "#faf8f4", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: r.publie ? "#5c616a" : "#1f7a52", fontFamily: "inherit" }}>
                    <Icon name="eye" size={14} /> {r.publie ? "Dépublier" : "Publier"}
                  </button>
                  <button onClick={() => supprimer(r.id)} disabled={isPending} title="Supprimer"
                    style={{ width: 42, display: "grid", placeItems: "center", padding: "9px", borderRadius: 10, border: "1px solid #f0d9d0", background: "#fff", color: "#d9551a", cursor: "pointer" }}>
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