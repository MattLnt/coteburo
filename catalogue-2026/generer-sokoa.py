#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère l'onglet SOKOA de l'Excel catalogue Côté BURO.

Une ligne par déclinaison. Chez Sokoa une déclinaison n'est pas un coloris
mais une CATÉGORIE de revêtement : le prix dépend d'elle — B, B+, C, D, E, H
pour les tissus, PP, Bois, Mélaminé ou Métal selon les produits — et le
coloris se choisit ensuite dans le nuancier de la catégorie retenue. Une
même référence sort donc sur autant de lignes qu'elle a de catégories
tarifées.

Sources, dans le même dossier que ce script :
    sokoa-references.json   le tarif-catalogue extrait (parser-sokoa.py)
    noms-sokoa.json         le regroupement en fiches et le périmètre

Les noms viennent du catalogue sans réécriture : Sokoa titre lui-même chaque
tableau de prix, et ce titre est le produit.

Les cotes du catalogue sont en millimètres, converties ici en centimètres.
La hauteur d'assise, qui n'a pas de colonne, part dans la description
technique avec les autres mesures.

Sortie :
    catalogue-sokoa.xlsx

Usage :
    pip install openpyxl
    python generer-sokoa.py
"""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

RACINE = Path(__file__).parent
REFERENCES = RACINE / "sokoa-references.json"
NOMS = RACINE / "noms-sokoa.json"
SORTIE = RACINE / "catalogue-sokoa.xlsx"

COLONNES = [
    ("Gamme", 18), ("Nature", 11), ("Sur devis", 10),
    ("Catégorie", 22), ("Sous-catégorie 1", 28), ("Sous-catégorie 2", 24),
    ("Nom sur le site", 52), ("Désignation fournisseur", 50),
    ("Page cat.", 10),
    ("Réf. produit", 16), ("Réf. finition", 32), ("Réf. complète", 26),
    ("Tarif HT", 10), ("Écotaxe", 9),
    ("Description générale", 46), ("Description technique", 52),
    ("Options (réf.)", 26),
    ("Larg. min", 10), ("Larg. max", 10),
    ("Prof. min", 10), ("Prof. max", 10),
    ("Haut. min", 10), ("Haut. max", 10),
    ("Poids (kg)", 10), ("Code EAN", 15),
]

MULTILIGNE = (15, 16)

# Le nom d'usage des catégories de revêtement, tel que le site les nomme
# déjà dans sa bibliothèque de finitions.
LIBELLE = {"B": "Tissu B", "B+": "Tissu B+", "C": "Tissu C", "D": "Tissu D",
           "E": "Tissu E", "H": "Tissu H"}

# « * C = Spazio exclu » : la note dit à quelle catégorie elle s'applique.
NOTE = re.compile(r"^\*+\s*([A-Z+]{1,2}(?:\s*/\s*[A-Z+]{1,2})*)\s*=\s*(.+)$")


def restrictions(notes):
    """Catégorie → texte de la note qui restreint son nuancier."""
    out = {}
    for n in notes:
        m = NOTE.match(n.strip())
        if not m:
            continue
        texte = m.group(2).strip()
        for cat in re.split(r"\s*/\s*", m.group(1)):
            out.setdefault(cat.strip(), texte)
    return out


def cm(mm):
    """Une cote du catalogue, des millimètres aux centimètres."""
    return round(mm / 10, 1)


def technique(cotes):
    """Les cotes en section « ## Titre » puis puces, format du répéteur."""
    if not cotes:
        return ""
    etiquettes = [("hauteur", "Hauteur"), ("largeur", "Largeur"),
                  ("profondeur", "Profondeur"), ("assise", "Hauteur d'assise"),
                  ("diametre", "Diamètre du piètement")]
    puces = []
    for cle, libelle in etiquettes:
        v = cotes.get(cle)
        if not v:
            continue
        a, b = cm(v[0]), cm(v[1])
        puces.append(f"- {libelle} : {a} cm" if a == b
                     else f"- {libelle} : de {a} à {b} cm")
    return "## Dimensions\n" + "\n".join(puces) if puces else ""


def entetes(ws):
    fond = PatternFill("solid", fgColor="23262A")
    police = Font(color="FFFFFF", bold=True, size=10)
    for i, (titre, largeur) in enumerate(COLONNES, 1):
        c = ws.cell(row=1, column=i, value=titre)
        c.fill = fond
        c.font = police
        c.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = largeur
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(COLONNES))}1"


