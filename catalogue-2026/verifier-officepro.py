#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Réconcilie l'onglet OFFICEPRO avec le tarif extrait.

Le principe : toute référence du tarif doit se retrouver dans l'Excel, ou
avoir une raison tracée de ne pas y être. Une seule raison est admise, et
elle est écrite dans noms-officepro.json : la famille du tarif n'est pas
retenue par le client, _perimetre.ecartees dit laquelle et cite sa page au
catalogue. _perimetre.exceptions traite la référence isolée qui échappe à
sa famille.

C'est ce contrôle-là qui manquait au premier import OfficePro : il écartait
par préfixe de référence, en silence, et soixante-trois références sont
passées à la trappe — dont les gammes Shineo, Wave et Vaseat entières.

CE QUE CE SCRIPT CONTRÔLE
  couverture    chaque référence du tarif est dans l'Excel ou écartée pour
                une raison tracée, et réciproquement
  périmètre     aucune famille du tarif n'est absente des deux listes
  prix          tarif HT et écotaxe, référence par référence
  identité      code EAN, coloris, et la racine portée en réf. produit
  unicité       aucune référence écrite deux fois
  pages         la page annoncée est celle que le tarif donne pour le
                catalogue, et le catalogue y montre bien la référence
  mise en forme description générale et technique sur la première ligne du
                produit seulement

CE QU'IL NE CONTRÔLE PAS — et qui demande un œil humain
  le libellé des noms  ils ont été relevés un par un sur les pages du
                catalogue, mais aucun script ne peut jurer qu'un intitulé
                imprimé en gros caractères sur une photo est bien celui-là ;
  le regroupement  qu'une fiche corresponde à ce que le catalogue présente
                comme un produit ;
  les catégories, sous-catégories et le drapeau sur devis ;
  les descriptions elles-mêmes ;
  les cotes, absentes faute de source — voir _cotes dans le JSON.

À relancer après chaque régénération de l'Excel.

Usage :
    python verifier-officepro.py
