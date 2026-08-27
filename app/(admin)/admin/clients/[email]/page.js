import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { StatutCommande } from "@/components/dashboard/StatutCommande";
import { getClientDetail } from "../actions";

export const dynamic = "force-dynamic";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const dateCourteFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

// Initiales du client — prénom + nom, ou première lettre de l'email en secours.
const initiales = (c) => {
  const p = (c.prenom || "").trim().charAt(0);
  const n = (c.nom || "").trim().charAt(0);
  const ini = `${p}${n}`.toUpperCase();
  return ini || (c.email || "?").charAt(0).toUpperCase();
};

export default async function ClientDetailPage({ params }) {
  const { email } = await params;
  const client = await getClientDetail(decodeURIComponent(email));
  if (!client) notFound();

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 20 };
  const label = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9aa0a8", marginBottom: 4 };
  const titreSection = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
    color: "#9aa0a8", margin: "0 0 10px",
  };
  const titreCarte = { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#23262a", margin: "0 0 14px" };

  const badgeCompte = (
    <span style={{
      display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
      background: client.possedeCompte ? "#e8f6f0" : "#f0ece4",
      color: client.possedeCompte ? "#1f7a52" : "#5c616a",
    }}>
      {client.possedeCompte
        ? `Compte créé${client.dateInscription ? ` · ${dateCourteFR(client.dateInscription)}` : ""}`
        : "Client invité"}
    </span>
  );

  return (
    <div>
      <style>{`
        /* Sous 1024px : tout s'empile, en-tête compact avec avatar, actions sur une ligne.
           Au-delà : deux colonnes (historique + coordonnées) comme avant. */
        .cd-entete { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .cd-avatar { display: grid; }
        .cd-badge-desktop { display: none; }
        .cd-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
        .cd-colonnes { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: start; }
        .cd-cmd-ligne { display: block; }
        @media (min-width: 1024px) {
          .cd-entete { align-items: center; justify-content: space-between; margin-bottom: 22px; }
          .cd-avatar { display: none; }
          .cd-badge-mobile { display: none; }
          .cd-badge-desktop { display: inline-block; }
          .cd-actions { display: flex; justify-content: flex-end; margin-bottom: 22px; }
          .cd-colonnes { grid-template-columns: 1fr 340px; gap: 20px; }
          .cd-cmd-ligne { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        }
      `}</style>

      {/* Fil d'ariane */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13.5, color: "#5c616a", flexWrap: "wrap" }}>
        <Link href="/admin/clients" style={{ color: "#f0661b", textDecoration: "none", fontWeight: 600 }}>← Clients</Link>
      </div>

      {/* En-tête */}
      <div className="cd-entete">
        <span className="cd-avatar" style={{
          width: 46, height: 46, borderRadius: "50%", flexShrink: 0, placeItems: "center",
          fontWeight: 700, fontSize: 15.5,
          background: client.possedeCompte ? "#fce6d6" : "#f0ece4",
          color: client.possedeCompte ? "#d9551a" : "#5c616a",
        }}>
          {initiales(client)}
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "#23262a", margin: 0, lineHeight: 1.2 }}>
              {client.prenom} {client.nom}
            </h1>
            <span className="cd-badge-desktop">{badgeCompte}</span>
          </div>
          {client.societe && <p style={{ color: "#5c616a", marginTop: 4, fontSize: 13.5 }}>{client.societe}</p>}
        </div>
      </div>

      <div className="cd-badge-mobile" style={{ marginBottom: 14 }}>{badgeCompte}</div>

      {/* Actions */}
      <div className="cd-actions">
        <a href={`mailto:${client.email}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 20px", borderRadius: 10, background: "#f0661b", color: "#fff", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
          <Icon name="mail" size={15} /> Email
        </a>
        {client.telephone && (
          <a href={`tel:${client.telephone.replace(/\s/g, "")}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: "1px solid #e8e3da", background: "#fff", color: "#23262a", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
            <Icon name="phone" size={15} /> Appeler
          </a>
        )}
      </div>

      {/* Bandeau chiffres — les trois valeurs se lisent ensemble
          (le panier moyen étant le total divisé par le nombre de commandes). */}
      <div style={{ background: "linear-gradient(135deg, #d9551a 0%, #f6925a 100%)", borderRadius: 16, padding: 18, position: "relative", overflow: "hidden", marginBottom: 22 }}>
        <div style={{ position: "absolute", top: -40, right: -20, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -50, left: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "0 0 6px", fontWeight: 500 }}>Total dépensé TTC</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {euro(client.totalDepense)}
              </p>
            </div>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="euro" size={18} color="#fff" />
            </span>
          </div>

          <div style={{ display: "flex", gap: 14, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,0.22)" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: "0 0 4px", fontWeight: 500 }}>Commandes</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>{client.nbCommandes}</p>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.22)" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: "0 0 4px", fontWeight: 500 }}>Panier moyen</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>{euro(client.panierMoyen)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cd-colonnes">
        {/* ── Historique des commandes ── */}
        <div>
          <p style={titreSection}>Historique — {client.nbCommandes} commande{client.nbCommandes > 1 ? "s" : ""}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {client.commandes.map((c) => {
              const totalFinal = c.totalTTC + (c.fraisLivraison || 0) + (c.fraisInstallation || 0);
              return (
                <div key={c.id} style={{ background: "#fff", border: "1px solid #ece8e0", borderRadius: 14, padding: "14px 16px" }}>
                  <div className="cd-cmd-ligne">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "#23262a", margin: 0 }}>{c.numero}</p>
                          <p style={{ fontSize: 11.5, color: "#9aa0a8", margin: "2px 0 0" }}>
                            {dateFR(c.createdAt)} · {c.nbArticles} article{c.nbArticles > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div style={{ flexShrink: 0 }}><StatutCommande statut={c.statut} /></div>
                      </div>
                      {c.avecInstallation && (
                        <p style={{ fontSize: 11, color: "#d9551a", fontWeight: 600, margin: "8px 0 0" }}>Avec installation</p>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid #f2efe9" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#23262a" }}>{euro(totalFinal)}</span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <a href={`/api/facture/${c.id}`} target="_blank" rel="noopener noreferrer" title="Télécharger la facture"
                          style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #e8e3da", background: "#faf8f4", display: "grid", placeItems: "center", color: "#5c616a", flexShrink: 0 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                        </a>
                        <Link href={`/admin/commandes/${c.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid #e8e3da", background: "#faf8f4", color: "#23262a", textDecoration: "none", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
                          <Icon name="eye" size={14} /> Détail
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {client.commandes.length === 0 && (
              <div style={{ ...card, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#5c616a", margin: 0 }}>Aucune commande enregistrée.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Coordonnées ── */}
        <div>
          <p style={titreSection}>Coordonnées</p>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: client.telephone || client.adresse ? 12 : 0 }}>
              <span style={{ color: "#9aa0a8", display: "flex", flexShrink: 0, marginTop: 1 }}><Icon name="mail" size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <p style={label}>Email</p>
                <p style={{ fontSize: 13, color: "#23262a", margin: 0, wordBreak: "break-word" }}>{client.email}</p>
              </div>
            </div>

            {client.telephone && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderTop: "1px solid #f2efe9" }}>
                <span style={{ color: "#9aa0a8", display: "flex", flexShrink: 0, marginTop: 1 }}><Icon name="phone" size={15} /></span>
                <div>
                  <p style={label}>Téléphone</p>
                  <p style={{ fontSize: 13, color: "#23262a", margin: 0 }}>{client.telephone}</p>
                </div>
              </div>
            )}

            {client.adresse && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingTop: 12, borderTop: "1px solid #f2efe9" }}>
                <span style={{ color: "#9aa0a8", display: "flex", flexShrink: 0, marginTop: 1 }}><Icon name="map-pin" size={15} /></span>
                <div>
                  <p style={label}>Dernière adresse utilisée</p>
                  <p style={{ fontSize: 13, color: "#23262a", margin: 0, lineHeight: 1.5 }}>
                    {client.adresse}{client.complement ? <><br />{client.complement}</> : null}<br />
                    {client.codePostal} {client.ville}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}