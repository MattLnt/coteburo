import Link from "next/link";
import { getReglagesPublic, formatTel } from "@/lib/reglages";

export default async function CtaBand() {
  const reglages = await getReglagesPublic();
  const tel = formatTel(reglages.telephone) || "06 20 39 13 90";
  const telLink = "tel:" + tel.replace(/\s/g, "");

  return (
    <section className="mx-auto max-w-[1400px] px-5 sm:px-7 w-full">
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-3xl bg-charcoal px-5 py-10 sm:px-12 sm:py-16 text-center">
        <div className="absolute w-[520px] h-[520px] rounded-full -right-[160px] -top-[220px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.45),transparent_65%)]" />
        <div className="absolute w-[420px] h-[420px] rounded-full -left-[140px] -bottom-[200px] pointer-events-none bg-[radial-gradient(circle,rgba(240,102,27,0.25),transparent_65%)]" />

        <div className="relative max-w-[620px] mx-auto">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Vous avez un projet ?</p>
          <h2 className="font-display font-bold text-white text-[27px] sm:text-4xl lg:text-[44px] leading-[1.1] sm:leading-[1.05] mt-2.5 sm:mt-3">Parlons-en autour d&apos;un café.</h2>
          <p className="text-[#c4c9d0] text-[13px] sm:text-[15px] mt-3 sm:mt-4 leading-relaxed">Nos experts vous accompagnent sur l&apos;aménagement de vos bureaux — d&apos;un poste isolé à plusieurs centaines de m².</p>
          {/* Boutons en pleine largeur empilés sur mobile : le numéro de
              téléphone rend le second bouton large, les deux ne tenaient pas. */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2.5 sm:gap-3 mt-6 sm:mt-8">
            <Link href="/contact" className="bg-orange text-white font-semibold rounded-full px-6 sm:px-7 py-3 sm:py-3.5 text-[13.5px] sm:text-base hover:bg-orange-dark transition">Demander un devis →</Link>
            <a href={telLink} className="text-white font-semibold rounded-full px-6 sm:px-7 py-3 sm:py-3.5 text-[13.5px] sm:text-base border border-white/25 hover:bg-white/10 transition">{tel}</a>
          </div>
        </div>
      </div>
    </section>
  );
}