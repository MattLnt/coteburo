#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lecture des règles de finition de la rationalisation 2026.

Le générateur et le vérificateur partagent ce module : ils doivent écarter
exactement les mêmes lignes, sinon la réconciliation ne prouve plus rien.

Les règles elles-mêmes vivent dans noms-produits.json, sous
_rationalisation_2026.finitions. Ici il n'y a que la mécanique.
"""

import re


def segments(libelle):
    """Le libellé de finition du tarif, découpé en ses positions.

    « NOIR METAL / BLANC - TIMBER » décrit le piètement, puis le plateau,
    puis le chant. Une règle de rationalisation vise l'une de ces positions.
    """
    return [s.strip().upper()
            for s in re.split(r"[/\-]", str(libelle or "")) if s.strip()]


def finition_retiree(gamme, libelle, regles):
    """Le libellé de la règle qui retire cette finition, ou None.

    La position compte autant que le nom. Ocre quitte la collection en métal
    et y reste en tissu : la règle vise le premier segment, celui du
    piètement, et exige une égalité stricte — « OCRE » part, « OCRE TISSU »
    reste. Les décors mélaminés, eux, partent où qu'ils soient.
    """
    segs = segments(libelle)
    if not segs:
        return None
    for r in regles:
        if r.get("gamme") and r["gamme"] != gamme:
            continue
        pos = r["segment"]
        if pos == "premier":
            vises = segs[:1]
        elif pos == "second":
            vises = segs[1:2]
        else:
            vises = segs
        jeton = r["jeton"].upper()
        for s in vises:
            if r["correspondance"] == "exacte":
                if s == jeton:
                    return r["libelle"]
            elif re.search(r"\b" + re.escape(jeton) + r"\b", s):
                return r["libelle"]
    return None