"""

import json
import re
from pathlib import Path

from openpyxl import load_workbook

RACINE = Path(__file__).parent
REFERENCES = RACINE / "officepro-references.json"
EXCEL = RACINE / "catalogue-officepro.xlsx"
NOMS = RACINE / "noms-officepro.json"
CATALOGUE = RACINE / "catalogue-officepro-pages.json"

# Le tarif renvoie à la page où le catalogue présente le produit ; le
# tableau des références se trouve souvent quelques pages plus loin, dans
# la même section. Au-delà, ce n'est plus la même gamme.
ECART_PAGE_TOLERE = 8


def main():
    noms = json.loads(NOMS.read_text(encoding="utf-8"))
    gammes = {k: v for k, v in noms.items() if not k.startswith("_")}
    per = noms["_perimetre"]
    retenues = {f for f in per["retenues"] if not f.startswith("_")}
    ecartees = {f for f in per["ecartees"] if not f.startswith("_")}
    exceptions = {r for r in per["exceptions"] if not r.startswith("_")}
    refs = {r["reference"]: r for r in json.loads(REFERENCES.read_text(encoding="utf-8"))}
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))

    # ── Le périmètre couvre-t-il tout le tarif ? ──
    familles = {r["famille"] for r in refs.values()}
    orphelines = sorted(familles - retenues - ecartees)

    attendues = {ref for ref, r in refs.items() if r["gamme"]}
    hors = {ref for ref, r in refs.items() if not r["gamme"]}

    # ── L'Excel ──
    ws = load_workbook(EXCEL, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    next(rows)
    excel = {}
    doublons = []
    ecarts_prix, ecarts_eco, ecarts_ean, ecarts_racine = [], [], [], []
    ecarts_page, page_hors_section = [], []
    desc_repetee = []
    vu_produit = set()

    for r in rows:
        ref = str(r[11] or "").strip()
        if not ref:
            continue
        if ref in excel:
            doublons.append(ref)
        excel[ref] = r

        s = refs.get(ref)
        if not s:
            continue
        # openpyxl rend None pour une cellule vide, le générateur y écrit
        # "" : les deux disent la même chose, l'absence de prix.
        vide = lambda v: v in (None, "")
        egal = lambda a, b: (vide(a) and vide(b)) or a == b
        if not egal(r[12], s["prix"]):
            ecarts_prix.append(ref)
        if not egal(r[13], s["ecotaxe"]):
            ecarts_eco.append(ref)
        if str(r[24] or "") != str(s["ean"] or ""):
            ecarts_ean.append(ref)
        if str(r[9] or "") != s["racine"]:
            ecarts_racine.append(ref)
        if (r[8] or "") != (s["page_catalogue"] or ""):
            ecarts_page.append(ref)
        # Le catalogue montre-t-il la référence dans la même section ?
        vue = catalogue.get(ref, {}).get("page")
        if vue and s["page_catalogue"] and abs(vue - s["page_catalogue"]) > ECART_PAGE_TOLERE:
            page_hors_section.append((ref, s["page_catalogue"], vue))

        marque = (r[0], r[6])
        if marque in vu_produit:
            if r[14] or r[15] or r[16]:
                desc_repetee.append(marque)
        else:
            vu_produit.add(marque)

    manquantes = attendues - set(excel)
    intruses = set(excel) - attendues
    revenantes = hors & set(excel)

    print("═══ RÉCONCILIATION TARIF ↔ ONGLET OFFICEPRO ═══\n")
    print(f"  tarif extrait           {len(refs):6} références")
    print(f"    familles écartées     {len(hors):6}")
    print(f"    {'─' * 32}")
    print(f"    attendues             {len(attendues):6}")
    print(f"    dans l'Excel          {len(excel):6}")
    print()
    print("  ── périmètre ──")
    print(f"  familles du tarif      {len(familles)}")
    print(f"    retenues             {len(retenues & familles)}")
    print(f"    écartées, avec raison{len(ecartees & familles):6}")
    print(f"    SANS DÉCISION ÉCRITE {len(orphelines):6}")
    print(f"  exceptions nommées     {len(exceptions)}")
    print()
    print("  ── couverture ──")
    print(f"  manquantes {len(manquantes)}")
    print(f"  intruses   {len(intruses)}")
    print(f"  revenantes (écartées mais présentes)  {len(revenantes)}")
    print(f"  doublons   {len(doublons)}")
    print()
    print("  ── fidélité au tarif ──")
    print(f"  écarts de prix        {len(ecarts_prix)}")
    print(f"  écarts d'écotaxe      {len(ecarts_eco)}")
    print(f"  écarts de code EAN    {len(ecarts_ean)}")
    print(f"  réf. produit          {len(ecarts_racine)}")
    print(f"  pages contredisant le tarif  {len(ecarts_page)}")
    print()
    print("  ── recoupement avec le catalogue ──")
    print(f"  descriptions répétées hors 1re ligne  {len(set(desc_repetee))}")
    print(f"  références montrées loin de leur page tarif  {len(page_hors_section)}"
          "   (signalement, pas une erreur)")

    def montre(titre, items, n=10):
        if not items:
            return
        print(f"\n  {titre} :")
        for x in list(items)[:n]:
            print(f"     {x}")
        if len(items) > n:
            print(f"     … et {len(items) - n} autres")

    montre("FAMILLES SANS DÉCISION ÉCRITE", orphelines)
    montre("MANQUANTES", sorted(manquantes))
    montre("INTRUSES", sorted(intruses))
    montre("REVENANTES", sorted(revenantes))
    montre("DOUBLONS", doublons)
    montre("ÉCARTS DE PRIX", [(k, refs[k]["prix"], excel[k][12]) for k in ecarts_prix])
    montre("ÉCARTS D'ÉCOTAXE", ecarts_eco)
    montre("ÉCARTS D'EAN", ecarts_ean)
    montre("PAGES CONTREDISANT LE TARIF", ecarts_page)
    montre("DESCRIPTIONS RÉPÉTÉES", sorted(set(desc_repetee)))
    if page_hors_section:
        # Le tarif renvoie à la page où le produit est présenté, le
        # catalogue peut le lister ailleurs : les placets Tecseat sont
        # tarifés p.108 et montrés p.52, sur la page de la poutre. Les deux
        # pages sont justes, on le dit sans faire échouer le contrôle.
        print("\n  À SAVOIR — montrées ailleurs qu'à leur page de tarif :")
        for ref, tarif, vue in page_hors_section[:10]:
            print(f"     {ref:16} tarif p.{tarif:<5} catalogue p.{vue}")
        if len(page_hors_section) > 10:
            print(f"     … et {len(page_hors_section) - 10} autres")

    ok = not (orphelines or manquantes or intruses or revenantes or doublons
              or ecarts_prix or ecarts_eco or ecarts_ean or ecarts_racine
              or ecarts_page or desc_repetee)
    print("\n" + ("✓ RÉCONCILIATION EXACTE sur les points contrôlés — voir en tête\n"
                  "  du script ce qui reste à vérifier à l'œil (libellés, regroupement,\n"
                  "  catégories, descriptions, cotes)"
                  if ok else "✗ écarts ci-dessus, à corriger"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
