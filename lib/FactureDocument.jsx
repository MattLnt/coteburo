import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SOCIETE, mentionLegale } from "@/lib/societe";

const euro = (v) => `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const C = { orange: "#f0661b", ink: "#23262a", soft: "#5c616a", line: "#e5e0d8" };

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 80, fontSize: 10, color: C.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 },
  logo: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  factureTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", textAlign: "right" },
  factureNum: { fontSize: 11, color: C.soft, textAlign: "right", marginTop: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  soft: { color: C.soft },
  soft9: { color: C.soft, fontSize: 9 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  col: { width: "47%" },
  label: { fontSize: 8, color: C.soft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  tableHead: { flexDirection: "row", backgroundColor: C.ink, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4 },
  th: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  cDesc: { width: "44%" },
  cQte: { width: "10%", textAlign: "center" },
  cPU: { width: "16%", textAlign: "right" },
  cEco: { width: "14%", textAlign: "right" },
  cTot: { width: "16%", textAlign: "right" },
  totaux: { marginTop: 16, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 3 },
  totalTTC: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingTop: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: C.ink },
  ecoNote: { marginTop: 18, fontSize: 7.5, color: C.soft, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, fontSize: 7.5, color: C.soft, textAlign: "center", lineHeight: 1.5 },
  orangeBold: { fontFamily: "Helvetica-Bold", color: C.orange },
});

export function FactureDocument({ c }) {
  const lignes = c.lignes || [];

  // L'éco-participation est une taxe de recyclage que Côté BURO paie au
  // fabricant et refacture à l'identique. Le code de l'environnement
  // impose qu'elle figure distinctement sur la facture, sans marge.
  const totalEco = c.totalEcoPart != null
    ? c.totalEcoPart
    : lignes.reduce((sum, l) => sum + (l.ecoContribution || 0) * l.quantite, 0);

  const avecEco = totalEco > 0;

  // Le sous-total des produits seuls : les frais et l'éco-participation
  // s'ajoutent ensuite, ligne par ligne, pour que le client suive le
  // détail du calcul.
  const sousTotal = lignes.reduce((sum, l) => sum + l.prixHT * l.quantite, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* En-tête */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.logo}>CÔTÉ BURO</Text>
            <Text style={[s.soft9, { marginTop: 8 }]}>{SOCIETE.batiment}</Text>
            <Text style={s.soft9}>{SOCIETE.rue}</Text>
            <Text style={s.soft9}>{SOCIETE.codePostal} {SOCIETE.ville}</Text>
            <Text style={[s.soft9, { marginTop: 4 }]}>
              {SOCIETE.email} — {SOCIETE.contacts.map((k) => k.tel).join(" / ")}
            </Text>
          </View>
          <View>
            <Text style={s.factureTitle}>FACTURE</Text>
            <Text style={s.factureNum}>{c.numero}</Text>
            <Text style={s.factureNum}>Date : {dateFR(c.createdAt)}</Text>
          </View>
        </View>

        {/* Client + paiement */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Facturé à</Text>
            <Text style={s.bold}>{c.prenom} {c.nom}</Text>
            {c.societe ? <Text>{c.societe}</Text> : null}
            <Text style={s.soft}>{c.adresse}{c.complement ? `, ${c.complement}` : ""}</Text>
            <Text style={s.soft}>{c.codePostal} {c.ville}</Text>
            <Text style={s.soft}>{c.email}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Statut du paiement</Text>
            <Text style={s.bold}>{c.paye ? "Payé" : "En attente"}</Text>
            {c.stripePaymentId ? <Text style={[s.soft, { marginTop: 4, fontSize: 8 }]}>Réf. : {c.stripePaymentId}</Text> : null}
          </View>
        </View>

        {/* Tableau */}
        <View style={s.tableHead}>
          <Text style={[s.th, s.cDesc]}>DÉSIGNATION</Text>
          <Text style={[s.th, s.cQte]}>QTÉ</Text>
          <Text style={[s.th, s.cPU]}>P.U. HT</Text>
          {avecEco ? <Text style={[s.th, s.cEco]}>ÉCO-PART.</Text> : null}
          <Text style={[s.th, s.cTot]}>TOTAL HT</Text>
        </View>
        {lignes.map((l, i) => (
          <View style={s.row} key={i}>
            <View style={s.cDesc}>
              <Text style={s.bold}>{l.designation}</Text>
              {l.finition ? <Text style={[s.soft, { fontSize: 8, marginTop: 2 }]}>{l.finition}</Text> : null}
            </View>
            <Text style={s.cQte}>{l.quantite}</Text>
            <Text style={s.cPU}>{euro(l.prixHT)}</Text>
            {avecEco ? (
              <Text style={[s.cEco, s.soft]}>
                {l.ecoContribution > 0 ? euro(l.ecoContribution) : "—"}
              </Text>
            ) : null}
            <Text style={s.cTot}>{euro(l.prixHT * l.quantite)}</Text>
          </View>
        ))}

        {/* Totaux */}
        <View style={s.totaux}>
          <View style={s.totalLine}><Text style={s.soft}>Sous-total produits HT</Text><Text>{euro(sousTotal)}</Text></View>
          {avecEco ? (
            <View style={s.totalLine}><Text style={s.soft}>Éco-participation</Text><Text>{euro(totalEco)}</Text></View>
          ) : null}
          {c.fraisLivraison > 0 ? (
            <View style={s.totalLine}><Text style={s.soft}>Livraison</Text><Text>{euro(c.fraisLivraison)}</Text></View>
          ) : null}
          {c.fraisInstallation > 0 ? (
            <View style={s.totalLine}><Text style={s.soft}>Montage et installation</Text><Text>{euro(c.fraisInstallation)}</Text></View>
          ) : null}
          <View style={[s.totalLine, { paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line, marginTop: 3 }]}>
            <Text style={s.bold}>Total HT</Text><Text style={s.bold}>{euro(c.totalHT)}</Text>
          </View>
          <View style={s.totalLine}><Text style={s.soft}>TVA (20 %)</Text><Text>{euro(c.totalTVA)}</Text></View>
          <View style={s.totalTTC}><Text style={s.bold}>Total TTC</Text><Text style={s.orangeBold}>{euro(c.totalTTC)}</Text></View>
        </View>

        {/* La mention accompagne le montant : le client doit savoir à quoi
            correspond cette ligne qu'il ne peut pas négocier. */}
        {avecEco ? (
          <Text style={s.ecoNote}>
            L&apos;éco-participation est une contribution obligatoire au recyclage du
            mobilier professionnel (article L541-10 du code de l&apos;environnement).
            Elle est reversée intégralement à l&apos;éco-organisme agréé et ne fait
            l&apos;objet d&apos;aucune marge.
          </Text>
        ) : null}

        {/* Pied de page légal */}
        <View style={s.footer} fixed>
          <Text>{mentionLegale()}</Text>
          <Text style={{ marginTop: 3 }}>{SOCIETE.garantie} — Merci de votre confiance</Text>
        </View>
      </Page>
    </Document>
  );
}