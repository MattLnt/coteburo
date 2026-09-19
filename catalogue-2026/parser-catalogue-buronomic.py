#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lit le catalogue PDF Buronomic et en tire, pour chaque référence, sa page
et ses cotes.

Le catalogue présente ses produits en tableaux : une colonne « Dim. (cm) »,
une colonne « Réf. », puis les nuanciers. Les lignes sont groupées sous un
libellé de bloc — « Plans droits H72 cm », « Tables Cohésion H74 cm » — qui
porte souvent la hauteur, absente des lignes elles-mêmes.

On reconstitue donc les lignes par leur ordonnée, on y repère les codes
racine (validés contre le tarif, jamais devinés), et on lit les cotes dans
la ligne puis, à défaut, dans le libellé du bloc qui la précède.

pdftotext ne suffit pas ici : il aplatit les colonnes et colle la cote d'une
ligne à la référence de la suivante. Il faut les positions.

Sortie : catalogue-pages-cotes.json
    { "DE85": {"page": 112, "L": 120, "P": 80, "H": 72, "bloc": "Plans droits"} }

Usage :
    python parser-catalogue-buronomic.py
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import pdfplumber
from openpyxl import load_workbook

RACINE = Path(__file__).parent
PDF = RACINE / "catalogue_buronomic_2026_fr.pdf"
TARIF = RACINE / "buronomic.xlsx"
SORTIE = RACINE / "catalogue-pages-cotes.json"

# Le catalogue écrit tantôt le code racine seul (DE85), tantôt la référence
# complète, racine suivie du code de finition (A2201K = racine A220). On ne
# devine rien : un jeton n'est retenu que si ses quatre premiers caractères
# sont un code racine du tarif.
JETON = re.compile(r"^[A-Z0-9]{4,8}$")


def code_racine(jeton, connus):
    """Le code racine porté par un jeton du catalogue, ou None."""
    j = jeton.upper().strip(".,;:()")
    if not JETON.match(j):
        return None
    if j in connus:
        return j
    return j[:4] if j[:4] in connus else None


def racines_du_tarif():
    """Les codes racine réellement vendus, et leur gamme."""
    wb = load_workbook(TARIF, read_only=True)
    rows = wb["Kits 2026"].iter_rows(values_only=True)
    next(rows)
    next(rows)
    par_code = defaultdict(set)
    for r in rows:
        if r and r[1] and r[3]:
            par_code[str(r[3]).strip().upper()].add(str(r[1]).strip())
    return par_code


def lignes(page, tol=2.6):
    """Les mots de la page, regroupés en lignes par leur ordonnée."""
    mots = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    paquets = []
    for m in sorted(mots, key=lambda w: (round(w["top"], 1), w["x0"])):
        for p in paquets:
            if abs(p["top"] - m["top"]) <= tol:
                p["mots"].append(m)
                p["top"] = (p["top"] * len(p["mots"]) + m["top"]) / (len(p["mots"]) + 1)
                break
        else:
            paquets.append({"top": m["top"], "mots": [m]})
    for p in paquets:
        p["mots"].sort(key=lambda w: w["x0"])
        p["texte"] = " ".join(w["text"] for w in p["mots"])
    return sorted(paquets, key=lambda p: p["top"])


def cotes(texte):
    """Largeur, profondeur, hauteur et diamètre lus dans un libellé.

    Le catalogue écrit « L 120 », « P 80 / L 160 », « H 72 cm », « Ø 80 »,
    et pour les piètements réglables une plage : « H 63 / 128 ».

    Chaque cote sort en couple [mini, maxi], égaux quand elle est fixe. On ne
    lit que ce qui est écrit : une cote absente reste absente.

    Attention au « / » : il sépare tantôt les bornes d'une plage, tantôt deux
    cotes différentes (« P 80 / L 160 »). Une borne n'est donc reconnue que
    si aucune lettre de cote ne la précède.
    """
    if not texte:
        return {}
    t = texte.upper().replace(",", ".")

    def cm(v):
        v = float(v)
        return round(v / 10, 1) if v > 400 else v

    out = {}
    for cle in ("L", "P", "H"):
        m = re.search(r"\b" + cle + r"\s*(\d{2,4}(?:\.\d)?)"
                      r"(?:\s*/\s*(?![LPHØ])(\d{2,4}(?:\.\d)?))?", t)
        if m:
            a = cm(m.group(1))
            b = cm(m.group(2)) if m.group(2) else a
            out[cle] = [min(a, b), max(a, b)]
    m = re.search(r"[ØD]\s*(\d{2,3}(?:\.\d)?)", t)
    if m and "L" not in out:
        d = cm(m.group(1))
        out["L"] = out["P"] = [d, d]
    return out


