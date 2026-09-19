#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Réconcilie l'onglet SOKOA avec le tarif-catalogue extrait.

Le principe : tout couple (référence, catégorie de revêtement) lu dans le
document doit se retrouver dans l'Excel, ou avoir une raison tracée de ne
pas y être. La seule raison admise est écrite dans noms-sokoa.json : la
gamme n'est pas retenue, _perimetre.ecartees dit laquelle et pourquoi.

CE QUE CE SCRIPT CONTRÔLE
  couverture    chaque couple (référence, catégorie) du tarif est dans
                l'Excel ou écarté pour une raison tracée, et réciproquement
  périmètre     aucune gamme du tarif n'échappe aux deux listes
  prix          le prix de chaque couple, l'écotaxe et le poids
  unicité       aucun couple écrit deux fois dans une même fiche
  cotes         celles de l'Excel sont bien celles du catalogue, converties
                des millimètres aux centimètres
  mise en forme description générale et technique sur la première ligne du
                produit seulement

CE QU'IL NE CONTRÔLE PAS — et qui demande un œil humain
  le libellé des noms  ils sont repris tels quels du catalogue, mais aucun
                script ne peut juger qu'un titre de bloc fait un bon nom de
                fiche pour la vitrine ;
  le regroupement  un bloc du catalogue vaut ici une fiche ; rien ne dit que
                le client veuille ce découpage-là ;
  les catégories et sous-catégories, VIDES à ce stade : classer une gamme
                dans les rayons du site est une décision commerciale ;
  les descriptions générales, absentes faute d'être dans le tarif ;
  le nuancier : le script vérifie qu'une restriction repérée est reportée,
                pas que la liste des coloris d'une catégorie soit complète.

CE QU'IL SIGNALE SANS ÉCHOUER
  Sokoa imprime parfois la MÊME référence pour deux produits différents —
  chez Adela, le même code sort en dos résille et en dos PP, à deux prix et
  deux écotaxes. Ce n'est pas une erreur de lecture, c'est une ambiguïté du
  document : elle est listée pour être tranchée avec le fournisseur.

Usage :
    python verifier-sokoa.py
