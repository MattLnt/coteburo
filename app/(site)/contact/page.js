import ContactForm from "@/components/ContactForm";
import { getReglagesPublic, formatTel } from "@/lib/reglages";

export const metadata = {
  title: "Contact",
  description:
    "Contactez Côté BURO à Aix-en-Provence : conseil, devis et aménagement de bureaux. Showroom TECH'INDUS, 645 rue Mayor de Montricher.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const reglages = await getReglagesPublic();

  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");
  const email = reglages.email || "coteburo@orange.fr";
  const adresse = reglages.adresse || "TECH'INDUS — Bât D, Porte 8\n645 rue Mayor de Montricher\n13290 Aix-en-Provence";
  const horaires = reglages.horaires || "Du lundi au vendredi\n9h – 18h";

  const INFOS = [
    { label: "Showroom", value: adresse, icon: (<><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>) },
    { label: "Téléphone", value: tel, href: telLink, icon: (<path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2z" />) },
    { label: "Email", value: email, href: `mailto:${email}`, icon: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>) },
    { label: "Horaires", value: horaires, icon: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  ];

  const adresseMap = encodeURIComponent(adresse.replace(/\n/g, " "));

  return (
    <main>
      {/* En-tête */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-7 sm:pt-14 pb-5 sm:pb-10">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Contact</p>
        <h1 className="font-display font-bold text-[29px] sm:text-5xl lg:text-6xl mt-2 sm:mt-3 leading-tight">Parlons de votre projet</h1>
        <p className="text-ink-soft text-[13.5px] sm:text-lg mt-3 sm:mt-5 max-w-[560px] leading-relaxed">
          Un poste isolé ou plusieurs centaines de m² : décrivez-nous votre besoin, on vous recontacte rapidement avec des conseils et un devis.
        </p>
      </section>

      {/* Appel direct — sur mobile, c'est le geste le plus courant depuis
          cette page, il mérite mieux qu'une tuile parmi quatre. */}
      <section className="sm:hidden mx-auto max-w-[1400px] px-5 pb-4">
        <div className="flex gap-2">
          <a href={telLink} className="flex-1 flex items-center justify-center gap-2 rounded-full bg-orange text-white font-semibold py-3.5 text-[13.5px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2z" /></svg>
            Appeler
          </a>
          <a href={`mailto:${email}`} className="flex-1 flex items-center justify-center gap-2 rounded-full border border-line bg-surface font-semibold text-ink py-3.5 text-[13.5px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            Écrire
          </a>
        </div>
      </section>

      {/* Bandeau infos */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-4 sm:pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {INFOS.map((it) => (
            <div key={it.label} className="rounded-2xl border border-line bg-surface p-3.5 sm:p-5">
              <span className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-orange-tint text-orange-dark mb-2.5 sm:mb-3">
                <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
              </span>
              <p className="text-[10.5px] sm:text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{it.label}</p>
              {it.href ? (
                <a href={it.href} className="block font-display font-bold text-[12.5px] sm:text-[15px] mt-1 hover:text-orange transition whitespace-pre-line leading-snug break-words">{it.value}</a>
              ) : (
                <p className="font-display font-bold text-[12.5px] sm:text-[15px] mt-1 whitespace-pre-line leading-snug break-words">{it.value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Formulaire (gauche) + carte (droite) */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-12 sm:pb-20">
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 sm:gap-6 items-start">
          <ContactForm />

          {/* La carte passe après le formulaire sur mobile : 560px de plan
              avant d'atteindre les champs, personne ne scrolle jusque-là. */}
          <div className="rounded-[18px] sm:rounded-[24px] overflow-hidden border border-line lg:sticky lg:top-24">
            <iframe
              title="Plan d'accès Côté BURO"
              src={`https://www.google.com/maps?q=${adresseMap}&output=embed`}
              className="w-full h-[240px] sm:h-[400px] lg:h-[560px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>
    </main>
  );
}