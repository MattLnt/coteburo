# Questions à poser aux fournisseurs

Trois points relevés en rapprochant les visuels du catalogue 2026. Aucun
n'empêche de publier : ce sont des doutes sur le catalogue lui-même, pas
sur les images.

---

## 1. Sokoa — deux fiches décrivent-elles le même siège ?

Gamme **Alaia by Sokoa**, référence de tronc `IA32`.

Le catalogue porte trois fiches dont **les deux premières disent la même
chose** :

| fiche | catégorie |
|---|---|
| Chaise multimédia moyen dossier, lift assis debout avec repose-pieds, base sur patins | Alaia by Sokoa |
| AlaiaT - chaise multimédia moyen dossier, lift assis-debout avec repose-pied, base sur patins | Sièges Hauts |
| AlaiaT - chaise multimédia moyen dossier, lift haut avec repose-pied, base sur patins | Sièges Hauts |

Même produit, même lift assis-debout, même base sur patins. Seuls changent
le préfixe `AlaiaT`, le singulier de « repose-pied » et la catégorie.

**La question :** est-ce un seul siège référencé deux fois, ou deux produits
distincts ? Si c'est un doublon, laquelle des deux fiches garde-t-on ?

---

## 2. Sokoa — « Fauteuil » et « Siège » chez Wi-Max

Troncs `WL66` (base nylon blanc) et `WR06` (base nylon noir).

Pour chacun, deux fiches identiques mot pour mot, à un mot près :

```
Fauteuil haut dossier résille, base nylon blanc, roulettes ø50 sol moquette
Siège    haut dossier résille, base nylon blanc, roulettes ø50 sol moquette
```

Rien d'autre ne les sépare : ni le dossier, ni la base, ni les roulettes.
Les visuels montrent un siège **avec accoudoirs**, ce qui irait pour
« fauteuil », mais rien ne dit que « siège » désigne la version sans
accoudoirs — le catalogue écrit « chaise » ailleurs pour cela.

**La question :** « siège » et « fauteuil » désignent-ils deux produits, ou
est-ce deux façons de nommer le même ? Si ce sont deux produits, qu'est-ce
qui les distingue ?

En attendant, le même visuel est posé sur les deux fiches.

---

## 3. Sokoa — trois intitulés reconstitués, à valider

Trois fiches Rhune n'avaient pas de nom : le parser avait gardé la fin de
la phrase du catalogue et perdu son sujet. Elles apparaissaient comme des
produits à part entière.

La tête a été reconstituée d'après les **préfixes de référence**, seuls
faits disponibles — `RUQ` et `RUR` sont les bancs, `RUY` et `RUZ` les
méridiennes, `RUZT` un canapé 3 places. Aucune caractéristique n'a été
inventée, le libellé d'origine est conservé mot pour mot :

| avant | après | réfs |
|---|---|---|
| `Inclus 2 coussins lombaires` | Canapé 3 places, inclus 2 coussins lombaires | 1 |
| `avec tablette de rangement bois et électrification possible` | Méridienne avec tablette de rangement bois et électrification possible | 12 |
| `à droite ou à gauche et électrification possible` | Banc à droite ou à gauche et électrification possible | 8 |

**La question :** comment le catalogue Sokoa nomme-t-il ces trois produits
au complet ? On sait de quelle famille ils relèvent, pas leur intitulé exact.

Le troisième, en particulier, reste bancal : « Banc à droite ou à gauche »
laisse entendre qu'un élément — accoudoir, angle, tablette — se monte d'un
côté ou de l'autre, sans qu'on sache lequel.

---

## 4. Buronomic — que désigne la partie écrite après le tiret ?

Les libellés de finition du tarif décrivent plusieurs pièces à la fois,
séparées par des barres obliques puis par un tiret :

```
NOIR METAL / NEBRASKA / VERT EAU - VERT EAU
HETRE / HETRE        - POIGNEES ALUMINIUM
NOIR METAL / BLANC   - TIMBER
```

