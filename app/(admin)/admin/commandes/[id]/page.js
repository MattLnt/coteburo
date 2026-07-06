import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/dashboard/Icon";
import { StatutCommande } from "@/components/dashboard/StatutCommande";
import { StatutSelect } from "./StatutSelect";
import { getCommande } from "../actions";

export const dynamic = "force-dynamic";

const euro = (v) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const card = { background: "#fff", border: "1px solid #ece8e0", borderRadius: 16, padding: 22 };
const cardTitle = { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#23262a", margin: "0 0 16px" };
const labelStyle = { fontSize: 11, fontWeight: 700, color: "#9aa0a8", textTransform: "uppercase", letterSpacing: "0.06em" };

export default async function CommandeDetailPage({ params }) {
  const { id } = await params;
  const commande = await getCommande(id);
  if (!commande) notFound();

  const c = commande;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/commandes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#5c616a", textDecoration: "none", marginBottom: 12 }}>
          <Icon name="chevronDown" size={15} /> <span style={{ transform: "rotate(0deg)" }}>Retour aux commandes</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: 0 }}>{c.numero}</h1>
            <StatutCommande statut={c.statut} />
          </div>
          <span style={{ fontSize: 13.5, color: "#9aa0a8" }}>{dateFR(c.createdAt)}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }} className="cmd-grid">
        <style>{`@media (max-width: 900px){ .cmd-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* Colonne principale */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Articles */}
          <div style={card}>
            <h3 style={cardTitle}>Articles commandés</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {c.lignes.map((l) => (
                <div key={l.id} style={{ display: "flex", gap: 14, alignItems: "center", paddingBottom: 14, borderBottom: "1px solid #f2efe9" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: "#f7f4ef", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                    {l.imageUrl ? <img src={l.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="box" size={22} color="#c4c0b6" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#23262a" }}>{l.designation}</div>
                    {l.finition && <div style={{ fontSize: 12.5, color: "#9aa0a8", marginTop: 2 }}>{l.finition}</div>}
                    <div style={{ fontSize: 12.5, color: "#9aa0a8", marginTop: 2 }}>{l.marque || ""} · {euro(l.prixHT)} HT × {l.quantite}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{euro(l.prixHT * l.quantite)}</div>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#5c616a" }}><span>Sous-total HT</span><span>{euro(c.totalHT)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#5c616a" }}><span>TVA (20 %)</span><span>{euro(c.totalTVA)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, paddingTop: 8, borderTop: "1px solid #f2efe9" }}>
                <span>Total TTC</span><span style={{ color: "#f0661b" }}>{euro(c.totalTTC)}</span>
              </div>
            </div>
          </div>

          {/* Client + Livraison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="cmd-sub">
            <style>{`@media (max-width: 620px){ .cmd-sub { grid-template-columns: 1fr !important; } }`}</style>
            <div style={card}>
              <h3 style={cardTitle}>Client</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Info label="Nom" value={`${c.prenom} ${c.nom}`} />
                {c.societe && <Info label="Société" value={c.societe} />}
                <Info label="Email" value={c.email} />
                {c.telephone && <Info label="Téléphone" value={c.telephone} />}
              </div>
            </div>
            <div style={card}>
              <h3 style={cardTitle}>Livraison</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Info label="Adresse" value={c.adresse} />
                {c.complement && <Info label="Complément" value={c.complement} />}
                <Info label="Ville" value={`${c.codePostal} ${c.ville}`} />
                <Info label="Pays" value={c.pays} />
              </div>
            </div>
          </div>
        </div>

        {/* Colonne latérale : statut */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 90 }}>
          <div style={card}>
            <h3 style={cardTitle}>Statut de la commande</h3>
            <StatutSelect commandeId={c.id} statutActuel={c.statut} />
          </div>

          <div style={card}>
            <span style={labelStyle}>Paiement</span>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9aa0a8" }}>État</span>
                <span style={{ fontWeight: 700, color: c.paye ? "#1f7a52" : "#b45309" }}>{c.paye ? "Payé" : "Non payé"}</span>
              </div>
              {c.stripePaymentId && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "#9aa0a8" }}>Réf. Stripe</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11.5, color: "#5c616a", textAlign: "right", wordBreak: "break-all" }}>{c.stripePaymentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa0a8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#23262a" }}>{value}</div>
    </div>
  );
}