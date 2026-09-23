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

---

## 11. Les gammes et les rayons — deux axes, pas deux onglets

### Ce qui est confondu

`/admin/architecture` présente trois onglets côte à côte : Gammes,
Catégories, Finitions. Le voisinage laisse croire à trois listes de même
nature. Il y en a deux, et elles ne disent pas la même chose.

| axe | qui le décide | volume | un produit en a |
|---|---|---|---|
| **Marque → Gamme** | le fournisseur | 3 → 101 | exactement une |
| **Catégorie → Sous-catégorie** | nous | 6 → 31 | une ou plusieurs, dont une principale |

Le premier dit **qui fabrique**, le second **où l'on range**. Un bureau
Astrolite est de la gamme Astrolite *et* dans Bureaux / Bureaux classiques.
Les deux ensembles se croisent, ils ne s'emboîtent pas.

État actuel : 101 gammes, aucune vide ; 555 fiches, aucune sans catégorie ni
sans sous-catégorie. L'architecture est saine — c'est le moment de la rendre
difficile à casser.

### Deux écrans, une même forme

Chacun est un arbre à gauche, le détail du nœud choisi à droite. Les gestes
sont les mêmes des deux côtés : renommer, réordonner, déplacer, fusionner,
supprimer. Les apprendre une fois suffit.

### La robustesse est dans les quatre gestes dangereux

Aucun ne s'exécute sans montrer d'abord ce qu'il emporte.

| geste | ce qui s'affiche avant |
|---|---|
| **renommer** | le slug change-t-il ? combien d'adresses deviendraient mortes |
| **déplacer une sous-catégorie** | combien de fiches changent de rayon |
| **fusionner deux gammes** | combien de fiches reprises, quels slugs entrent en collision |
| **supprimer** | refusé tant qu'il reste des fiches, avec leur compte |

### Le slug ne suit plus le nom

Aujourd'hui, renommer peut régénérer le slug et rompre les adresses déjà
partagées. Le slug est **gelé à la création** et ne se modifie que
délibérément, dans un champ à part ; l'ancien est conservé en redirection.
Corriger une faute de frappe dans un nom ne doit jamais casser un lien.

### Une seule source pour l'architecture

Depuis le 23 septembre 2026, l'arborescence est celle que le client a
fournie : huit catégories, trente rayons, chaque fiche dans un seul rayon.
Elle est écrite par `prisma/reclasser-architecture-client.mjs`, qui range
chaque fiche d'après son nom et sa gamme, par des règles lues dans l'ordre.
Une fiche qu'aucune règle n'attrape fait échouer le script : rien ne
s'écrit tant qu'il en reste une.

`importer-catalogue.mjs` porte encore une constante `ARCHITECTURE` — les six
catégories d'origine, celles des colonnes du Excel. Il **refuse d'écrire**
tant que la base porte l'arbre du client, sauf en `--options-seules`. Une
fiche importée demain se classe en relançant le reclasseur, pas en
retouchant le Excel.

Trois noms de rayons vivent dans deux catégories — Direction, Collaboratif,
Convivialité. Un rayon ne se lit donc jamais sans sa catégorie : le filtre
du catalogue ignore `sousCategorie` quand `categorie` manque.

---

## 12. Les finitions — la bibliothèque doit être la source

### Le défaut, mesuré

Deux mondes parallèles coexistent :

```
PaletteFinition + FinitionModele     la bibliothèque    15 palettes · 219 modèles
GroupeFinition  + Finition           posé sur la fiche  577 groupes · 2 135 finitions
```

Le lien entre les deux est un **champ texte**, `paletteNom`. À l'instant où
ces lignes sont écrites, il vaut `null` sur **les 2 135 finitions**. Il avait
été renseigné sur 749 d'entre elles il y a trois jours ; les groupes qui les
portaient ont été refaits depuis, et le lien est reparti avec eux.

C'est la même cause qui a fait disparaître 1 094 couleurs à la purge, et qui
a coûté une journée de reconstruction par correspondance de teintes. Un lien
qui n'est pas une clé étrangère finit toujours par se rompre.

### Le correctif

```
ValeurChoix.modeleId  →  FinitionModele.id
```

Une clé, pas un nom. Trois conséquences immédiates :

- **`couleur` et `imageUrl` sont héritées du modèle.** La valeur ne stocke
  que ce qui diffère vraiment, et une valeur sans surcharge suit sa
  bibliothèque.
- **Corriger une pastille la corrige partout.** Les 85 teintes du Tissu C
  arrivent une fois et bénéficient aux 180 fiches qui s'en servent.
