"use client";
import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";

// Saisie du code promo, dans le récapitulatif du panier et de la commande.
//
// La vérification est faite par le serveur (/api/code-promo) : le navigateur
// ne décide jamais si un code est valable. Une fois retenu, le code reste dans
// le panier et sa remise suit les quantités, mais le paiement le revérifie —
// ce qui est affiché ici n'engage rien.
export function ChampCodePromo() {
  const { codePromo, setCodePromo, retirerCode, sousTotalHT, remiseCode, minimumAtteint } = useCart();
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  // Replié par défaut : la majorité des clients n'ont pas de code, et un champ
  // vide en plein milieu du récapitulatif leur fait croire qu'ils en ratent un.
  const [ouvert, setOuvert] = useState(false);

  const appliquer = async () => {
    const code = saisie.trim();
    if (!code || envoi) return;
    setErreur("");
    setEnvoi(true);
    try {
      const res = await fetch("/api/code-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, sousTotalHT }),
      });
      const data = await res.json();
      if (data.error) { setErreur(data.error); return; }
      setCodePromo({
        code: data.code,
        nom: data.nom,
        typeRemise: data.typeRemise,
        valeur: data.valeur,
        minimumHT: data.minimumHT,
      });
      setSaisie("");
      setOuvert(false);
    } catch {
      setErreur("Vérification impossible pour le moment.");
    } finally {
      setEnvoi(false);
    }
  };

  // Code retenu : on montre ce qu'il retire, et de quoi le retirer.
  if (codePromo) {
    return (
      <div className="rounded-xl border border-[#cfe6da] bg-[#f2faf6] px-3.5 py-2.5 mt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-[#1f7a52] truncate">
              Code {codePromo.code}
              <span className="font-semibold text-[#2f8a62]">
                {" "}· {codePromo.typeRemise === "montant" ? `−${codePromo.valeur} €` : `−${codePromo.valeur} %`}
              </span>
            </p>
            {!minimumAtteint ? (
              <p className="text-[11px] text-[#b45528] mt-0.5 leading-snug">
                Valable à partir de {codePromo.minimumHT.toLocaleString("fr-FR")} € HT — pas encore atteint.
              </p>
            ) : (
              <p className="text-[11px] text-[#2f8a62] mt-0.5">
                {remiseCode.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € déduits
              </p>
            )}
          </div>
          <button type="button" onClick={retirerCode} aria-label="Retirer le code promo"
            className="shrink-0 grid place-items-center h-7 w-7 rounded-lg text-[#1f7a52]/70 hover:text-[#1f7a52] hover:bg-white transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)}
        className="text-left text-[12.5px] font-semibold text-orange hover:text-orange-dark transition mt-1">
        J&apos;ai un code promo
      </button>
    );
  }

  return (
    <div className="mt-1">
      <div className="flex gap-2">
        <input
          value={saisie}
          onChange={(e) => { setSaisie(e.target.value.toUpperCase()); setErreur(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); appliquer(); } }}
          placeholder="CODE PROMO"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          aria-label="Code promo"
          className="flex-1 min-w-0 rounded-xl border border-line bg-surface-2/50 px-3.5 py-2.5 text-[13px] font-semibold tracking-wide uppercase outline-none focus:border-orange transition"
        />
        <button type="button" onClick={appliquer} disabled={envoi || !saisie.trim()}
          className="shrink-0 rounded-xl bg-ink text-white font-semibold px-4 text-[12.5px] disabled:opacity-40 hover:bg-orange transition">
          {envoi ? "…" : "Appliquer"}
        </button>
      </div>
      {erreur && <p className="text-[11.5px] text-[#b45528] mt-1.5 leading-snug">{erreur}</p>}
    </div>
  );
}
