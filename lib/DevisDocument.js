import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { SOCIETE, mentionLegale } from "@/lib/societe";

const euro = (v) => Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFR = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

const C = { orange: "#f0661b", ink: "#1a1a1a", soft: "#555", line: "#000", gris: "#d9d9d9", tint: "#fce6d6" };

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingHorizontal: 32, paddingBottom: 90, fontSize: 8.5, color: C.ink, fontFamily: "Helvetica" },

  // ── En-tête ──
  logo: { width: 168 },
  entete: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  colGauche: { width: "50%" },
  colDroite: { width: "45%" },
  ligneSociete: { fontSize: 8, lineHeight: 1.45 },
  legalLigne: { flexDirection: "row", fontSize: 7.5, marginTop: 1 },
  legalLabel: { width: 44, color: C.soft },

  clientNom: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  clientLigne: { fontSize: 9, lineHeight: 1.5 },

  // ── Bandeau Devis ──
  titreCadre: { borderWidth: 1, borderColor: C.line, paddingVertical: 4, paddingHorizontal: 14, alignSelf: "flex-start", marginBottom: 8 },
  titreTexte: { fontSize: 14, fontFamily: "Helvetica-Bold" },

  bandeau: { flexDirection: "row", gap: 6, marginBottom: 10 },
  bandeauCase: { borderWidth: 1, borderColor: C.line, paddingTop: 3, paddingBottom: 5, paddingHorizontal: 8 },
  bandeauLabel: { fontSize: 7, color: C.soft, textAlign: "center", marginBottom: 2 },
  bandeauValeur: { fontSize: 9.5, fontFamily: "Helvetica-Bold", textAlign: "center" },

  // ── Mot d'accompagnement ──
  note: { borderLeftWidth: 2.5, borderLeftColor: C.orange, paddingLeft: 10, paddingVertical: 6, marginBottom: 12, fontSize: 8.5, lineHeight: 1.6, color: C.soft },

  // ── Tableau ──
  thead: { flexDirection: "row", backgroundColor: C.gris, borderWidth: 1, borderColor: C.line },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 5, paddingHorizontal: 4, textAlign: "center" },
  tr: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.line },
  td: { fontSize: 8, paddingVertical: 3.5, paddingHorizontal: 4 },
  cRef: { width: "10%" },
  cDesc: { width: "46%" },
  cQte: { width: "10%", textAlign: "right" },
  cPU: { width: "12%", textAlign: "right" },
  cMontant: { width: "16%", textAlign: "right" },
  cTva: { width: "6%", textAlign: "right" },
  filetBas: { borderBottomWidth: 1, borderColor: C.line },

  // ── Totaux ──
  basPage: { flexDirection: "row", justifyContent: "space-between", marginTop: 22, gap: 14 },
  blocTotaux: { width: 230, borderWidth: 1, borderColor: C.line },
  totalLigne: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8, fontSize: 9 },
  totalSep: { borderTopWidth: 1, borderColor: C.line },
  totalFort: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  aPayer: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1.5, borderColor: C.line, backgroundColor: "#f2f2f2" },

  // ── Acceptation ──
  validite: { marginTop: 20, backgroundColor: C.tint, padding: 11 },
  validiteTitre: { fontFamily: "Helvetica-Bold", fontSize: 9, color: C.orange, marginBottom: 3 },

  // ── Pied ──
  pied: { position: "absolute", bottom: 24, left: 32, right: 32, borderTopWidth: 0.8, borderColor: "#bbb", paddingTop: 8 },
  piedTexte: { fontSize: 6.5, color: C.soft, lineHeight: 1.5, textAlign: "center" },
});

const LOGO = `${process.env.NEXT_PUBLIC_SITE_URL || "https://coteburo.fr"}/logo-coteburo-orange-1200.png`;