- **Une purge ne peut plus couper le lien**, la base le refuse.

### L'écran

Les palettes à gauche, leurs teintes en grille à droite. Chaque teinte porte
**le nombre de produits qui l'emploient** — ce qui rend visible, d'un coup
d'œil, ce qui compte et ce qui dort.

Les trous se voient aussi : les 60 modèles sans pastille apparaissent en
cases vides plutôt que dans un fichier texte à part.

Deux gestes suffisent au quotidien :

- **Téléverser un nuancier** — on dépose les images, le manifeste les
  apparie, ce qui ne s'apparie pas reste en attente et se règle à la main.
- **Tirer un nuancier vers un produit** — crée d'un coup un choix de finition
  avec une valeur par modèle, toutes liées. C'est ce que fait déjà
  `importerFinitionsVersProduit`, mais le lien y survivra.

---

## 13. La galerie et le détourage

### L'outil de détourage reste

Sa logique de recadrage est bonne et éprouvée : seuil de fond à 244, marge de
4 %, qualité 92, sortie carrée. Elle ne change pas. Ce qui change, c'est ce
qu'il lit et ce qu'il écrit.

| aujourd'hui | demain |
|---|---|
| lit `images[]`, un tableau d'URL | lit des lignes `Visuel` |
| téléverse un nouveau fichier `_cadre.jpg` | réécrit la même ligne, `urlOrigine` conservée |
| « déjà traité » se lit dans le nom du fichier | se lit dans `Visuel.recadre` |
| « c'est une ambiance » se devine sur `amb_`, `bodegon`, `zoom` | se lit dans `Visuel.role` |

Ce que l'on y gagne : le recadrage devient **réversible**, un second passage
ne peut plus recadrer deux fois, et plus aucune décision ne dépend d'un nom
de fichier — la même règle que pour les décors.

### Un visuel illustre souvent plusieurs valeurs

La migration à vide l'a montré : `bx867n-aluminium-chene-fil-01` montre un
piétement **et** un plateau. Un `valeurChoixId` au singulier oblige à choisir,
et choisit mal une fois sur deux.

Le rattachement devient donc une table de liaison : un visuel, plusieurs
valeurs. Le front affiche un visuel dès que **toutes** ses valeurs sont
retenues par le client, et retombe sur la vignette sinon.

### Trois surfaces, un seul modèle

1. **L'onglet Visuels d'un produit** — la galerie, le rôle, le rattachement.
2. **La médiathèque** — déjà là, elle parcourt les dossiers locaux ; c'est par
   elle que les dépôts `_A-TRIER` se vident, en rattachant au lieu de
   renommer.
3. **Le détourage** — le traitement en lot, par marque et par gamme.

Les trois écrivent dans `Visuel`. Aucune n'a sa propre notion de ce qu'est
une image de produit.

---

## 14. La liste des produits en administration

### Ce qui cloche, mesuré

`/admin/produits` charge **tout**, calcule **tout**, et rend **tout**.

```
555 produits          →  5 022 lignes de tableau
                         8,8 Mo envoyés au navigateur à chaque affichage
```

L'écart vient d'une décision de la page : elle déplie **une ligne par
déclinaison**. La liste des produits n'est donc pas une liste de produits,
c'est une liste de lignes tarifaires. Avant cette semaine et la sortie des
finitions du prix, elle en comptait 22 745.

Trois autres manques, plus discrets :

- **Les filtres ne couvrent pas les axes qui structurent le catalogue.** On y
  filtre par mode et par statut, mais ni par marque, ni par gamme, ni par
  rayon — alors que ce sont eux qu'on emploie pour travailler.
- **Rien ne montre ce qui manque.** 220 fiches sans visuel, 185 sans
  finition, 66 sans choix, 10 sans prix : c'est le travail en cours, et il
  faut le chercher fiche par fiche.
- **Aucune action en lot.** Publier trente fiches, changer le rayon de vingt,
  envoyer une gamme au détourage : trente, vingt, une gamme de clics.

### Une ligne par produit

Le tableau redevient ce qu'il prétend être. Les combinaisons se **déplient à
la demande** sous leur produit, et l'onglet Prix de la fiche reste l'endroit
où l'on travaille les tarifs en nombre.

La pagination passe au serveur et l'agrégat — prix mini, prix maxi, nombre de
combinaisons — se calcule en base. On ne charge plus jamais le JSON complet
des déclinaisons pour afficher une liste.

### Cinq pastilles qui disent l'essentiel

