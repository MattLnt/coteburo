# Questions en attente

Ce que le tarif ne tranche pas, et qu'il faut demander avant d'écrire quoi que
ce soit dans le catalogue. Tant qu'une réponse manque, la donnée reste vide :
une référence ou un prix inventés partent chez le fournisseur sans que personne
ne s'en aperçoive.

Mis à jour le 23 septembre 2026.

---

## Chez Sokoa

### 1. Le prix de `ER05/B1` — Bero, page 67

Le fauteuil coque bois à **base pyramidale, lift blanc et patins noirs**
existe au tarif et **n'est pas au catalogue**. C'est le seul produit
réellement absent que l'audit ait trouvé sur les trois fournisseurs.

Son prix est illisible : la page superpose deux jeux de chiffres à cet
endroit. Le premier, **861**, se lit ; la suite est brouillée.

L'écart de +12 € entre la version noire et la version blanche se vérifie sur
les trois autres paires de la page :

```
ER05/31  869 879 891 945   →  ER05/71  881 891 903 957   (+12)
ER05/10  575 583 593 637   →  ER05/B0  587 595 605 649   (+12)
ER05/11  849 859 871 925   →  ER05/B1  861  ?   ?   ?
```

Ce qui donnerait **861, 871, 883, 937** pour les catégories de tissu B, B+, C
et D. **C'est une déduction, pas une lecture** — à faire confirmer avant de
créer la fiche.

### 2. Le chiffre du coloris Spazio — Alaia, page 53

La page numérote les six teintes Spazio, et l'astérisque de `IR66/0*` occupe
la place où le jeton de référence irait. Rien ne confirme que c'est bien lui.

Tant que ce n'est pas tranché, `rangReference` reste vide sur cet axe : la
fiche se commande par sa référence de base, sans jeton de coloris.

### 3. Les codes R4x de la résille Eman

Même question, même conséquence : l'axe existe, son jeton de référence est
inconnu, `rangReference` reste vide.

---

## Chez Buronomic

### 4. Les quatre poufs Kulbu sans prix

`Pouf non tapissé` (243 €), `Pouf avec assise tapissée` (265 €) et
`Pouf avec assise et corps tapissés` (294 €) portent des prix que **aucun des
fichiers `catalogue-*.xlsx` ne contient**. Le correcteur de références les a
donc laissés de côté.

Matiaz s'en occupe — ne pas chercher ni inventer ces tarifs.

---

## Hors fournisseur

### 5. La clé Stripe de test est invalide

Un appel à la création de paiement répond **401**. Tout le reste de la chaîne
fonctionne : la commande se crée en base avec les bons montants, seule
l'autorisation Stripe échoue. Clé à renouveler.
