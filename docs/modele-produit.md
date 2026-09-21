# Le modèle produit

Comment le catalogue décrit un produit : ses choix, ses prix, ses finitions,
ses options, ses visuels — et comment tout cela s'importe, se crée à la main
et s'affiche au client.

> Écrit le 21 septembre 2026, après la reconstruction du catalogue 2026.
> Ce document est la proposition retenue, pas l'état actuel du code.

---

## 1. Pourquoi changer

### Ce qui s'est passé

Le catalogue 2026 a été reconstruit depuis le tarif. Le tarif porte une ligne
par combinaison vendable, et l'import en a fait une **déclinaison** par ligne.
D'où 22 745 déclinaisons pour 555 fiches, et une série de symptômes qu'on a
passé la semaine à réparer un par un :

| symptôme | cause |
|---|---|
| un axe « Modèle » à 26 boutons de soixante caractères | la désignation entière servait de valeur |
| un mur de quarante pastilles sous un bloc « Coloris » | les parties d'un libellé accrochées à l'axe |
| quatre pastilles beiges identiques chez Sokoa | des catégories tarifaires affichées comme des teintes |
| cinq boutons portant le même texte | seule la référence changeait |
| quinze lignes au même prix pour un même bureau | la finition mise dans le calcul du prix |

Chaque réparation était juste. Aucune ne touchait la cause.

### La cause

Le produit mélange **trois natures de variation** sous un seul mécanisme.

| nature | change le prix | change la référence | change l'image | exemple |
|---|---|---|---|---|
| **choix tarifaire** | oui | oui | parfois | Largeur 120 / 140 / 160 · Catégorie Tissu D |
| **choix de finition** | non | **oui** | oui | Plateau chêne fil · Piétement noir |
| **option** | s'ajoute | article à part | non | Goulotte · Voile de fond |

La finition a été mise dans les déclinaisons **parce qu'elle change la
référence**. Et comme les déclinaisons portent le prix, elle s'est mise à
changer le prix aussi.

En sortant la finition du prix, on a dû ranger la correspondance des
références dans un champ que rien ne lit — `referencesParFinition`. C'est le
signe qu'il manque un concept, pas un champ.

### Les trois mesures qui fondent la suite

Rien ici n'est supposé. Trois sondes ont été passées sur les 555 fiches.

**La référence fournisseur se décompose.** Sur 224 fiches qui portent une
table de références, **208** ont la forme `base + suffixe unique par
finition` — `BK421` + `A` / `F` / `N` / `S` / `Y`. Les 16 restantes suivent la
même règle avec un suffixe plus long (`GGC3`, `1SGC`) parce qu'elles ont
quatre pièces à finir : **un caractère par choix**.

**Le sens ne doit pas vivre dans un nom de fichier.** Les visuels ont été
nommés `<référence>_<décor>_<vue>`. Après téléversement, l'URL dit
`dm60nn-chene-nebraska-01` : la slugification a effacé la frontière entre les
champs, et « chene-nebraska » est un seul décor qui contient un tiret. La
convention de nommage est fragile par construction.

**L'explosion combinatoire est finie.** 7 390 déclinaisons pour 555 fiches,
soit treize par fiche. La matrice de prix n'est plus un problème de volume.

---

## 2. Le modèle

Cinq objets. Un seul endroit pour chaque chose.

### Produit

La fiche. Nom, descriptif, gamme, catégories, sections de devis, dimensions
d'encombrement.

### Choix

Une question posée au client. **Remplace à la fois l'« axe de déclinaison » et
le « groupe de finition »**, qui sont la même idée rendue différemment.

| champ | rôle |
|---|---|
| `nature` | `tarifaire` · `finition` · `option` |
| `nom` | « Largeur », « Plateau », « Catégorie de revêtement » |
| `rendu` | `boutons` · `pastilles` · `nuancier` · `liste` · `vignettes` |
| `ordre` | l'ordre des étapes |
| `obligatoire` | une réponse est-elle exigée |

### ValeurChoix

Une réponse possible.

| champ | rôle |
|---|---|
| `libelle` | « Chêne fil » |
| `couleur` | `#c9a876` — la pastille quand il n'y a pas d'image |
| `imageUrl` | la pastille du nuancier |
| `suffixeReference` | `N` — **le concept qui manquait** |
| `supplementHT` | presque toujours vide, voir §4 |
| `paletteId` | pour tirer un nuancier entier d'un coup |