export function DevisDocument({ d, reglages = {} }) {
  const lignes = d.lignes || [];
  const tauxTVA = 20;

  const sousTotal = lignes.reduce((sum, l) => sum + l.prixHT * l.quantite, 0);
  const remise = d.remiseType === "montant"
    ? Math.min(d.remiseValeur || 0, sousTotal)
    : sousTotal * ((d.remiseValeur || 0) / 100);

  const infosProjet = [d.typeProjet, d.surface, d.delai].filter(Boolean);

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
            <Text style={s.clientNom}>{[d.prenom, d.nom].filter(Boolean).join(" ").toUpperCase()}</Text>
            {d.societe ? <Text style={s.clientLigne}>{d.societe}</Text> : null}
            {d.adresse ? (
              <>
                <Text style={s.clientLigne}>{d.adresse}</Text>
                {d.complement ? <Text style={s.clientLigne}>{d.complement}</Text> : null}
                <Text style={s.clientLigne}>{d.codePostal}   {d.ville}</Text>
                <Text style={s.clientLigne}>{(d.pays || "France").toUpperCase()}</Text>
              </>
            ) : null}
            <Text style={[s.clientLigne, { marginTop: 3 }]}>{d.email}</Text>
            {d.telephone ? <Text style={s.clientLigne}>{d.telephone}</Text> : null}
          </View>
        </View>

        {/* ══ Titre + bandeau ══ */}
        <View style={s.titreCadre}>
          <Text style={s.titreTexte}>Devis</Text>
        </View>

        <View style={s.bandeau}>
          <View style={[s.bandeauCase, { width: 110 }]}>
            <Text style={s.bandeauLabel}>Numéro</Text>
            <Text style={s.bandeauValeur}>{d.numero}</Text>
          </View>
          <View style={[s.bandeauCase, { width: 100 }]}>
            <Text style={s.bandeauLabel}>Date</Text>
            <Text style={s.bandeauValeur}>{dateFR(d.dateEnvoi || d.createdAt)}</Text>
          </View>
          {d.dateValidite ? (
            <View style={[s.bandeauCase, { width: 120 }]}>
              <Text style={s.bandeauLabel}>Valable jusqu&apos;au</Text>
              <Text style={s.bandeauValeur}>{dateFR(d.dateValidite)}</Text>
            </View>
          ) : null}
          {infosProjet.length > 0 ? (
            <View style={[s.bandeauCase, { flex: 1 }]}>
              <Text style={s.bandeauLabel}>Projet</Text>
              <Text style={[s.bandeauValeur, { fontSize: 8 }]}>{infosProjet.join(" · ")}</Text>
            </View>
          ) : null}
        </View>

        {/* ══ Mot d'accompagnement ══ */}
        {d.noteClient ? (
          <View style={s.note}>
            <Text>{d.noteClient}</Text>
          </View>
        ) : null}

        {/* ══ Tableau ══ */}
        <View style={s.thead}>
          <Text style={[s.th, s.cRef]}>Référence</Text>
          <Text style={[s.th, s.cDesc, { textAlign: "left" }]}>Désignation</Text>
          <Text style={[s.th, s.cQte]}>Quantité</Text>
          <Text style={[s.th, s.cPU]}>P.U. HT</Text>
          <Text style={[s.th, s.cMontant]}>Montant HT</Text>
          <Text style={[s.th, s.cTva]}>TVA</Text>
        </View>

        {lignes.map((l, i) => (
          <View key={i} style={[s.tr, i === lignes.length - 1 ? s.filetBas : null]} wrap={false}>
            <Text style={[s.td, s.cRef]}>{l.codeRacine || "A"}</Text>
            <View style={[s.td, s.cDesc]}>
              <Text>{l.designation}</Text>
              {l.config ? <Text style={{ fontSize: 7, color: C.soft, marginTop: 1 }}>{l.config}</Text> : null}
            </View>
            <Text style={[s.td, s.cQte]}>{euro(l.quantite)}</Text>
            <Text style={[s.td, s.cPU]}>{euro(l.prixHT)}</Text>
            <Text style={[s.td, s.cMontant]}>{euro(l.prixHT * l.quantite)}</Text>
            <Text style={[s.td, s.cTva]}>{tauxTVA}</Text>
          </View>
        ))}

        {/* ══ Bas de page ══ */}
        <View style={s.basPage}>
          {/* Récapitulatif TVA */}
          <View style={{ width: 210, borderWidth: 1, borderColor: C.line }}>
            <View style={[s.thead, { borderWidth: 0 }]}>
              <Text style={[s.th, { width: "40%" }]}>Montant HT</Text>
              <Text style={[s.th, { width: "20%" }]}>TVA</Text>
              <Text style={[s.th, { width: "40%" }]}>Montant TVA</Text>
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line }}>
              <Text style={[s.td, { width: "40%", textAlign: "right" }]}>{euro(d.totalHT)}</Text>
              <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{tauxTVA}</Text>
              <Text style={[s.td, { width: "40%", textAlign: "right" }]}>{euro(d.totalTVA)}</Text>
            </View>
          </View>

          <View style={s.blocTotaux}>
            <View style={s.totalLigne}>
              <Text>Total brut HT</Text><Text>{euro(sousTotal)}</Text>
            </View>
            {remise > 0 ? (
              <View style={s.totalLigne}>
                <Text>Remise{d.remiseType === "pourcentage" ? ` ${d.remiseValeur} %` : ""}</Text>
                <Text style={{ color: C.orange }}>- {euro(remise)}</Text>
              </View>
            ) : null}
            {d.fraisLivraison > 0 ? (
              <View style={s.totalLigne}><Text>Frais de port</Text><Text>{euro(d.fraisLivraison)}</Text></View>
            ) : null}
            {d.fraisInstallation > 0 ? (
              <View style={s.totalLigne}><Text>Montage et installation</Text><Text>{euro(d.fraisInstallation)}</Text></View>
            ) : null}
            <View style={[s.totalLigne, s.totalSep]}>
              <Text style={s.totalFort}>Net HT</Text><Text style={s.totalFort}>{euro(d.totalHT)}</Text>
            </View>
            <View style={[s.totalLigne, s.totalSep]}>
              <Text>Total TVA  {tauxTVA} %</Text><Text>{euro(d.totalTVA)}</Text>
            </View>
            <View style={s.aPayer}>
              <Text style={s.totalFort}>Total TTC</Text>
              <Text style={[s.totalFort, { color: C.orange }]}>{euro(d.totalTTC)} EUR</Text>
            </View>
          </View>
        </View>

        {/* ══ Acceptation ══ */}
        <View style={s.validite}>
          <Text style={s.validiteTitre}>Pour accepter ce devis</Text>
          <Text style={{ fontSize: 8, color: C.soft, lineHeight: 1.6 }}>
            Rendez-vous sur le lien reçu par email : vous y choisirez vos finitions et réglerez votre commande en ligne.
            {d.dateValidite ? ` Cette proposition est valable jusqu'au ${dateFR(d.dateValidite)}.` : ""}
          </Text>
          <Text style={{ fontSize: 7.5, color: C.soft, marginTop: 6 }}>
            Livraison et montage assurés par nos équipes en région PACA · {SOCIETE.garantie}
          </Text>
        </View>

        {/* ══ Pied de page légal ══ */}
        <View style={s.pied} fixed>
          <Text style={s.piedTexte}>{mentionLegale()}</Text>
          <Text style={[s.piedTexte, { marginTop: 3 }]}>
            Devis gratuit et sans engagement · Prix en euros, TVA {tauxTVA} % applicable
          </Text>
        </View>
      </Page>
    </Document>
  );
}