import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Côté BURO <contact@coteburo.fr>";
const NOTIF = process.env.EMAIL_NOTIFICATION;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://coteburo.vercel.app";

const euro = (v) => `${Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const C = {
  orange: "#f0661b",
  orangeDark: "#d9551a",
  charcoal: "#212428",
  ink: "#23262a",
  inkSoft: "#5c616a",
  bg: "#f7f4ef",
  surface: "#ffffff",
  line: "#ece8e0",
  tint: "#fce6d6",
};

// avecReference : n'affiche la référence fournisseur que dans l'email interne —
// c'est l'info dont a besoin le magasin pour commander, pas le client.
function lignesHTML(lignes, avecReference = false) {
  return lignes.map((l) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};">
        <div style="font-weight:600;color:${C.ink};font-size:14px;">${l.designation}</div>
        ${avecReference && l.referenceFournisseur ? `<div style="color:${C.orangeDark};font-size:12px;margin-top:3px;font-family:monospace;font-weight:700;">Réf. à commander : ${l.referenceFournisseur}</div>` : ""}
        ${l.finition ? `<div style="color:${C.inkSoft};font-size:12px;margin-top:3px;">${l.finition}</div>` : ""}
        <div style="color:${C.inkSoft};font-size:12px;margin-top:3px;">Quantité : ${l.quantite}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};text-align:right;font-weight:700;color:${C.ink};font-size:14px;white-space:nowrap;vertical-align:top;">
        ${euro(l.prixHT * l.quantite)}
      </td>
    </tr>
  `).join("");
}

