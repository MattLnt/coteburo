"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { listerDossier, vignetteLocale, importerImagesLocales } from "@/app/(admin)/admin/architecture/actionsMediatheque";

// Parcours du dossier de visuels fournisseurs, depuis l'admin.
//
// Les vignettes se chargent au fil de l'affichage plutôt que d'un bloc : un
// dossier OfficePro compte jusqu'à 371 images, et en calculer autant d'un coup
// bloquerait la page pour rien — on ne regarde que ce qu'on a sous les yeux.

const grille = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 10 };

function Vignette({ image, choisie, onToggle }) {
  const [src, setSrc] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    let vivant = true;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(async (entrees) => {
      if (!entrees[0]?.isIntersecting) return;
      obs.disconnect();
      const data = await vignetteLocale(image.rel);
      if (vivant) setSrc(data || "");
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => { vivant = false; obs.disconnect(); };
  }, [image.rel]);

  return (
    <button ref={ref} type="button" onClick={onToggle} title={image.nom}
      style={{ position: "relative", padding: 0, border: choisie ? "2px solid #f0661b" : "1px solid #ece8e0",
        borderRadius: 10, overflow: "hidden", background: "#faf8f4", cursor: "pointer", textAlign: "left" }}>
      <div style={{ aspectRatio: "1 / 1", display: "grid", placeItems: "center" }}>
        {src === null ? <span style={{ fontSize: 11, color: "#c9c4bb" }}>…</span>
          : src === "" ? <span style={{ fontSize: 11, color: "#c9c4bb" }}>illisible</span>
          : <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
      </div>
      <div style={{ fontSize: 10.5, color: "#5c616a", padding: "4px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {image.nom}
      </div>
      {choisie && (
        <span style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: "50%", background: "#f0661b",
          color: "#fff", fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>✓</span>
      )}
    </button>
  );
}

export function MediathequeLocale({ onFermer, onAjouter }) {
  const [rel, setRel] = useState("");
  const [contenu, setContenu] = useState(null);
  const [erreur, setErreur] = useState("");
  const [choisies, setChoisies] = useState([]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let vivant = true;
    setContenu(null);
    setErreur("");
    listerDossier(rel).then((r) => {
      if (!vivant) return;
      if (r.ok) setContenu(r); else setErreur(r.error);
    });
    return () => { vivant = false; };
  }, [rel]);

  const basculer = (r) => setChoisies((l) => (l.includes(r) ? l.filter((x) => x !== r) : [...l, r]));

  const ajouter = async () => {
    if (!choisies.length) return;
    setEnvoi(true);
    setErreur("");
    const r = await importerImagesLocales(choisies);
    setEnvoi(false);
    if (!r.ok) { setErreur(r.error); return; }
    if (r.echecs?.length) setErreur(`${r.echecs.length} image(s) refusée(s) : ${r.echecs.map((e) => e.raison).slice(0, 2).join(", ")}`);
    if (r.urls.length) { onAjouter(r.urls); setChoisies([]); }
    if (!r.echecs?.length) onFermer();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={onFermer} style={{ position: "absolute", inset: 0, background: "rgba(33,38,42,0.6)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 940, maxHeight: "88vh", background: "#fff", border: "1px solid #ece8e0",
        borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="image" size={20} color="#f0661b" />
          <strong style={{ fontSize: 15 }}>Visuels du disque</strong>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onFermer} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "#9aa0a8" }}>×</button>
        </div>

        {/* Fil d'Ariane */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12.5, alignItems: "center" }}>
          <button type="button" onClick={() => setRel("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: rel ? "#d9551a" : "#23262a", fontWeight: 600, padding: 0 }}>
            Médiathèque
          </button>
          {contenu?.chemin?.map((c, i) => (
            <span key={c.rel} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: "#c9c4bb" }}>›</span>
              <button type="button" onClick={() => setRel(c.rel)}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0,
                  color: i === contenu.chemin.length - 1 ? "#23262a" : "#d9551a", fontWeight: 600 }}>
                {c.nom}
              </button>
            </span>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 240 }}>
          {erreur && <p style={{ fontSize: 12.5, color: "#d9551a" }}>{erreur}</p>}
          {!contenu && !erreur && <p style={{ fontSize: 12.5, color: "#9aa0a8" }}>Lecture du dossier…</p>}

          {contenu?.dossiers?.length > 0 && (
            <div style={{ ...grille, marginBottom: 14 }}>
              {contenu.dossiers.map((d) => (
                <button key={d.rel} type="button" onClick={() => setRel(d.rel)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 8px",
                    border: "1px solid #ece8e0", borderRadius: 10, background: "#faf8f4", cursor: "pointer" }}>
                  <Icon name="layers" size={22} color="#9aa0a8" />
                  <span style={{ fontSize: 11.5, color: "#23262a", textAlign: "center", wordBreak: "break-word" }}>{d.nom}</span>
                </button>
              ))}
            </div>
          )}

          {contenu?.images?.length > 0 && (
            <div style={grille}>
              {contenu.images.map((img) => (
                <Vignette key={img.rel} image={img} choisie={choisies.includes(img.rel)} onToggle={() => basculer(img.rel)} />
              ))}
            </div>
          )}

          {contenu && !contenu.dossiers.length && !contenu.images.length && (
            <p style={{ fontSize: 12.5, color: "#9aa0a8" }}>Ce dossier ne contient aucune image.</p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #f2efe9", paddingTop: 12 }}>
          <span style={{ fontSize: 12.5, color: "#5c616a" }}>
            {choisies.length ? `${choisies.length} image${choisies.length > 1 ? "s" : ""} sélectionnée${choisies.length > 1 ? "s" : ""}` : "Clique sur les images à reprendre"}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onFermer} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e8e3da", background: "#fff", cursor: "pointer", fontSize: 13 }}>
            Annuler
          </button>
          <button type="button" onClick={ajouter} disabled={!choisies.length || envoi}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: choisies.length && !envoi ? "#f0661b" : "#e8e3da",
              color: choisies.length && !envoi ? "#fff" : "#9aa0a8", cursor: choisies.length && !envoi ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}>
            {envoi ? "Envoi…" : "Ajouter à la fiche"}
          </button>
        </div>
      </div>
    </div>
  );
}
