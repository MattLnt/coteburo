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

---

## 8. Sokoa — la table des codes coloris, celle qui débloque 71 fiches

C'est la demande la plus rentable du document : une seule table
débloquerait **soixante et onze fiches**.

### Ce qui se passe aujourd'hui

Sur une fiche produit, le client choisit sa déclinaison par étapes. Chez
Buronomic les étapes sont Largeur, puis Profondeur, puis Passage des câbles.
Chez Sokoa, il n'y a qu'une étape et elle propose **cinq boutons portant
exactement le même texte** :

```
Chaise 4 pieds, assise tapissée, dos PP (AOB0/11)
Chaise 4 pieds, assise tapissée, dos PP (AOB0/G2)
Chaise 4 pieds, assise tapissée, dos PP (AOB0/V5)
Chaise 4 pieds, assise tapissée, dos PP (AOB0/L4)
Chaise 4 pieds, assise tapissée, dos PP (AOB0/T7)
```

La désignation du tarif est identique d'une ligne à l'autre ; seul change le
suffixe de la référence, après la barre oblique.

Sur **quarante-deux** de ces fiches le prix ne bouge pas d'un suffixe à
l'autre — 162 € pour `/11` comme pour `/G2` chez Adio. Tout y indique un
**coloris de coque**.

Sur les **vingt-neuf autres**, il bouge, et parfois beaucoup :

| gamme | suffixes | prix |
|---|---|---|
| Azkar | 55 / 51 | 1 286 € / 1 273 € |
| Bero | 30 / 70 | 595 € / 607 € |
| Eden | 51 / 72 / 33 | 922 € / 958 € / 958 € |

Treize euros d'écart ressemblent à un supplément de finition — une base
aluminium poli contre une base noire. Trente-six euros, moins. **La question
vaut donc pour les deux cas : que code ce suffixe — une teinte, une finition
de piétement avec supplément, ou un autre produit ?**

### Ce qui manque

Le site sait afficher ces cinq lignes comme un axe « Coloris » à cinq
pastilles — c'est prêt, une option du script l'active. Mais il afficherait
« 11 », « G2 », « V5 » : des codes que personne ne sait lire.

Les nuanciers déjà en base ne répondent pas : ils portent des codes d'une
autre famille — `B 066`, `CUL`, `80M`, `SLB` — qui sont des références de
**tissu**, pas de coque, et qui ne se raccordent pas à ces suffixes.

### La demande

**La correspondance entre le suffixe de référence et la teinte**, dans ce
format :

```
11  →  Noir
G2  →  Gris
V5  →  Vert
L4  →  …
T7  →  …
```

Et, si les pastilles existent, une image par teinte — même format que
`sokoa_swatches`.

### Les 96 codes en usage, par gamme

| gamme | fiches | codes | les codes | exemple de référence |
|---|---|---|---|---|
| Loria | 23 | 17 | 1, 1+, 10, 4, 4+, 40, 7, 7+, 70, A, B, B+, B0, E, P, T, W | LCA0/1 |
| Eman | 27 | 16 | A, A0, B, B0, D, D0, E, E0, J, J0, K, K0 | NL86/E |
| Klik | 18 | 14 | 0, 2, 3, 7, AA, AL, AP, BB, C, CC, CE, *P*A*D, *P*A*T*D, 2*A*D | KLA0/AP |
| Adio | 20 | 12 | 1+, 11, 1N, 7+, G2, GB, L4, LL, T7, TT, V5, VV | AOB0/11 |
| Wi-Max | 15 | 12 | 10, 15, 15+, 18, 1N, 70, 76, 7L, 7N | WL66/7L |
| Alaia by Sokoa | 11 | 10 | 0*, 0G, 0K, 20, 4*, 4G, 4K, 5*, 5G, 5K | IR66/5K |
| Tertio | 11 | 8 | 10, 14, 14+, 15, 55, 70, 70+, 7B | RT36/10 |
| Bero | 3 | 6 | 10, 30, 31, 70, 71, B0 | ER05/30 |
| Punta | 5 | 6 | 0B, 0G, 20, 2B, 2G, H0 | PNY1/20 |
| Kanpoa by Colos | 2 | 5 | 10, 30, 60, 80, 90 | KPDC/10 |
| Ildo | 4 | 4 | 3, 7, N, P | DOA1/3 |
| Rhune | 11 | 4 | 00, 10, 11, 1B | RUYB/1B |
| Eden | 3 | 3 | 33, 51, 72 | EI17/51 |
| Azkar | 2 | 2 | 51, 55 | AK77/55 |
| Luma | 1 | 2 | B1, N1 | LM05/N1 |
| Sièges Hauts | 4 | 2 | 00, 20 | IA32/20 |
| Adela | 4 | 2 | 5, 5N | ALJ1/5N |

