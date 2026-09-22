"use client";

// Poser des photos sur une fiche, depuis n'importe où.
//
// CE QUE ÇA RÉSOUT
//   L'onglet Visuels savait afficher, réordonner et supprimer — jamais
//   ajouter. Une photo ne pouvait entrer que par un dépôt _A-TRIER de la
//   médiathèque, donc par le disque du poste qui la porte. Une image reçue
//   par courriel d'un fournisseur n'avait aucun chemin, et il fallait un
//   script pour la poser.
//
// CE QU'IL FAIT
//   Glisser-déposer ou sélection de fichiers, compression au-delà de trois
//   mégaoctets, envoi à Cloudinary, puis rattachement à la fiche. Le même
//   chemin d'envoi que la galerie des produits et que l'éditeur de finitions
//   — components/dashboard/televerser — pour qu'un réglage ne vaille pas
//   ici et pas ailleurs.
//
// CE QU'IL NE FAIT PAS
//   Détourer. La galerie historique sait le faire ; ici on pose ce qu'on a.
//   Un envoi qui échoue laisse les autres passer et dit lequel a manqué.

import { useState, useRef } from "react";
import { televerserImage, cloudinaryPret } from "@/components/dashboard/televerser";
import { Icon } from "@/components/dashboard/Icon";

export function AjouterVisuels({ vitrineId, ajouter }) {
  const [enCours, setEnCours] = useState(null);   // { fait, total }
  const [erreurs, setErreurs] = useState([]);
  const [bilan, setBilan] = useState("");
  const [survol, setSurvol] = useState(false);
  const inputRef = useRef(null);

  const pret = cloudinaryPret();

  async function envoyer(fichiers) {
    const images = [...fichiers].filter((f) => f.type?.startsWith("image/"));
    if (!images.length) {
      setErreurs(["Aucune image dans ce qui a été déposé."]);
      return;
    }
    setErreurs([]);
    setBilan("");
    setEnCours({ fait: 0, total: images.length });

    const urls = [];
    const rates = [];
    for (const [i, f] of images.entries()) {
      try {
        urls.push(await televerserImage(f));
      } catch (e) {
        rates.push(`${f.name} — ${e.message}`);
      }
      setEnCours({ fait: i + 1, total: images.length });
    }

    setEnCours(null);
    setErreurs(rates);

    if (!urls.length) return;
    const r = await ajouter(vitrineId, urls);
    if (!r?.ok) {
      setErreurs((e) => [...e, r?.error || "Le rattachement a échoué."]);
      return;
    }
    setBilan(r.doublons
      ? `${r.ajoutes} image(s) ajoutée(s), ${r.doublons} déjà présente(s).`
      : `${r.ajoutes} image(s) ajoutée(s).`);
  }

  if (!pret) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-5 text-[13px] text-ink-soft">
        L&apos;envoi d&apos;images n&apos;est pas configuré sur cet environnement.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          if (!enCours) envoyer(e.dataTransfer.files);
        }}
        onClick={() => !enCours && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
          survol ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-ink-soft"
        } ${enCours ? "pointer-events-none opacity-60" : ""}`}
      >
        <Icon name="image" className="h-6 w-6 text-ink-soft" />
        {enCours ? (
          <p className="text-[13.5px] font-medium">
            Envoi… {enCours.fait} / {enCours.total}
          </p>
        ) : (
          <>
            <p className="text-[13.5px] font-medium">
              Glissez des photos ici, ou cliquez pour les choisir
            </p>
            <p className="text-[12px] text-ink-soft">
              Plusieurs à la fois. Au-delà de 3 Mo, elles sont compressées avant l&apos;envoi.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            envoyer(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {bilan && (
        <p className="rounded-xl bg-surface-2 px-4 py-2.5 text-[12.5px] text-ink-soft">{bilan}</p>
      )}
      {erreurs.map((e) => (
        <p key={e} className="rounded-xl bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">{e}</p>
      ))}
    </div>
  );
}
