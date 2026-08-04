import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Lecture seule : montre les produits en double par nom (ex. "Fauteuil Tecsy"),
// avec leur contenu, pour décider lequel supprimer. Ne supprime RIEN.
async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, slug: true, publie: true, imageUrl: true, images: true,
      descriptif: true, axesDeclinaisons: true, declinaisons: true,
      gamme: { select: { nom: true } },
      _count: { select: { produits: true, groupesFinition: true } },
    },
  });
  const parNom = {};
  for (const v of vitrines) (parNom[v.nom] ||= []).push(v);
  const doublons = Object.entries(parNom).filter(([, a]) => a.length > 1);

  if (!doublons.length) { console.log("Aucun doublon de nom."); return; }
  for (const [nom, list] of doublons) {
    console.log(`\n### "${nom}" — ${list.length} exemplaires`);
    for (const v of list) {
      const nbDecl = Array.isArray(v.declinaisons) ? v.declinaisons.length : 0;
      const nbImg = (v.images || []).length + (v.imageUrl ? 0 : 0);
      console.log(`   • id ${v.id}`);
      console.log(`     gamme=${v.gamme?.nom} · slug=${v.slug} · publié=${v.publie}`);
      console.log(`     déclinaisons=${nbDecl} · images=${(v.images||[]).length} · imageUrl=${v.imageUrl ? "oui" : "non"} · descriptif=${v.descriptif ? "oui" : "non"} · finitions=${v._count.groupesFinition} · anciensProduits=${v._count.produits}`);
    }
    console.log(`   → garde celui avec des déclinaisons/prix, supprime l'autre (vide).`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