### Trois questions de lecture qui vont avec

1. **Le `+` suffixe-t-il une teinte ou un supplément ?** On trouve côte à
   côte `1` et `1+`, `4` et `4+`, `14` et `14+`, `70` et `70+`. Est-ce deux
   teintes distinctes, ou la même avec une option ?

2. **Le `0` final change-t-il quelque chose ?** Même remarque pour `A` / `A0`,
   `B` / `B0`, `E` / `E0`, `J` / `J0`, `K` / `K0` chez Eman, et `7` / `70`,
   `4` / `40` chez Loria.

3. **`+coloris*` figure dans certaines références du tarif** — `NL86/E+coloris*`,
   `WR66/10+coloris*`. Ce n'est manifestement pas un code mais un renvoi de
   note de bas de page. Que signale cette note, et faut-il la lire comme
   « coloris au choix » ?

### Et pour les 104 autres fiches

Un mot d'avertissement, qui n'appelle pas de réponse mais explique pourquoi
elles ne sont pas dans le compte des 71.

Sur cent quatre fiches, ce n'est pas le suffixe qui change d'une ligne à
l'autre mais le **préfixe** de la référence, la désignation restant la même :

```
Siège haut dossier résille, base nylon noir, roulettes ø50 sol moquette (WR66/10)
Siège haut dossier résille, base nylon noir, roulettes ø50 sol moquette (WR06/10)
```

`WR66` et `WR06` sont deux produits différents que le tarif décrit avec la
même phrase. Aucune table de coloris ne résoudra cela : il faudra savoir ce
qui les distingue — mécanisme, accotoirs, version. C'est le même genre de
doute que les points 1 et 2 de ce document, en beaucoup plus large.

---

## 9. Sokoa — « XF3/B » est-il la catégorie B ?

Cinq fiches de la gamme **Wi-Max Ergo** portent, dans leur liste de
catégories de revêtement, une valeur qui ne ressemble pas aux autres :

```
Tissu B+   ·   Tissu C   ·   Tissu D   ·   XF3/B
```

Toutes les autres fiches du catalogue écrivent « Tissu B », « Tissu B+ »,
« Tissu C ». Celle-ci écrit un code.

Trois faits concordent pour en faire la **catégorie B** :

1. **Le prix.** Sur les cinq fiches, `XF3/B` est systématiquement le moins
   cher, juste en dessous de Tissu B+, et l'écart est toujours le même :

   | fiche | XF3/B | Tissu B+ | Tissu C | Tissu D |
   |---|---|---|---|---|
   | JOF / Fauteuil moyen dossier + têtière | 1 065 € | 1 069 € | 1 074 € | 1 094 € |
   | AIR/M Fauteuil haut dossier | 826 € | 829 € | 832 € | 842 € |
   | ELO / Fauteuil haut dossier + têtière | 1 055 € | 1 060 € | 1 065 € | 1 085 € |

   L'ordre B < B+ < C < D est celui de tout le tarif.

2. **La place vide.** Aucune de ces cinq fiches n'a de valeur « Tissu B ».
   `XF3/B` occupe exactement ce créneau.

3. **Le `/B` final**, qui est la lettre de catégorie.

`XF3` serait alors une référence de tissu — le catalogue mentionne ailleurs
« Tissu B — Xtrevira uniquement », et l'Xtrevira est le tissu de base de la
catégorie B.

**La question :** `XF3/B` désigne-t-il bien la catégorie B, restreinte à un
tissu précis ? Si oui, lequel, et faut-il l'écrire « Tissu B — XF3 » comme
les autres restrictions du tarif ?

En attendant, la valeur reste affichée telle quelle et **ne tire aucun
nuancier** : c'est la seule des quatre catégories de ces fiches à ne montrer
aucune teinte au client.
