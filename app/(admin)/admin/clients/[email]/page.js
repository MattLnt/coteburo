import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { StatutCommande } from "@/components/dashboard/StatutCommande";
import { getClientDetail } from "../actions";

export const dynamic = "force-dynamic";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const dateCourteFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default async function ClientDetailPage({ params }) {
  const { email } = await params;
  const client = await getClientDetail(decodeURIComponent(email));
  if (!client) notFound();

  const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 24 };
  const label = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9aa0a8", marginBottom: 4 };

  return (
    <div>
      {/* Fil d'ariane */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13.5, color: "#5c616a", flexWrap: "wrap" }}>
        <Link href="/admin/clients" style={{ color: "#f0661b", textDecoration: "none", fontWeight: 600 }}>← Clients</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: "#23262a" }}>{client.prenom} {client.nom}</span>
      </div>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "#23262a", margin: 0 }}>{client.prenom} {client.nom}</h1>
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: client.possedeCompte ? "#e8f6f0" : "#f0ece4", color: client.possedeCompte ? "#1f7a52" : "#5c616a" }}>
              {client.possedeCompte ? "Compte créé" : "Client invité"}
            </span>
          </div>
          {client.societe && <p style={{ color: "#5c616a", marginTop: 6, fontSize: 14.5 }}>{client.societe}</p>}
        </div>
        <a href={`mailto:${client.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, background: "#f0661b", color: "#fff", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
          <Icon name="edit" size={15} /> Contacter par email
        </a>
      </div>

      {/* Stats rapides */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Commandes" value={client.nbCommandes} icon="box" />
        <StatCard label="Total dépensé TTC" value={euro(client.totalDepense)} icon="euro" accent />
        <StatCard label="Panier moyen" value={euro(client.panierMoyen)} icon="tag" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        {/* ── Colonne principale : historique des commandes ── */}
        <div style={card}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#23262a", margin: "0 0 18px" }}>Historique des commandes</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {client.commandes.map((c) => {
              const totalFinal = c.totalTTC + (c.fraisLivraison || 0) + (c.fraisInstallation || 0);
              return (
                <div key={c.id} style={{ border: "1px solid #f0ece4", borderRadius: 13, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14.5, color: "#23262a" }}>{c.numero}</span>
                      <StatutCommande statut={c.statut} />
                    </div>
                    <p style={{ fontSize: 12.5, color: "#9aa0a8", margin: "5px 0 0" }}>
                      {dateFR(c.createdAt)} · {c.nbArticles} article{c.nbArticles > 1 ? "s" : ""}
                      {c.avecInstallation && <span style={{ color: "#d9551a", fontWeight: 600 }}> · avec installation</span>}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#23262a" }}>{euro(totalFinal)}</span>
                    <a href={`/api/facture/${c.id}`} target="_blank" rel="noopener noreferrer" title="Télécharger la facture"
                      style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid #e8e3da", display: "grid", placeItems: "center", color: "#5c616a", flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                    </a>
                    <Link href={`/admin/commandes/${c.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid #e8e3da", color: "#23262a", textDecoration: "none", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                      <Icon name="eye" size={14} /> Détail
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Colonne latérale : coordonnées ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#23262a", margin: "0 0 16px" }}>Contact</h3>
            <div style={{ marginBottom: 14 }}>
              <p style={label}>Email</p>
              <p style={{ fontSize: 13.5, color: "#23262a" }}>{client.email}</p>
            </div>
            {client.telephone && (
              <div>
                <p style={label}>Téléphone</p>
                <p style={{ fontSize: 13.5, color: "#23262a" }}>{client.telephone}</p>
              </div>
            )}
          </div>

          {client.adresse && (
            <div style={card}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#23262a", margin: "0 0 16px" }}>Dernière adresse utilisée</h3>
              <p style={{ fontSize: 13.5, color: "#23262a", lineHeight: 1.6 }}>
                {client.adresse}{client.complement ? <><br />{client.complement}</> : null}<br />
                {client.codePostal} {client.ville}
              </p>
            </div>
          )}

          <div style={card}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#23262a", margin: "0 0 16px" }}>Compte</h3>
            {client.possedeCompte ? (
              <p style={{ fontSize: 13.5, color: "#1f7a52" }}>✓ Compte créé{client.dateInscription ? ` le ${dateCourteFR(client.dateInscription)}` : ""}</p>
            ) : (
              <p style={{ fontSize: 13.5, color: "#5c616a" }}>Ce client a toujours commandé sans créer de compte (invité).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div style={{ background: accent ? "#f0661b" : "#fff", border: "1px solid " + (accent ? "#f0661b" : "#ece8e0"), borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 13 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: accent ? "rgba(255,255,255,0.2)" : "#faf3ee", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={20} color={accent ? "#fff" : "#f0661b"} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: accent ? "rgba(255,255,255,0.85)" : "#9aa0a8", fontWeight: 600 }}>{label}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: accent ? "#fff" : "#23262a", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}