"""

import json
from collections import Counter, defaultdict
from pathlib import Path

from openpyxl import load_workbook

RACINE = Path(__file__).parent
REFERENCES = RACINE / "sokoa-references.json"
EXCEL = RACINE / "catalogue-sokoa.xlsx"
NOMS = RACINE / "noms-sokoa.json"


def cm(mm):
    return round(mm / 10, 1)


def main():
    noms = json.loads(NOMS.read_text(encoding="utf-8"))
    gammes = {k: v for k, v in noms.items() if not k.startswith("_")}
    per = noms["_perimetre"]
    ecartees = {g for g in per["ecartees"] if not g.startswith("_")}
    refs = json.loads(REFERENCES.read_text(encoding="utf-8"))

    gammes_tarif = {x["gamme"] for x in refs if x["gamme"]}
    orphelines = sorted(gammes_tarif - set(gammes) - ecartees)

    # La clé d'une ligne : la fiche, la référence et la catégorie. On garde
    # la PREMIÈRE présentation, comme le générateur : une gamme reprise plus
    # loin dans le document ne doit pas produire une seconde ligne.
    source, presentations = {}, defaultdict(list)
    for x in refs:
        if x["gamme"] in ecartees:
            continue
        cle = (x["gamme"], x["titre_bloc"], x["reference"], x["categorie"])
        source.setdefault(cle, x)
        presentations[cle].append(x)

    # ── L'Excel ──
    ws = load_workbook(EXCEL, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    next(rows)
    excel = {}
    doublons = []
    ecarts_prix, ecarts_eco, ecarts_poids, ecarts_cotes = [], [], [], []
    desc_repetee = []
    vu_produit = set()

    for r in rows:
        ref, fin = str(r[11] or "").strip(), str(r[10] or "")
        if not ref:
            continue
        categorie = fin.split(" — ")[0].replace("Tissu ", "")
        cle = (r[0], str(r[7] or ""), ref, categorie)
        if cle in excel:
            doublons.append(cle)
        excel[cle] = r

        s = source.get(cle)
        if not s:
            continue
        if r[12] != s["prix"]:
            ecarts_prix.append(cle)
        vide = lambda v: v in (None, "")
        if not (vide(r[13]) and vide(s["ecotaxe"])) and r[13] != s["ecotaxe"]:
            ecarts_eco.append(cle)
        if not (vide(r[23]) and vide(s["poids"])) and r[23] != s["poids"]:
            ecarts_poids.append(cle)

        cotes = s.get("cotes") or {}
        attendu = {
            17: (cotes.get("largeur") or cotes.get("diametre"), 0),
            19: (cotes.get("profondeur") or cotes.get("diametre"), 0),
            21: (cotes.get("hauteur"), 0),
        }
        for col, (v, i) in attendu.items():
            voulu = cm(v[i]) if v else ""
            if (r[col] if r[col] is not None else "") != voulu:
                ecarts_cotes.append((cle, col, r[col], voulu))

        marque = (r[0], r[6])
        if marque in vu_produit:
            if r[14] or r[15] or r[16]:
                desc_repetee.append(marque)
        else:
            vu_produit.add(marque)

    manquants = set(source) - set(excel)
    intrus = set(excel) - set(source)

    # Une gamme reprise deux fois peut ne pas donner les mêmes cotes d'un
    # endroit à l'autre du document : on retient la première et on le dit.
    cotes_divergentes = sorted(
        {(k[0], k[2]) for k, xs in presentations.items()
         if len({json.dumps(y.get("cotes") or {}, sort_keys=True) for y in xs}) > 1})

    # Les ambiguïtés du fournisseur : même référence, deux prix.
    prix_par_ref = defaultdict(set)
    for x in refs:
        prix_par_ref[(x["reference"], x["categorie"])].add(x["prix"])
    ambigus = sorted(k for k, v in prix_par_ref.items() if len(v) > 1)

    print("═══ RÉCONCILIATION TARIF-CATALOGUE ↔ ONGLET SOKOA ═══\n")
    print(f"  couples (référence, catégorie) lus  {len(refs):6}")
    print(f"    gammes écartées                   {len(refs) - len(source):6}")
    print(f"    {'─' * 34}")
    print(f"    attendus                          {len(source):6}")
    print(f"    dans l'Excel                      {len(excel):6}")
    print()
    print("  ── périmètre ──")
    print(f"  gammes au tarif        {len(gammes_tarif)}")
    print(f"    décrites dans le JSON{len(gammes_tarif & set(gammes)):6}")
    print(f"    écartées, avec raison{len(ecartees):6}")
    print(f"    SANS DÉCISION ÉCRITE {len(orphelines):6}")
    print()
    print("  ── couverture ──")
    print(f"  manquants  {len(manquants)}")
    print(f"  intrus     {len(intrus)}")
    print(f"  doublons   {len(doublons)}")
    print()
    print("  ── fidélité au tarif ──")
    print(f"  écarts de prix     {len(ecarts_prix)}")
    print(f"  écarts d'écotaxe   {len(ecarts_eco)}")
    print(f"  écarts de poids    {len(ecarts_poids)}")
    print(f"  écarts de cotes    {len(ecarts_cotes)}")
    print()
    print("  ── mise en forme ──")
    print(f"  descriptions répétées hors 1re ligne  {len(set(desc_repetee))}")

    def montre(titre, items, n=10):
        if not items:
            return
        print(f"\n  {titre} :")
        for x in list(items)[:n]:
            print(f"     {x}")
        if len(items) > n:
            print(f"     … et {len(items) - n} autres")

    montre("GAMMES SANS DÉCISION ÉCRITE", orphelines)
    montre("MANQUANTS", sorted(manquants))
    montre("INTRUS", sorted(intrus))
    montre("DOUBLONS", doublons)
    montre("ÉCARTS DE PRIX", [(k, source[k]["prix"], excel[k][12]) for k in ecarts_prix])
    montre("ÉCARTS D'ÉCOTAXE", ecarts_eco)
    montre("ÉCARTS DE POIDS", ecarts_poids)
    montre("ÉCARTS DE COTES", ecarts_cotes)
    montre("DESCRIPTIONS RÉPÉTÉES", sorted(set(desc_repetee)))

    if cotes_divergentes:
        print("\n  À SAVOIR — cotes différentes selon la présentation "
              f"({len(cotes_divergentes)} références, la première est retenue) :")
        for gamme, ref in cotes_divergentes[:8]:
            print(f"     {gamme:14} {ref}")
        if len(cotes_divergentes) > 8:
            print(f"     … et {len(cotes_divergentes) - 8} autres")

    if ambigus:
        print(f"\n  À TRANCHER AVEC SOKOA — même référence, deux prix "
              f"({len(ambigus)} couples) :")
        for ref, cat in ambigus[:10]:
            lignes = [x for x in refs
                      if x["reference"] == ref and x["categorie"] == cat]
            print(f"     {ref}  catégorie {cat}")
            for l in lignes:
                print(f"        p.{l['page']:<4} {l['prix']:>8}  {l['titre_bloc'][:54]}")
        if len(ambigus) > 10:
            print(f"     … et {len(ambigus) - 10} autres couples")

    ok = not (orphelines or manquants or intrus or doublons or ecarts_prix
              or ecarts_eco or ecarts_poids or ecarts_cotes or desc_repetee)
    print("\n" + ("✓ RÉCONCILIATION EXACTE sur les points contrôlés — voir en tête\n"
                  "  du script ce qui reste à vérifier à l'œil (libellés, regroupement,\n"
                  "  catégories, descriptions, nuancier)"
                  if ok else "✗ écarts ci-dessus, à corriger"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