def main():
    noms = json.loads(NOMS.read_text(encoding="utf-8"))
    gammes = {k: v for k, v in noms.items() if not k.startswith("_")}
    ecartees = set(noms["_perimetre"]["ecartees"])

    # Le tarif, indexé par la fiche à laquelle chaque ligne appartient : une
    # même référence peut être présentée deux fois, sous deux produits
    # différents — chez Adela, le même code sort en dos résille et en dos PP,
    # à deux prix. C'est le bloc du catalogue qui les distingue, pas la page.
    tarif = defaultdict(list)
    for x in json.loads(REFERENCES.read_text(encoding="utf-8")):
        tarif[(x["gamme"], x["rubrique"], x["titre_bloc"], x["reference"])].append(x)

    out = Workbook()
    ws = out.active
    ws.title = "SOKOA"
    entetes(ws)

    ligne = 2
    stats = Counter()
    manquantes = []

    for gamme, conf in gammes.items():
        if gamme in ecartees:
            stats["gammes écartées"] += 1
            continue
        affichee = conf.get("gamme_affichee", gamme)
        cat = conf.get("categorie", "")
        sous = conf.get("sous_categories", [])
        devis = "Oui" if conf.get("sur_devis") else "Non"
        opts = ", ".join(conf.get("options_refs", []))

        for produit in conf["produits"]:
            stats["fiches"] += 1
            nom = f"{produit['nom']} - {affichee}"
            page = produit.get("page")
            premiere = True

            for ref in produit["refs"]:
                titre = produit.get("titre_bloc", produit["nom"])
                if titre == "(sans titre au catalogue)":
                    titre = ""
                lignes_tarif = tarif.get((gamme, produit.get("rubrique", ""), titre, ref), [])
                if not lignes_tarif:
                    manquantes.append((gamme, ref, page))
                    continue

                cotes = lignes_tarif[0].get("cotes") or {}
                # La fiche a son propre texte quand il en a été écrit un ;
                # sinon elle retombe sur celui de la gamme. Deux fiches
                # d'une même gamme ne doivent pas servir le même contenu :
                # vingt pages identiques, c'est du duplicata aux yeux d'un
                # moteur de recherche.
                desc = produit.get("description") or conf.get("description", "")
                brut = produit.get("technique") or conf.get("technique", [])
                # Une ligne vide sépare les sections : sans elle, « ## Dimensions »
                # se colle à la dernière puce et le répéteur les fond en une.
                tech = "\n\n".join(filter(None, ["\n".join(brut).rstrip(),
                                                 technique(cotes)]))
                notes = restrictions(lignes_tarif[0].get("notes") or [])

                L = cotes.get("largeur") or cotes.get("diametre")
                P = cotes.get("profondeur") or cotes.get("diametre")
                H = cotes.get("hauteur")

                # Une gamme peut être présentée deux fois dans le document —
                # Azkar ouvre la section Direction p.28 et revient en Ergo
                # p.58, tableau identique. Une seule ligne par catégorie
                # suffit ; si les deux présentations divergeaient sur le
                # prix, le vérificateur le dirait.
                par_categorie = {}
                for x in lignes_tarif:
                    par_categorie.setdefault(x["categorie"], x)

                for categorie in sorted(par_categorie):
                    x = par_categorie[categorie]
                    finition = LIBELLE.get(categorie, categorie)
                    if x.get("restreinte") and notes.get(categorie):
                        finition = f"{finition} — {notes[categorie]}"

                    vals = [
                        gamme, produit["nature"], devis, cat,
                        sous[0] if sous else "", sous[1] if len(sous) > 1 else "",
                        nom, x.get("titre_bloc", ""), page,
                        x.get("code", ref), finition, ref,
                        x["prix"], x.get("ecotaxe") or "",
                        desc if premiere else "",
                        tech if premiere else "",
                        opts if premiere else "",
                        cm(L[0]) if L else "", cm(L[1]) if L else "",
                        cm(P[0]) if P else "", cm(P[1]) if P else "",
                        cm(H[0]) if H else "", cm(H[1]) if H else "",
                        x.get("poids") or "", "",
                    ]
                    for j, v in enumerate(vals, 1):
                        ws.cell(row=ligne, column=j, value=v)
                    for j in MULTILIGNE:
                        ws.cell(row=ligne, column=j).alignment = Alignment(
                            wrap_text=True, vertical="top"
                        )
                    ligne += 1
                    stats["lignes"] += 1
                    premiere = False

    out.save(SORTIE)

    retenues = [g for g in gammes if g not in ecartees]
    print(f"{stats['lignes']} lignes · {stats['fiches']} fiches · "
          f"{len(retenues)} gammes")
    if ecartees:
        print(f"  {len(ecartees)} gammes écartées par le périmètre client")
    if manquantes:
        print(f"\n  {len(manquantes)} références introuvables au tarif :")
        for g, r, p in manquantes[:10]:
            print(f"     {g} · {r} (page {p})")
    print(f"\nÉcrit → {SORTIE.name}")


if __name__ == "__main__":
    main()
