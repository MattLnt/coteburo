"use client";
import { useState } from "react";

const fmt = (n) => (n == null ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

// ─────────── Helpers option (déclinaisons + finitions) ───────────
export const estDeclOption = (o) => !(o.sansDeclinaisons ?? true) && (o.axes || []).length > 0;

export const declinaisonOption = (o, valeurs) => {
  const axes = o.axes || [];
  if (!axes.length || !axes.every((a) => valeurs?.[a.id])) return null;
  return (o.declinaisons || []).find((d) => axes.every((a) => (d.valeurs || {})[a.id] === valeurs[a.id])) || null;
};

export const prixOption = (o, cfg) => {
  if (!estDeclOption(o)) {
    const p = o.prixVenteHT ?? o.prixHT;
    return p != null ? Number(p) : null;
  }
  const d = declinaisonOption(o, cfg?.valeurs || {});
  return d && d.prixVenteHT != null ? Number(d.prixVenteHT) : null;
};

export const groupesFinitionOption = (o, valeurs) => {
  const g = [];
  (o.groupesFinition || []).forEach((grp) => {
    if (grp.finitions?.length) g.push({ id: `opt:${o.id}:grp:${grp.id}`, nom: grp.nom || "Coloris", finitions: grp.finitions });
  });
  (o.axes || []).forEach((a) => {
    const v = valeurs?.[a.id];
    const fins = v && a.finitionsParValeur ? a.finitionsParValeur[v] : null;
    if (fins?.length) g.push({ id: `opt:${o.id}:axe:${a.id}:${v}`, nom: `${a.nom} — ${v}`, finitions: fins });
  });
  return g;
};

export const optionConfiguree = (o, cfg) => {
  if (!cfg) return true;
  if (estDeclOption(o)) {
    const axes = o.axes || [];
    if (!axes.every((a) => cfg.valeurs?.[a.id])) return false;
    if (!declinaisonOption(o, cfg.valeurs)) return false;
  }
  const groupes = groupesFinitionOption(o, cfg.valeurs || {});
  if (!groupes.every((gr) => cfg.finitions?.[gr.id])) return false;
  return true;
};

export const libelleOption = (o, cfg) => {
  const parts = [];
  (o.axes || []).forEach((a) => { if (cfg?.valeurs?.[a.id]) parts.push(cfg.valeurs[a.id]); });
  groupesFinitionOption(o, cfg?.valeurs || {}).forEach((gr) => {
    const f = gr.finitions.find((x) => (x.id || x.nom) === cfg?.finitions?.[gr.id]);
    if (f) parts.push(f.nom);
  });
  return parts.join(" / ");
};

// ─────────── Hook réutilisable par les deux fiches ───────────
export function useOptionsAcheteur({ options, carte, addItem }) {
  const optionsDispo = (options || []).filter((o) => {
    if (!o || !o.nom) return false;
    if (estDeclOption(o)) return (o.declinaisons || []).length > 0;
    return (o.prixVenteHT ?? o.prixHT) != null;
  });

  const [optionsCfg, setOptionsCfg] = useState({});
  const [lightbox, setLightbox] = useState(null);

  const toggleOption = (id) =>
    setOptionsCfg((s) => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = { qte: 1, valeurs: {}, finitions: {} }; return n; });
  const setQteOption = (id, q) =>
    setOptionsCfg((s) => (s[id] ? { ...s, [id]: { ...s[id], qte: Math.max(1, q) } } : s));
  const setValeurOption = (id, axeId, val) =>
    setOptionsCfg((s) => {
      const cur = s[id] || { qte: 1, valeurs: {}, finitions: {} };
      const valeurs = { ...cur.valeurs, [axeId]: val };
      const finitions = { ...cur.finitions };
      Object.keys(finitions).forEach((k) => { if (k.startsWith(`opt:${id}:axe:${axeId}:`)) delete finitions[k]; });
      return { ...s, [id]: { ...cur, valeurs, finitions } };
    });
  const setFinitionOption = (id, groupeId, finVal) =>
    setOptionsCfg((s) => (s[id] ? { ...s, [id]: { ...s[id], finitions: { ...s[id].finitions, [groupeId]: finVal } } } : s));

  const totalOptions = optionsDispo.reduce((t, o) => {
    const cfg = optionsCfg[o.id];
    if (!cfg) return t;
    const p = prixOption(o, cfg);
    return t + (p != null && optionConfiguree(o, cfg) ? p * cfg.qte : 0);
  }, 0);
  const optionsOK = optionsDispo.every((o) => !optionsCfg[o.id] || optionConfiguree(o, optionsCfg[o.id]));

  const ajouterOptions = (parentId) => {
    optionsDispo.forEach((o) => {
      const cfg = optionsCfg[o.id];
      if (!cfg) return;
      const d = estDeclOption(o) ? declinaisonOption(o, cfg.valeurs) : null;
      const prix = prixOption(o, cfg);
      if (prix == null) return;
      const lbl = libelleOption(o, cfg);

      if (o.estProduitLie) {
        addItem(
          {
            type: "nouveau",
            vitrineId: o.vitrineId || o.id,
            declinaisonId: d ? d.id : null,
            slug: o.slug || carte.slug,
            categorieSlug: o.categorieSlug || carte.categorieSlug || null,
            sousCategorieSlug: o.sousCategorieSlug || carte.sousCategorieSlug || null,
            designation: o.nom + (lbl ? ` — ${lbl}` : ""),
            marque: "Buronomic",
            image: (o.images && o.images[0]) || null,
            prix,
            parentId,
          },
          lbl || null, cfg.qte
        );
      } else {
        const ref = (d && d.referenceFournisseur) || o.reference || null;
        addItem(
          {
            codeRacine: `opt-${o.id}-${d ? d.id : "simple"}`,
            vitrineId: carte.id,
            optionId: o.id,
            optionDeclinaisonId: d ? d.id : null,
            reference: ref,
            slug: carte.slug,
            categorieSlug: carte.categorieSlug || null,
            sousCategorieSlug: carte.sousCategorieSlug || null,
            designation: o.nom + (lbl ? ` — ${lbl}` : ""),
            marque: "Buronomic",
            image: (o.images && o.images[0]) || null,
            prix,
            parentId,
          },
          lbl || null, cfg.qte
        );
      }
    });
  };

  const optionsUI = optionsDispo.length > 0 ? (
    <>
      <div className="mt-6 pt-6 border-t border-line">
        <p className="font-semibold text-ink text-[16px] mb-1">Options / Accessoires</p>
        <p className="text-[12.5px] text-ink-soft mb-4">Ajoutez des accessoires. Chaque option s'ajoute au panier avec sa propre référence.</p>
        <div className="flex flex-col gap-2.5">
          {optionsDispo.map((o) => (
            <OptionRow
              key={o.id}
              o={o}
              cfg={optionsCfg[o.id]}
              onToggle={toggleOption}
              onQte={setQteOption}
              onValeur={setValeurOption}
              onFinition={setFinitionOption}
              onZoom={setLightbox}
            />
          ))}
        </div>
        {totalOptions > 0 && (
          <p className="text-[13px] text-ink-soft mt-3 text-right">Total options : <span className="font-bold text-ink">+ {fmt(totalOptions)}</span></p>
        )}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ background: "rgba(33,38,42,0.72)", backdropFilter: "blur(2px)" }}>
          <div onClick={(e) => e.stopPropagation()} className="text-center">
            <div className="relative inline-block">
              {(lightbox.option.images || []).length > 1 && (
                <>
                  <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index - 1 + l.option.images.length) % l.option.images.length }))} className="absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white grid place-items-center text-charcoal">‹</button>
                  <button onClick={() => setLightbox((l) => ({ ...l, index: (l.index + 1) % l.option.images.length }))} className="absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white grid place-items-center text-charcoal">›</button>
                </>
              )}
              <img src={lightbox.option.images[lightbox.index]} alt={lightbox.option.nom} className="max-w-[70vw] max-h-[70vh] rounded-2xl border-4 border-white object-contain" />
            </div>
            <p className="text-white text-[14px] font-semibold mt-3">{lightbox.option.nom}{(lightbox.option.images || []).length > 1 ? ` (${lightbox.index + 1}/${lightbox.option.images.length})` : ""}</p>
            {(lightbox.option.images || []).length > 1 && (
              <div className="flex gap-1.5 justify-center mt-2">
                {lightbox.option.images.map((im, k) => (
                  <button key={k} onClick={() => setLightbox((l) => ({ ...l, index: k }))} className="w-9 h-9 rounded-lg overflow-hidden" style={{ border: k === lightbox.index ? "2px solid #f0661b" : "2px solid transparent" }}>
                    <img src={im} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-[12px] text-white/70 mt-2">Cliquer à l'extérieur pour fermer</p>
          </div>
        </div>
      )}
    </>
  ) : null;

  return { optionsDispo, optionsCfg, optionsUI, totalOptions, optionsOK, ajouterOptions };
}

// ─────────── Une option configurable (déclinaison + finitions + quantité) ───────────
function OptionRow({ o, cfg, onToggle, onQte, onValeur, onFinition, onZoom }) {
  const sel = !!cfg;
  const q = cfg?.qte || 1;
  const img = (o.images && o.images[0]) || null;
  const multi = (o.images || []).length > 1;
  const decl = estDeclOption(o);
  const prix = prixOption(o, cfg || { valeurs: {} });
  const groupes = groupesFinitionOption(o, cfg?.valeurs || {});
  const configuree = optionConfiguree(o, cfg);

  const valeurBtn = (actif) => `px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition ${
    actif ? "border-orange bg-orange-tint text-orange-dark" : "border-line text-ink hover:border-orange/50"}`;

  return (
    <div className={`p-3 rounded-xl border transition ${sel ? "border-orange bg-orange-tint" : "border-line"}`}>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={sel} onChange={() => onToggle(o.id)} style={{ width: 18, height: 18, accentColor: "#f0661b", cursor: "pointer" }} />
        <button type="button" onClick={() => img && onZoom({ option: o, index: 0 })} className="relative w-[54px] h-[54px] rounded-lg overflow-hidden shrink-0 bg-surface-2" style={{ cursor: img ? "zoom-in" : "default" }}>
          {img ? <img src={img} alt={o.nom} className="w-full h-full object-cover" /> : null}
          {multi && <span className="absolute bottom-0.5 right-0.5 bg-charcoal/80 text-white text-[10px] font-bold px-1.5 rounded">{o.images.length}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink">{o.nom}</p>
          {o.description && <p className="text-[12px] text-ink-soft leading-snug">{o.description}</p>}
          {!decl && o.reference && <p className="text-[12px] text-ink-soft">Réf. {o.reference}</p>}
        </div>
        {sel && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onQte(o.id, q - 1)} className="w-7 h-7 rounded-lg border border-line bg-surface-2 grid place-items-center">−</button>
            <span className="w-5 text-center text-[14px] font-bold">{q}</span>
            <button type="button" onClick={() => onQte(o.id, q + 1)} className="w-7 h-7 rounded-lg border border-line bg-surface-2 grid place-items-center">+</button>
          </div>
        )}
        <span className="text-[14px] font-bold text-orange-dark whitespace-nowrap min-w-[80px] text-right">
          {decl && !configuree ? "à configurer" : `+ ${fmt((prix != null ? prix : 0) * (sel ? q : 1))}`}
        </span>
      </div>

      {sel && decl && (
        <div className="mt-3 pl-9 flex flex-col gap-3">
          {(o.axes || []).map((a) => (
            <div key={a.id}>
              <p className="text-[12.5px] font-semibold text-ink mb-1.5">
                {a.nom}{!cfg.valeurs?.[a.id] && <span className="text-orange-dark font-medium"> · à choisir</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {(a.valeurs || []).map((v) => (
                  <button key={v} type="button" onClick={() => onValeur(o.id, a.id, v)} className={valeurBtn(cfg.valeurs?.[a.id] === v)}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {sel && groupes.length > 0 && (
        <div className="mt-3 pl-9 flex flex-col gap-3">
          {groupes.map((gr) => (
            <div key={gr.id}>
              <p className="text-[12.5px] font-semibold text-ink mb-1.5">
                {gr.nom}{!cfg.finitions?.[gr.id] && <span className="text-orange-dark font-medium"> · à choisir</span>}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {gr.finitions.map((f) => {
                  const val = f.id || f.nom;
                  const actif = cfg.finitions?.[gr.id] === val;
                  return (
                    <button key={val} type="button" onClick={() => onFinition(o.id, gr.id, val)} title={f.nom} className="flex flex-col items-center gap-1">
                      <span className={`rounded-full border-2 overflow-hidden block ${actif ? "border-orange" : "border-line hover:border-orange/40"}`} style={{ width: 36, height: 36, background: !f.imageUrl ? (f.couleur || "#e8e3da") : undefined }}>
                        {f.imageUrl && <img src={f.imageUrl} alt={f.nom} className="w-full h-full object-cover rounded-full" />}
                      </span>
                      <span className={`text-[10.5px] ${actif ? "text-orange-dark font-semibold" : "text-ink-soft"}`}>{f.nom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}