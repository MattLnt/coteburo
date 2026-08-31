import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { SOCIETE, mentionLegale, MENTION_RETARD } from "@/lib/societe";

const euro = (v) => Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const C = { orange: "#f0661b", ink: "#1a1a1a", soft: "#555", line: "#000", gris: "#d9d9d9" };

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingHorizontal: 32, paddingBottom: 90, fontSize: 8.5, color: C.ink, fontFamily: "Helvetica" },

  logo: { width: 168 },
  entete: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  colGauche: { width: "50%" },
  colDroite: { width: "45%" },
  ligneSociete: { fontSize: 8, lineHeight: 1.45 },
  legalLigne: { flexDirection: "row", fontSize: 7.5, marginTop: 1 },
  legalLabel: { width: 44, color: C.soft },

  clientNom: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  clientLigne: { fontSize: 9, lineHeight: 1.5 },

  titreCadre: { borderWidth: 1, borderColor: C.line, paddingVertical: 4, paddingHorizontal: 14, alignSelf: "flex-start", marginBottom: 8 },
  titreTexte: { fontSize: 14, fontFamily: "Helvetica-Bold" },

  bandeau: { flexDirection: "row", gap: 6, marginBottom: 10 },
  bandeauCase: { borderWidth: 1, borderColor: C.line, paddingTop: 3, paddingBottom: 5, paddingHorizontal: 8 },
  bandeauLabel: { fontSize: 7, color: C.soft, textAlign: "center", marginBottom: 2 },
  bandeauValeur: { fontSize: 9.5, fontFamily: "Helvetica-Bold", textAlign: "center" },

  thead: { flexDirection: "row", backgroundColor: C.gris, borderWidth: 1, borderColor: C.line },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 5, paddingHorizontal: 4, textAlign: "center" },
  tr: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.line },
  td: { fontSize: 8, paddingVertical: 3.5, paddingHorizontal: 4 },
  cCode: { width: "10%" },
  cDesc: { width: "46%" },
  cQte: { width: "10%", textAlign: "right" },
  cPU: { width: "12%", textAlign: "right" },
  cMontant: { width: "16%", textAlign: "right" },
  cTva: { width: "6%", textAlign: "right" },
  filetBas: { borderBottomWidth: 1, borderColor: C.line },

  basPage: { flexDirection: "row", justifyContent: "space-between", marginTop: 22, gap: 14 },
  blocTotaux: { width: 230, borderWidth: 1, borderColor: C.line },
  totalLigne: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8, fontSize: 9 },
  totalSep: { borderTopWidth: 1, borderColor: C.line },
  totalFort: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  aPayer: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1.5, borderColor: C.line, backgroundColor: "#f2f2f2" },

  pied: { position: "absolute", bottom: 24, left: 32, right: 32, borderTopWidth: 0.8, borderColor: "#bbb", paddingTop: 8 },
  piedTexte: { fontSize: 6.5, color: C.soft, lineHeight: 1.5, textAlign: "center" },
});

const LOGO = `${process.env.NEXT_PUBLIC_SITE_URL || "https://coteburo.fr"}/logo-coteburo-orange-1200.png`;

