#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrait le tarif OfficePro 2026 en suivant les filets du tableau.

Le tarif est un tableau à cellules fusionnées verticalement : la
désignation, le prix et l'écotaxe sont écrits une seule fois, centrés sur
le groupe des coloris qu'ils concernent. pdftotext rend ces lignes dans un
ordre qui ne dit plus à quoi le prix se rapporte.

Comment on s'y retrouve. Le PDF ne trace pas de vraies bordures, mais il
dessine ses séparations sous forme de rectangles très plats. Ceux qui
partent de la colonne DÉSIGNATION et courent vers la droite ferment un
groupe ; ceux qui ne couvrent que la zone coloris / référence séparent
deux lignes d'un même groupe. Découper la page sur les premiers donne les
groupes exacts, sans rien deviner.

C'est ce qui distingue cette version de la précédente, qui regroupait les
références par racine — les quatre premiers caractères — et rattachait les
prix restants par proximité. Deux effets de bord : le Tecsy Chic
(TCY05NR-PU), le Platinium (TCY05GR) et l'Alto (TCY05NR-RH) partageaient
la racine TCY05 et donc le prix du Concept, et trente-neuf références
sortaient sans prix du tout.

La colonne PAGE du tarif renvoie à la page du catalogue : on la garde,
elle recoupe ce que lit parser-catalogue-officepro.py.

Sortie :
    officepro-references.json    une entrée par référence

Usage :
    pip install pdfplumber
    python parser-officepro.py
