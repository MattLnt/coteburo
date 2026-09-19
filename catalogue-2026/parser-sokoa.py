#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrait le tarif-catalogue Sokoa 2026 en lisant chaque tableau par ses
positions.

Sokoa ne sépare pas son catalogue de son tarif : les deux sont le même
document de 208 pages, où la description, les cotes et les prix d'un
produit tiennent sur la même page. C'est une chance — tout est à portée —
et un piège, parce que rien n'est aligné d'une page à l'autre.

Trois choses qu'il faut avoir comprises pour ne pas écrire n'importe quoi.

1. Le prix dépend de la CATÉGORIE de revêtement, pas du coloris. Une même
   référence a six prix — B, B+, C, D, E, H — et le client choisit ensuite
   son coloris dans le nuancier de la catégorie retenue (p.202 et suivantes).
   Une ligne de sortie vaut donc pour un couple (référence, catégorie).

2. Les colonnes de prix CHANGENT d'un tableau à l'autre. On rencontre
   « REF B B+ C* D ECO Kg/u m3 UC », mais aussi « REF B B+ C* D E H … »,
   « REF PP … » pour le polypropylène, « REF Bois … », « REF Mélaminé … »,
   ou une simple colonne « Prix ». Supposer un jeu de colonnes fixe, c'est
   décaler les prix sans s'en apercevoir. On lit donc l'en-tête de CHAQUE
   tableau et on s'en sert comme d'une grille : chaque valeur va à la
   colonne dont l'abscisse est la plus proche.

3. L'astérisque d'un en-tête renvoie à une note de bas de page qui restreint
   le nuancier — « * C = Spazio exclu », « * B = Xtrevira uniquement ». On
   retient l'astérisque et la note : sans elle, on vendrait un tissu que
   Sokoa ne fournit pas sur ce siège.

Les cotes sont dans la colonne de gauche, en millimètres, sous la forme
H / L / P / A / ø — hauteur, largeur, profondeur, assise, diamètre du
piètement. L'assise est souvent une plage, « A 420-530 ».

Sortie :
    sokoa-references.json   une entrée par couple (référence, catégorie)

Usage :
    pip install pdfplumber
    python parser-sokoa.py
"""

import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import pdfplumber

RACINE = Path(__file__).parent
PDF = RACINE / "SOKOA_TARIF 2026_FR.pdf"
SORTIE = RACINE / "sokoa-references.json"

# On ne reconnaît PAS une référence à sa forme. Sokoa en écrit de toutes
# sortes — « AK77/55 », « KUA0/*A*C » avec ses astérisques, « KEA0430 » et
# « WE37F » sans la moindre barre oblique. Un motif trop étroit avait fait
# disparaître Kulbu, Maike et Wi-Max Ergo en entier, sans un mot.
#
# Ce qui désigne une référence, c'est sa POSITION : elle est sous le mot REF
# de l'en-tête, dans une page où les colonnes sont tenues au point près. On
# prend donc ce qui tombe dans cette colonne, à l'exclusion des nombres,
# qui appartiennent aux colonnes de prix.
PAS_UNE_REFERENCE = re.compile(r"^[\d.,%€]+$|^(REF|ECO|UC|i|x\d+)$", re.I)


def est_reference(texte):
    t = texte.strip()
    return bool(t) and len(t) >= 3 and not PAS_UNE_REFERENCE.match(t)

# Les intitulés de colonne qu'on rencontre après REF et avant ECO.
CATEGORIES = {"B", "B+", "C", "D", "E", "H", "PP", "PRIX", "BOIS",
              "MÉLAMINÉ", "MELAMINE", "MÉTAL", "METAL", "CUIR", "TOILE",
              "RÉSILLE", "RESILLE"}

# La colonne des cotes, tout à gauche. « ø » ne se décompose pas en ASCII :
# il faut le nommer tel quel, sans quoi le diamètre du piètement disparaît.
COTES = {"H": "hauteur", "L": "largeur", "P": "profondeur",
         "A": "assise", "Ø": "diametre", "ø": "diametre"}


def sans_accent(s):
    return unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode()


def nombre(txt):
    """Un montant ou une mesure, ou None si ce n'en est pas un."""
    t = re.sub(r"[\s  ]", "", txt)
    if not re.fullmatch(r"\d{1,5}(?:[.,]\d{1,3})?", t):
        return None
    return float(t.replace(",", "."))