def main():
    par_code = racines_du_tarif()
    print(f"{len(par_code)} codes racine au tarif")
    if not PDF.exists():
        sys.exit(f"catalogue introuvable : {PDF}")

    trouve = {}
    doublons = defaultdict(list)

    with pdfplumber.open(PDF) as pdf:
        total = len(pdf.pages)
        for n, page in enumerate(pdf.pages, 1):
            try:
                lg = lignes(page)
            except Exception as e:
                print(f"  page {n} illisible : {e}")
                continue

            # Le libellé de bloc : la ligne la plus à gauche sans code, qui
            # précède. On garde la dernière rencontrée.
            #
            # La hauteur, elle, est presque toujours portée par ce libellé
            # (« Plans droits H 72 cm ») et jamais par les lignes. On la
            # retient tant qu'un nouveau libellé n'en annonce pas d'autre.
            # Le libellé de gauche est une cellule fusionnée, centrée sur le
            # bloc : sa hauteur tombe sur une seule ligne du tableau. Dès
            # qu'on la lit, on la reporte sur les lignes déjà vues du bloc.
            bloc = ""
            hauteur = None
            du_bloc = []
            for li in lg:
                codes = []
                for w in li["mots"]:
                    rac = code_racine(w["text"], par_code)
                    if rac:
                        codes.append((rac, w))
                if not codes:
                    # Un libellé de bloc commence tout à gauche du tableau.
                    if li["mots"] and li["mots"][0]["x0"] < 130 and len(li["texte"]) < 80:
                        if re.search(r"[A-Za-zÀ-ÿ]{4}", li["texte"]):
                            bloc = li["texte"]
                            du_bloc = []
                            hauteur = cotes(li["texte"]).get("H")
                    continue

                # Les cotes de la ligne : ce qui est à gauche du premier code.
                xmin = min(w["x0"] for _, w in codes)
                gauche = " ".join(w["text"] for w in li["mots"] if w["x1"] <= xmin)
                c = cotes(gauche)
                for k, v in cotes(bloc).items():
                    c.setdefault(k, v)
                if c.get("H") and hauteur is None:
                    hauteur = c["H"]
                    for dejavu in du_bloc:
                        trouve[dejavu].setdefault("H", hauteur)
                if hauteur is not None:
                    c.setdefault("H", hauteur)

                for code, w in codes:
                    if code in trouve:
                        doublons[code].append(n)
                        # On garde la première page : c'est la présentation
                        # du produit, les suivantes sont des rappels.
                        continue
                    trouve[code] = {"page": n, "bloc": bloc.strip()[:60], **c}
                    du_bloc.append(code)

            if n % 40 == 0:
                print(f"  … {n}/{total}")

    manquants = sorted(set(par_code) - set(trouve))
    print(f"\n{len(trouve)} codes retrouvés dans le catalogue")
    print(f"{len(manquants)} codes du tarif absents du catalogue")
    avec_h = sum(1 for v in trouve.values() if "H" in v)
    avec_l = sum(1 for v in trouve.values() if "L" in v)
    avec_p = sum(1 for v in trouve.values() if "P" in v)
    print(f"  avec largeur {avec_l} · profondeur {avec_p} · hauteur {avec_h}")
    print(f"{len(doublons)} codes vus sur plusieurs pages (première retenue)")

    SORTIE.write_text(json.dumps(trouve, ensure_ascii=False, indent=1, sort_keys=True),
                      encoding="utf-8")
    print(f"\nÉcrit → {SORTIE.name}")

    if manquants:
        print("\nExemples de codes absents du catalogue :")
        for c in manquants[:15]:
            print(f"   {c}  ({', '.join(sorted(par_code[c]))})")


if __name__ == "__main__":
    main()
