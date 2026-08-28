// Récupération des avis Google via l'API Places (New).
// L'API ne renvoie JAMAIS plus de 5 avis, et c'est Google qui choisit lesquels —
// on ne peut ni en demander plus, ni trier par date.

const PLACE_ID = "ChIJta_VZGztyRIR_BKsMan8qjQ";

// Lien vers la fiche Google. On passe par Google Maps plutôt que
// search.google.com/local/reviews : cette dernière ouvre bien la liste sur
// mobile, mais retombe souvent sur une recherche générique sur ordinateur.
export const URL_FICHE_GOOGLE = `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`;
export const URL_LAISSER_AVIS = `https://search.google.com/local/writereview?placeid=${PLACE_ID}`;

// Valeurs de repli si l'API échoue ou n'est pas configurée — la section
// continue de s'afficher plutôt que de disparaître.
const REPLI = {
  note: 4.9,
  nombre: null,
  avis: [
    { texte: "Travail sérieux et très bon suivi de dossier et de chantier. J'ai apprécié tout le conseil pour bien cibler nos besoins. Excellente prestation, je recommande !", auteur: "Chantal C.", note: 5, photo: null, date: null },
    { texte: "Conseillère professionnelle, attentive et impliquée du début à la fin. Pleinement satisfait de cette collaboration et du mobilier livré.", auteur: "Yvan G.", note: 5, photo: null, date: null },
    { texte: "Excellent conseil sur l'implantation, de la réactivité et un bon rapport qualité-prix. Toute l'équipe a été au top.", auteur: "AP Ressources", note: 5, photo: null, date: null },
  ],
};

export async function getAvisGoogle() {
  const cle = process.env.GOOGLE_PLACES_API_KEY;
  if (!cle) return REPLI;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=fr`,
      {
        headers: {
          "X-Goog-Api-Key": cle,
          // On ne demande que les champs utiles : la facturation dépend
          // du nombre de champs demandés, pas du nombre d'appels.
          "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
        },
        // Une requête par jour suffit : les avis changent rarement et
        // ça évite d'appeler l'API à chaque visiteur.
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) return REPLI;
    const data = await res.json();

    const avis = (data.reviews || [])
      .filter((r) => r.text?.text?.trim())
      .map((r) => ({
        texte: r.text.text.trim(),
        auteur: r.authorAttribution?.displayName || "Client Google",
        note: r.rating || 5,
        photo: r.authorAttribution?.photoUri || null,
        date: r.publishTime || null,
      }));

    if (avis.length === 0) return REPLI;

    return {
      note: data.rating ?? REPLI.note,
      nombre: data.userRatingCount ?? null,
      avis,
      // Google fournit lui-même l'URL canonique de la fiche : plus fiable
      // que celle qu'on construit à la main.
      url: data.googleMapsUri || null,
    };
  } catch {
    return REPLI;
  }
}