// Lignes d'articles pour une demande de DEVIS (avec image miniature + config, prix indicatif optionnel)
function lignesDevisHTML(articles = []) {
  return articles.map((a) => {
    const finTexte = finitionsTexte(a.finitions);
    return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};width:64px;vertical-align:top;">
        ${a.image
          ? `<img src="${a.image}" alt="" width="56" height="56" style="display:block;border-radius:10px;object-fit:cover;border:1px solid ${C.line};">`
          : `<div style="width:56px;height:56px;border-radius:10px;background:${C.bg};border:1px solid ${C.line};"></div>`}
      </td>
      <td style="padding:14px 0 14px 14px;border-bottom:1px solid ${C.line};vertical-align:top;">
        <div style="font-weight:600;color:${C.ink};font-size:14px;">${a.designation}</div>
        ${a.gammeNom ? `<div style="color:${C.inkSoft};font-size:12px;margin-top:2px;">Gamme ${a.gammeNom}</div>` : ""}
        ${a.config ? `<div style="color:${C.inkSoft};font-size:12px;margin-top:2px;">${a.config}</div>` : ""}
        ${finTexte ? `<div style="color:${C.inkSoft};font-size:11.5px;margin-top:4px;font-style:italic;">Finitions disponibles : ${finTexte}</div>` : ""}
        <div style="color:${C.inkSoft};font-size:12px;margin-top:3px;">Quantité : ${a.quantite}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};text-align:right;font-weight:700;color:${C.ink};font-size:13.5px;white-space:nowrap;vertical-align:top;">
        ${a.prixIndicatif != null ? euro(a.prixIndicatif * a.quantite) : "Sur devis"}
      </td>
    </tr>
  `;
  }).join("");
}

// Ligne récap des finitions disponibles pour un article ([{nom, valeurs:[...]}] -> texte lisible)
function finitionsTexte(finitions) {
  if (!Array.isArray(finitions) || finitions.length === 0) return "";
  return finitions.map((f) => `${f.nom} (${f.valeurs.join(", ")})`).join(" · ");
}

function enveloppe(contenu, preheader = "") {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:${C.bg};max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.surface};border-radius:20px;overflow:hidden;border:1px solid ${C.line};">
        <!-- Header -->
        <tr>
          <td style="background:${C.charcoal};padding:26px 32px;">
            <img src="${SITE_URL}/logo-email.png" alt="Côté BURO" width="150" style="display:block;border:0;height:auto;width:150px;max-width:150px;">
          </td>
        </tr>
        ${contenu}
        <!-- Footer -->
        <tr>
          <td style="background:${C.charcoal};padding:28px 32px;">
            <p style="margin:0 0 6px;color:#ffffff;font-weight:700;font-size:14px;">Côté BURO</p>
            <p style="margin:0;color:#9aa0a8;font-size:12.5px;line-height:1.6;">
              645 rue Mayor de Montricher, 13290 Aix-en-Provence<br>
              07 81 02 06 31 · contact@coteburo.fr
            </p>
            <p style="margin:16px 0 0;color:#6b7178;font-size:11px;">Spécialiste de l'aménagement de bureau · Garantie 7 ans</p>
          </td>
        </tr>
      </table>
      <p style="max-width:560px;margin:18px auto 0;color:#9aa0a8;font-size:11px;text-align:center;line-height:1.5;">
        Cet email vous a été envoyé suite à votre commande sur coteburo.fr
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function envoyerConfirmationClient(commande) {
  const c = commande;
  const fraisLivraison = c.fraisLivraison ?? 0;
  const fraisInstallation = c.fraisInstallation ?? 0;
  const totalGeneralTTC = c.totalTTC + fraisLivraison + fraisInstallation;

  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <div style="width:56px;height:56px;border-radius:50%;background:#e8f6f0;text-align:center;line-height:56px;margin-bottom:20px;">
        <span style="color:#1f7a52;font-size:28px;">✓</span>
      </div>
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Commande confirmée</p>
      <h1 style="margin:0 0 12px;color:${C.ink};font-size:26px;font-weight:800;">Merci pour votre commande !</h1>
      <p style="margin:0 0 24px;color:${C.inkSoft};font-size:15px;line-height:1.6;">
        Bonjour ${c.prenom},<br>
        Nous avons bien reçu votre commande et votre paiement. Notre équipe la prépare et vous contactera pour organiser la livraison${c.avecInstallation ? " et le montage" : ""}.
      </p>
      <table role="presentation" width="100%" style="background:${C.bg};border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:16px 20px;">
          <span style="color:${C.inkSoft};font-size:13px;">Numéro de commande</span>
          <div style="color:${C.ink};font-weight:800;font-size:18px;margin-top:2px;">${c.numero}</div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 32px;">
      <h2 style="margin:0 0 4px;color:${C.ink};font-size:16px;font-weight:700;">Récapitulatif</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${lignesHTML(c.lignes)}
      </table>
      <table role="presentation" width="100%" style="margin-top:16px;">
        <tr><td style="color:${C.inkSoft};font-size:13.5px;padding:3px 0;">Sous-total HT</td><td style="text-align:right;color:${C.inkSoft};font-size:13.5px;">${euro(c.totalHT)}</td></tr>
        <tr><td style="color:${C.inkSoft};font-size:13.5px;padding:3px 0;">TVA (20 %)</td><td style="text-align:right;color:${C.inkSoft};font-size:13.5px;">${euro(c.totalTVA)}</td></tr>
        <tr><td style="color:${C.inkSoft};font-size:13.5px;padding:3px 0;">Livraison</td><td style="text-align:right;color:${fraisLivraison === 0 ? "#1f7a52" : C.inkSoft};font-size:13.5px;font-weight:${fraisLivraison === 0 ? "700" : "400"};">${fraisLivraison === 0 ? "Offerte" : euro(fraisLivraison)}</td></tr>
        ${c.avecInstallation ? `<tr><td style="color:${C.inkSoft};font-size:13.5px;padding:3px 0;">Montage & installation</td><td style="text-align:right;color:${C.inkSoft};font-size:13.5px;">${euro(fraisInstallation)}</td></tr>` : ""}
        <tr><td style="padding-top:12px;border-top:2px solid ${C.line};color:${C.ink};font-weight:800;font-size:17px;">Total TTC</td><td style="padding-top:12px;border-top:2px solid ${C.line};text-align:right;color:${C.orange};font-weight:800;font-size:17px;">${euro(totalGeneralTTC)}</td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:28px 32px 36px;">
      <div style="background:${C.tint};border-radius:12px;padding:18px 20px;">
        <p style="margin:0 0 8px;color:${C.orangeDark};font-weight:700;font-size:14px;">Livraison à</p>
        <p style="margin:0;color:${C.ink};font-size:13.5px;line-height:1.6;">
          ${c.prenom} ${c.nom}${c.societe ? ` · ${c.societe}` : ""}<br>
          ${c.adresse}${c.complement ? `, ${c.complement}` : ""}<br>
          ${c.codePostal} ${c.ville}
        </p>
      </div>
    </td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: c.email,
    subject: `Votre commande ${c.numero} est confirmée · Côté BURO`,
    html: enveloppe(contenu, `Commande ${c.numero} confirmée — merci pour votre confiance !`),
  });
}

export async function envoyerNotificationInterne(commande) {
  if (!NOTIF) return;
  const c = commande;
  const fraisLivraison = c.fraisLivraison ?? 0;
  const fraisInstallation = c.fraisInstallation ?? 0;
  const totalGeneralTTC = c.totalTTC + fraisLivraison + fraisInstallation;

  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Nouvelle commande</p>
      <h1 style="margin:0 0 20px;color:${C.ink};font-size:24px;font-weight:800;">${c.numero} · ${euro(totalGeneralTTC)}</h1>
      <table role="presentation" width="100%" style="background:${C.bg};border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:${C.ink};font-weight:700;font-size:14px;">${c.prenom} ${c.nom}${c.societe ? ` · ${c.societe}` : ""}</p>
          <p style="margin:0;color:${C.inkSoft};font-size:13px;line-height:1.7;">
            ✉ ${c.email}${c.telephone ? `<br>☎ ${c.telephone}` : ""}<br>
            📍 ${c.adresse}${c.complement ? `, ${c.complement}` : ""}, ${c.codePostal} ${c.ville}
          </p>
        </td></tr>
      </table>
      ${c.avecInstallation ? `<table role="presentation" width="100%" style="background:${C.tint};border-radius:12px;margin-bottom:24px;"><tr><td style="padding:14px 20px;"><p style="margin:0;color:${C.orangeDark};font-weight:700;font-size:13.5px;">🔧 Montage & installation demandés — à planifier avec le client.</p></td></tr></table>` : ""}
    </td></tr>
    <tr><td style="padding:0 32px 36px;">
      <h2 style="margin:0 0 4px;color:${C.ink};font-size:15px;font-weight:700;">Articles à commander</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${lignesHTML(c.lignes, true)}
      </table>
      <table role="presentation" width="100%" style="margin-top:14px;">
        <tr><td style="color:${C.inkSoft};font-size:13px;padding:3px 0;">Livraison</td><td style="text-align:right;color:${C.inkSoft};font-size:13px;">${fraisLivraison === 0 ? "Offerte" : euro(fraisLivraison)}</td></tr>
        ${c.avecInstallation ? `<tr><td style="color:${C.inkSoft};font-size:13px;padding:3px 0;">Installation</td><td style="text-align:right;color:${C.inkSoft};font-size:13px;">${euro(fraisInstallation)}</td></tr>` : ""}
        <tr><td style="padding-top:10px;color:${C.ink};font-weight:800;font-size:16px;">Total TTC</td><td style="padding-top:10px;text-align:right;color:${C.orange};font-weight:800;font-size:16px;">${euro(totalGeneralTTC)}</td></tr>
      </table>
    </td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: NOTIF,
    subject: `🛎 Nouvelle commande ${c.numero} — ${euro(totalGeneralTTC)}`,
    html: enveloppe(contenu, `Nouvelle commande de ${c.prenom} ${c.nom} — ${euro(totalGeneralTTC)}`),
  });
}

// ─── Email : demande de contact ───
export async function envoyerContact({ nom, email, telephone, sujet, message }) {
  if (!NOTIF) return;
  const contenu = `
    <tr><td style="padding:36px 32px;">
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Nouveau message</p>
      <h1 style="margin:0 0 20px;color:${C.ink};font-size:22px;font-weight:800;">${sujet || "Demande de contact"}</h1>
      <table role="presentation" width="100%" style="background:${C.bg};border-radius:12px;margin-bottom:20px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;color:${C.ink};font-weight:700;font-size:14px;">${nom}</p>
          <p style="margin:0;color:${C.inkSoft};font-size:13px;line-height:1.7;">
            ✉ ${email}${telephone ? `<br>☎ ${telephone}` : ""}
          </p>
        </td></tr>
      </table>
      <div style="background:${C.surface};border:1px solid ${C.line};border-radius:12px;padding:18px 20px;">
        <p style="margin:0;color:${C.ink};font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
      </div>
    </td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: NOTIF,
    replyTo: email,
    subject: `📧 ${sujet || "Contact"} — ${nom}`,
    html: enveloppe(contenu, `Message de ${nom}`),
  });
}