Ce qui précède le tiret se lit sans peine : le suffixe nomme la matière —
`METAL`, `TISSU`, `PLASTIQUE` — et à défaut la position tranche, le
piétement d'abord, puis le plateau, puis le tissu.

Après le tiret, en revanche, deux cas :

- **Un mot de rôle ouvre la partie** — `POIGNEES ALUMINIUM`, `SERRURE NOIR`,
  `MEUBLE NEBRASKA`. Aucun doute, le groupe prend ce nom.
- **Une teinte nue** — `TIMBER`, `VERT EAU`, `GRIS CARBONE`. Là, rien ne dit
  de quelle pièce il s'agit.

**La question :** dans ce second cas, que désigne la teinte ? Un chant de
plateau, un second tissu, un panneau de fond ? Et est-ce la même pièce
selon les gammes, ou cela dépend-il du produit ?

En attendant, le site l'affiche sous le nom **« Complément »** — neutre et
sans invention. Il suffira de renommer le rôle une fois la réponse connue.

---

## 5. Sokoa — soixante nuanciers sans pastille

Les palettes de finition ont été recréées depuis la sauvegarde d'avant-purge :
quinze palettes, deux cent dix-neuf modèles. Cent cinquante-neuf ont retrouvé
leur pastille dans `sokoa_swatches`, grâce au manifeste qui donne le libellé
exact de chaque fichier.

**Les soixante autres n'ont aucune image.** Ce sont les modèles dont le nom
est une teinte simple, sans code : les palettes **Blend**, **Spazio**,
**Runner**, **Grain**, **Bouclé F.R.**, **Tissu E**, **Tissu H**, et les deux
palettes OfficePro **Verano** et **Arco**.

La liste complète est dans
`COTEBURO-MEDIAS/CATALOGUE-2026/_NUANCIERS/_SANS-PASTILLE.txt`.

**La demande :** les pastilles de ces nuanciers, au même format que celles de
`sokoa_swatches` — une image par teinte, nommée par son code ou son libellé.

---

## 6. Sokoa — la gamme Adio n'a aucun visuel

Vingt fiches, tout le catalogue de la gamme, et pas un seul fichier ne
mentionne Adio dans les quatre arborescences de visuels reçues.

**La demande :** les visuels produit de la gamme Adio. C'est le plus gros
manque du catalogue : vingt fiches sur les vingt-cinq qui n'ont aucune source.

---

## 7. Buronomic — quinze familles de produits sans nom de groupe connu

Les noms des groupes de finition — « Piétement métal », « Plateau »,
« Caisson », « Top », « Panneaux extérieurs » — ont été repris de l'ancienne
base, qui les portait à la main sur quatre-vingt-quatre fiches. Ils y sont
appris par famille de produit : un bureau à deux teintes, c'est
« Piétement métal / Plateau » ; un caisson, « Caisson / Top » ; une cabine,
« Panneaux extérieurs / Panneaux intérieurs ».

Quinze familles n'y figuraient pas, soit quarante-cinq fiches :

| famille | fiches | affiché en attendant |
|---|---|---|
| Comptoir | 8 | Structure / Plateau |
| Module | 7 | Structure / Plateau |
| Rangement, Casier, Cloison | 12 | Structure / Plateau |
| Angle, Canapé | 6 | Structure / Plateau |
| Bibliothèque, Meuble, Fauteuil, Séparateur | 8 | Structure / Plateau |
| Porte, Station, Alcôve | 3 | Structure / Plateau / Tissu |

Quand le libellé nomme lui-même la matière — `NOIR METAL` — le groupe prend
« Piétement métal » sans hésitation. C'est seulement quand les deux teintes
sont nues — `HETRE / BLANC` — que la position tranche, et « Structure » est
alors un nom prudent plutôt qu'un nom juste.

**La question :** sur un comptoir, un casier, un module, que désignent la
première et la seconde teinte ? Corps et plateau, façade et intérieur,
autre chose ?
