import DevisForm from "@/components/DevisForm";
import DevisPanier from "@/components/DevisPanier";

export const metadata = {
  title: "Demander un devis",
  description: "Demandez un devis gratuit pour l'aménagement de vos bureaux à Aix-en-Provence. Conseil, mobilier, livraison et montage sur mesure.",
  alternates: { canonical: "/devis" },
};

const ETAPES = [
  { titre: "Vous décrivez votre projet", texte: "Type d'aménagement, surface, délai et budget : quelques informations suffisent pour démarrer." },
  { titre: "Nous étudions votre besoin", texte: "Notre équipe analyse votre demande et prépare une proposition adaptée à votre espace." },
  { titre: "Vous recevez votre devis", texte: "Un devis clair et détaillé, avec conseil, mobilier, livraison et montage." },
];

const REASSURANCE = [
  "Devis gratuit et sans engagement",
  "Conseil personnalisé par nos experts",
  "Livraison et montage inclus sur devis",
  "Garantie 7 ans sur le mobilier",
];

export default function DevisPage() {
  return (
    <main>
      {/* En-tête */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pt-7 sm:pt-14 pb-5 sm:pb-10">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-orange">Devis gratuit</p>
        <h1 className="font-display font-bold text-[28px] sm:text-5xl lg:text-6xl mt-2 sm:mt-3 leading-tight">Demandez votre devis</h1>
        <p className="text-ink-soft text-[13.5px] sm:text-lg mt-3 sm:mt-5 max-w-[600px] leading-relaxed">
          De la sélection du mobilier à la livraison et au montage, nous vous accompagnons sur l&apos;ensemble de votre projet d&apos;aménagement. Recevez une proposition sur mesure, sans engagement.
        </p>
      </section>

      {/* Panier de devis (si présent) + Formulaire + étapes */}
      <section className="mx-auto max-w-[1400px] px-5 sm:px-7 pb-12 sm:pb-20">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 lg:gap-6 items-start">
          {/* Réassurance remontée en premier sur mobile : c'est ce qui donne
              envie de remplir le formulaire, pas ce qu'on lit après. */}
          <div className="lg:hidden rounded-2xl bg-orange-tint p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {REASSURANCE.map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-orange text-white shrink-0 mt-0.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  <span className="text-[11.5px] font-medium text-orange-dark leading-snug">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
            <DevisPanier />
            <DevisForm />
          </div>

          <div className="flex flex-col gap-4 sm:gap-5 lg:sticky lg:top-[180px]">
            {/* Comment ça marche */}
            <div className="rounded-2xl lg:rounded-[24px] border border-line bg-surface p-4 sm:p-7">
              <h2 className="font-display font-bold text-[15.5px] sm:text-xl mb-4 sm:mb-5">Comment ça marche</h2>
              <div className="flex flex-col gap-4 sm:gap-5">
                {ETAPES.map((e, i) => (
                  <div key={i} className="flex gap-3 sm:gap-4">
                    <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-orange text-white font-display font-bold text-[13px] sm:text-sm shrink-0">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-ink text-[13.5px] sm:text-base leading-snug">{e.titre}</p>
                      <p className="text-[12.5px] sm:text-[13.5px] text-ink-soft mt-1 leading-relaxed">{e.texte}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Réassurance — desktop uniquement, remontée en haut sur mobile */}
            <div className="hidden lg:block rounded-[24px] bg-orange-tint p-7">
              <div className="flex flex-col gap-3">
                {REASSURANCE.map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-orange text-white shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    <span className="text-[14px] font-medium text-orange-dark">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}