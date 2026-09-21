"use client";

// L'éditeur d'un groupe de finitions.
//
// CE QU'IL REMPLACE
//   Une liste de lignes où la teinte était un champ de texte attendant un
//   code hexadécimal. On ne voyait pas les couleurs, on ne pouvait pas en
//   choisir une, pas envoyer une image, pas prendre une teinte dans la
//   bibliothèque. Dix-sept teintes s'y lisaient comme un tableur.
//
// CE QU'IL FAIT
//   Un nuancier se juge à l'œil : les teintes sont donc une grille de
//   pastilles, à la taille où l'on distingue un chêne d'un hêtre. On clique
//   une pastille, son panneau s'ouvre dessous — couleur, image, lien vers la
//   bibliothèque, jeton de référence, ordre.
//
// LA BIBLIOTHÈQUE D'ABORD
//   Une teinte liée à un modèle hérite sa couleur et sa pastille. C'est la
//   voie normale : corriger le nuancier corrige toutes les fiches. La
//   couleur écrite à la main est une surcharge, et l'écran le dit.

import { useState, useTransition, useMemo, useRef } from "react";
import {
  majChoix, supprimerChoix, creerValeur, majValeur, supprimerValeur,
  lierAuModele, apparierNuancier, ajouterDuNuancier, reordonnerValeurs,
} from "./actions";
import { televerserImage, cloudinaryPret } from "@/components/dashboard/televerser";
import Selecteur from "@/components/dashboard/Selecteur";

const RENDUS = [
  ["pastilles", "Pastilles de couleur"],
  ["nuancier", "Nuancier (grande pastille)"],
  ["vignettes", "Vignettes d'image"],
  ["boutons", "Boutons de texte"],
  ["liste", "Liste déroulante"],
];

/** Le carré d'une teinte : son image si elle en a une, sa couleur sinon. */
function Pastille({ couleur, imageUrl, taille = 56, className = "" }) {
  return (
    <span
      className={`block shrink-0 rounded-lg border border-line bg-cover bg-center ${className}`}
      style={{
        width: taille, height: taille,
        ...(imageUrl
          ? { backgroundImage: `url(${imageUrl})` }
          : couleur
            ? { background: couleur }
            : {
              // Ni couleur ni image : un damier, pour que le vide se voie.
              backgroundImage:
                "linear-gradient(45deg,#e8e3da 25%,transparent 25%,transparent 75%,#e8e3da 75%),"
                + "linear-gradient(45deg,#e8e3da 25%,transparent 25%,transparent 75%,#e8e3da 75%)",
              backgroundSize: "10px 10px",
              backgroundPosition: "0 0, 5px 5px",
              backgroundColor: "#fff",
            }),
      }}
    />
  );
}

/** Un champ qui s'enregistre en le quittant. */
function Champ({ valeur, onEnregistrer, className = "", ...props }) {
  const [v, setV] = useState(valeur ?? "");
  const [erreur, setErreur] = useState(null);
  const [enCours, demarrer] = useTransition();

  return (
    <span className="flex flex-col">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (String(v) === String(valeur ?? "")) return;
          demarrer(async () => {
            const r = await onEnregistrer(v);
            if (r?.ok === false) { setErreur(r.error); setV(valeur ?? ""); }
            else setErreur(null);
          });
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className={`h-9 rounded-lg border px-2.5 text-[13px] ${
          erreur ? "border-orange" : "border-line"
        } ${enCours ? "opacity-60" : ""} ${className}`}
        {...props}
      />
      {erreur && <span className="mt-1 text-[11px] leading-tight text-orange-dark">{erreur}</span>}
    </span>
  );
}

const BTN = "h-9 rounded-lg border border-line px-3 text-[13px] hover:border-orange hover:text-orange-dark disabled:opacity-40";