def recoller_milliers(mots):
    """Recolle « 1 841 », que le PDF sépare en deux mots.

    Au-delà de mille, Sokoa met une espace fine entre le millier et les
    centaines, et pdfplumber en fait deux mots. Lus séparément, le canapé
    Emeki sortait à 1 euro et la référence suivante à 2. On rapproche donc
    un nombre d'un ou deux chiffres suivi, à moins de six points, d'un
    groupe de trois chiffres exactement.
    """
    out, i = [], 0
    while i < len(mots):
        a = mots[i]
        b = mots[i + 1] if i + 1 < len(mots) else None
        if (b and re.fullmatch(r"\d{1,2}", a["text"].strip())
                and re.fullmatch(r"\d{3}", b["text"].strip())
                and 0 <= b["x0"] - a["x1"] < 6):
            out.append({**a, "text": a["text"].strip() + b["text"].strip(),
                        "x1": b["x1"]})
            i += 2
            continue
        out.append(a)
        i += 1
    return out


def lignes_de(page, tol=2.2):
    """Les mots de la page groupés en lignes par leur ordonnée."""
    paquets = []
    for m in sorted(page.extract_words(use_text_flow=False),
                    key=lambda w: (round(w["top"], 1), w["x0"])):
        for p in paquets:
            if abs(p["top"] - m["top"]) <= tol:
                p["mots"].append(m)
                break
        else:
            paquets.append({"top": m["top"], "mots": [m]})
    for p in paquets:
        p["mots"].sort(key=lambda w: w["x0"])
        p["texte"] = " ".join(w["text"] for w in p["mots"])
    return sorted(paquets, key=lambda p: p["top"])


def grilles(ligne):
    """Les grilles de colonnes décrites par une ligne d'en-tête.

    Le plus souvent il n'y en a qu'une. Mais le rayonnage Archikit range
    quatre tableaux côte à côte sur la même ligne — une colonne REF par
    hauteur de rayonnage, 2000, 2500, 3000, puis le niveau supplémentaire —
    et n'en lire qu'une seule perdait les trois quarts de la gamme. Chaque
    mot REF ouvre donc sa propre grille, fermée par le REF suivant.
    """
    mots = ligne["mots"]
    depuis = [i for i, w in enumerate(mots) if w["text"].strip() == "REF"]
    if not depuis:
        return []
    out = []
    for k, iref in enumerate(depuis):
        fin = depuis[k + 1] if k + 1 < len(depuis) else len(mots)
        g = _grille(mots, iref, fin, titre_jusqua=depuis[0])
        if g:
            out.append(g)
    return out


