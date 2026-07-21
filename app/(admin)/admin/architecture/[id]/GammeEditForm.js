"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import TiptapEditor from "@/components/dashboard/TiptapEditor";
import { sauverInfosGamme } from "./actions";
import OngletCartes from "./OngletCartes";

export default function GammeEditForm({ gamme, categoriesMarque }) {
  const [onglet, setOnglet] = useState("infos");

  const tabs = [
    ["infos", "Infos"],
    ["cartes", `Produits${gamme.nbVitrines ? ` (${gamme.nbVitrines})` : ""}`],
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13.5, color: "#5c616a" }}>
        <Link href="/admin/architecture" style={{ color: "#f0661b", textDecoration: "none", fontWeight: 600 }}>← Gammes</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: "#23262a" }}>{gamme.nom}</span>
      </div>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#23262a", margin: 0, letterSpacing: "-0.02em" }}>{gamme.nom}</h1>
        <p style={{ color: "#5c616a", marginTop: 8, fontSize: 14 }}>
          {gamme.marqueNom} · {gamme.nbVitrines} produits · {gamme.nbProduits} lignes tarif
          <span style={{ marginLeft: 10, display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: gamme.publie ? "#e8f6f0" : "#f0ece4", color: gamme.publie ? "#1f7a52" : "#5c616a" }}>
            {gamme.publie ? "Publiée" : "Brouillon"}
          </span>
        </p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#f0ece4", padding: 4, borderRadius: 12, marginBottom: 24, width: "fit-content" }}>
        {tabs.map(([val, lbl]) => (
          <button key={val} onClick={() => setOnglet(val)}
            style={{ padding: "9px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
              background: onglet === val ? "#fff" : "transparent", color: onglet === val ? "#f0661b" : "#5c616a",
              boxShadow: onglet === val ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
            {lbl}
          </button>
        ))}
      </div>

      {onglet === "infos" && <OngletInfos gamme={gamme} />}
      {onglet === "cartes" && <OngletCartes gammeId={gamme.id} gammeDevis={gamme.venteSurDevis} />}
    </div>
  );
}

/* ─────────── Onglet INFOS ─────────── */
function OngletInfos({ gamme }) {
  const router = useRouter();
  const [nom, setNom] = useState(gamme.nom);
  const [descriptif, setDescriptif] = useState(gamme.descriptif || "");
  const [descriptionTech, setDescriptionTech] = useState(gamme.descriptionTech || "");
  const [imagePrincipale, setImagePrincipale] = useState(gamme.imageUrl ? [gamme.imageUrl] : []);
  const [galerie, setGalerie] = useState(gamme.images || []);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const enregistrer = () => {
    setSaved(false);
    startTransition(async () => {
      await sauverInfosGamme(gamme.id, {
        nom, descriptif, descriptionTech,
        imageUrl: imagePrincipale[0] || null, images: galerie,
      });
      setSaved(true);
      router.refresh();
    });
  };

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 18, padding: 26, marginBottom: 20 };
  const label = { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#5c616a", marginBottom: 10 };
  const input = { width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #ece8e0", background: "#faf8f4", fontSize: 16, color: "#23262a", outline: "none" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
      {/* ── Colonne formulaire ── */}
      <div>
        <div style={card}>
          <label style={label}>Nom de la gamme</label>
          <input value={nom} onChange={(e) => { setNom(e.target.value); setSaved(false); }} style={{ ...input, fontWeight: 600 }} />
        </div>

        <div style={card}>
          <label style={label}>Image principale (vignette de la gamme)</label>
          <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 16px" }}>Une seule image — c'est la vignette affichée dans le catalogue.</p>
          <ImageUploader images={imagePrincipale} onChange={(imgs) => { setImagePrincipale(imgs.slice(-1)); setSaved(false); }} />
        </div>

        <div style={card}>
          <label style={label}>Galerie (photos d'ambiance)</label>
          <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 16px" }}>Images supplémentaires présentées sur la fiche de la gamme.</p>
          <ImageUploader images={galerie} onChange={(imgs) => { setGalerie(imgs); setSaved(false); }} />
        </div>

        <div style={card}>
          <label style={label}>Descriptif</label>
          <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 16px" }}>Texte de présentation court de la gamme.</p>
          <TiptapEditor value={descriptif} onChange={(html) => { setDescriptif(html); setSaved(false); }} />
        </div>

        <div style={card}>
          <label style={label}>Descriptif technique</label>
          <p style={{ fontSize: 13, color: "#9aa0a8", margin: "0 0 16px" }}>
            Détails techniques communs à toute la gamme (plateau, piètement, réglage, électrification…), comme sur la fiche Buronomic. Affiché sur toutes les fiches produit de cette gamme.
          </p>
          <TiptapEditor value={descriptionTech} onChange={(html) => { setDescriptionTech(html); setSaved(false); }} />
        </div>

        <div style={{ position: "sticky", bottom: 0, background: "#f7f4ef", padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, borderTop: "1px solid #ece8e0" }}>
          {saved && <span style={{ fontSize: 13.5, color: "#1f7a52", fontWeight: 600 }}>✓ Enregistré</span>}
          <button onClick={enregistrer} disabled={isPending}
            style={{ padding: "14px 30px", borderRadius: 13, background: isPending ? "#c98a5f" : "#f0661b", color: "#fff", border: "none", cursor: isPending ? "default" : "pointer", fontSize: 15, fontWeight: 700, boxShadow: "0 8px 20px -6px rgba(240,102,27,0.5)" }}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* ── Colonne aperçu ── */}
      <div style={{ position: "sticky", top: 24 }}>
        <div style={{ background: "linear-gradient(150deg, #23262a 0%, #33261f 100%)", borderRadius: 20, padding: 28, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,102,27,0.28), transparent 70%)" }} />

          {imagePrincipale[0] && (
            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden", marginBottom: 20, border: "1px solid rgba(255,255,255,0.12)" }}>
              <img src={imagePrincipale[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          <p style={{ position: "relative", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#f0661b", margin: "0 0 14px" }}>Aperçu</p>

          <h2 style={{ position: "relative", fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 6px", minHeight: 34, letterSpacing: "-0.01em" }}>
            {nom.trim() || "Nom de la gamme"}
          </h2>
          <p style={{ position: "relative", fontSize: 13, color: "#9aa0a8", margin: "0 0 20px" }}>{gamme.marqueNom}</p>

          <div style={{ position: "relative", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Statut", gamme.publie ? "Publiée" : "Brouillon"],
              ["Produits", String(gamme.nbVitrines)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#9aa0a8" }}>{k}</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}