### Combinaison

Ce qu'on appelait déclinaison, mais **portant uniquement les choix
tarifaires**.

| champ | rôle |
|---|---|
| `valeurs` | `{ largeur: "120", profondeur: "80", passage: "obturateurs" }` |
| `prixTarifHT` | 365 |
| `ecoContribution`, `poids`, `ean` | ce que dit le tarif |
| `referenceBase` | `BK421` |

### Visuel

Une image, éventuellement rattachée à une valeur de choix.

| champ | rôle |
|---|---|
| `url` | l'image |
| `valeurChoixId` | « Chêne fil » — vide pour un visuel général |
| `role` | `vignette` · `galerie` · `ambiance` · `schema` |
| `ordre` | le rang dans la galerie |

---

## 3. La règle de référence

```
référence commandée = referenceBase + Σ suffixeReference(valeur choisie)

                      BK421 + "2" (piétement noir) + "N" (plateau chêne fil)
                      → BK4212N
```

Les suffixes s'assemblent dans l'ordre des choix.

C'est le pivot du modèle. Il rend la finition honnête : **elle ne touche pas
au prix, mais elle touche à ce qu'on commande.** Le devis redevient exact sans
champ fantôme.

Surtout, il est **vérifiable** : la référence reconstruite doit exister dans
le tarif. C'est le test de vérité du modèle — s'il passe sur les 555 fiches,
le modèle tient ; s'il échoue, on le sait avant d'avoir écrit une ligne de
front.

---

## 4. Le prix

Un seul chemin.

```
prix affiché = prixTarifHT(combinaison) × (1 + marge)
```

La marge vient des Réglages. **Aucun prix de vente n'est stocké** — un prix
stocké finit toujours par diverger du panier. Cette règle a traversé une purge
totale et cinq refontes sans être remise en cause ; elle ne change pas.

### Pourquoi pas de supplément par finition

Sur 161 fiches qui gardent un choix tarifaire de revêtement, **139 ont un
écart de prix constant** entre catégories, quelle que soit la dimension. Un
`supplementHT` porté par la valeur suffirait donc à les modéliser sans
matrice.

**On ne le fait pas.** Ce serait un second chemin de calcul du prix, pour
économiser des lignes qu'on n'a plus besoin d'économiser. Le champ existe pour
le cas où un fournisseur facture explicitement un supplément — jamais comme
mécanisme de repli.

Les 22 fiches à écart variable imposent de toute façon la matrice. Une seule
règle vaut mieux qu'une règle et son exception.

---

## 5. La fiche produit, côté client

Un parcours en étapes, toujours le même, quel que soit le produit.

```
┌─ Étapes tarifaires ───────────────── Largeur → Profondeur → Passage
│
│  Filtrage progressif sur la matrice : une valeur qui ne mène à
│  aucune combinaison n'est jamais proposée.
│  Une étape à réponse unique est sautée, sans être affichée.
│  Le prix reste « à partir de » tant que la combinaison n'est pas
│  résolue.
│
├─ Étapes de finition ──────────────── Piétement → Plateau
│
│  Toutes les valeurs sont toujours disponibles : le prix ne bouge
│  pas, donc rien ne se ferme. Chaque choix échange le visuel
│  principal.
│
├─ Options ─────────────────────────── cases à cocher, prix ajouté
│
└─ Récapitulatif ───────────────────── référence assemblée, prix ferme
```

La différence de traitement est **visible pour le client** : les premières
étapes portent un prix qui change, les suivantes non. C'est plus honnête que
l'état actuel, où tout se ressemble.

Le moteur de filtrage progressif existe déjà — `lib/declinaisonsLibres.js`,
trois fonctions pures — et n'a pas besoin d'évoluer. Il s'appliquera aux
seules étapes tarifaires.

---

## 6. La galerie

Une ligne par visuel, avec son rattachement **en donnée** et non dans le nom
du fichier.

Conséquences directes :

- choisir « Chêne fil » échange la photo, sans convention de nommage ;
- la vignette est un `role`, plus « le premier fichier par ordre
  alphabétique » ;
- déplacer ou renommer un fichier ne casse rien ;
- les dépôts `_A-TRIER` se vident **en rattachant, pas en renommant** — ce qui
  supprime la règle de nommage à respecter à la main aujourd'hui, et avec elle
  la section correspondante de `_A-FAIRE.md`.

