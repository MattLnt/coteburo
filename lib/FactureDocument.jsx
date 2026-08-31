import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const euro = (v) => `${Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const C = { orange: "#f0661b", ink: "#23262a", soft: "#5c616a", line: "#e5e0d8" };

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: C.ink, fontFamily: "Helvetica" },
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
  cDesc: { width: "50%" },
  cQte: { width: "12%", textAlign: "center" },
  cPU: { width: "19%", textAlign: "right" },
  cTot: { width: "19%", textAlign: "right" },
  totaux: { marginTop: 16, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 3 },
  totalTTC: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingTop: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: C.ink },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, fontSize: 8, color: C.soft, textAlign: "center", lineHeight: 1.5 },
  orangeBold: { fontFamily: "Helvetica-Bold", color: C.orange },
});

export function FactureDocument({ c }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* En-tête */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.logo}>CÔTÉ BURO</Text>
            <Text style={[s.soft9, { marginTop: 8 }]}>645 rue Mayor de Montricher</Text>
            <Text style={s.soft9}>13290 Aix-en-Provence</Text>
            <Text style={[s.soft9, { marginTop: 4 }]}>contact@coteburo.fr - 07 81 02 06 31</Text>
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
          <Text style={[s.th, s.cTot]}>TOTAL HT</Text>
        </View>
        {c.lignes.map((l, i) => (
          <View style={s.row} key={i}>
            <View style={s.cDesc}>
              <Text style={s.bold}>{l.designation}</Text>
              {l.finition ? <Text style={[s.soft, { fontSize: 8, marginTop: 2 }]}>{l.finition}</Text> : null}
            </View>
            <Text style={s.cQte}>{l.quantite}</Text>
            <Text style={s.cPU}>{euro(l.prixHT)}</Text>
            <Text style={s.cTot}>{euro(l.prixHT * l.quantite)}</Text>
          </View>
        ))}

        {/* Totaux */}
        <View style={s.totaux}>
          <View style={s.totalLine}><Text style={s.soft}>Sous-total HT</Text><Text>{euro(c.totalHT)}</Text></View>
          <View style={s.totalLine}><Text style={s.soft}>TVA (20 %)</Text><Text>{euro(c.totalTVA)}</Text></View>
          <View style={s.totalTTC}><Text style={s.bold}>Total TTC</Text><Text style={s.orangeBold}>{euro(c.totalTTC)}</Text></View>
        </View>

        {/* Pied de page légal */}
        <View style={s.footer} fixed>
          <Text>Côté BURO - [Forme juridique à compléter] au capital de [montant] - SIRET [à compléter] - TVA intracom. [à compléter]</Text>
          <Text>Garantie 7 ans sur le mobilier - Merci de votre confiance</Text>
        </View>
      </Page>
    </Document>
  );
}