"""

import json
import re
from collections import defaultdict
from pathlib import Path

import pdfplumber

RACINE = Path(__file__).parent
TARIF = RACINE / "TARIF GENERAL COMPLET OFFICEPRO SEATING 2026.pdf"
NOMS = RACINE / "noms-officepro.json"
SORTIE = RACINE / "officepro-references.json"


def perimetre():
    """Quelles familles du tarif sont vendues, et sous quelle gamme.

    Le périmètre vit dans noms-officepro.json, pas ici : il se relit sans
    ouvrir du Python, et chaque famille écartée y porte sa raison. Une
    version précédente le codait en préfixes de référence — ACC21 pour
    Coigny, ACC26 pour Synergy — ce qui se lisait mal et se vérifiait pire.
    """
    n = json.loads(NOMS.read_text(encoding="utf-8"))
    per = n["_perimetre"]
    familles = {f: v["gamme"] for f, v in per["retenues"].items()}
    exceptions = {r: v["gamme"] for r, v in per["exceptions"].items()
                  if not r.startswith("_")}
    return familles, exceptions

# Bornes des colonnes, relevées sur les rectangles de la mise en page.
COLONNES = [
    ("page", 0, 28),
    ("produit", 28, 87),
    ("designation", 87, 287),
    ("new", 287, 310),
    ("coloris", 310, 370),
    ("reference", 370, 420),
    ("prix", 420, 474),
    ("eco", 474, 511),
    ("ean", 511, 9999),
]

# Le gros des références suit « lettres + deux chiffres », mais le tarif
# en compte quelques-unes hors format : STRP2-SEAT, RJ-PROS01NR,
# SECVIE01_KIT. Les écarter perdrait la poutre Tecseat et le repose-jambe
# Proseat, deux produits que le client vend.
REFERENCE = re.compile(r"[A-Z]{2,6}\d{1,2}[A-Z0-9_\-]*|[A-Z]{2}-[A-Z0-9]+")


def colonne(x):
    for nom, a, b in COLONNES:
        if a <= x < b:
            return nom
    return None


def montant(s):
    m = re.search(r"([\d\s]+,\d{2})", s or "")
    return float(m.group(1).replace(" ", "").replace(",", ".")) if m else None


def racine(ref):
    """Lettres et chiffres de tête.

    Sert à rapprocher les déclinaisons d'un même produit, jamais à leur
    attribuer un prix : c'est le groupe du tableau qui le donne.
    """
    m = re.match(r"([A-Z]{2,6}\d{1,2})", ref)
    return m.group(1) if m else ref.split("-")[0]


# Chaque colonne fusionnée a sa propre trame, et c'est l'étendue du filet
# qui la donne. Un trait qui part de la colonne DÉSIGNATION mais s'arrête
# à l'entrée des prix (x 87→420) change de désignation sans rompre la
# cellule de prix : deux désignations peuvent partager un tarif. Prendre
# la même trame pour tout le monde, c'est perdre le prix de la seconde.
TRAMES = {
    "page_catalogue": lambda r: r["x0"] < 10,
    "produit": lambda r: r["x0"] < 30,
    "designation": lambda r: r["x0"] < 95,
    "prix": lambda r: r["x1"] > 470,
}


def separations(page, retient):
    """Les ordonnées où se ferme une cellule fusionnée de cette colonne."""
    ys = set()
    for r in page.rects:
        if (r["bottom"] - r["top"]) < 2 and (r["x1"] - r["x0"]) > 100 and retient(r):
            ys.add(round(r["top"], 1))
    return sorted(ys)


def bande(ys, y):
    """L'indice de la bande de cette trame qui contient l'ordonnée y."""
    i = 0
    for k, borne in enumerate(ys):
        if y >= borne:
            i = k + 1
    return i


def lignes(page):
    """Les mots de la page, groupés en lignes et ventilés par colonne."""
    par_y = defaultdict(lambda: defaultdict(list))
    for mot in page.extract_words(use_text_flow=False):
        col = colonne(mot["x0"])
        if col:
            par_y[round(mot["top"], 1)][col].append((mot["x0"], mot["text"]))
    out = []
    for y in sorted(par_y):
        cellule = {c: " ".join(t for _, t in sorted(v)) for c, v in par_y[y].items()}
        cellule["_y"] = y
        out.append(cellule)
    return out


def groupes_de(page):
    """Chaque référence de la page, avec les cellules qui la surplombent.

    On lit chaque colonne fusionnée dans sa propre trame : la référence
    hérite de la valeur écrite dans la bande où elle tombe.
    """
    lg = lignes(page)
    trames = {nom: separations(page, f) for nom, f in TRAMES.items()}

    # La valeur portée par chaque bande, colonne par colonne.
    valeurs = {nom: {} for nom in TRAMES}
    sources = {"page_catalogue": "page", "produit": "produit",
               "designation": "designation", "prix": "prix"}
    for nom, col in sources.items():
        for l in lg:
            if l.get(col):
                valeurs[nom].setdefault(bande(trames[nom], l["_y"]), l[col])
    # L'écotaxe suit la trame des prix.
    eco = {}
    for l in lg:
        if l.get("eco"):
            eco.setdefault(bande(trames["prix"], l["_y"]), l["eco"])

    out = []
    for l in lg:
        brut = (l.get("reference") or "").strip()
        if not REFERENCE.fullmatch(brut):
            continue
        y = l["_y"]
        out.append({
            "reference": brut,
            "coloris": l.get("coloris", ""),
            "ean": l.get("ean", ""),
            "designation": valeurs["designation"].get(bande(trames["designation"], y), ""),
            "produit": valeurs["produit"].get(bande(trames["produit"], y), ""),
            "page_catalogue": valeurs["page_catalogue"].get(bande(trames["page_catalogue"], y), ""),
            "prix": montant(valeurs["prix"].get(bande(trames["prix"], y), "")),
            "ecotaxe": montant(eco.get(bande(trames["prix"], y), "")),
        })
    return out


def main():
    if not TARIF.exists():
        print(f"{TARIF.name} introuvable")
        return 1

    familles, exceptions = perimetre()
    ECARTEES = set(json.loads(NOMS.read_text(encoding="utf-8"))["_perimetre"]["ecartees"])
    inconnues = set()

    sortie = []
    with pdfplumber.open(TARIF) as pdf:
        for numero, page in enumerate(pdf.pages, 1):
            for r in groupes_de(page):
                pc = re.search(r"\d{1,3}", r["page_catalogue"] or "")
                fam = re.sub(r"\s+", " ", (r["produit"] or "").strip().upper())
                gamme = exceptions.get(r["reference"], familles.get(fam))
                if gamme is None and fam not in ECARTEES:
                    inconnues.add(fam)
                sortie.append({
                    "reference": r["reference"],
                    "famille": fam,
                    "gamme": gamme,
                    "racine": racine(r["reference"]),
                    "coloris": r["coloris"],
                    "designation": r["designation"],
                    "produit": r["produit"],
                    "prix": r["prix"],
                    "ecotaxe": r["ecotaxe"],
                    "ean": r["ean"],
                    "page_catalogue": int(pc.group()) if pc else None,
                    "page_tarif": numero,
                })

    # Une référence peut apparaître deux fois si elle est vendue dans deux
    # configurations : on garde la première et on le signale.
    vues, dedup, doublons = set(), [], []
    for x in sortie:
        if x["reference"] in vues:
            doublons.append(x["reference"])
            continue
        vues.add(x["reference"])
        dedup.append(x)

    SORTIE.write_text(json.dumps(dedup, ensure_ascii=False, indent=1),
                      encoding="utf-8")

    sans_prix = [x for x in dedup if x["prix"] is None]
    sans_page = [x for x in dedup if x["page_catalogue"] is None]
    retenues = [x for x in dedup if x["gamme"]]
    print(f"{len(dedup)} références extraites")
    print(f"  dans les gammes retenues : {len(retenues)}")
    print(f"  hors périmètre           : {len(dedup) - len(retenues)}")
    print(f"  sans prix          : {len(sans_prix)}")
    print(f"  sans page catalogue: {len(sans_page)}")
    print(f"  doublons ignorés   : {len(doublons)}")
    if sans_prix:
        print("\n  SANS PRIX :")
        for x in sans_prix[:15]:
            print(f"     {x['reference']:16} {x['designation'][:52]}")
    if inconnues:
        # Une famille que le périmètre ne nomme pas est un trou : ni
        # retenue, ni écartée pour une raison écrite. On la signale plutôt
        # que de la laisser filer en « hors périmètre » par défaut.
        print("\n  FAMILLES INCONNUES DU PÉRIMÈTRE — à trancher dans "
              "noms-officepro.json :")
        for f in sorted(inconnues):
            print(f"     {f}")
    if doublons:
        print(f"\n  DOUBLONS : {doublons[:15]}")

    par_racine = defaultdict(set)
    for x in dedup:
        par_racine[x["racine"]].add(x["prix"])
    multi = {k: v for k, v in par_racine.items() if len(v) > 1}
    print(f"\n  racines portant plusieurs prix : {len(multi)}")
    for k, v in list(multi.items())[:10]:
        print(f"     {k} : {sorted(x for x in v if x is not None)}")

    print(f"\nÉcrit → {SORTIE.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
