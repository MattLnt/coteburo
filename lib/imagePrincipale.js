// La carte du catalogue lit ProduitVitrine.imageUrl ; la fiche et le panier
// lisent ProduitVitrine.images. Ce sont des copies de la table Visuel, et
// elles ne se mettaient à jour qu'à l'ajout d'une image : choisir une autre
// vignette dans l'admin n'atteignait jamais la carte.
//
// Chaque geste qui touche un visuel — ajout, rôle, ordre, suppression,
// attribution depuis la médiathèque — repasse par ici.
//
// Reçoit le client Prisma en paramètre : les scripts de prisma/ ont le
// leur, l'application a le sien.

/**
 * Recopie la vignette et la galerie d'une fiche depuis ses visuels.
 *
 * La vignette est le visuel de rôle « vignette » — le premier par ordre s'il
 * y en a plusieurs, les autres redeviennent galerie. Sans vignette déclarée,
 * la première image de galerie ; sans galerie, la première image, quelle
 * qu'elle soit.
 *
 * @returns l'adresse de la vignette retenue, ou null
 */
export async function synchroniserImagePrincipale(prisma, vitrineId) {
  const visuels = await prisma.visuel.findMany({
    where: { vitrineId }, orderBy: { ordre: "asc" }, select: { id: true, url: true, role: true },
  });
  const vignettes = visuels.filter((v) => v.role === "vignette");
  if (vignettes.length > 1) {
    await prisma.visuel.updateMany({
      where: { id: { in: vignettes.slice(1).map((v) => v.id) } }, data: { role: "galerie" },
    });
  }
  const principale = vignettes[0] ?? visuels.find((v) => v.role === "galerie") ?? visuels[0] ?? null;
  const autres = visuels.filter((v) => v !== principale).map((v) => v.url);
  await prisma.produitVitrine.update({
    where: { id: vitrineId }, data: { imageUrl: principale?.url ?? null, images: autres },
  });
  return principale?.url ?? null;
}
