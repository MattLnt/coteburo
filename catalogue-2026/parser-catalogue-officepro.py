#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lit le catalogue PDF OfficePro et en tire, pour chaque référence, sa page
imprimée et le nom que le catalogue lui donne.

Deux pièges dans ce document.

Le premier : il est monté en double page. Chaque page du PDF porte deux
pages imprimées côte à côte, folio en bas à gauche et en bas à droite. La
page PDF 76 est le cahier 150-151. Ignorer ça, c'est annoncer des pages
fausses d'un facteur deux.

Le second : les noms de produits ne sont pas écrits à côté des références,
mais en en-tête de colonne. Les tableaux du catalogue croisent les coloris
en lignes et les produits en colonnes — la référence VER01RE est à
l'intersection de « Paprika » et de « CHAISE SANS ACCOUDOIRS ». C'est cet
en-tête qui donne le nom du produit, et c'est lui qu'il faut lire : le
tarif, lui, appelle « Verano coussin » cette même chaise.

On reconstitue donc les lignes par leur ordonnée, on repère les références
— validées contre le tarif extrait, jamais devinées —, et pour chacune on
remonte à l'en-tête de colonne dont l'abscisse recouvre la sienne.

Sortie : catalogue-officepro-pages.json
    { "VER01RE": {"page": 157, "libelle": "CHAISE SANS ACCOUDOIRS"} }

Usage :
    pip install pdfplumber
    python parser-catalogue-officepro.py