---

## 7. Import, création, modification

C'est ici que se joue la robustesse.

### Deux couches, jamais mélangées

```
couche SOURCE       ce que dit le tarif
                    réécrite intégralement à chaque import
                    prix, éco, poids, ean, références, désignations

couche ÉDITORIALE   ce qu'un humain a décidé
                    l'import n'y touche JAMAIS
                    noms de choix, noms de valeurs, couleurs, ordre,
                    regroupement de fiches, rattachement des visuels
```

Un réimport devient : **recalculer la source, réappliquer l'éditorial,
signaler les conflits.**

Aujourd'hui `importer-catalogue.mjs:483` écrit `axesDeclinaisons` sans
condition : rejouer l'import effacerait tout le travail de cette semaine. Avec
deux couches, c'est structurellement impossible.

### L'affinage devient une étape

Les cinq scripts correctifs empilés — `enrichir-finitions`,
`corriger-groupes-buronomic`, `decouper-axes`, `rattacher-nuanciers`,
`sortir-finitions-sans-prix` — sont tous des fonctions déterministes du tarif
et de la sauvegarde. Ils deviennent **une passe que l'import appelle
lui-même**. Une commande, un ordre fixé par le code et non par la mémoire.

### Le contrôle d'intégrité tourne à chaque écriture

Trois invariants, à un seul endroit :

1. toute valeur portée par une combinaison existe dans son choix ;
2. tout choix obligatoire est couvert par toutes les combinaisons ;
3. toute référence reconstruite existe dans le tarif.

Ce contrôle a été écrit trois fois cette semaine, dans trois scripts
différents. Il n'en faut qu'un.

---

## 8. L'administration

Créer ou modifier un produit passe par le **même modèle** que l'import.
L'admin écrit dans la couche éditoriale, celle que l'import ne touche pas. Pas
de second chemin, donc pas de divergence possible entre un produit importé et
un produit saisi à la main.

### L'écran d'un produit

Quatre onglets.

```
┌──────────────────────────────────────────────────────────────┐
│  Bureau plan droit — Astrolite                               │
│  ┌────────────┬──────────┬──────────┬──────────┐             │
│  │ Identité   │ Choix    │ Prix     │ Visuels  │             │
│  └────────────┴──────────┴──────────┴──────────┘             │
└──────────────────────────────────────────────────────────────┘
```

**Identité** — nom, descriptif, gamme, catégories, sections de devis. Les
champs venus du tarif sont marqués d'une pastille « tarif » et grisés : les
modifier crée une surcharge éditoriale, affichée comme telle, que le réimport
respectera.

**Choix** — la liste des questions, réordonnables par glissé. Chaque choix se
déplie sur ses valeurs.

```
⠿  Largeur              tarifaire   boutons      4 valeurs     ▾
⠿  Profondeur           tarifaire   boutons      2 valeurs     ▾
⠿  Passage des câbles   tarifaire   boutons      4 valeurs     ▾
⠿  Piétement métal      finition    pastilles    3 valeurs     ▾
   ├─ ⠿  Aluminium      ■ #9a9a94   suffixe  1   [visuel ▾]
   ├─ ⠿  Blanc          ■ #f2f0ec   suffixe  3   [visuel ▾]
   └─ ⠿  Noir           ■ #23262a   suffixe  5   [visuel ▾]
⠿  Plateau              finition    pastilles    5 valeurs     ▾
⠿  Goulotte             option      cases        2 valeurs     ▾

           [ + un choix ]     [ tirer d'un nuancier ▾ ]
```

Une valeur se saisit en une ligne : libellé, couleur ou pastille, suffixe de
référence, visuel associé. « Tirer d'un nuancier » crée d'un coup un choix de
finition à partir d'une palette existante — les 85 teintes du Tissu C en une
action.

**Prix** — la matrice des combinaisons, une ligne par combinaison de choix
tarifaires. Elle est **calculée** : ajouter une valeur à un choix tarifaire
crée les lignes manquantes, en vide, et l'écran signale celles qui n'ont pas
de prix.