/** Le panneau d'une teinte : tout ce qu'on peut lui faire, au même endroit. */
function PanneauTeinte({ valeur, choix, bibliotheque, agir, onFermer, position, total }) {
  const [envoi, setEnvoi] = useState(null);   // null | "en cours" | message d'erreur
  const fichier = useRef(null);

  // Trois états du jeton, et il faut les trois.
  const etatJeton = valeur.suffixeReference == null
    ? "aucun" : valeur.suffixeReference === "" ? "vide" : "code";

  const paletteCourante = bibliotheque.find((p) => p.id === (valeur.palette?.id || valeur.paletteId))
    || bibliotheque.find((p) => p.finitions.some((f) => f.id === valeur.modele?.id));
  const [paletteId, setPaletteId] = useState(paletteCourante?.id || bibliotheque[0]?.id || "");
  const palette = bibliotheque.find((p) => p.id === paletteId);

  const envoyer = async (file) => {
    if (!file) return;
    setEnvoi("en cours");
    try {
      const url = await televerserImage(file);
      const r = await majValeur(valeur.id, { imageUrl: url });
      setEnvoi(r?.ok === false ? r.error : null);
    } catch (e) {
      setEnvoi(e?.message || "L'envoi a échoué.");
    }
    if (fichier.current) fichier.current.value = "";
  };

  return (
    <div className="mt-3 rounded-xl border border-orange bg-orange-tint/30 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Pastille couleur={valeur.couleur} imageUrl={valeur.imageUrl} taille={44} />
        <Champ
          valeur={valeur.libelle}
          onEnregistrer={(v) => majValeur(valeur.id, { libelle: v })}
          className="w-[220px] font-semibold"
        />
        <span className="flex-1" />
        <span className="flex items-center gap-1">
          <button
            type="button" className={BTN} disabled={position === 0}
            onClick={() => agir(reordonnerValeurs(choix.id, deplacer(choix.valeurs, position, -1)))}
            aria-label="Vers la gauche"
          >←</button>
          <button
            type="button" className={BTN} disabled={position === total - 1}
            onClick={() => agir(reordonnerValeurs(choix.id, deplacer(choix.valeurs, position, +1)))}
            aria-label="Vers la droite"
          >→</button>
        </span>
        <button type="button" className={BTN} onClick={onFermer}>Fermer</button>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-3">

        {/* ── La bibliothèque, la voie normale ───────────────────────── */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Bibliothèque
          </div>
          {valeur.modele ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
              <Pastille couleur={valeur.modele.couleur} imageUrl={valeur.modele.imageUrl} taille={26} />
              <span className="flex-1 truncate text-[12.5px]">
                {valeur.modele.nom}
                {valeur.paletteNom && <span className="text-ink-soft"> · {valeur.paletteNom}</span>}
              </span>
              <button
                type="button"
                onClick={() => agir(lierAuModele(valeur.id, null))}
                className="text-[12px] text-ink-soft hover:text-orange-dark"
              >
                détacher
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              Teinte libre. Liée à la bibliothèque, elle hériterait sa couleur
              et sa pastille, et suivrait le nuancier sans qu'on y revienne.
            </p>
          )}

          {bibliotheque.length > 0 && (
            <>
              <Selecteur
                className="mt-2 w-full"
                ariaLabel="Nuancier"
                valeur={paletteId}
                onChange={setPaletteId}
                options={bibliotheque.map((p) => ({
                  valeur: p.id, libelle: p.nom, groupe: p.marque || null,
                  detail: `${p.finitions.length} teintes`,
                  couleur: p.finitions[0]?.couleur, imageUrl: p.finitions[0]?.imageUrl,
                }))}
              />
              <div className="mt-2 flex max-h-[168px] flex-wrap gap-1.5 overflow-y-auto">
                {(palette?.finitions || []).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    title={f.nom}
                    onClick={() => agir(lierAuModele(valeur.id, f.id))}
                    className={`rounded-lg p-0.5 ${
                      valeur.modele?.id === f.id ? "ring-2 ring-orange" : "hover:ring-2 hover:ring-line"
                    }`}
                  >
                    <Pastille couleur={f.couleur} imageUrl={f.imageUrl} taille={30} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── La couleur et l'image, quand il faut surcharger ─────────── */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Couleur {valeur.modele && <span className="normal-case tracking-normal">(surcharge)</span>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={estHexa(valeur.couleur) ? valeur.couleur : "#d9d2c5"}
              onChange={(e) => agir(majValeur(valeur.id, { couleur: e.target.value }))}
              className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1"
              aria-label="Choisir la couleur"
            />
            <Champ
              valeur={valeur.heritee ? "" : (valeur.couleur || "")}
              onEnregistrer={(v) => majValeur(valeur.id, { couleur: v })}
              className="w-[110px] font-display"
              placeholder={valeur.heritee ? "héritée" : "#……"}
            />
            {valeur.couleur && !valeur.heritee && (
              <button
                type="button"
                onClick={() => agir(majValeur(valeur.id, { couleur: "" }))}
                className="text-[12px] text-ink-soft hover:text-orange-dark"
              >
                retirer
              </button>
            )}
          </div>

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Image {valeur.modele && <span className="normal-case tracking-normal">(surcharge)</span>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Pastille couleur={null} imageUrl={valeur.imageUrl} taille={36} />
            <input
              ref={fichier} type="file" accept="image/*" hidden
              onChange={(e) => envoyer(e.target.files?.[0])}
            />
            <button
              type="button"
              className={BTN}
              disabled={!cloudinaryPret() || envoi === "en cours"}
              onClick={() => fichier.current?.click()}
            >
              {envoi === "en cours" ? "Envoi…" : "Téléverser"}
            </button>
            {valeur.imageUrl && !valeur.heritee && (
              <button
                type="button"
                onClick={() => agir(majValeur(valeur.id, { imageUrl: "" }))}
                className="text-[12px] text-ink-soft hover:text-orange-dark"
              >
                retirer
              </button>
            )}
          </div>
          {envoi && envoi !== "en cours" && (
            <p className="mt-1.5 text-[11px] leading-tight text-orange-dark">{envoi}</p>
          )}
        </div>

        {/* ── Le jeton de référence, et ses trois états ───────────────── */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Jeton de référence
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {[
              ["code", "Un code — il s'ajoute à la référence"],
              ["vide", "Vide — commandable, n'ajoute rien"],
              ["aucun", "Aucun — non commandable en ligne"],
            ].map(([cle, texte]) => (
              <label key={cle} className="flex items-start gap-2 text-[12.5px] leading-snug">
                <input
                  type="radio"
                  name={`jeton-${valeur.id}`}
                  checked={etatJeton === cle}
                  onChange={() => agir(majValeur(valeur.id, {
                    suffixeReference: cle === "aucun" ? null : cle === "vide" ? "" : (valeur.libelle || "X").slice(0, 1).toUpperCase(),
                  }))}
                  className="mt-0.5"
                />
                <span className={etatJeton === cle ? "font-semibold" : "text-ink-soft"}>{texte}</span>
              </label>
            ))}
          </div>
          {etatJeton === "code" && (
            <Champ
              valeur={valeur.suffixeReference}
              onEnregistrer={(v) => majValeur(valeur.id, { suffixeReference: v })}
              className="mt-2 w-[120px] font-display font-semibold tracking-wide"
            />
          )}

          <button
            type="button"
            onClick={() => { onFermer(); agir(supprimerValeur(valeur.id)); }}
            className="mt-5 text-[12.5px] text-ink-soft hover:text-orange-dark"
          >
            Supprimer cette teinte
          </button>
        </div>
      </div>
    </div>
  );
}

const estHexa = (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);

/** L'ordre des identifiants après avoir déplacé celui de la position i. */
function deplacer(valeurs, i, pas) {
  const ids = valeurs.map((v) => v.id);
  const j = i + pas;
  if (j < 0 || j >= ids.length) return ids;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}

export default function EditeurFinitions({ choix, bibliotheque, agir }) {
  const [ouverte, setOuverte] = useState(null);    // id de la teinte dépliée
  const [nouvelle, setNouvelle] = useState("");
  const [panneau, setPanneau] = useState(null);    // null | "bibliotheque"
  const [paletteId, setPaletteId] = useState(bibliotheque[0]?.id || "");
  const [cochees, setCochees] = useState(() => new Set());

  const palette = bibliotheque.find((p) => p.id === paletteId);
  const choisie = choix.valeurs.find((v) => v.id === ouverte) || null;

  // Ce qui manque à ce groupe, dit en une ligne plutôt qu'en cherchant.
  const bilan = useMemo(() => {
    const sansTeinte = choix.valeurs.filter((v) => !v.couleur && !v.imageUrl).length;
    const sansJeton = choix.valeurs.filter((v) => v.suffixeReference == null).length;
    const liees = choix.valeurs.filter((v) => v.modele).length;
    return { sansTeinte, sansJeton, liees };
  }, [choix.valeurs]);

  const basculer = (id) => setCochees((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div className="px-5 pb-5 pt-4">

      {/* ── Les réglages du groupe ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Nom du groupe</span>
          <Champ
            valeur={choix.nom}
            onEnregistrer={(v) => majChoix(choix.id, { nom: v })}
            className="w-[220px]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Affichage</span>
          <Selecteur
            className="w-[240px]"
            ariaLabel="Affichage"
            valeur={choix.rendu}
            onChange={(v) => agir(majChoix(choix.id, { rendu: v }))}
            options={RENDUS.map(([cle, nom]) => ({ valeur: cle, libelle: nom }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Rang dans la référence
          </span>
          <Champ
            valeur={choix.rangReference ?? ""}
            onEnregistrer={(v) => majChoix(choix.id, { rangReference: v })}
            className="w-[90px]"
            placeholder="aucun"
          />
        </label>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => agir(supprimerChoix(choix.id))}
          className={BTN}
        >
          Supprimer ce groupe
        </button>
      </div>

      <p className="mt-3 text-[12px] text-ink-soft">
        {choix.valeurs.length} teinte{choix.valeurs.length > 1 ? "s" : ""}
        {bilan.liees > 0 && ` · ${bilan.liees} liée${bilan.liees > 1 ? "s" : ""} à la bibliothèque`}
        {bilan.sansTeinte > 0 && ` · ${bilan.sansTeinte} sans couleur ni image`}
        {bilan.sansJeton > 0 && ` · ${bilan.sansJeton} sans jeton, donc non commandable${bilan.sansJeton > 1 ? "s" : ""} en ligne`}
      </p>

      {/* ── La grille de pastilles ─────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        {choix.valeurs.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setOuverte(ouverte === v.id ? null : v.id)}
            className={`flex w-[92px] flex-col items-center gap-1.5 rounded-xl border p-2 text-center ${
              ouverte === v.id ? "border-orange bg-orange-tint/40" : "border-line bg-surface hover:border-ink-soft/40"
            }`}
          >
            <span className="relative">
              <Pastille couleur={v.couleur} imageUrl={v.imageUrl} taille={56} />
              {v.modele && (
                <span
                  title="liée à la bibliothèque"
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px] text-ink-soft shadow"
                >
                  ⛓
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-[11.5px] leading-tight">{v.libelle}</span>
            <span className={`font-display text-[10px] tracking-wide ${
              v.suffixeReference == null ? "text-orange-dark" : "text-ink-soft"
            }`}>
              {v.suffixeReference == null ? "sans jeton" : v.suffixeReference || "jeton vide"}
            </span>
          </button>
        ))}

        <div className="flex w-[92px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line p-2">
          <input
            value={nouvelle}
            onChange={(e) => setNouvelle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !nouvelle.trim()) return;
              agir(creerValeur(choix.id, { libelle: nouvelle.trim() }));
              setNouvelle("");
            }}
            placeholder="Teinte…"
            className="h-8 w-full rounded-lg border border-line px-2 text-center text-[11.5px]"
          />
          <span className="text-[10px] text-ink-soft">Entrée pour ajouter</span>
        </div>
      </div>

      {choisie && (
        <PanneauTeinte
          key={choisie.id}
          valeur={choisie}
          choix={choix}
          bibliotheque={bibliotheque}
          agir={agir}
          onFermer={() => setOuverte(null)}
          position={choix.valeurs.findIndex((v) => v.id === choisie.id)}
          total={choix.valeurs.length}
        />
      )}

      {/* ── Le nuancier entier ─────────────────────────────────────── */}
      <div className="mt-4 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setPanneau(panneau ? null : "bibliotheque")}
          className="text-[13px] font-semibold text-orange-dark hover:underline"
        >
          {panneau ? "▴ Fermer la bibliothèque" : "▾ Piocher dans la bibliothèque"}
        </button>

        {panneau && (
          bibliotheque.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-ink-soft">
              Aucun nuancier n'est encore enregistré.
            </p>
          ) : (
            <div className="mt-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Selecteur
                  className="w-[240px]"
                  ariaLabel="Nuancier"
                  valeur={paletteId}
                  onChange={(v) => { setPaletteId(v); setCochees(new Set()); }}
                  options={bibliotheque.map((p) => ({
                    valeur: p.id, libelle: p.nom, groupe: p.marque || null,
                    detail: `${p.finitions.length} teintes`,
                    couleur: p.finitions[0]?.couleur, imageUrl: p.finitions[0]?.imageUrl,
                  }))}
                />
                <button
                  type="button"
                  className={BTN}
                  onClick={() => agir(apparierNuancier(choix.id, paletteId))}
                  title="Relier les teintes de ce groupe qui portent le nom d'une teinte du nuancier"
                >
                  Apparier par le nom
                </button>
                <span className="flex-1" />
                <button
                  type="button"
                  className={BTN}
                  disabled={!cochees.size}
                  onClick={() => { agir(ajouterDuNuancier(choix.id, [...cochees])); setCochees(new Set()); }}
                >
                  Ajouter {cochees.size || ""} teinte{cochees.size > 1 ? "s" : ""}
                </button>
              </div>

              {/* Le Tissu C de Sokoa compte quatre-vingt-cinq teintes : la
                  grille défile plutôt que de pousser la page. */}
              <div className="mt-3 flex max-h-[340px] flex-wrap gap-2 overflow-y-auto">
                {(palette?.finitions || []).map((f) => {
                  const deja = choix.valeurs.some((v) => v.modele?.id === f.id || v.libelle === f.nom);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={deja}
                      onClick={() => basculer(f.id)}
                      title={deja ? `${f.nom} — déjà dans le groupe` : f.nom}
                      className={`flex w-[76px] flex-col items-center gap-1 rounded-lg border p-1.5 ${
                        deja ? "border-line opacity-40"
                          : cochees.has(f.id) ? "border-orange bg-orange-tint/40" : "border-line hover:border-ink-soft/40"
                      }`}
                    >
                      <Pastille couleur={f.couleur} imageUrl={f.imageUrl} taille={40} />
                      <span className="line-clamp-2 text-[10.5px] leading-tight">{f.nom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
