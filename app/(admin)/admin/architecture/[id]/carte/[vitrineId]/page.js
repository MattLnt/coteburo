import { permanentRedirect } from "next/navigation";

// L'ancienne adresse d'édition d'une fiche, conservée parce qu'elle a été
// mise en favori et qu'elle traîne dans des liens.
//
// POURQUOI ELLE NE MÈNE PLUS À SON FORMULAIRE
//   Ce formulaire écrivait dans `declinaisons`, `groupesFinition` et
//   `optionsAdditionnelles` — les champs JSON du modèle d'avant. La boutique
//   ne les lit plus : elle lit Choix, ValeurChoix, Combinaison et Visuel.
//   Une correction faite là ne paraissait donc nulle part, en silence, ce qui
//   est la pire façon de perdre du travail.
//
//   Les composants restent sur le disque tant que la reprise des données
//   n'est pas close. Seule la route est détournée.

export default async function CartePage({ params }) {
  const { vitrineId } = await params;
  permanentRedirect(`/admin/produits/${vitrineId}`);
}
