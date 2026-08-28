"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enregistrerDevis, changerStatutDevis, supprimerDevis } from "./actions";

const euro = (v) => `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const nb = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const STATUTS = {
  nouveau: { label: "Nouveau", bg: "#fce6d6", color: "#d9551a" },
  en_cours: { label: "En chiffrage", bg: "#e6eefc", color: "#2a5db0" },
  envoye: { label: "Envoyé", bg: "#f0ece4", color: "#5c616a" },
  accepte: { label: "Accepté", bg: "#e8f6f0", color: "#1f7a52" },
  refuse: { label: "Refusé", bg: "#fbe9e7", color: "#b3392f" },
  expire: { label: "Expiré", bg: "#f2efe9", color: "#9aa0a8" },
};

const champ = {
  width: "100%", padding: "9px 11px", borderRadius: 10, border: "1.5px solid #e8e3da",
  background: "#fff", fontSize: 12.5, color: "#23262a", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const mini = { fontSize: 10, color: "#9aa0a8", margin: "0 0 4px", display: "block" };

// Section repliable — la page est longue, tout ouvert on ne s'y retrouve pas.
function Section({ titre, sousTitre, ouvertParDefaut, children, action }) {
  const [ouvert, setOuvert] = useState(!!ouvertParDefaut);
  return (
    <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, overflow: "hidden", marginBottom: 8 }}>
      <button type="button" onClick={() => setOuvert((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 15px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#23262a" }}>{titre}</span>
          {sousTitre && <span style={{ display: "block", fontSize: 11.5, color: "#9aa0a8", marginTop: 2 }}>{sousTitre}</span>}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {action}
          <span style={{ color: ouvert ? "#d9551a" : "#9aa0a8", display: "flex", transform: ouvert ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </span>
      </button>
      {ouvert && <div style={{ padding: "0 15px 15px", borderTop: "1px solid #f2efe9" }}>{children}</div>}
    </div>
  );
}

export default function DevisEditForm({ devis }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [lignes, setLignes] = useState(devis.lignes.map((l) => ({ ...l, prixHT: String(l.prixHT), quantite: String(l.quantite) })));
  const [form, setForm] = useState({
    adresse: devis.adresse || "",
    complement: devis.complement || "",
    codePostal: devis.codePostal || "",
    ville: devis.ville || "",
    remiseType: devis.remiseType || "pourcentage",
    remiseValeur: String(devis.remiseValeur ?? 0),
    fraisLivraison: String(devis.fraisLivraison ?? 0),
    fraisInstallation: String(devis.fraisInstallation ?? 0),
    noteClient: devis.noteClient || "",
    noteInterne: devis.noteInterne || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };
  const setLigne = (i, k, v) => {
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
    setSaved(false);
  };
  const supprimerLigne = (i) => { setLignes((ls) => ls.filter((_, j) => j !== i)); setSaved(false); };
  const ajouterLigne = () => {
    setLignes((ls) => [...ls, { id: `new-${Date.now()}`, designation: "", config: null, imageUrl: null, prixHT: "0", quantite: "1", codeRacine: null, vitrineId: null }]);
    setSaved(false);
  };

  // Totaux recalculés en direct — mêmes règles que le serveur.
  const totaux = useMemo(() => {
    const sousTotal = lignes.reduce((s, l) => s + nb(l.prixHT) * (parseInt(l.quantite, 10) || 0), 0);
    const remise = form.remiseType === "montant"
      ? Math.min(nb(form.remiseValeur), sousTotal)
      : sousTotal * (nb(form.remiseValeur) / 100);
    const totalHT = sousTotal - remise + nb(form.fraisLivraison) + nb(form.fraisInstallation);
    const totalTVA = totalHT * 0.2;
    return { sousTotal, remise, totalHT, totalTVA, totalTTC: totalHT + totalTVA };
  }, [lignes, form]);

  const enregistrer = async (nouveauStatut) => {
    setSaving(true);
    // Une demande qu'on chiffre pour la première fois passe en cours.
    const statut = nouveauStatut || (devis.statut === "nouveau" ? "en_cours" : undefined);
    await enregistrerDevis(devis.id, { ...form, lignes, statut });
    setSaving(false);
    setSaved(true);
    router.refresh();
  };

  const changerStatut = (statut) => {
    startTransition(async () => { await changerStatutDevis(devis.id, statut); router.refresh(); });
  };

  const supprimer = () => {
    if (!confirm("Supprimer définitivement ce devis ?")) return;
    startTransition(async () => { await supprimerDevis(devis.id); router.push("/admin/devis"); });
  };

  const s = STATUTS[devis.statut] || STATUTS.nouveau;
  const infosProjet = [devis.typeProjet, devis.surface, devis.delai, devis.budget].filter(Boolean);
  const telLink = devis.telephone ? `tel:${devis.telephone.replace(/\s/g, "")}` : null;

  return (
    <div style={{ paddingBottom: 130 }}>
      <style>{`
        .dv-cols { display: block; }
        .dv-barre { position: fixed; bottom: 0; left: 0; right: 0; }
        @media (min-width: 1024px) {
          .dv-cols { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
          .dv-barre { position: sticky; bottom: auto; top: 86px; left: auto; right: auto; }
        }
      `}</style>

      <Link href="/admin/devis" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#f0661b", textDecoration: "none", marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg>
        Devis
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 3 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "#23262a", margin: 0 }}>{devis.numero}</h1>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
      </div>
      <p style={{ fontSize: 12, color: "#5c616a", margin: "0 0 14px" }}>Reçu le {dateFR(devis.createdAt)}</p>

      <div className="dv-cols">
        <div>
          {/* ── Client & projet ── */}
          <Section titre="Client & projet" ouvertParDefaut>
            <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
              <span style={{ color: "#9aa0a8", flexShrink: 0, marginTop: 2, display: "flex" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              </span>
              <p style={{ fontSize: 12.5, color: "#23262a", margin: 0, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700 }}>{devis.prenom} {devis.nom}</span>
                {devis.societe && <><br />{devis.societe}</>}
                <br />{devis.email}{devis.telephone ? ` · ${devis.telephone}` : ""}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {telLink && (
                <a href={telLink} style={{ flex: 1, textAlign: "center", padding: 9, borderRadius: 999, background: "#f0661b", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Appeler</a>
              )}
              <a href={`mailto:${devis.email}?subject=Votre devis ${devis.numero}`} style={{ flex: 1, textAlign: "center", padding: 9, borderRadius: 999, border: "1px solid #ece8e0", color: "#23262a", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Écrire</a>
            </div>

            {(infosProjet.length > 0 || devis.message) && (
              <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid #f2efe9" }}>
                {infosProjet.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: devis.message ? 9 : 0 }}>
                    {infosProjet.map((t) => (
                      <span key={t} style={{ fontSize: 11, padding: "4px 9px", borderRadius: 999, background: "#f4f2ed", color: "#5c616a" }}>{t}</span>
                    ))}
                  </div>
                )}
                {devis.message && (
                  <p style={{ fontSize: 12, color: "#5c616a", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>« {devis.message} »</p>
                )}
              </div>
            )}
          </Section>

          {/* ── Adresse ── */}
          <Section titre="Adresse de livraison" sousTitre={devis.adresse ? `${devis.codePostal || ""} ${devis.ville || ""}`.trim() : "Non renseignée"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              <div>
                <label style={mini}>Adresse</label>
                <input style={champ} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="N° et nom de rue" />
              </div>
              <div>
                <label style={mini}>Complément</label>
                <input style={champ} value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Bâtiment, étage…" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 110 }}>
                  <label style={mini}>Code postal</label>
                  <input style={champ} value={form.codePostal} onChange={(e) => set("codePostal", e.target.value)} inputMode="numeric" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={mini}>Ville</label>
                  <input style={champ} value={form.ville} onChange={(e) => set("ville", e.target.value)} />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Lignes ── */}
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: 0 }}>Lignes du devis</p>
              <span style={{ fontSize: 11.5, color: "#9aa0a8" }}>{lignes.length} ligne{lignes.length > 1 ? "s" : ""}</span>
            </div>

            {lignes.length === 0 && (
              <p style={{ fontSize: 12.5, color: "#9aa0a8", textAlign: "center", padding: "16px 0", margin: 0 }}>Aucune ligne — ajoutez-en une ci-dessous.</p>
            )}

            {lignes.map((l, i) => {
              const totalLigne = nb(l.prixHT) * (parseInt(l.quantite, 10) || 0);
              const estLibre = !l.codeRacine && !l.vitrineId;
              return (
                <div key={l.id} style={{ border: "1px solid #ece8e0", borderRadius: 12, padding: 11, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 9, background: "#f4f2ed", flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center" }}>
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4c0b6" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Une ligne issue du catalogue garde sa désignation ;
                          une ligne libre se saisit à la main. */}
                      {estLibre ? (
                        <input style={{ ...champ, padding: "7px 10px", fontSize: 12 }} value={l.designation} onChange={(e) => setLigne(i, "designation", e.target.value)} placeholder="Désignation (prestation, transport…)" />
                      ) : (
                        <>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#23262a", margin: 0, lineHeight: 1.3 }}>{l.designation}</p>
                          {l.config && <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: "2px 0 0", lineHeight: 1.4 }}>{l.config}</p>}
                        </>
                      )}
                    </div>
                    <button onClick={() => supprimerLigne(i)} title="Retirer"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#c4735a", flexShrink: 0, padding: 0, display: "flex", alignItems: "flex-start" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
                    <div style={{ width: 62 }}>
                      <label style={mini}>Qté</label>
                      <input style={{ ...champ, padding: "8px 10px" }} value={l.quantite} onChange={(e) => setLigne(i, "quantite", e.target.value)} inputMode="numeric" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={mini}>Prix unitaire HT</label>
                      <input style={{ ...champ, padding: "8px 10px" }} value={l.prixHT} onChange={(e) => setLigne(i, "prixHT", e.target.value)} inputMode="decimal" />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#23262a", margin: 0, paddingBottom: 9, whiteSpace: "nowrap", minWidth: 84, textAlign: "right" }}>{euro(totalLigne)}</p>
                  </div>
                </div>
              );
            })}

            <button onClick={ajouterLigne} type="button"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px dashed #e8e3da", background: "#faf8f4", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#5c616a", fontFamily: "inherit" }}>
              + Ajouter une ligne libre
            </button>
          </div>

          {/* ── Remise & frais ── */}
          <div style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 14, marginBottom: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#23262a", margin: "0 0 12px" }}>Remise & frais</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
              <div style={{ flex: 1 }}>
                <label style={mini}>Remise</label>
                <div style={{ display: "flex", gap: 5 }}>
                  <input style={{ ...champ, flex: 1 }} value={form.remiseValeur} onChange={(e) => set("remiseValeur", e.target.value)} inputMode="decimal" />
                  {/* Bascule % / € : deux formes de remise, un seul champ de valeur */}
                  <div style={{ display: "flex", border: "1.5px solid #e8e3da", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                    {[["pourcentage", "%"], ["montant", "€"]].map(([val, lbl]) => (
                      <button key={val} type="button" onClick={() => set("remiseType", val)}
                        style={{ width: 30, background: form.remiseType === val ? "#f0661b" : "#fff", color: form.remiseType === val ? "#fff" : "#9aa0a8", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={mini}>Livraison €</label>
                <input style={champ} value={form.fraisLivraison} onChange={(e) => set("fraisLivraison", e.target.value)} inputMode="decimal" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={mini}>Installation €</label>
                <input style={champ} value={form.fraisInstallation} onChange={(e) => set("fraisInstallation", e.target.value)} inputMode="decimal" />
              </div>
            </div>

            <div style={{ paddingTop: 12, borderTop: "1px solid #f2efe9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
                <span style={{ color: "#9aa0a8" }}>Sous-total HT</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(totaux.sousTotal)}</span>
              </div>
              {totaux.remise > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
                  <span style={{ color: "#9aa0a8" }}>Remise {form.remiseType === "pourcentage" ? `${nb(form.remiseValeur)} %` : ""}</span>
                  <span style={{ color: "#d9551a", fontWeight: 600 }}>− {euro(totaux.remise)}</span>
                </div>
              )}
              {nb(form.fraisLivraison) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
                  <span style={{ color: "#9aa0a8" }}>Livraison</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(nb(form.fraisLivraison))}</span>
                </div>
              )}
              {nb(form.fraisInstallation) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
                  <span style={{ color: "#9aa0a8" }}>Installation</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(nb(form.fraisInstallation))}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 10 }}>
                <span style={{ color: "#9aa0a8" }}>TVA (20 %)</span><span style={{ color: "#23262a", fontWeight: 600 }}>{euro(totaux.totalTVA)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f2efe9" }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: "#23262a" }}>Total TTC</span>
                <span style={{ fontSize: 19, fontWeight: 700, fontFamily: "var(--font-display)", color: "#f0661b" }}>{euro(totaux.totalTTC)}</span>
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          <Section titre="Mot d'accompagnement" sousTitre="Visible par le client sur son devis">
            <textarea style={{ ...champ, minHeight: 90, resize: "vertical", lineHeight: 1.6, marginTop: 12 }}
              value={form.noteClient} onChange={(e) => set("noteClient", e.target.value)}
              placeholder="Bonjour, suite à notre échange, voici notre proposition pour l'aménagement de vos bureaux…" />
          </Section>

          <Section titre="Note interne" sousTitre="Jamais visible par le client">
            <textarea style={{ ...champ, minHeight: 70, resize: "vertical", lineHeight: 1.6, marginTop: 12 }}
              value={form.noteInterne} onChange={(e) => set("noteInterne", e.target.value)}
              placeholder="Remarques, points à vérifier, historique des échanges…" />
          </Section>

          {/* ── Statut ── */}
          <Section titre="Statut du devis" sousTitre={s.label}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
              {Object.entries(STATUTS).map(([cle, st]) => {
                const actif = devis.statut === cle;
                return (
                  <button key={cle} onClick={() => changerStatut(cle)} disabled={isPending || actif}
                    style={{
                      padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: actif ? "default" : "pointer",
                      fontFamily: "inherit", border: actif ? `1.5px solid ${st.color}` : "1px solid #ece8e0",
                      background: actif ? st.bg : "#fff", color: actif ? st.color : "#5c616a",
                    }}>
                    {st.label}
                  </button>
                );
              })}
            </div>
            <button onClick={supprimer} disabled={isPending}
              style={{ marginTop: 14, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#c4735a", fontFamily: "inherit", padding: 0 }}>
              Supprimer ce devis
            </button>
          </Section>
        </div>

        {/* ── Barre d'action ── */}
        <div className="dv-barre" style={{ zIndex: 40 }}>
          <div style={{
            background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)",
            borderTop: "1px solid #ece8e0", padding: "12px 14px",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 10.5, color: "#9aa0a8", margin: 0 }}>Total TTC</p>
                <p style={{ fontSize: 19, fontWeight: 700, fontFamily: "var(--font-display)", color: "#23262a", margin: "1px 0 0" }}>{euro(totaux.totalTTC)}</p>
              </div>
              {saved && <span style={{ fontSize: 11, color: "#1f7a52", fontWeight: 600 }}>✓ Enregistré</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => enregistrer()} disabled={saving}
                style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid #ece8e0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#23262a", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, opacity: saving ? 0.6 : 1 }}>
                {saving ? "…" : "Enregistrer"}
              </button>
              <button disabled
                title="Disponible à la prochaine étape"
                style={{ flex: 1, padding: 12, borderRadius: 999, background: "#f0661b", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "not-allowed", fontFamily: "inherit", opacity: 0.5 }}>
                Envoyer au client
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}