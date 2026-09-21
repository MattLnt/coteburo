# Ce qui manque au catalogue

Relevé du 21 septembre 2026, sur 555 fiches publiées.

Les chiffres se régénèrent : `node prisma/etat-catalogue.mjs`. Ce fichier
porte ce que les chiffres ne disent pas — pourquoi ça manque, et à qui le
demander.

---

## 1. Les visuels — 221 fiches sur 555 n'ont aucune image

C'est le premier manque du catalogue, et de loin. 136 autres fiches n'ont
qu'un seul visuel.

Les gammes entièrement dépourvues, à traiter en priorité parce qu'un lot
d'images en règle vingt d'un coup :

| | gamme | fiches sans visuel |
|---|---|---|
| Sokoa | Adio | 20 / 20 |
| OfficePro | Verano | 14 / 16 |
| Buronomic | ALTO | 14 / 18 |
| Sokoa | Adela | 12 / 24 |
| Sokoa | Eman | 12 / 27 |
| Sokoa | Loria | 10 / 23 |
| OfficePro | Coigny | 8 / 8 |
| OfficePro | Tecseat | 7 / 8 |
| OfficePro | Beez | 6 / 6 |
| Sokoa | Azkar, Bero | 4 / 4 chacune |
| Sokoa | Eden | 3 / 3 |

Par marque : **Sokoa 89 · OfficePro 70 · Buronomic 62**.

Le détail complet sort de `node prisma/etat-catalogue.mjs --visuels`.

---

## 2. Les pastilles de finition — 81 finitions sur 2 135

Le nuancier Sokoa 2026 a réglé les 48 teintes de la bibliothèque
(`prisma/pastilles-sokoa.mjs`). Ce qui reste se range en trois tas, et un
seul se règle avec un nuancier.

### a. Il me manque le nuancier OfficePro — 14 coloris, 18 finitions

```
BLEU PAON ×3 · GRIS CHINÉ FONCÉ ×2 · GRIS CHINÉ CLAIR ×2 · VERT TILLEUL
TURQUOISE · BLEU JEAN · VERT ANIS · PRUNE · BLEU CIEL · GRIS ANTHRACITE
CITRON · PARME · GRIS BLANC · NOIR ET ROUGE
```

Le catalogue OfficePro n'a **pas** de planche de nuancier. Trois coloris ont
pu être relevés sur les pages produits où ils sont dessinés en aplats
vectoriels sous leur nom — `MENTHE #75d1b5`, `KAKI #6a7357`,
`ARDOISE #2d3d51`. Partout ailleurs, les noms sont dans un tableau de
références et les carrés voisins sont des images JPEG 2000 illisibles pour
la bibliothèque de rendu : elles s'affichent en aplat bleu uniforme.

**À demander à OfficePro : le nuancier, au format du Sokoa_Nuancier_2026.pdf.**
`prisma/pastilles-officepro.mjs` le traitera tel quel.

### b. Buronomic — 3 coloris, 6 finitions

`Chêne Nebraska` ×3 · `ZINC METAL` ×2 · `AQUA`

Trop peu pour déranger le fournisseur : à saisir à la main dans l'onglet
Choix, le sélecteur de couleur est en place.

### c. 57 finitions qu'aucun nuancier ne réglera

**44 sont des matières, pas des couleurs.** `PP` ×28, `Stratifié` ×6,
`Mélaminé` ×3, `Bois` ×4, `Acier` ×2, `Lin plastique`. Il leur faudrait une
vignette de matière — ou bien elles n'ont rien à faire dans un groupe de
finition.

**13 ne sont pas des finitions du tout.** `PVP unitaire` ×6,
`PVP lot de 4` ×4, `PVP lot de 2` ×3, chez Sokoa. C'est un **conditionnement**
rangé dans un groupe « Finitions ».

> C'est le seul manque de cette liste qui coûte de l'argent : tant qu'il
> reste une finition, un client peut choisir « lot de 4 » et payer le prix
> d'une chaise. Cela doit devenir une question tarifaire.

---

## 3. Les prix — 10 combinaisons sur 7 390

Dix variantes n'ont pas de tarif fournisseur, et neuf pas de référence. Ce
sont les trous connus des tarifs, relevés à la migration. Ils concernent des
fiches marginales ; à demander au fil de l'eau plutôt qu'en lot.

---

## 4. Les jetons de référence — 659 finitions sur 2 135

Une finition sans jeton n'est pas commandable en ligne : la référence
assemblée ne saurait pas la coder. Ce n'est pas toujours une anomalie — sur
la plupart des fiches, la finition ne décline pas la référence, et le jeton
n'a donc pas lieu d'être.

À vérifier fiche par fiche quand une commande le réclamera, pas avant.

---

## 5. Ce qui est réglé, pour mémoire

- **Les rayons** : 0 fiche sans rayon, 37 icônes attribuées (6 catégories,
  31 rayons).
- **Les descriptifs** : 0 fiche sans descriptif ; les 555 portent leurs
  sections techniques.
- **La bibliothèque de finitions** : 219 teintes, toutes avec pastille.
- **Les nuanciers** : 7 employés, 8 dormants (156 teintes) — Bouclé F.R.,
  Grain, Tissu B, B+, C, D, E, H. Soit ils servent à des fiches pas encore
  rattachées, soit ils sont à retirer. Personne ne supprime sans validation.
- **Runner et les 7 teintes de Tissu C sont les mêmes tissus** (codes `R4E`,
  `R4G`…). Les deux palettes les portent ; une seule suffirait sans doute.
