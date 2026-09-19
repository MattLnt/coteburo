#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Réconcilie l'Excel catalogue avec le tarif source.

Le principe : toute ligne du tarif doit se retrouver dans l'Excel, ou avoir
une raison tracée de ne pas y être. Trois raisons sont admises, et chacune
est écrite dans noms-produits.json, jamais dans ce script :

  · la gamme est hors du périmètre — retrait fournisseur ou choix du client,
    _hors_perimetre dit lequel et cite sa page ;
  · la référence est retirée par la rationalisation 2026, via la liste
    supprimees_2026 de sa gamme ;
  · la finition quitte la collection, via _rationalisation_2026.finitions.

Le reste est une erreur.

CE QUE CE SCRIPT CONTRÔLE
  couverture    chaque ligne du tarif est dans l'Excel ou écartée pour une
                raison tracée, et réciproquement
  prix          tarif HT et écotaxe, ligne à ligne
  identité      poids, code EAN, et la cohérence réf. produit / réf. finition
                / réf. complète
  unicité       aucune ligne écrite deux fois
  mise en forme description générale et technique sur la première ligne du
                produit seulement

CE QU'IL NE CONTRÔLE PAS — et qui demande un œil humain
  les noms       il vérifie qu'ils existent et que la page annoncée est celle
                 où le catalogue montre la référence, mais pas que le libellé
                 soit bien celui du catalogue ;
  le regroupement  qu'une fiche corresponde à ce que le catalogue présente
                 comme un produit ;
  les catégories, sous-catégories et le drapeau sur devis ;
  les descriptions elles-mêmes.

À relancer après chaque régénération de l'Excel.

Usage :
    python verifier-catalogue.py