```
Largeur   Profondeur   Passage        Réf. base   Tarif HT   Éco    Vente HT
120 cm    80 cm        Obturateurs    BK421        365,00    5,24     438,00
140 cm    80 cm        Obturateurs    BK422        375,00    5,68     450,00
160 cm    80 cm        Obturateurs    BK423        395,00    6,37     474,00
…
                                      ⚠ 2 combinaisons sans prix
```

La colonne « Vente HT » est calculée et non saisissable : c'est le tarif fois
la marge des Réglages.

**Visuels** — la galerie, en vignettes glissables. Chaque visuel porte son
rôle et, s'il y a lieu, la valeur de choix qu'il illustre.

```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  [img] │ │  [img] │ │  [img] │ │  [img] │
│vignette│ │ galerie│ │ galerie│ │ambiance│
│   —    │ │ Chêne  │ │  Noir  │ │   —    │
└────────┘ └────────┘ └────────┘ └────────┘

      [ + téléverser ]    [ rattacher un dépôt _A-TRIER ]
```

« Rattacher un dépôt » ouvre les images en attente de la gamme et les rattache
par glissé sur la fiche et sur la valeur de choix. **C'est ce qui remplace le
renommage manuel.**

### Créer un produit

Trois écrans, dans cet ordre.

1. **Identité** — gamme, nom, catégories. On enregistre, le produit existe.
2. **Choix** — on déclare les questions et leurs valeurs, ou on les tire d'un
   nuancier.
3. **Prix** — la matrice apparaît déjà remplie de combinaisons vides ; on
   saisit les tarifs, ou on colle un bloc depuis le tarif du fournisseur.

Un produit sans choix est vendu à prix unique : la matrice a alors une seule
ligne, et les étapes n'apparaissent pas côté client.

### Ce que l'admin refuse

- enregistrer une combinaison dont une valeur n'existe pas dans son choix ;
- publier un produit dont une combinaison n'a pas de prix ;
- supprimer une valeur de choix encore citée par une combinaison — il faut
  d'abord retirer les lignes concernées, l'écran les montre.

---

## 9. La migration

Tout ce qu'il faut est déjà en base. **Rien n'est à ressaisir.**

| ce qu'il faut | d'où ça vient |
|---|---|
| les choix tarifaires | `axesDeclinaisons`, hors `finition` |
| les choix de finition | `groupesFinition` et leurs `finitions` |
| les valeurs, couleurs, pastilles | idem, et les palettes |
| les combinaisons et les prix | `declinaisons` |
| les suffixes de référence | les 224 tables `referencesParFinition` |
| les visuels et leurs décors | les URLs Cloudinary |

### L'ordre de marche

1. **Le schéma et la migration à vide** — vérifier que le catalogue actuel se
   reverse dans le nouveau modèle sans perte, sans rien écrire.
2. **La règle de référence** — reconstruire chaque référence et vérifier
   qu'elle existe dans le tarif, sur les 555 fiches. *C'est le test de
   vérité.*
3. **Le front en étapes.**
4. **La galerie rattachée.**
5. **L'import à deux couches**, qui clôt le sujet.

On ne touche au front qu'une fois le test de l'étape 2 au vert.

### La sauvegarde

Prise avant toute migration :

```
prisma/sauvegardes/base-complete-2026-09-21T09-41-53.json
25 tables · 3 653 lignes · 16,5 Mo · vérifiée
```

`pg_dump` n'étant pas installé sur cette machine, la sauvegarde passe par
Prisma, table par table, dans l'ordre de remontage. Relecture :

```
node prisma/sauvegarder-base.mjs --verifier=prisma/sauvegardes/base-complete-2026-09-21T09-41-53.json
```

---

## 10. Ce que ce modèle ne résout pas

Deux limites, à décider à froid.

**Le découpage du catalogue est celui du tarif, pas celui du client.**
L'ancienne base fusionnait plusieurs lignes tarifaires en une fiche à choix ;
l'import fait une fiche par désignation. C'est la cause des 104 fiches Sokoa
où deux désignations identiques cachent deux produits, et des cinq boutons
portant le même texte. **Aucun modèle ne répare ça** : c'est un arbitrage
éditorial, fiche par fiche.

**Le découpage des désignations reste une lecture de texte.** Largeur et
profondeur sont déduites de « PLAN DROIT L120 x P80 ». Si Buronomic change son
gabarit l'an prochain, le réimport produira d'autres choix sans prévenir. Le
contrôle d'intégrité le verra ; il faudra le regarder.
