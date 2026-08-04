import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─────────────────────────────────────────────────────────────
// Régénère le slug de chaque produit à partir de son NOM (qui contient
// désormais la gamme) → slug UNIQUE GLOBALEMENT, donc URL publique unique.
// Deux passes pour éviter toute collision transitoire avec le contrainte
// @@unique([gammeId, slug]). Ne touche à rien d'autre.
// ─────────────────────────────────────────────────────────────
async function main() {
  const vitrines = await prisma.produitVitrine.findMany({
    orderBy: [{ nom: "asc" }],
    select: { id: true, nom: true, slug: true, gammeId: true },
  });

  // Slugs finaux, uniques au global
  const used = new Set();
  const plan = []; // { id, gammeId, ancien, nouveau }
  for (const v of vitrines) {
    const base = slugify(v.nom) || "produit";
    let slug = base, i = 2;
    while (used.has(slug)) slug = `${base}-${i++}`;
    used.add(slug);
    plan.push({ id: v.id, gammeId: v.gammeId, ancien: v.slug, nouveau: slug });
  }

  // Passe 1 : slug provisoire unique (préfixe id) pour libérer tous les anciens
  await prisma.$transaction(
    plan.map((p) => prisma.produitVitrine.update({ where: { id: p.id }, data: { slug: `tmp-${p.id.slice(-8)}` } }))
  );

  // Passe 2 : slug final
  let changes = 0;
  await prisma.$transaction(
    plan.map((p) => prisma.produitVitrine.update({ where: { id: p.id }, data: { slug: p.nouveau } }))
  );

  for (const p of plan) {
    if (p.ancien !== p.nouveau) { console.log(`  ${p.ancien}  →  ${p.nouveau}`); changes++; }
  }

  // Détection de noms en double (URL ok mais nom identique = à nettoyer)
  const parNom = {};
  for (const v of vitrines) (parNom[v.nom] ||= []).push(v.id);
  const doublons = Object.entries(parNom).filter(([, ids]) => ids.length > 1);

  console.log(`\n════════════════════════════════`);
  console.log(`Produits : ${vitrines.length} · slugs modifiés : ${changes}`);
  if (doublons.length) {
    console.log(`\n⚠ Noms de produit EN DOUBLE (slugs différenciés par -2, mais à vérifier/fusionner) :`);
    doublons.forEach(([nom, ids]) => console.log(`   "${nom}" × ${ids.length}`));
  }
  console.log(`(Slugs uniques au global → plus de collision d'URL. Rien d'autre modifié.)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