def _grille(mots, iref, fin, titre_jusqua):
    """Une grille : ce qui va du mot REF à la fin de son groupe."""
    ieco = next((i for i in range(iref + 1, fin)
                 if mots[i]["text"].strip().upper() == "ECO"), None)
    if ieco is None:
        return None

    # Un intitulé peut tenir en plusieurs mots — « PVP lot de 4 »,
    # « Natural Linen », « Eden Free ». À l'intérieur d'un libellé les mots
    # se touchent (1,5 pt) ; entre deux colonnes l'écart est d'au moins
    # 6 pt. On recolle donc sous ce seuil.
    colonnes, notes = [], {}
    for w in mots[iref + 1:ieco]:
        brut = w["text"].strip()
        if not brut:
            continue
        if colonnes and w["x0"] - colonnes[-1]["x1"] < 4:
            colonnes[-1]["mots"].append(brut)
            colonnes[-1]["x1"] = w["x1"]
        else:
            colonnes.append({"mots": [brut], "x0": w["x0"], "x1": w["x1"]})
    for c in colonnes:
        libelle = " ".join(c["mots"])
        c["restreint"] = libelle.rstrip().endswith("*")
        c["nom"] = libelle.rstrip("*").strip()
    colonnes = [c for c in colonnes if c["nom"]]
    if not colonnes:
        return None

    # « NET » est la colonne du poids sur les tableaux de rayonnage, où
    # l'en-tête complet se lit « Mont. € / ECO Eco / Poids NET ».
    for w in mots[ieco:fin]:
        nom = sans_accent(w["text"].strip()).upper().rstrip(".")
        if nom in ("ECO", "KG/U", "M3", "UC"):
            notes[nom] = (w["x0"] + w["x1"]) / 2
        elif nom == "NET":
            notes.setdefault("KG/U", (w["x0"] + w["x1"]) / 2)

    titre = " ".join(w["text"] for w in mots[:titre_jusqua]
                     if w["x1"] < mots[titre_jusqua]["x0"] - 3).strip()
    return {"titre": titre, "colonnes": colonnes, "annexes": notes,
            "xref": mots[iref]["x0"]}


def plus_proche(x, reperes, tolerance=16):
    """La colonne dont l'intervalle est le plus proche de cette abscisse.

    On mesure la distance à l'intervalle du libellé, pas à son centre : un
    intitulé large comme « PVP lot de 4 » a son centre loin de la colonne
    de chiffres qu'il surplombe.
    """
    if not reperes:
        return None
    def ecart(bornes):
        a, b = bornes
        return 0.0 if a <= x <= b else min(abs(x - a), abs(x - b))
    nom, dx = min(((n, ecart(b)) for n, b in reperes), key=lambda t: t[1])
    return nom if dx <= tolerance else None


def cle_de_cote(texte):
    t = texte.strip()
    return COTES.get(t) or COTES.get(sans_accent(t).upper())


def cotes_de(ligne, xmax):
    """Les cotes lues dans la colonne de gauche d'une ligne.

    Rend aussi les mots consommés : ils ne doivent pas se retrouver dans
    l'intitulé de la variante, sous peine d'y écrire « 805 Chaise base et
    roulettes ».
    """
    out, pris = {}, set()
    mots = [w for w in ligne["mots"] if w["x1"] < xmax]
    for i, w in enumerate(mots[:-1]):
        cle = cle_de_cote(w["text"])
        if not cle:
            continue
        suite = mots[i + 1:i + 4]
        val = " ".join(x["text"] for x in suite)
        m = re.match(r"(\d{2,4})\s*(?:[-/]\s*(\d{2,4}))?", val)
        if not m:
            continue
        a = int(m.group(1))
        b = int(m.group(2)) if m.group(2) else a
        out.setdefault(cle, [min(a, b), max(a, b)])
        pris.add(id(w))
        for x in suite:
            if re.fullmatch(r"[\d/\-]+", x["text"].strip()):
                pris.add(id(x))
            else:
                break
    return out, pris


def rubrique_de(lignes):
    """Le titre de page, celui que Sokoa compose en gros caractères.

    Il porte une information qu'aucun titre de bloc ne donne : la version
    de la gamme. Les pages 38-39 sont l'« EmanT », dossier tapissé, et les
    pages 40-41 l'« EmanR », dossier résille — avec, mot pour mot, les
    mêmes titres de blocs. Sans la rubrique, les deux se confondent en une
    seule fiche, alors que ce sont deux produits à deux prix.
    """
    if not lignes:
        return ""
    hauteurs = [round(w["bottom"] - w["top"], 1)
                for li in lignes[:6] for w in li["mots"]]
    if not hauteurs:
        return ""
    seuil = max(hauteurs)
    if seuil < 9:                      # pas de vrai titre sur cette page
        return ""
    mots = [w["text"] for li in lignes[:6] for w in li["mots"]
            if round(w["bottom"] - w["top"], 1) >= seuil - 0.6]
    return " ".join(mots).strip()[:40]


