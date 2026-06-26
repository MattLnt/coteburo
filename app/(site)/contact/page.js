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

  // Adresse sur une ligne pour l'URL Google Maps
  const adresseMap = encodeURIComponent(adresse.replace(/\n/g, " "));

  return (
    <main>
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-14 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">Contact</p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mt-3">Parlons de votre projet</h1>
        <p className="text-ink-soft text-lg mt-5 max-w-[560px]">
          Un poste isolé ou plusieurs centaines de m² : décrivez-nous votre besoin, on vous recontacte rapidement avec des conseils et un devis.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-20">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10">
          <div>
            <div className="grid sm:grid-cols-2 gap-4">
              {INFOS.map((it) => (
                <div key={it.label} className="rounded-2xl border border-line bg-surface p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-tint text-orange-dark mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
                  </span>
                  <p className="text-[13px] font-semibold text-ink-soft">{it.label}</p>
                  {it.href ? (
                    <a href={it.href} className="block font-display font-bold text-[15px] mt-0.5 hover:text-orange transition whitespace-pre-line">{it.value}</a>
                  ) : (
                    <p className="font-display font-bold text-[15px] mt-0.5 whitespace-pre-line leading-snug">{it.value}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl overflow-hidden border border-line aspect-[16/10]">
              <iframe title="Plan d'accès Côté BURO" src={`https://www.google.com/maps?q=${adresseMap}&output=embed`} className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </main>
  );
}