"""

import json
from pathlib import Path

from openpyxl import load_workbook

from rationalisation import finition_retiree

RACINE = Path(__file__).parent
TARIF = RACINE / "buronomic.xlsx"
EXCEL = RACINE / "catalogue-buronomic.xlsx"
NOMS = RACINE / "noms-produits.json"
CATALOGUE = RACINE / "catalogue-pages-cotes.json"


def main():
    noms = json.loads(NOMS.read_text(encoding="utf-8"))
    gammes = {k: v for k, v in noms.items() if not k.startswith("_")}
    perim = noms["_hors_perimetre"]
    hors_gammes = ({g for g in perim["retrait_fournisseur"] if not g.startswith("_")}
                   | {g for g in perim["non_retenue"] if not g.startswith("_")})
    regles = noms["_rationalisation_2026"]["finitions"]
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))

    # ── Le tarif source, par code article ──
    wb = load_workbook(TARIF, read_only=True)
    rows = wb["Kits 2026"].iter_rows(values_only=True)
    next(rows)
    next(rows)
    source = {}
    for r in rows:
        if not r or not r[1] or not r[2]:
            continue
        gamme, article = str(r[1]).strip(), str(r[2]).strip()
        source[(gamme, article)] = {
            "prix": (r[6], r[7]),
            "racine": str(r[3]).strip() if r[3] else "",
            "finition": r[5],
            "poids": r[8],
            "ean": r[11],
        }

    # ── Les références écartées par la rationalisation ──
    supprimees = {}
    for gamme, conf in gammes.items():
        for ref in conf.get("supprimees_2026", []):
            supprimees.setdefault(gamme, set()).add(ref)

    hors = {k for k in source if k[0] in hors_gammes}
    par_ref = {k for k, v in source.items()
               if k not in hors and k[0] in supprimees and v["racine"] in supprimees[k[0]]}
    par_finition = {k for k, v in source.items()
                    if k not in hors and k not in par_ref
                    and finition_retiree(k[0], v["finition"], regles)}

    # ── L'Excel généré ──
    ws = load_workbook(EXCEL, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    next(rows)
    excel = {}
    doublons = []
    sans_tarif = 0
    ecarts_prix, ecarts_poids, ecarts_ean, ecarts_ref, ecarts_page = [], [], [], [], []
    desc_repetee = []
    vu_produit = {}
    for r in rows:
        if not r[11]:
            # Gamme sans tarif — Essentielle, Oasys.
            sans_tarif += 1
            continue
        cle = (r[0], str(r[11]).strip())
        if cle in excel:
            doublons.append(cle)
        excel[cle] = r

        s = source.get(cle)
        if not s:
            continue
        if (r[12], r[13]) != s["prix"]:
            ecarts_prix.append(cle)
        if r[23] != s["poids"]:
            ecarts_poids.append(cle)
        if str(r[24] or "") != str(s["ean"] or ""):
            ecarts_ean.append(cle)
        if str(r[9] or "") != s["racine"]:
            ecarts_ref.append(cle)
        # Description générale et technique : première ligne du produit seule.
        marque = (r[0], r[6])
        if marque in vu_produit:
            if r[14] or r[15] or r[16]:
                desc_repetee.append(marque)
        else:
            vu_produit[marque] = True

    # ── La page de chaque fiche ──
    # Une fiche porte une page, ses références peuvent s'étaler sur
    # plusieurs : on exige seulement que la page annoncée soit l'une de
    # celles où le catalogue montre effectivement une de ses références.
    for gamme, conf in gammes.items():
        for p in conf["produits"]:
            vues = {catalogue[r]["page"] for r in p["refs"] if r in catalogue}
            if vues and p.get("page") not in vues:
                ecarts_page.append((gamme, p["nom"], p.get("page"), sorted(vues)))

    # ── Confrontation ──
    attendus = set(source) - hors - par_ref - par_finition
    manquants = attendus - set(excel)
    intrus = set(excel) - set(source)
    revenants = (par_ref | par_finition | hors) & set(excel)

    print("═══ RÉCONCILIATION TARIF ↔ EXCEL ═══\n")
    print(f"  tarif source            {len(source):6} lignes")
    print(f"    gammes hors périmètre {len(hors):6} écartées")
    print(f"    références retirées   {len(par_ref):6} écartées")
    print(f"    finitions retirées    {len(par_finition):6} écartées")
    print(f"    {'─' * 32}")
    print(f"    attendus              {len(attendus):6}")
    print(f"    dans l'Excel          {len(excel):6}")
    print(f"  plus {sans_tarif} lignes sans tarif (gammes sur devis)")
    print()
    print("  ── couverture ──")
    print(f"  manquants  {len(manquants)}")
    print(f"  intrus     {len(intrus)}")
    print(f"  revenants (écartés mais présents)  {len(revenants)}")
    print(f"  doublons   {len(doublons)}")
    print()
    print("  ── fidélité au tarif ──")
    print(f"  écarts de prix ou d'écotaxe  {len(ecarts_prix)}")
    print(f"  écarts de poids              {len(ecarts_poids)}")
    print(f"  écarts de code EAN           {len(ecarts_ean)}")
    print(f"  réf. produit incohérente     {len(ecarts_ref)}")
    print()
    print("  ── cohérence interne ──")
    print(f"  fiches dont la page ne montre aucune de leurs réf.  {len(ecarts_page)}")
    print(f"  descriptions répétées hors 1re ligne  {len(set(desc_repetee))}")

    def montre(titre, items, n=10):
        if not items:
            return
        print(f"\n  {titre} :")
        for x in list(items)[:n]:
            print(f"     {x}")
        if len(items) > n:
            print(f"     … et {len(items) - n} autres")

    montre("MANQUANTS", sorted(manquants))
    montre("INTRUS (dans l'Excel, absents du tarif)", sorted(intrus))
    montre("REVENANTS (écartés par une règle, pourtant présents)", sorted(revenants))
    montre("DOUBLONS", doublons)
    montre("ÉCARTS DE PRIX", [(k, source[k]["prix"], (excel[k][12], excel[k][13]))
                              for k in ecarts_prix])
    montre("ÉCARTS DE POIDS", ecarts_poids)
    montre("ÉCARTS D'EAN", ecarts_ean)
    montre("PAGES CONTREDISANT LE CATALOGUE", ecarts_page)
    montre("DESCRIPTIONS RÉPÉTÉES", sorted(set(desc_repetee)))

    ok = not (manquants or intrus or revenants or doublons or ecarts_prix
              or ecarts_poids or ecarts_ean or ecarts_ref or ecarts_page
              or desc_repetee)
    print("\n" + ("✓ RÉCONCILIATION EXACTE sur les points contrôlés — voir en tête\n"
                  "  du script ce qui reste à vérifier à l'œil (noms, regroupement,\n"
                  "  catégories, descriptions)"
                  if ok else "✗ écarts ci-dessus, à corriger"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
