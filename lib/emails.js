import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Côté BURO <onboarding@resend.dev>";
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

function lignesHTML(lignes) {
  return lignes.map((l) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};">
        <div style="font-weight:600;color:${C.ink};font-size:14px;">${l.designation}</div>
        ${l.finition ? `<div style="color:${C.inkSoft};font-size:12px;margin-top:3px;">${l.finition}</div>` : ""}
        <div style="color:${C.inkSoft};font-size:12px;margin-top:3px;">Quantité : ${l.quantite}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid ${C.line};text-align:right;font-weight:700;color:${C.ink};font-size:14px;white-space:nowrap;vertical-align:top;">
        ${euro(l.prixHT * l.quantite)}
      </td>
    </tr>
  `).join("");
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
              TECH'INDUS — Bât D, Porte 8, 645 rue Mayor de Montricher, 13290 Aix-en-Provence<br>
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
  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <div style="width:56px;height:56px;border-radius:50%;background:#e8f6f0;text-align:center;line-height:56px;margin-bottom:20px;">
        <span style="color:#1f7a52;font-size:28px;">✓</span>
      </div>
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Commande confirmée</p>
      <h1 style="margin:0 0 12px;color:${C.ink};font-size:26px;font-weight:800;">Merci pour votre commande !</h1>
      <p style="margin:0 0 24px;color:${C.inkSoft};font-size:15px;line-height:1.6;">
        Bonjour ${c.prenom},<br>
        Nous avons bien reçu votre commande et votre paiement. Notre équipe la prépare et vous contactera pour organiser la livraison et le montage.
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
        <tr><td style="padding-top:12px;border-top:2px solid ${C.line};color:${C.ink};font-weight:800;font-size:17px;">Total TTC</td><td style="padding-top:12px;border-top:2px solid ${C.line};text-align:right;color:${C.orange};font-weight:800;font-size:17px;">${euro(c.totalTTC)}</td></tr>
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
  const contenu = `
    <tr><td style="padding:36px 32px 0;">
      <p style="margin:0 0 4px;color:${C.orange};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Nouvelle commande</p>
      <h1 style="margin:0 0 20px;color:${C.ink};font-size:24px;font-weight:800;">${c.numero} · ${euro(c.totalTTC)}</h1>
      <table role="presentation" width="100%" style="background:${C.bg};border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:${C.ink};font-weight:700;font-size:14px;">${c.prenom} ${c.nom}${c.societe ? ` · ${c.societe}` : ""}</p>
          <p style="margin:0;color:${C.inkSoft};font-size:13px;line-height:1.7;">
            ✉ ${c.email}${c.telephone ? `<br>☎ ${c.telephone}` : ""}<br>
            📍 ${c.adresse}${c.complement ? `, ${c.complement}` : ""}, ${c.codePostal} ${c.ville}
          </p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 36px;">
      <h2 style="margin:0 0 4px;color:${C.ink};font-size:15px;font-weight:700;">Articles</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${lignesHTML(c.lignes)}
      </table>
      <table role="presentation" width="100%" style="margin-top:14px;">
        <tr><td style="color:${C.ink};font-weight:800;font-size:16px;">Total TTC</td><td style="text-align:right;color:${C.orange};font-weight:800;font-size:16px;">${euro(c.totalTTC)}</td></tr>
      </table>
    </td></tr>
  `;
  return resend.emails.send({
    from: FROM,
    to: NOTIF,
    subject: `🛎 Nouvelle commande ${c.numero} — ${euro(c.totalTTC)}`,
    html: enveloppe(contenu, `Nouvelle commande de ${c.prenom} ${c.nom} — ${euro(c.totalTTC)}`),
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

// ─── Email : demande de devis ───
export async function envoyerDevis(d) {
  if (!NOTIF) return;
  const ligne = (label, val) => val ? `<tr><td style="padding:5px 0;color:${C.inkSoft};font-size:13px;width:42%;">${label}</td><td style="padding:5px 0;color:${C.ink};font-size:13px;font-weight:600;">${val}</td></tr>` : "";
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
    subject: `📐 Demande de devis — ${d.prenom} ${d.nom}${d.societe ? ` (${d.societe})` : ""}`,
    html: enveloppe(contenu, `Demande de devis de ${d.prenom} ${d.nom}`),
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
  if (!info) return; // statut sans notification (en_attente, payee)

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