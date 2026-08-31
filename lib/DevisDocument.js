import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const euro = (v) => `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const C = { orange: "#f0661b", ink: "#23262a", soft: "#5c616a", line: "#e5e0d8", tint: "#fce6d6" };

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 80, fontSize: 10, color: C.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 },
  logo: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  docTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docNum: { fontSize: 11, color: C.soft, textAlign: "right", marginTop: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  soft: { color: C.soft },
  soft9: { color: C.soft, fontSize: 9 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  col: { width: "47%" },
  label: { fontSize: 8, color: C.soft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  // Mot d'accompagnement — encadré clair, avant le tableau
  note: { backgroundColor: "#faf8f4", borderLeftWidth: 3, borderLeftColor: C.orange, padding: 12, marginBottom: 22, fontSize: 9.5, lineHeight: 1.6, color: C.soft },
  tableHead: { flexDirection: "row", backgroundColor: C.ink, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4 },
  th: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  cDesc: { width: "50%" },
  cQte: { width: "12%", textAlign: "center" },
  cPU: { width: "19%", textAlign: "right" },
  cTot: { width: "19%", textAlign: "right" },
  totaux: { marginTop: 16, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", width: 240, paddingVertical: 3 },
  totalTTC: { flexDirection: "row", justifyContent: "space-between", width: 240, paddingTop: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: C.ink },
  // Bandeau de validité — l'information qui pousse à décider
  validite: { marginTop: 26, backgroundColor: C.tint, borderRadius: 5, padding: 12 },
  validiteTitre: { fontFamily: "Helvetica-Bold", fontSize: 10, color: C.orange, marginBottom: 4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, fontSize: 8, color: C.soft, textAlign: "center", lineHeight: 1.5 },
  orangeBold: { fontFamily: "Helvetica-Bold", color: C.orange },
});

export function DevisDocument({ d, reglages = {} }) {
  const sousTotal = (d.lignes || []).reduce((sum, l) => sum + l.prixHT * l.quantite, 0);
  const remise = d.remiseType === "montant"
    ? Math.min(d.remiseValeur || 0, sousTotal)
    : sousTotal * ((d.remiseValeur || 0) / 100);

  const adresseSociete = reglages.adresse || "645 rue Mayor de Montricher, 13290 Aix-en-Provence";
  const emailSociete = reglages.email || "contact@coteburo.fr";
  const telSociete = reglages.telephone || "07 81 02 06 31";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* En-tête */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.logo}>CÔTÉ BURO</Text>
            <Text style={[s.soft9, { marginTop: 8 }]}>{adresseSociete}</Text>
            <Text style={[s.soft9, { marginTop: 4 }]}>{emailSociete} - {telSociete}</Text>
          </View>
          <View>
            <Text style={s.docTitle}>DEVIS</Text>
            <Text style={s.docNum}>{d.numero}</Text>
            <Text style={s.docNum}>Date : {dateFR(d.dateEnvoi || d.createdAt)}</Text>
            {d.dateValidite ? <Text style={s.docNum}>Valable jusqu'au {dateFR(d.dateValidite)}</Text> : null}
          </View>
        </View>

        {/* Client + projet */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Destinataire</Text>
            <Text style={s.bold}>{d.prenom} {d.nom}</Text>
            {d.societe ? <Text>{d.societe}</Text> : null}
            {d.adresse ? (
              <>
                <Text style={s.soft}>{d.adresse}{d.complement ? `, ${d.complement}` : ""}</Text>
                <Text style={s.soft}>{d.codePostal} {d.ville}</Text>
              </>
            ) : null}
            <Text style={s.soft}>{d.email}</Text>
            {d.telephone ? <Text style={s.soft}>{d.telephone}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Votre projet</Text>
            {d.typeProjet ? <Text style={s.bold}>{d.typeProjet}</Text> : null}
            {d.surface ? <Text style={s.soft}>{d.surface}</Text> : null}
            {d.delai ? <Text style={[s.soft, { marginTop: 4, fontSize: 9 }]}>Délai souhaité : {d.delai}</Text> : null}
          </View>
        </View>

        {/* Mot d'accompagnement */}
        {d.noteClient ? (
          <View style={s.note}>
            <Text>{d.noteClient}</Text>
          </View>
        ) : null}

        {/* Tableau */}
        <View style={s.tableHead}>
          <Text style={[s.th, s.cDesc]}>DÉSIGNATION</Text>
          <Text style={[s.th, s.cQte]}>QTÉ</Text>
          <Text style={[s.th, s.cPU]}>P.U. HT</Text>
          <Text style={[s.th, s.cTot]}>TOTAL HT</Text>
        </View>
        {(d.lignes || []).map((l, i) => (
          <View style={s.row} key={i} wrap={false}>
            <View style={s.cDesc}>
              <Text style={s.bold}>{l.designation}</Text>
              {l.config ? <Text style={[s.soft, { fontSize: 8, marginTop: 2 }]}>{l.config}</Text> : null}
            </View>
            <Text style={s.cQte}>{l.quantite}</Text>
            <Text style={s.cPU}>{euro(l.prixHT)}</Text>
            <Text style={s.cTot}>{euro(l.prixHT * l.quantite)}</Text>
          </View>
        ))}

        {/* Totaux */}
        <View style={s.totaux}>
          <View style={s.totalLine}><Text style={s.soft}>Sous-total HT</Text><Text>{euro(sousTotal)}</Text></View>
          {remise > 0 ? (
            <View style={s.totalLine}>
              <Text style={s.soft}>Remise{d.remiseType === "pourcentage" ? ` (${d.remiseValeur} %)` : ""}</Text>
              <Text style={{ color: C.orange }}>- {euro(remise)}</Text>
            </View>
          ) : null}
          {d.fraisLivraison > 0 ? (
            <View style={s.totalLine}><Text style={s.soft}>Livraison</Text><Text>{euro(d.fraisLivraison)}</Text></View>
          ) : null}
          {d.fraisInstallation > 0 ? (
            <View style={s.totalLine}><Text style={s.soft}>Montage et installation</Text><Text>{euro(d.fraisInstallation)}</Text></View>
          ) : null}
          <View style={s.totalLine}><Text style={s.soft}>Total HT</Text><Text style={s.bold}>{euro(d.totalHT)}</Text></View>
          <View style={s.totalLine}><Text style={s.soft}>TVA (20 %)</Text><Text>{euro(d.totalTVA)}</Text></View>
          <View style={s.totalTTC}><Text style={s.bold}>Total TTC</Text><Text style={s.orangeBold}>{euro(d.totalTTC)}</Text></View>
        </View>

        {/* Validité et acceptation */}
        <View style={s.validite}>
          <Text style={s.validiteTitre}>Pour accepter ce devis</Text>
          <Text style={{ fontSize: 9, color: C.soft, lineHeight: 1.6 }}>
            Rendez-vous sur le lien reçu par email pour valider votre commande en ligne.
            {d.dateValidite ? ` Cette proposition est valable jusqu'au ${dateFR(d.dateValidite)}.` : ""}
          </Text>
          <Text style={{ fontSize: 8.5, color: C.soft, marginTop: 8 }}>
            Livraison et montage assurés par nos équipes - Garantie 7 ans sur le mobilier
          </Text>
        </View>

        {/* Pied de page légal */}
        <View style={s.footer} fixed>
          <Text>Côté BURO - [Forme juridique à compléter] au capital de [montant] - SIRET [à compléter] - TVA intracom. [à compléter]</Text>
          <Text>Devis gratuit et sans engagement - Prix en euros, TVA 20 % applicable</Text>
        </View>
      </Page>
    </Document>
  );
}