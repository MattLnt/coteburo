import Link from "next/link";
import Image from "next/image";
import { formatTel } from "@/lib/reglages";

export default function Footer({ reglages = {} }) {
  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");
  const email = reglages.email || "coteburo@orange.fr";
  const adresse = reglages.adresse || "TECH'INDUS — Bât D, Porte 8, 645 rue Mayor de Montricher, 13290 Aix-en-Provence";
  const horaires = reglages.horaires || "Conseil & commande du lundi au vendredi · 9h–18h";

  const socials = [
    reglages.instagram && { label: "Instagram", href: reglages.instagram, stroke: true, paths: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></> },
    reglages.facebook && { label: "Facebook", href: reglages.facebook, stroke: false, paths: <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z" /> },
    reglages.linkedin && { label: "LinkedIn", href: reglages.linkedin, stroke: false, paths: <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" /> },
  ].filter(Boolean);

  return (
    <footer className="bg-charcoal text-[#aab0b8] mt-20">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-14">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Image src="/logo-coteburo-blanc.svg" alt="Côté BURO" width={160} height={31} className="mb-4" />
            <p className="text-sm leading-7">Spécialiste de l&apos;aménagement de petits, moyens et grands espaces à Aix-en-Provence, avec une longue expérience dans le mobilier de bureau professionnel.</p>
            {socials.length > 0 && (
              <div className="flex gap-2.5 mt-5">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid place-items-center h-[34px] w-[34px] rounded-full border border-white/20 text-white hover:bg-orange hover:border-orange transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={s.stroke ? "none" : "currentColor"} stroke={s.stroke ? "currentColor" : "none"} strokeWidth="2">{s.paths}</svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          <FooterCol title="Le site" links={[
            ["Notre société", "/a-propos"],
            ["Services", "/services"],
            ["Réalisations", "/realisations"],
            ["Conseils", "/conseils"],
            ["Contact", "/contact"],
          ]} />

          <FooterCol title="Catalogue" links={[
            ["Sièges", "/catalogue/sieges"],
            ["Bureaux", "/catalogue/bureaux"],
            ["Tables", "/catalogue/tables"],
            ["Rangements", "/catalogue/rangements"],
            ["Acoustique", "/catalogue/acoustique"],
          ]} />

          <div>
            <h4 className="text-white font-display text-[15px] mb-3.5">Côté BURO</h4>
            <p className="text-sm leading-7">{adresse}</p>
            <p className="text-sm leading-7 mt-3"><a href={telLink} className="text-white font-semibold hover:text-orange transition">{tel}</a><br /><a href={`mailto:${email}`} className="hover:text-orange transition">{email}</a></p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-[13px]">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>© {new Date().getFullYear()} Côté BURO — Tous droits réservés</span>
            <span className="text-white/30">·</span>
            <Link href="/mentions-legales" className="hover:text-orange transition">Mentions légales</Link>
            <span className="text-white/30">·</span>
            <Link href="/cgv" className="hover:text-orange transition">CGV</Link>
            <span className="text-white/30">·</span>
            <Link href="/confidentialite" className="hover:text-orange transition">Confidentialité</Link>
          </span>
          <span className="flex items-center gap-3">
            {horaires}
            <span className="text-white/20">·</span>
            <Link href="/admin/login" className="text-white/40 hover:text-orange transition" title="Espace administration">Espace pro</Link>
          </span>
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