def notes_de(page_texte):
    """Les notes de bas de page, celles qui restreignent les nuanciers."""
    return [li.strip() for li in page_texte.split("\n")
            if li.strip().startswith("*") and len(li.strip()) > 3]


def sommaire(pdf):
    """Gamme → page de début, lu au sommaire des pages 2 et 3."""
    entrees = []
    for n in (2, 3):
        texte = pdf.pages[n - 1].extract_text() or ""
        for ligne in texte.split("\n"):
            for m in re.finditer(r"([A-Za-zÀ-ÿ][\w\-'’/ ]*?)\s+(\d{1,3})(?=\s|$)", ligne):
                nom = re.sub(r"^(NEW)\s+", "", m.group(1).strip())
                page = int(m.group(2))
                if 20 <= page <= 184 and len(nom) > 2:
                    entrees.append((page, nom))
    # Une même gamme peut revenir dans deux sections : on garde les deux,
    # chacune couvre ses propres pages.
    entrees = sorted(set(entrees))
    plages = []
    for i, (p, nom) in enumerate(entrees):
        fin = entrees[i + 1][0] - 1 if i + 1 < len(entrees) else 184
        plages.append((p, fin, nom))
    return plages


def gamme_de(page, plages):
    for debut, fin, nom in plages:
        if debut <= page <= fin:
            return nom
    return None


