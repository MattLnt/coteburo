import Link from "next/link";
import Image from "next/image";
import { formatTel } from "@/lib/reglages";

export default function Footer({ reglages = {} }) {
  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");
  const email = reglages.email || "coteburo@orange.fr";
  const adresse = reglages.adresse || "645 rue Mayor de Montricher, 13290 Aix-en-Provence";
  const horaires = reglages.horaires || "Conseil & commande du lundi au vendredi · 9h–18h";

  const socials = [
    reglages.instagram && { label: "Instagram", href: reglages.instagram, stroke: true, paths: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></> },
    reglages.facebook && { label: "Facebook", href: reglages.facebook, stroke: false, paths: <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z" /> },
    reglages.linkedin && { label: "LinkedIn", href: reglages.linkedin, stroke: false, paths: <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" /> },
  ].filter(Boolean);

  return (
    <footer className="bg-charcoal text-[#aab0b8] mt-12 sm:mt-20">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-7 py-8 sm:py-14">
        <div className="grid gap-6 sm:gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Image src="/logo-coteburo-blanc.svg" alt="Côté BURO" width={160} height={31} className="mb-3 sm:mb-4 w-[150px] sm:w-[160px] h-auto" />
            <p className="text-[12.5px] sm:text-sm leading-[1.75] sm:leading-7">Spécialiste de l&apos;aménagement de petits, moyens et grands espaces à Aix-en-Provence, avec une longue expérience dans le mobilier de bureau professionnel.</p>
            {socials.length > 0 && (
              <div className="flex gap-2.5 mt-4 sm:mt-5">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid place-items-center h-[34px] w-[34px] rounded-full border border-white/20 text-white hover:bg-orange hover:border-orange transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={s.stroke ? "none" : "currentColor"} stroke={s.stroke ? "currentColor" : "none"} strokeWidth="2">{s.paths}</svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Les deux colonnes de liens côte à côte sur mobile : onze liens
              empilés en pleine largeur faisaient une très longue liste. */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:contents">
            <FooterCol title="Le site" links={[
              ["Notre société", "/a-propos"],
              ["Services", "/services"],
              ["Réalisations", "/realisations"],
              ["Conseils", "/conseils"],
              ["Suivi de commande", "/suivi"],
              ["Contact", "/contact"],
            ]} />

            <FooterCol title="Catalogue" links={[
              ["Sièges", "/catalogue?categorie=sieges"],
              ["Bureaux", "/catalogue?categorie=bureaux"],
              ["Tables", "/catalogue?categorie=tables"],
              ["Rangements", "/catalogue?categorie=rangements"],
              ["Acoustique", "/catalogue?categorie=acoustique"],
            ]} />
          </div>

          {/* Contact — carte avec boutons d'action sur mobile : un numéro en
              simple lien texte se tape mal au doigt. */}
          <div className="rounded-2xl bg-white/[0.04] p-4 sm:bg-transparent sm:p-0 sm:rounded-none">
            <h4 className="text-white font-display text-[14px] sm:text-[15px] mb-3 sm:mb-3.5">
              <span className="sm:hidden">Nous trouver</span>
              <span className="hidden sm:inline">Côté BURO</span>
            </h4>

            <div className="flex gap-2.5 sm:block">
              <span className="sm:hidden text-orange shrink-0 mt-0.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </span>
              <p className="text-[12.5px] sm:text-sm leading-[1.6] sm:leading-7">{adresse}</p>
            </div>

            {/* Boutons sur mobile, liens texte sur desktop */}
            <div className="flex gap-2 mt-3 sm:hidden">
              <a href={telLink} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-orange text-white text-[12.5px] font-semibold">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
                Appeler
              </a>
              <a href={`mailto:${email}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-white/20 text-white text-[12.5px] font-semibold">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
                Écrire
              </a>
            </div>

            <p className="hidden sm:block text-sm leading-7 mt-3">
              <a href={telLink} className="text-white font-semibold hover:text-orange transition">{tel}</a><br />
              <a href={`mailto:${email}`} className="hover:text-orange transition">{email}</a>
            </p>
          </div>
        </div>

        {/* Bas de page — horaires, liens légaux, puis copyright.
            Tout sur une ligne, c'était un bloc de texte compact illisible. */}
        <div className="border-t border-white/10 mt-7 sm:mt-10 pt-5 sm:pt-6 flex flex-col sm:flex-row sm:justify-between gap-3 text-[11.5px] sm:text-[13px]">
          <div className="flex flex-col sm:flex-row-reverse sm:items-center gap-2.5 sm:gap-3 sm:order-2">
            <span className="leading-[1.6]">{horaires}</span>
            <span className="hidden sm:inline text-white/20">·</span>
            <Link href="/admin/login" className="hidden sm:inline text-white/40 hover:text-orange transition" title="Espace administration">Espace pro</Link>
          </div>

          <div className="sm:order-1">
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <Link href="/mentions-legales" className="hover:text-orange transition">Mentions légales</Link>
              <span className="text-white/30">·</span>
              <Link href="/cgv" className="hover:text-orange transition">CGV</Link>
              <span className="text-white/30">·</span>
              <Link href="/confidentialite" className="hover:text-orange transition">Confidentialité</Link>
              <span className="sm:hidden text-white/30">·</span>
              <Link href="/admin/login" className="sm:hidden text-white/40 hover:text-orange transition">Espace pro</Link>
            </span>
            <p className="text-[11px] text-white/35 mt-3 sm:mt-1.5">© {new Date().getFullYear()} Côté BURO — Tous droits réservés</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-white font-display text-[14px] sm:text-[15px] mb-3 sm:mb-3.5">{title}</h4>
      <ul className="space-y-2 sm:space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}><Link href={href} className="text-[12.5px] sm:text-sm hover:text-orange transition">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}