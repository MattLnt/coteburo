import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// AUDIT LECTURE SEULE — ne modifie RIEN.
// Objectif : montrer, avant la refonte "catégories globales",
// quels slugs de catégories / sous-catégories sont dupliqués entre
// marques, et tout ce qui y est rattaché (sous-cat, gammes, produits,
// principales). Sert de base de décision pour la fusion (Phase 1).
// ─────────────────────────────────────────────────────────────

async function main() {
  const marques = await prisma.marque.findMany({ select: { id: true, nom: true, slug: true } });
  const nomMarque = Object.fromEntries(marques.map((m) => [m.id, m.nom]));
  console.log(`Marques (${marques.length}) : ${marques.map((m) => m.nom).join(", ")}\n`);

  // Toutes les catégories, avec compteurs de rattachements
  const cats = await prisma.categorie.findMany({
    orderBy: [{ slug: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { sousCategories: true, gammes: true, vitrines: true } },
      sousCategories: { select: { id: true, slug: true, nom: true, _count: { select: { vitrines: true } } } },
    },
  });

  // Groupe par slug de catégorie
  const parSlug = new Map();
  for (const c of cats) {
    if (!parSlug.has(c.slug)) parSlug.set(c.slug, []);
    parSlug.get(c.slug).push(c);
  }

  console.log(`Catégories : ${cats.length} au total, ${parSlug.size} slugs distincts\n`);
  console.log("═══ CATÉGORIES PAR SLUG (⚠ = doublon entre marques, à fusionner) ═══");
  let nbDoublonsCat = 0;
  for (const [slug, liste] of [...parSlug.entries()].sort()) {
    const dup = liste.length > 1;
    if (dup) nbDoublonsCat++;
    console.log(`\n${dup ? "⚠" : " "} [${slug}] — ${liste.length} exemplaire(s)`);
    for (const c of liste) {
      console.log(
        `     • "${c.nom}" (marque ${nomMarque[c.marqueId] || c.marqueId})` +
          ` — ${c._count.sousCategories} sous-cat, ${c._count.gammes} gammes, ${c._count.vitrines} produits` +
          ` [id ${c.id}]`
      );
    }
  }

  // Sous-catégories : collisions APRÈS fusion des catégories (même slug de cat + même slug de sous-cat)
  console.log("\n\n═══ SOUS-CATÉGORIES — collisions après fusion des catégories ═══");
  const sousParCle = new Map(); // clé = slugCatégorie|slugSousCat
  for (const c of cats) {
    for (const s of c.sousCategories) {
      const cle = `${c.slug}|${s.slug}`;
      if (!sousParCle.has(cle)) sousParCle.set(cle, []);
      sousParCle.get(cle).push({ ...s, catNom: c.nom, marque: nomMarque[c.marqueId] });
    }
  }
  let nbDoublonsSous = 0;
  for (const [cle, liste] of [...sousParCle.entries()].sort()) {
    if (liste.length > 1) {
      nbDoublonsSous++;
      console.log(`\n⚠ [${cle}] — ${liste.length} exemplaires à fusionner`);
      for (const s of liste) {
        console.log(`     • "${s.nom}" (cat "${s.catNom}" / ${s.marque}) — ${s._count.vitrines} produits [id ${s.id}]`);
      }
    }
  }
  if (nbDoublonsSous === 0) console.log("  (aucune collision de sous-catégorie)");

  // Produits pointant vers une catégorie/sous-cat principale (à re-pointer lors de la fusion)
  const nbCatPrinc = await prisma.produitVitrine.count({ where: { categoriePrincipaleId: { not: null } } });
  const nbSousPrinc = await prisma.produitVitrine.count({ where: { sousCategoriePrincipaleId: { not: null } } });

  // Liaisons many-to-many (indicatif)
  const totVitrines = await prisma.produitVitrine.count();

  console.log("\n\n═══ RÉSUMÉ ═══");
  console.log(`  Catégories à fusionner (slugs en doublon) : ${nbDoublonsCat}`);
  console.log(`  Sous-catégories à fusionner : ${nbDoublonsSous}`);
  console.log(`  Produits avec catégorie principale définie : ${nbCatPrinc} / ${totVitrines}`);
  console.log(`  Produits avec sous-catégorie principale définie : ${nbSousPrinc} / ${totVitrines}`);
  console.log("\n(Lecture seule — rien n'a été modifié.)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
