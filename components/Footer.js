import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-[#aab0b8] mt-20">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-7 py-14">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Image src="/logo-coteburo-blanc.svg" alt="Côté BURO" width={160} height={31} className="mb-4" />
            <p className="text-sm leading-7">Spécialiste de l&apos;aménagement de petits, moyens et grands espaces à Aix-en-Provence, avec une longue expérience dans le mobilier de bureau professionnel.</p>
            <div className="flex gap-2.5 mt-5">
              <Social label="Facebook"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z" /></Social>
              <Social label="Instagram" stroke><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></Social>
              <Social label="WhatsApp"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.9.9-2.8-.2-.3A8 8 0 1 1 12 20z" /></Social>
            </div>
          </div>

          <FooterCol title="Le site" links={[
            ["Notre société", "/a-propos"],
            ["Services", "/services"],
            ["Réalisations", "/realisations"],
            ["Conseils", "/conseils"],
            ["Contact", "/contact"],
          ]} />

          <FooterCol title="Catalogue" links={[
            ["Sièges & fauteuils", "/catalogue/sieges"],
            ["Bureaux", "/catalogue/bureaux"],
            ["Tables de réunion", "/catalogue/tables"],
            ["Rangements", "/catalogue/rangements"],
            ["Acoustique", "/catalogue/acoustique"],
          ]} />

          <div>
            <h4 className="text-white font-display text-[15px] mb-3.5">Côté BURO</h4>
            <p className="text-sm leading-7"><span className="text-white font-semibold">TECH&apos;INDUS</span> — Bât D, Porte 8<br />645 rue Mayor de Montricher<br />13290 Aix-en-Provence</p>
            <p className="text-sm leading-7 mt-3"><a href="tel:0620391390" className="text-white font-semibold hover:text-orange transition">06 20 39 13 90</a><br /><a href="mailto:coteburo@orange.fr" className="hover:text-orange transition">coteburo@orange.fr</a></p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-[13px]">
          <span>© {new Date().getFullYear()} Côté BURO — Tous droits réservés · Mentions légales · CGV</span>
          <span>Conseil & commande du lundi au vendredi · 9h–18h</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-white font-display text-[15px] mb-3.5">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}><Link href={href} className="text-sm hover:text-orange transition">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

function Social({ label, children, stroke }) {
  return (
    <a href="#" aria-label={label} className="grid place-items-center h-[34px] w-[34px] rounded-full border border-white/20 text-white hover:bg-orange hover:border-orange transition">
      <svg width="16" height="16" viewBox="0 0 24 24" fill={stroke ? "none" : "currentColor"} stroke={stroke ? "currentColor" : "none"} strokeWidth="2">{children}</svg>
    </a>
  );
}