// ─── Email : demande de devis (INTERNE — vers le commercial) ───
export async function envoyerDevis(d) {
  if (!NOTIF) return;
  const ligne = (label, val) => val ? `<tr><td style="padding:5px 0;color:${C.inkSoft};font-size:13px;width:42%;">${label}</td><td style="padding:5px 0;color:${C.ink};font-size:13px;font-weight:600;">${val}</td></tr>` : "";
  const articles = Array.isArray(d.articles) ? d.articles : [];

  const contenu = `
    <tr><td style="padding:36px 32px;">
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Demande de devis</p>
      <h1 style="margin:0 0 20px;color:${C.ink};font-size:22px;font-weight:800;">${d.typeProjet || "Projet d'aménagement"}</h1>

      <table role="presentation" width="100%" style="background:${C.bg};border-radius:12px;margin-bottom:20px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;color:${C.ink};font-weight:700;font-size:14px;">${d.prenom} ${d.nom}${d.societe ? ` · ${d.societe}` : ""}</p>
          <p style="margin:0;color:${C.inkSoft};font-size:13px;line-height:1.7;">✉ ${d.email}${d.telephone ? `<br>☎ ${d.telephone}` : ""}</p>
        </td></tr>
      </table>

      <table role="presentation" width="100%" style="border:1px solid ${C.line};border-radius:12px;padding:6px 16px;margin-bottom:20px;">
        ${ligne("Type de projet", d.typeProjet)}
        ${ligne("Surface / nb de postes", d.surface)}
        ${ligne("Délai souhaité", d.delai)}
        ${ligne("Budget estimé", d.budget)}
      </table>

      ${articles.length > 0 ? `
      <h2 style="margin:24px 0 4px;color:${C.ink};font-size:15px;font-weight:700;">Produits sélectionnés (${articles.length})</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        ${lignesDevisHTML(articles)}
      </table>` : ""}

      ${d.message ? `<div style="background:${C.surface};border:1px solid ${C.line};border-radius:12px;padding:18px 20px;">
        <p style="margin:0 0 6px;color:${C.inkSoft};font-size:12px;font-weight:700;text-transform:uppercase;">Détails</p>
        <p style="margin:0;color:${C.ink};font-size:14px;line-height:1.7;white-space:pre-wrap;">${d.message}</p>
      </div>` : ""}
    </td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: NOTIF,
    replyTo: d.email,
    subject: `📐 Demande de devis — ${d.prenom} ${d.nom}${d.societe ? ` (${d.societe})` : ""}${articles.length ? ` · ${articles.length} produit${articles.length > 1 ? "s" : ""}` : ""}`,
    html: enveloppe(contenu, `Demande de devis de ${d.prenom} ${d.nom}`),
  });
}

// ─── Email : confirmation de devis (CLIENT — accusé de réception) ───
export async function envoyerDevisClient(d) {
  const articles = Array.isArray(d.articles) ? d.articles : [];

  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <div style="width:56px;height:56px;border-radius:50%;background:${C.tint};text-align:center;line-height:56px;margin-bottom:20px;">
        <span style="color:${C.orangeDark};font-size:26px;">📐</span>
      </div>
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Demande bien reçue</p>
      <h1 style="margin:0 0 12px;color:${C.ink};font-size:26px;font-weight:800;">Merci ${d.prenom} !</h1>
      <p style="margin:0 0 28px;color:${C.inkSoft};font-size:15px;line-height:1.6;">
        Votre demande de devis a bien été transmise à notre équipe. Nous l'étudions avec soin et revenons vers vous sous 24 à 48h ouvrées avec une proposition personnalisée.
      </p>
    </td></tr>

    ${articles.length > 0 ? `
    <tr><td style="padding:0 32px;">
      <h2 style="margin:0 0 4px;color:${C.ink};font-size:16px;font-weight:700;">Votre sélection (${articles.length})</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${lignesDevisHTML(articles)}
      </table>
    </td></tr>` : ""}

    <tr><td style="padding:28px 32px 36px;">
      <div style="background:${C.bg};border-radius:12px;padding:18px 20px;">
        <p style="margin:0 0 6px;color:${C.ink};font-weight:700;font-size:14px;">Une question en attendant ?</p>
        <p style="margin:0;color:${C.inkSoft};font-size:13.5px;line-height:1.6;">
          Contactez-nous directement au 07 81 02 06 31 ou par retour de cet email.
        </p>
      </div>
    </td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: d.email,
    subject: `Votre demande de devis est bien reçue · Côté BURO`,
    html: enveloppe(contenu, `Merci ${d.prenom}, nous revenons vers vous rapidement !`),
  });
}

// ─── Email : mise à jour du statut de commande ───
const STATUT_EMAIL = {
  en_preparation: {
    sujet: "Votre commande est en préparation",
    titre: "Votre commande est en préparation",
    message: "Bonne nouvelle ! Notre équipe prépare actuellement votre commande. Vous serez informé dès son expédition.",
    couleur: "#f0661b",
  },
  expediee: {
    sujet: "Votre commande a été expédiée",
    titre: "Votre commande est en route",
    message: "Votre commande a été expédiée. Notre équipe vous contactera pour convenir de la livraison et du montage.",
    couleur: "#f0661b",
  },
  livree: {
    sujet: "Votre commande a été livrée",
    titre: "Votre commande a été livrée",
    message: "Votre commande a bien été livrée. Nous espérons qu'elle vous donnera entière satisfaction. Merci de votre confiance !",
    couleur: "#1f7a52",
  },
  annulee: {
    sujet: "Votre commande a été annulée",
    titre: "Votre commande a été annulée",
    message: "Votre commande a été annulée. Pour toute question, n'hésitez pas à nous contacter.",
    couleur: "#5c616a",
  },
};

export async function envoyerMajStatut(commande, nouveauStatut) {
  const info = STATUT_EMAIL[nouveauStatut];
  if (!info) return;

  const c = commande;
  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <div style="width:52px;height:52px;border-radius:50%;background:${info.couleur}1a;text-align:center;line-height:52px;margin-bottom:18px;">
        <span style="color:${info.couleur};font-size:24px;">●</span>
      </div>
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Commande ${c.numero}</p>
      <h1 style="margin:0 0 12px;color:${C.ink};font-size:24px;font-weight:800;">${info.titre}</h1>
      <p style="margin:0 0 24px;color:${C.inkSoft};font-size:15px;line-height:1.6;">
        Bonjour ${c.prenom},<br>${info.message}
      </p>
      <table role="presentation" width="100%" style="background:${C.bg};border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:16px 20px;">
          <span style="color:${C.inkSoft};font-size:13px;">Numéro de commande</span>
          <div style="color:${C.ink};font-weight:800;font-size:18px;margin-top:2px;">${c.numero}</div>
        </td></tr>
      </table>
      <a href="${SITE_URL}/compte/commandes" style="display:inline-block;background:${C.orange};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:13px 26px;border-radius:999px;margin-bottom:8px;">Suivre ma commande →</a>
    </td></tr>
    <tr><td style="padding:20px 32px 36px;"></td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: c.email,
    subject: `${info.sujet} · Côté BURO`,
    html: enveloppe(contenu, `${info.titre} — ${c.numero}`),
  });
}

// ─── Email : réinitialisation de mot de passe ───
export async function envoyerReinitialisationMotDePasse({ email, prenom, token }) {
  const lien = `${SITE_URL}/reinitialiser-mot-de-passe/${token}`;
  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <div style="width:52px;height:52px;border-radius:50%;background:${C.tint};text-align:center;line-height:52px;margin-bottom:18px;">
        <span style="color:${C.orangeDark};font-size:24px;">🔒</span>
      </div>
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Réinitialisation</p>
      <h1 style="margin:0 0 12px;color:${C.ink};font-size:26px;font-weight:800;">Mot de passe oublié ?</h1>
      <p style="margin:0 0 28px;color:${C.inkSoft};font-size:15px;line-height:1.6;">
        Bonjour${prenom ? ` ${prenom}` : ""},<br>
        Vous avez demandé à réinitialiser le mot de passe de votre compte Côté BURO. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est valable 1 heure.
      </p>
      <a href="${lien}" style="display:inline-block;background:${C.orange};color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:14px 30px;border-radius:999px;margin-bottom:8px;">Choisir un nouveau mot de passe →</a>
    </td></tr>
    <tr><td style="padding:20px 32px 36px;">
      <p style="margin:0;color:${C.inkSoft};font-size:12.5px;line-height:1.6;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité — votre mot de passe actuel reste inchangé.
      </p>
    </td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Réinitialisez votre mot de passe · Côté BURO`,
    html: enveloppe(contenu, "Choisissez un nouveau mot de passe pour votre compte Côté BURO"),
  });
}