"""

import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import pdfplumber

RACINE = Path(__file__).parent
PDF = RACINE / "Catalogue_Officepro_Seating_2026.pdf"
REFERENCES = RACINE / "officepro-references.json"
SORTIE = RACINE / "catalogue-officepro-pages.json"

# Le pli de la double page : tout ce qui est à gauche appartient au folio
# de gauche, le reste à celui de droite.
PLI = 652

# Un en-tête de colonne est en capitales et sans chiffre de référence.
BRUIT = re.compile(r"^(REF|RÉF|COULEUR|COLORIS|TAILLE|PAGE|PRODUIT|NEW|KIT|CM|KG)$", re.I)

# Les pages mêlent aux tableaux les légendes des dessins cotés et les
# pictogrammes de garantie. Un intitulé qui parle de centimètres, de kilos
# ou d'heures d'assise décrit un schéma, pas un produit : mieux vaut pas de
# nom qu'un faux nom.
LEGENDE = re.compile(
    r"\b(cm|mm|kg|heures?|ans?|assise|garantie|norme|iso|bifma|en\d{4})\b|^\W*\d", re.I)


def intitule_credible(texte):
    """Un en-tête de colonne qui nomme vraiment un produit."""
    t = texte.strip()
    if not (3 <= len(t) <= 60):
        return False
    if LEGENDE.search(t):
        return False
    lettres = [c for c in sans_accent(t) if c.isalpha()]
    if len(lettres) < 3:
        return False
    # Les en-têtes du catalogue sont en capitales ; une casse mixte trahit
    # une phrase de description happée par erreur.
    return sum(1 for c in lettres if c.isupper()) / len(lettres) > 0.7


def sans_accent(s):
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()


def lignes_de(page):
    """Les mots de la page groupés en lignes, séparément pour chaque folio."""
    mots = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    cotes = {"gauche": [], "droite": []}
    for m in mots:
        cotes["gauche" if m["x0"] < PLI else "droite"].append(m)

    out = {}
    for cote, ms in cotes.items():
        paquets = []
        for m in sorted(ms, key=lambda w: (round(w["top"], 1), w["x0"])):
            for p in paquets:
                if abs(p["top"] - m["top"]) <= 3:
                    p["mots"].append(m)
                    break
            else:
                paquets.append({"top": m["top"], "mots": [m]})
        for p in paquets:
            p["mots"].sort(key=lambda w: w["x0"])
            p["texte"] = " ".join(w["text"] for w in p["mots"])
        out[cote] = sorted(paquets, key=lambda p: p["top"])
    return out


def colonnes_den_tete(entetes):
    """Les mots des lignes d'en-tête, regroupés en colonnes par abscisse.

    Un intitulé tient souvent sur plusieurs lignes — « PETITE TABLE
    RECTANGULAIRE 4 PLACES » en occupe trois. On recolle par la colonne,
    de haut en bas.
    """
    mots = [w for li in entetes for w in li["mots"]]
    cols = []
    for m in sorted(mots, key=lambda w: w["x0"]):
        texte = m["text"].strip()
        if not texte or BRUIT.match(texte):
            continue
        for c in cols:
            if m["x0"] <= c["x1"] + 14 and m["x1"] >= c["x0"] - 14:
                c["mots"].append(m)
                c["x0"] = min(c["x0"], m["x0"])
                c["x1"] = max(c["x1"], m["x1"])
                break
        else:
            cols.append({"x0": m["x0"], "x1": m["x1"], "mots": [m]})
    for c in cols:
        c["mots"].sort(key=lambda w: (round(w["top"], 1), w["x0"]))
        c["texte"] = " ".join(w["text"] for w in c["mots"]).strip()
    return [c for c in cols if intitule_credible(c["texte"])]


def cotes_de(lignes):
    """Les cotes en centimètres lues sur la page.

    Le catalogue ne tient pas de tableau de dimensions : ses cotes sont des
    légendes posées contre les dessins, parfois à la verticale — le texte
    en ressort à l'envers, « mc 5.011 » pour « 110.5 cm ». Rien ne les
    rattache à une référence plutôt qu'à sa voisine, et plusieurs produits
    partagent souvent la double page.

    On les relève donc sans les attribuer : c'est une aide à la saisie
    manuelle, pas une source pour les colonnes de cotes.
    """
    vues = set()
    for li in lignes:
        t = li["texte"]
        for m in re.finditer(r"(\d{1,3}(?:[.,]\d)?)\s*cm\b", t, re.I):
            vues.add(float(m.group(1).replace(",", ".")))
        # la même chose écrite à l'envers par une rotation de 90°
        for m in re.finditer(r"\bmc\s*(\d{1,3}(?:[.,]\d)?)", t, re.I):
            env = m.group(1)[::-1].replace(",", ".")
            try:
                vues.add(float(env))
            except ValueError:
                pass
    # Les légendes se coupent en cours de route et laissent des bouts de
    # nombre. Hors de la plage d'un siège, c'est un débris, pas une cote.
    return sorted(v for v in vues if 20 <= v <= 200)


def titres_de(lignes):
    """Les intitulés les plus gros de la page : le nom de la gamme et les
    titres de section, que le catalogue compose en grands caractères."""
    tailles = []
    for li in lignes:
        for w in li["mots"]:
            h = round(w["bottom"] - w["top"], 1)
            tailles.append((h, li))
    if not tailles:
        return []
    seuil = sorted({h for h, _ in tailles}, reverse=True)[:3]
    vus, out = set(), []
    for h, li in tailles:
        if h in seuil and li["texte"] not in vus and len(li["texte"]) > 2:
            vus.add(li["texte"])
            out.append(li["texte"][:70])
    return out[:6]


def main():
    refs_tarif = json.loads(REFERENCES.read_text(encoding="utf-8"))
    connues = {r["reference"] for r in refs_tarif}
    # Le catalogue écrit parfois la référence sans son suffixe de coloris.
    racines = {r["racine"] for r in refs_tarif}
    print(f"{len(connues)} références au tarif, {len(racines)} racines")

    trouve = {}
    titres = {}
    cotes = {}
    vues = Counter()

    with pdfplumber.open(PDF) as pdf:
        for n, page in enumerate(pdf.pages, 1):
            folios = {"gauche": 2 * n - 2, "droite": 2 * n - 1}
            for cote, lignes in lignes_de(page).items():
                folio = folios[cote]
                titres[folio] = titres_de(lignes)
                cotes[folio] = cotes_de(lignes)

                # Quelles lignes portent des références ?
                porteuses = []
                for i, li in enumerate(lignes):
                    trouvees = [(w, w["text"].strip().upper().strip(".,;:()"))
                                for w in li["mots"]]
                    trouvees = [(w, t) for w, t in trouvees if t in connues]
                    if trouvees:
                        porteuses.append((i, li, trouvees))
                if not porteuses:
                    continue

                # Les blocs de lignes porteuses consécutives forment un
                # tableau ; ce qui précède immédiatement en est l'en-tête.
                blocs = []
                for i, li, tr in porteuses:
                    if blocs and i - blocs[-1][-1][0] <= 2:
                        blocs[-1].append((i, li, tr))
                    else:
                        blocs.append([(i, li, tr)])

                for bloc in blocs:
                    debut = bloc[0][0]
                    entetes = [lignes[j] for j in range(max(0, debut - 4), debut)]
                    cols = colonnes_den_tete(entetes)
                    for _, li, tr in bloc:
                        for mot, ref in tr:
                            vues[ref] += 1
                            if ref in trouve:
                                continue
                            centre = (mot["x0"] + mot["x1"]) / 2
                            col = None
                            if cols:
                                col = min(cols, key=lambda c: abs((c["x0"] + c["x1"]) / 2 - centre))
                                # Une colonne trop éloignée ne décrit pas ce mot.
                                if abs((col["x0"] + col["x1"]) / 2 - centre) > 130:
                                    col = None
                            trouve[ref] = {
                                "page": folio,
                                "libelle": col["texte"] if col else "",
                                "pdf": n,
                            }

    retenues = {r["reference"] for r in refs_tarif}
    absentes = sorted(retenues - set(trouve))
    print(f"\n{len(trouve)} références retrouvées dans le catalogue")
    print(f"  dont au tarif : {len(retenues & set(trouve))} / {len(retenues)}")
    print(f"  avec un libellé de colonne : {sum(1 for v in trouve.values() if v['libelle'])}")
    print(f"  références du tarif ABSENTES du catalogue : {len(absentes)}")
    for a in absentes[:20]:
        print(f"     {a}")

    for ref, v in trouve.items():
        v["titres_page"] = titres.get(v["page"], [])
        v["cotes_page"] = cotes.get(v["page"], [])

    SORTIE.write_text(json.dumps(trouve, ensure_ascii=False, indent=1, sort_keys=True),
                      encoding="utf-8")
    print(f"\nÉcrit → {SORTIE.name}")


if __name__ == "__main__":
    main()