Chaque ligne porte l'état de complétude du produit :

```
visuel · prix · choix · finition · rayon
  ●       ●      ●        ○        ●
```

C'est le cœur de la proposition. Au lieu de chercher ce qui manque, on le
voit ; et les **vues enregistrées** y mènent d'un clic :

| vue | fiches |
|---|---|
| Tout | 555 |
| Sans visuel | 220 |
| Sans finition | 185 |
| Sans choix | 66 |
| Sans prix | 10 |
| Sur devis | 17 |

Ces vues ne sont pas des réglages cachés : ce sont des filtres nommés, et
elles remplacent `_A-FAIRE.md` par quelque chose qui ne se périme pas.

### Les filtres vivent dans l'URL

```
/admin/produits?vue=sans-visuel&marque=buronomic&page=1
```

Recherche, marque, gamme, rayon, état, tri, page : tout s'y écrit. Un lien
vers « les 74 fiches Buronomic sans visuel » se met en favori, s'envoie à
quelqu'un, et se retrouve au retour. C'est aussi ce qui rend la pagination
serveur possible.

### Les actions en lot, et ce qu'elles montrent avant d'agir

La sélection **survit au changement de page et de filtre** — changer de vue
ne la vide pas, et le bandeau dit combien d'éléments sont hors de la vue
courante. Sans cela, une sélection de trente fiches se perd au premier
filtre, et c'est ainsi qu'on finit par ne plus s'en servir.

Quatre actions : publier ou dépublier, changer de rayon, affecter une gamme,
envoyer au détourage. Chacune annonce son compte avant de s'exécuter, comme
les gestes de l'architecture.

### La règle d'édition

**Ce qui tient dans un champ s'édite en ligne** — le nom, le prix unique,
l'état publié. **Tout le reste ouvre la fiche**, avec ses quatre onglets.

Pas de modale à moitié, pas de formulaire qui recopie la moitié de la fiche :
une règle simple, valable partout, qu'on n'a pas à réapprendre écran par
écran.

---

## 15. Commandes, devis et facturation

Aucune commande ni aucun devis n'existe en base : la structure se juge donc
sur pièces, pas sur un historique à ménager.

### Ce qui est juste et ne bouge pas

**L'instantané.** `LigneCommande` et `LigneDevis` portent leurs propres
copies — désignation, prix, référence, éco-contribution, image — sans clé
étrangère vers une déclinaison. Une commande ne doit jamais changer parce que
le catalogue a changé. C'est la bonne décision, et elle est conservée telle
quelle.

**L'éco-contribution à part, sans marge.** Un champ dédié sur la ligne, un
total sur l'entête. La loi impose qu'elle figure distinctement sur la
facture ; Côté BURO la paie au fabricant et la refacture à l'identique.

**Le prix recalculé au serveur.** `api/commande/checkout` ne fait jamais
confiance au montant envoyé par le navigateur : il refait le calcul avec
`prixVitrine`, et refuse la commande si la déclinaison a disparu du catalogue
ou si le prix manque. Trois garde-fous, tous au bon endroit.

**Le devis accessible sans compte**, par jeton, et sa conversion en commande
par une relation un-à-un.

### Les trois défauts, tous sur l'identité de ce qui est commandé

**1. Le chemin du devis perd la référence.** Le panier est sain — il reprend
`declinaison.referenceFournisseur` et la vraie marque de la gamme. Mais
`mon-devis/[token]/actions.js` écrit `referenceFournisseur: l.codeRacine`, et
`codeRacine` est **l'identifiant de déclinaison**, pas la référence du tarif.
Une commande née d'un devis part donc avec `d13pufsd` là où il faudrait
`BX865F`. Les deux chemins doivent produire la même chose.

**2. Le devis ne sait pas quoi commander.** `LigneDevis` n'a aucun champ de
référence fournisseur. L'information est à retrouver au moment de
l'acceptation — et c'est exactement là qu'elle se perdait.

**3. La finition n'est qu'une chaîne de texte.** `« Largeur: 160 cm · Noir /
Nebraska »` se lit, mais ne se calcule pas : on ne peut ni en déduire la
référence, ni compter combien de plateaux Nebraska ont été vendus.

### Deux manques structurels

**La commande ne remonte pas au produit.** `LigneDevis` porte un `vitrineId`,
`LigneCommande` non. Depuis une commande, impossible de retrouver la fiche —
ni pour un service après-vente, ni pour recommander, ni pour une statistique
par gamme.

