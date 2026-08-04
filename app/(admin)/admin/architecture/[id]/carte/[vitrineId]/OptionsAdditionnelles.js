"use client";
import { ImageUploader } from "@/components/dashboard/ImageUploader";

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function OptionsAdditionnelles({ options = [], onChange }) {
  const ajouter = () => onChange([...options, { id: uid(), nom: "", prixHT: "", reference: "", images: [] }]);
  const maj = (id, patch) => onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const supprimer = (id) => onChange(options.filter((o) => o.id !== id));
  const deplacer = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };
  const label = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#5c616a", marginBottom: 6 };
  const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ece8e0", background: "#faf8f4", fontSize: 14, color: "#23262a", outline: "none", boxSizing: "border-box" };

  return (
    <div style={card}>
      <label style={{ ...label, marginBottom: 4 }}>Options / Accessoires</label>
      <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "0 0 18px" }}>
        Accessoires proposés en option sur la fiche. Chaque option cochée par le client s'ajoute au panier avec sa propre référence.
      </p>

      {options.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#9aa0a8", fontSize: 13.5, border: "1px dashed #e8e3da", borderRadius: 12, marginBottom: 14 }}>
          Aucune option pour l'instant. Ajoute un accessoire ci-dessous (ex : bloc à encastrer, top de finition, lest…).
        </div>
      )}

      {options.map((o, i) => {
        const sansImage = !o.images || o.images.length === 0;
        return (
          <div key={o.id} style={{ border: "1px solid #f0ece4", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#9aa0a8" }}>Option {i + 1}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} title="Monter"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1, fontSize: 13 }}>↑</button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={i === options.length - 1} title="Descendre"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", cursor: i === options.length - 1 ? "default" : "pointer", opacity: i === options.length - 1 ? 0.4 : 1, fontSize: 13 }}>↓</button>
                <button type="button" onClick={() => supprimer(o.id)} title="Supprimer cette option"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #ece8e0", background: "#fff", color: "#c4735a", cursor: "pointer", fontSize: 14 }}>🗑</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 150px", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={label}>Nom</label>
                <input value={o.nom} onChange={(e) => maj(o.id, { nom: e.target.value })} placeholder="ex : Bloc rangement 1 porte à encastrer" style={input} />
              </div>
              <div>
                <label style={label}>Prix HT €</label>
                <input value={o.prixHT} onChange={(e) => maj(o.id, { prixHT: e.target.value })} placeholder="155" inputMode="decimal" style={input} />
              </div>
              <div>
                <label style={label}>Référence</label>
                <input value={o.reference} onChange={(e) => maj(o.id, { reference: e.target.value })} placeholder="ex : BS843G" style={{ ...input, fontFamily: "monospace", fontWeight: 700 }} />
              </div>
            </div>

            <label style={label}>Images (la principale sert de vignette)</label>
            <ImageUploader images={o.images || []} onChange={(imgs) => maj(o.id, { images: imgs })} />

            {sansImage && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#b45528", background: "#fef4ee", borderRadius: 9, padding: "8px 12px", display: "inline-block" }}>
                ⚠ Une image principale est requise pour publier l'option.
              </div>
            )}
          </div>
        );
      })}

      <button type="button" onClick={ajouter}
        style={{ width: "100%", padding: 13, borderRadius: 12, border: "2px dashed #e0dacf", background: "#faf8f4", color: "#5c616a", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        <span style={{ color: "#f0661b", fontSize: 16 }}>+</span>&nbsp; Ajouter une option
      </button>
    </div>
  );
}