// ─── Email : envoi du devis chiffré (CLIENT — avec PDF joint) ───
export async function envoyerDevisChiffre({ devis, pdfBase64 }) {
  const d = devis;
  const lien = `${SITE_URL}/mon-devis/${d.token}`;
  const dateValidite = d.dateValidite
    ? new Date(d.dateValidite).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const lignesHtml = (d.lignes || []).map((l) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};width:64px;vertical-align:top;">
        ${l.imageUrl
          ? `<img src="${l.imageUrl}" alt="" width="56" height="56" style="display:block;border-radius:10px;object-fit:cover;border:1px solid ${C.line};">`
          : `<div style="width:56px;height:56px;border-radius:10px;background:${C.bg};border:1px solid ${C.line};"></div>`}
      </td>
      <td style="padding:14px 0 14px 14px;border-bottom:1px solid ${C.line};vertical-align:top;">
        <div style="font-weight:600;color:${C.ink};font-size:14px;">${l.designation}</div>
        ${l.config ? `<div style="color:${C.inkSoft};font-size:12px;margin-top:2px;">${l.config}</div>` : ""}
        <div style="color:${C.inkSoft};font-size:12px;margin-top:3px;">Quantité : ${l.quantite}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};text-align:right;font-weight:700;color:${C.ink};font-size:13.5px;white-space:nowrap;vertical-align:top;">
        ${euro(l.prixHT * l.quantite)}
      </td>
    </tr>
  `).join("");

  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <div style="width:56px;height:56px;border-radius:50%;background:${C.tint};text-align:center;line-height:56px;margin-bottom:20px;">
        <span style="color:${C.orangeDark};font-size:26px;">📐</span>
      </div>
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Votre devis ${d.numero}</p>
      <h1 style="margin:0 0 12px;color:${C.ink};font-size:26px;font-weight:800;">Votre proposition est prête</h1>
      <p style="margin:0 0 24px;color:${C.inkSoft};font-size:15px;line-height:1.6;">
        Bonjour ${d.prenom},<br>
        ${d.noteClient ? "" : "Suite à votre demande, voici notre proposition pour votre projet d'aménagement. Vous la trouverez détaillée ci-dessous et en pièce jointe."}
      </p>

      ${d.noteClient ? `
      <div style="background:${C.bg};border-left:3px solid ${C.orange};border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:${C.ink};font-size:14px;line-height:1.7;white-space:pre-wrap;">${d.noteClient}</p>
      </div>` : ""}

      <table role="presentation" width="100%" style="background:${C.charcoal};border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:20px 22px;">
          <span style="color:#9aa0a8;font-size:12.5px;">Montant total TTC</span>
          <div style="color:#ffffff;font-weight:800;font-size:26px;margin-top:2px;">${euro(d.totalTTC)}</div>
          ${dateValidite ? `<p style="margin:10px 0 0;color:#9aa0a8;font-size:12px;">Valable jusqu'au ${dateValidite}</p>` : ""}
        </td></tr>
      </table>

      <a href="${lien}" style="display:inline-block;background:${C.orange};color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 32px;border-radius:999px;">Voir et accepter mon devis →</a>
      <p style="margin:12px 0 0;color:${C.inkSoft};font-size:12.5px;line-height:1.6;">
        En acceptant en ligne, vous choisirez vos finitions et réglerez votre commande en toute sécurité.
      </p>
    </td></tr>

    <tr><td style="padding:28px 32px 0;">
      <h2 style="margin:0 0 4px;color:${C.ink};font-size:16px;font-weight:700;">Détail de la proposition</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${lignesHtml}
      </table>
      <table role="presentation" width="100%" style="margin-top:16px;">
        <tr><td style="color:${C.inkSoft};font-size:13.5px;padding:3px 0;">Total HT</td><td style="text-align:right;color:${C.inkSoft};font-size:13.5px;">${euro(d.totalHT)}</td></tr>
        <tr><td style="color:${C.inkSoft};font-size:13.5px;padding:3px 0;">TVA (20 %)</td><td style="text-align:right;color:${C.inkSoft};font-size:13.5px;">${euro(d.totalTVA)}</td></tr>
        <tr><td style="padding-top:12px;border-top:2px solid ${C.line};color:${C.ink};font-weight:800;font-size:17px;">Total TTC</td><td style="padding-top:12px;border-top:2px solid ${C.line};text-align:right;color:${C.orange};font-weight:800;font-size:17px;">${euro(d.totalTTC)}</td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:28px 32px 36px;">
      <div style="background:${C.bg};border-radius:12px;padding:18px 20px;">
        <p style="margin:0 0 6px;color:${C.ink};font-weight:700;font-size:14px;">Une question sur ce devis ?</p>
        <p style="margin:0;color:${C.inkSoft};font-size:13.5px;line-height:1.6;">
          Contactez-nous au 07 81 02 06 31 ou par retour de cet email — nous ajusterons la proposition avec vous.
        </p>
      </div>
    </td></tr>
  `;

  // Resend NE LÈVE PAS d'exception en cas d'échec : il renvoie { data, error }.
  // Sans ce test, un envoi raté passe pour un succès.
  const res = await resend.emails.send({
    from: FROM,
    to: d.email,
    subject: `Votre devis ${d.numero} · Côté BURO`,
    html: enveloppe(contenu, `Votre proposition pour ${euro(d.totalTTC)} — valable ${dateValidite ? `jusqu'au ${dateValidite}` : "30 jours"}`),
    attachments: [
      {
        filename: `Devis-${d.numero}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  if (res?.error) {
    throw new Error(res.error.message || JSON.stringify(res.error));
  }
  return res;
}