export function FactureDocument({ c }) {
  const lignes = c.lignes || [];
  // Toutes les lignes sont à 20 % : on affiche le taux par ligne comme sur le
  // modèle d'origine, et le récapitulatif reste sur un seul taux.
  const tauxTVA = 20;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ══ En-tête ══ */}
        <Image src={LOGO} style={s.logo} />

        <View style={[s.entete, { marginTop: 12 }]}>
          <View style={s.colGauche}>
            <Text style={s.ligneSociete}>{SOCIETE.batiment}</Text>
            <Text style={s.ligneSociete}>{SOCIETE.rue}</Text>
            <Text style={s.ligneSociete}>{SOCIETE.codePostal}  {SOCIETE.ville}</Text>

            <View style={{ marginTop: 8 }}>
              <View style={s.legalLigne}>
                <Text style={s.legalLabel}>Tél :</Text>
                <Text>{SOCIETE.contacts.map((k) => k.tel).join(" / ")}</Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <View style={s.legalLigne}><Text style={s.legalLabel}>SIRET :</Text><Text>{SOCIETE.siret}</Text></View>
              <View style={s.legalLigne}><Text style={s.legalLabel}>APE :</Text><Text>{SOCIETE.ape}</Text></View>
              <View style={s.legalLigne}><Text style={s.legalLabel}>Capital :</Text><Text>{SOCIETE.capital}</Text></View>
              <View style={s.legalLigne}><Text style={s.legalLabel}>N° TVA :</Text><Text>{SOCIETE.tvaIntracom}</Text></View>
            </View>

            <Text style={[s.ligneSociete, { marginTop: 8 }]}>{SOCIETE.siteWeb}</Text>
          </View>

          <View style={s.colDroite}>
            <Text style={s.clientNom}>{[c.prenom, c.nom].filter(Boolean).join(" ").toUpperCase()}</Text>
            {c.societe ? <Text style={s.clientLigne}>{c.societe}</Text> : null}
            <Text style={s.clientLigne}>{c.adresse}</Text>
            {c.complement ? <Text style={s.clientLigne}>{c.complement}</Text> : null}
            <Text style={s.clientLigne}>{c.codePostal}   {c.ville}</Text>
            <Text style={s.clientLigne}>{(c.pays || "France").toUpperCase()}</Text>
          </View>
        </View>

        {/* ══ Titre + bandeau ══ */}
        <View style={s.titreCadre}>
          <Text style={s.titreTexte}>Facture</Text>
        </View>

        <View style={s.bandeau}>
          <View style={[s.bandeauCase, { width: 110 }]}>
            <Text style={s.bandeauLabel}>Numéro</Text>
            <Text style={s.bandeauValeur}>{c.numero}</Text>
          </View>
          <View style={[s.bandeauCase, { width: 100 }]}>
            <Text style={s.bandeauLabel}>Date</Text>
            <Text style={s.bandeauValeur}>{dateFR(c.createdAt)}</Text>
          </View>
          <View style={[s.bandeauCase, { flex: 1 }]}>
            <Text style={s.bandeauLabel}>Statut du paiement</Text>
            <Text style={s.bandeauValeur}>{c.paye ? "Payée" : "En attente"}</Text>
          </View>
        </View>

        {/* ══ Tableau ══ */}
        <View style={s.thead}>
          <Text style={[s.th, s.cCode]}>Code article</Text>
          <Text style={[s.th, s.cDesc, { textAlign: "left" }]}>Désignation</Text>
          <Text style={[s.th, s.cQte]}>Quantité</Text>
          <Text style={[s.th, s.cPU]}>P.U. HT</Text>
          <Text style={[s.th, s.cMontant]}>Montant HT</Text>
          <Text style={[s.th, s.cTva]}>TVA</Text>
        </View>

        {lignes.map((l, i) => (
          <View key={i} style={[s.tr, i === lignes.length - 1 ? s.filetBas : null]} wrap={false}>
            <Text style={[s.td, s.cCode]}>{l.referenceFournisseur || l.codeRacine || "A"}</Text>
            <View style={[s.td, s.cDesc]}>
              <Text>{l.designation}</Text>
              {l.finition ? <Text style={{ fontSize: 7, color: C.soft, marginTop: 1 }}>{l.finition}</Text> : null}
            </View>
            <Text style={[s.td, s.cQte]}>{euro(l.quantite)}</Text>
            <Text style={[s.td, s.cPU]}>{euro(l.prixHT)}</Text>
            <Text style={[s.td, s.cMontant]}>{euro(l.prixHT * l.quantite)}</Text>
            <Text style={[s.td, s.cTva]}>{tauxTVA}</Text>
          </View>
        ))}

        {/* ══ Bas de page ══ */}
        <View style={s.basPage}>
          {/* Récapitulatif TVA, à gauche comme sur le modèle */}
          <View style={{ width: 210, borderWidth: 1, borderColor: C.line }}>
            <View style={[s.thead, { borderWidth: 0 }]}>
              <Text style={[s.th, { width: "40%" }]}>Montant HT</Text>
              <Text style={[s.th, { width: "20%" }]}>TVA</Text>
              <Text style={[s.th, { width: "40%" }]}>Montant TVA</Text>
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line }}>
              <Text style={[s.td, { width: "40%", textAlign: "right" }]}>{euro(c.totalHT)}</Text>
              <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{tauxTVA}</Text>
              <Text style={[s.td, { width: "40%", textAlign: "right" }]}>{euro(c.totalTVA)}</Text>
            </View>
          </View>

          <View style={s.blocTotaux}>
            <View style={s.totalLigne}>
              <Text>Total HT</Text><Text>{euro(c.totalHT)}</Text>
            </View>
            {c.fraisLivraison > 0 ? (
              <View style={s.totalLigne}><Text>Frais de port</Text><Text>{euro(c.fraisLivraison)}</Text></View>
            ) : null}
            {c.fraisInstallation > 0 ? (
              <View style={s.totalLigne}><Text>Montage et installation</Text><Text>{euro(c.fraisInstallation)}</Text></View>
            ) : null}
            <View style={[s.totalLigne, s.totalSep]}>
              <Text style={s.totalFort}>Net HT</Text><Text style={s.totalFort}>{euro(c.totalHT)}</Text>
            </View>
            <View style={[s.totalLigne, s.totalSep]}>
              <Text>Total TVA  {tauxTVA} %</Text><Text>{euro(c.totalTVA)}</Text>
            </View>
            <View style={s.totalLigne}>
              <Text>Total TTC</Text><Text style={s.totalFort}>{euro(c.totalTTC)}</Text>
            </View>
            <View style={s.aPayer}>
              <Text style={s.totalFort}>{c.paye ? "Montant réglé" : "Montant à payer"}</Text>
              <Text style={[s.totalFort, { color: C.orange }]}>{euro(c.totalTTC)} EUR</Text>
            </View>
          </View>
        </View>

        {c.paye ? (
          <Text style={{ fontSize: 8, marginTop: 10, color: C.soft }}>
            Réglée en ligne par carte bancaire le {dateFR(c.updatedAt || c.createdAt)}
            {c.stripePaymentId ? ` — réf. ${c.stripePaymentId}` : ""}.
          </Text>
        ) : null}

        {/* ══ Pied de page légal ══ */}
        <View style={s.pied} fixed>
          <Text style={s.piedTexte}>{mentionLegale()}</Text>
          <Text style={[s.piedTexte, { marginTop: 3 }]}>{MENTION_RETARD}</Text>
          <Text style={[s.piedTexte, { marginTop: 3 }]}>
            Escompte pour règlement anticipé : néant · {SOCIETE.garantie}
          </Text>
        </View>
      </Page>
    </Document>
  );
}