def main():
    if not PDF.exists():
        print(f"{PDF.name} introuvable")
        return 1

    sortie = []
    stats = Counter()
    sans_prix = []
    intitules = Counter()

    with pdfplumber.open(PDF) as pdf:
        plages = sommaire(pdf)
        print(f"{len(plages)} entrées au sommaire, "
              f"de la page {plages[0][0]} à {plages[-1][1]}")

        for numero, page in enumerate(pdf.pages, 1):
            lignes = lignes_de(page)
            texte = page.extract_text() or ""
            notes = notes_de(texte)
            rubrique = rubrique_de(lignes)
            gamme = gamme_de(numero, plages)

            # Les en-têtes découpent la page en tableaux.
            entetes = []
            for i, li in enumerate(lignes):
                for g in grilles(li):
                    entetes.append((i, g))
            if not entetes:
                continue
            stats["tableaux"] += len(entetes)

            for k, (i, g) in enumerate(entetes):
                suivante = next((j for j, _ in entetes[k + 1:] if j > i), None)
                fin = suivante if suivante is not None else len(lignes)
                bloc = lignes[i:fin]

                # Quand le titre du bloc est trop long pour tenir à gauche du
                # mot REF, la mise en page le rejette sur la ligne du dessus.
                # Sans ce rattrapage, quinze blocs sortiraient anonymes.
                if not g["titre"]:
                    for j in range(i - 1, max(i - 3, -1), -1):
                        prec = lignes[j]
                        if grilles(prec):
                            break
                        mots = [w for w in prec["mots"] if w["x1"] < g["xref"] - 3]
                        texte = " ".join(w["text"] for w in mots).strip()
                        if len(texte) > 12 and not cle_de_cote(mots[0]["text"]):
                            g["titre"] = texte
                            break
                for c in g["colonnes"]:
                    intitules[c["nom"]] += 1

                reperes = [(c["nom"], (c["x0"], c["x1"])) for c in g["colonnes"]]
                reperes += [(n, (x - 6, x + 6)) for n, x in g["annexes"].items()]
                restreintes = {c["nom"] for c in g["colonnes"] if c["restreint"]}

                # Les cotes du bloc, prises sur toutes ses lignes.
                cotes, pris = {}, set()
                for li in bloc:
                    trouvees, consommes = cotes_de(li, g["xref"] - 20)
                    for cle, val in trouvees.items():
                        cotes.setdefault(cle, val)
                    pris |= consommes

                xprix = min(c["x0"] for c in g["colonnes"])
                for li in bloc[1:]:
                    refs = [w for w in li["mots"]
                            if est_reference(w["text"])
                            and abs(w["x0"] - g["xref"]) <= 25]
                    if not refs:
                        continue
                    ref = refs[0]
                    valeurs = {}
                    for w in recoller_milliers(li["mots"]):
                        if w["x0"] < xprix - 12:
                            continue
                        v = nombre(w["text"])
                        if v is None:
                            continue
                        cle = plus_proche((w["x0"] + w["x1"]) / 2, reperes)
                        if cle:
                            valeurs.setdefault(cle, v)

                    # La référence commandable ne s'arrête pas au code : Sokoa
                    # l'écrit « LCK0/1 + coloris*/000 », où le suffixe final
                    # distingue des produits différents — /000 sur roulettes,
                    # /010 sur patins, au même code et à deux prix. Tronquer
                    # après le code confondrait les deux.
                    complete = " ".join(
                        w["text"] for w in li["mots"]
                        if w["x0"] >= ref["x0"] - 2 and w["x1"] < xprix - 6
                    ).strip()
                    # Entre la référence et les prix traînent des renvois de
                    # note — le « i » d'information, un « unitaire », un
                    # « p.190 ». Ils ne font pas partie du code commandé.
                    while True:
                        mots_ref = complete.split()
                        if len(mots_ref) > 1 and (mots_ref[-1].islower()
                                                  or mots_ref[-1].startswith("p.")):
                            complete = " ".join(mots_ref[:-1])
                        else:
                            break

                    # L'intitulé de la variante : entre les cotes et la
                    # référence, les mots que les cotes n'ont pas consommés.
                    variante = " ".join(
                        w["text"] for w in li["mots"]
                        if w["x1"] < ref["x0"] - 3 and id(w) not in pris
                        and not cle_de_cote(w["text"])
                    ).strip()

                    prix = {c["nom"]: valeurs.get(c["nom"]) for c in g["colonnes"]}
                    if not any(v is not None for v in prix.values()):
                        sans_prix.append((numero, ref["text"]))
                        continue

                    stats["references"] += 1
                    for categorie, montant in prix.items():
                        if montant is None:
                            continue
                        stats["lignes"] += 1
                        sortie.append({
                            "reference": complete or ref["text"].strip(),
                            "code": ref["text"].strip(),
                            "categorie": categorie,
                            "prix": montant,
                            "restreinte": categorie in restreintes,
                            "ecotaxe": valeurs.get("ECO"),
                            "poids": valeurs.get("KG/U"),
                            "volume": valeurs.get("M3"),
                            "unite": valeurs.get("UC"),
                            "gamme": gamme,
                            "rubrique": rubrique,
                            "page": numero,
                            "titre_bloc": g["titre"],
                            "variante": variante,
                            "cotes": cotes,
                            "notes": notes,
                        })

    SORTIE.write_text(json.dumps(sortie, ensure_ascii=False, indent=1),
                      encoding="utf-8")

    refs = {x["reference"] for x in sortie}
    print(f"\n{stats['tableaux']} tableaux lus")
    print(f"{len(refs)} références · {stats['lignes']} couples (référence, catégorie)")
    print(f"{len(sans_prix)} références vues sans aucun prix")
    avec_cotes = {x["reference"] for x in sortie if x["cotes"]}
    print(f"{len(avec_cotes)} références avec des cotes")
    sans_gamme = {x["reference"] for x in sortie if not x["gamme"]}
    print(f"{len(sans_gamme)} références sans gamme")

    print("\nIntitulés de colonne rencontrés :")
    for nom, n in intitules.most_common():
        print(f"   {n:5}  {nom}")

    if sans_prix:
        print(f"\nSans prix (15 premières) :")
        for p, r in sans_prix[:15]:
            print(f"   p.{p:<4} {r}")

    print(f"\nÉcrit → {SORTIE.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