**Le lien d'une option à son produit se perd.** Le panier connaît
`parentId` et `estOption` ; rien n'arrive jusqu'à la commande. Sur le bon de
commande, une goulotte flotte à côté du bureau qu'elle complète, sans qu'on
sache lequel.

### Le bloc d'identité

Les mêmes champs sur la ligne de devis et sur la ligne de commande, figés
comme le reste :

| champ | rôle |
|---|---|
| `vitrineId` | la fiche d'origine — sans clé étrangère, pour que sa disparition n'emporte pas l'historique |
| `combinaisonId` | la combinaison retenue |
| `referenceComplete` | `BX865F`, assemblée par la règle du modèle |
| `fournisseur` | chez qui commander |
| `choix` | `{ largeur: "160 cm", pietement: "Noir", plateau: "Nebraska" }` |
| `ligneParenteId` | l'option se rattache au produit qu'elle complète |

`finition` reste, comme version lisible par un humain ; `choix` est sa
version calculable.

**L'invariant qui va avec :** une ligne de catalogue sans
`referenceComplete` bloque la validation de la commande. Il vaut mieux
l'apprendre au chiffrage que devant le bon de commande à envoyer.

### Ce qui reste à faire dessus

Les champs existent en base. Il reste à les remplir aux trois endroits qui
fabriquent une ligne — le checkout, l'ajout au devis, et la conversion
devis → commande — puis à poser l'invariant. Cela vient avec le front, qui
est l'endroit d'où partent les choix.

---

## 16. L'ordre des travaux

### Ce qui est déjà fait

| | |
|---|---|
| le schéma | quatre tables, cinq migrations, toutes additives |
| la migration des données | 555 produits reversés, rien de perdu |
| le test de vérité | 224 fiches sur 224, 2 625 références regénérées |
| `lib/modeleProduit.js` | le raisonnement, pur — étapes, référence, prix, visuels |
| `lib/chargerProduit.js` | la lecture base, une requête, héritage des nuanciers |
| `prisma/verifier-modele-produit.mjs` | le contrôle indépendant, cinq invariants |

### Ce qui reste, dans l'ordre

**1. La fiche produit publique.** Elle prouve le modèle de bout en bout, elle
est déjà maquettée et validée, et les deux modules dont elle a besoin sont
écrits. Tant qu'elle ne tourne pas, tout le reste s'appuierait sur une
fondation non vérifiée.

**2. Panier, devis, commande.** Le chemin de l'argent, et le plus court.
C'est là que le bloc d'identité doit atterrir, et là que se trouve le défaut
connu : une commande née d'un devis part avec un identifiant interne dans le
champ « référence fournisseur ».

**3. La fiche produit en administration.** L'écran à quatre onglets —
Identité, Choix, Prix, Visuels. **Il n'existe pas aujourd'hui** : tout se fait
en ligne dans le tableau des produits, qui sait renommer, publier, supprimer
une ligne et créer une fiche vide. C'est le plus gros manque de
l'administration, et c'est ce qui permettra de corriger une donnée sans
écrire un script.

**4. La liste des produits.** Tableau à une ligne par produit, filtres par
marque, gamme et rayon, cinq pastilles de complétude, vues enregistrées,
actions en lot. Utile dès le premier jour pour les 220 fiches sans visuel.

**5. L'architecture.** Gammes et rayons séparés en deux axes, nuanciers
branchés sur `modeleId`. Les écrans existent, ils sont à refondre.

**6. La galerie et le détourage.** Rattachement par glissé, recadrage
réversible écrit dans la donnée. L'outil de détourage garde sa logique au
pixel près.

**7. L'import à deux couches.** Ce qui referme le sujet : rejouer l'import du
tarif ne détruit plus le travail éditorial.

### Ce qui ne bouge pas

Commandes, devis, clients, ventes, promotions, articles, réalisations,
réglages, marques, import : ces écrans ne dépendent pas du modèle produit et
restent tels quels. Les deux premiers afficheront simplement les champs
nouveaux — référence assemblée, fournisseur, choix structurés — quand le
point 2 les aura remplis.

`lib/prixCatalogue.js` ne bouge pas non plus. C'est le seul endroit où naît
un prix de vente, et il n'a jamais eu tort.

### Le principe qui tient l'ensemble

Chaque étape se termine par un compte qui peut être faux et qui le dira. Le
test de référence, le contrôle des cinq invariants, le reversement 807/807 :
c'est ce qui a permis de trouver que la référence fournisseur des commandes
issues d'un devis était cassée, et que l'ordre d'assemblage de la référence
n'existait nulle part en base.
