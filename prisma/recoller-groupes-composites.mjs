// Rend lisibles les libellés composites du tarif en réparant les groupes de
// finition : recoller ceux qu'un libellé traverse, compléter ceux auxquels il
// manque une teinte.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/recoller-groupes-composites.mjs
//   node prisma/recoller-groupes-composites.mjs --appliquer
//
// LE DÉFAUT, VU DEPUIS LA FICHE
//   « Armoire à rideaux - Classif » pose une question tarifaire dont chaque
//   valeur agrège deux pièces : « NOIR METAL / NOIR ». La fiche ne sait la
//   relire qu'en rattachant chaque position à UN groupe qui lui soit propre.
//   Quand ce rattachement échoue, l'écran attribue deux positions au même
//   groupe et le choix des portes disparaît. Le client ne peut plus choisir.
//
//   Deux causes, deux remèdes :
//
//   1. UN GROUPE COUPÉ EN DEUX. La position réclame noir, aluminium et blanc
//      métal ; ils sont éclatés entre « Piétement métal » et « Structure ».
//      On les recolle.
//
//   2. UNE TEINTE MANQUANTE. La position réclame sept teintes, le groupe
//      « Portes et intérieur » n'en tient que six : le tarif vend du Yukon
//      que le groupe ignore. On l'ajoute.
//
// LE MÊME MAL QU'AILLEURS
//   Six fiches avaient déjà ce piétement coupé en deux ; elles ont été
//   recollées en lisant la table des références du tarif. Celles-ci n'en ont
//   pas : leur position vient du libellé composite, qui vit maintenant dans
//   les choix. On lit donc la même chose à la nouvelle source.
//
// LA RÈGLE
//   Rien n'est inventé. Une fusion n'a lieu que si la réunion de DEUX groupes
//   couvre exactement une position que ni l'un ni l'autre ne couvre seul, et
//   qu'il n'existe qu'une seule paire possible. Une teinte n'est ajoutée que
//   si elle est écrite dans le libellé composite, qu'un seul groupe est en
//   défaut, qu'il lui en manque au plus deux, et que le catalogue ne connaît
//   qu'une graphie du mot. Tout le reste est laissé tel quel et signalé.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

// Un nom générique cède devant un nom qui désigne une pièce précise.
const GENERIQUE = /^(PIETEMENT|PIETEMENTS|FINITION|FINITIONS|STRUCTURE METAL|CORPS)/;

const correspond = (morceau, libelle) => {
  const k = nu(morceau);
  const kv = nu(libelle);
  if (!k || !kv) return false;
  if (k === kv) return true;
  if (k.startsWith(`${kv} `) || k.endsWith(` ${kv}`)) return true;
  if (kv.startsWith(`${k} `) || kv.endsWith(` ${k}`)) return true;
  const d = k.split(" ").pop();
  return d.length > 2 && kv.split(" ").pop() === d;
};

const couvre = (valeurs, morceaux) =>
  morceaux.every((m) => valeurs.some((v) => correspond(m, v.libelle)));

const manquantes = (valeurs, morceaux) =>
  morceaux.filter((m) => !valeurs.some((v) => correspond(m, v.libelle)));

// Existe-t-il une façon d'attribuer à chaque position un groupe qui lui soit
// propre ? La couverture seule ne suffit pas : « Portes et intérieur » contient
// par hasard noir, aluminium et blanc, donc il « couvre » aussi la position du
// piétement. Ce qu'il faut, c'est un rattachement INJECTIF.
function injectif(listes) {
  const essayer = (i, pris) => {
    if (i === listes.length) return true;
    for (const id of listes[i]) {
      if (pris.has(id)) continue;
      pris.add(id);
      if (essayer(i + 1, pris)) return true;
      pris.delete(id);
    }
    return false;
  };
  return listes.every((L) => L.length) && essayer(0, new Set());
}

const rattachement = (groupes, positions) =>
  positions.map((m) => groupes.filter((g) => couvre(g.valeurs, m)).map((g) => g.id));

/**
 * La graphie que le catalogue donne à un mot du tarif.
 *
 * « YUKON » dans le libellé composite s'écrit « Yukon » partout ailleurs. On
 * ne retient une entrée que si le catalogue ne connaît qu'une seule graphie
 * du mot : on préfère ne rien écrire à écrire « Fixé » pour « FIXE ».
 */
async function lexique() {
  const L = await prisma.valeurChoix.findMany({
    where: { choix: { nature: "finition" } },
    select: { libelle: true, couleur: true, imageUrl: true, modeleId: true },
  });
  const tas = new Map();
  for (const v of L) {
    const k = nu(v.libelle);
    // La graphie toute en capitales est celle du tarif, pas celle du catalogue.
    if (!k || v.libelle === v.libelle.toUpperCase()) continue;
    if (!tas.has(k)) tas.set(k, new Map());
    tas.get(k).set(v.libelle, v);
  }
  const lex = new Map();
  for (const [k, formes] of tas) if (formes.size === 1) lex.set(k, [...formes.values()][0]);
  return lex;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const LEX = await lexique();
  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true,
      choix: {
        orderBy: { ordre: "asc" },
        select: {
          id: true, nom: true, nature: true, ordre: true,
          valeurs: { orderBy: { ordre: "asc" }, select: { id: true, libelle: true, ordre: true } },
        },
      },
    },
  });

  const fusions = [];
  const ajouts = [];
  const refuses = [];

  for (const v of vitrines) {
    // L'état des groupes tel qu'il sera après les réparations décidées ici :
    // une fiche peut porter plusieurs libellés composites, et le second doit
    // se lire sur les groupes que le premier a déjà recollés.
    const groupes = v.choix.filter((c) => c.nature === "finition")
      .map((c) => ({ id: c.id, nom: c.nom, valeurs: [...c.valeurs] }));
    if (groupes.length < 2) continue;

    const composites = v.choix.filter((c) => c.nature === "tarifaire"
      && c.valeurs.some((x) => /\s+\/\s+|\s+-\s+/.test(x.libelle)));
    if (!composites.length) continue;

    for (const comp of composites) {
      const parts = comp.valeurs.map((x) =>
        x.libelle.split(/\s+\/\s+|\s+-\s+/).map((s) => s.trim()).filter(Boolean));
      const K = parts[0]?.length || 0;
      if (K < 2 || parts.some((p) => p.length !== K)) continue;

      const positions = [];
      for (let i = 0; i < K; i += 1) positions.push([...new Set(parts.map((x) => x[i]))]);

      const ecarte = (motif) => refuses.push({
        nom: v.nom, choix: comp.nom, motif,
        groupes: groupes.map((g) => `${g.nom} (${g.valeurs.length})`),
        positions: positions.map((m) => m.join(" · ")),
      });

      if (injectif(rattachement(groupes, positions))) continue;  // déjà lisible

      // ── Remède 1 : deux groupes qu'il faut recoller ────────────────────
      const paires = [];
      for (let a = 0; a < groupes.length; a += 1) {
        for (let b = a + 1; b < groupes.length; b += 1) {
          const A = groupes[a];
          const B = groupes[b];
          const fondu = { id: A.id, nom: A.nom, valeurs: [...A.valeurs, ...B.valeurs] };
          const essai = groupes.filter((g) => g !== A && g !== B).concat(fondu);
          if (injectif(rattachement(essai, positions))) paires.push([A, B]);
        }
      }

      if (paires.length === 1) {
        const [A, B] = paires[0];
        const aGen = GENERIQUE.test(nu(A.nom));
        const bGen = GENERIQUE.test(nu(B.nom));
        let garde = A;
        let absorbe = B;
        if (aGen && !bGen) { garde = B; absorbe = A; }
        else if (aGen === bGen && B.valeurs.length > A.valeurs.length) { garde = B; absorbe = A; }

        fusions.push({ nom: v.nom, choix: comp.nom, garde, absorbe });
        // On recolle dans l'état simulé pour la suite de la fiche.
        garde.valeurs = [...garde.valeurs, ...absorbe.valeurs];
        groupes.splice(groupes.indexOf(absorbe), 1);
        continue;
      }
      if (paires.length > 1) {
        ecarte(`${paires.length} recollages possibles, aucun ne s'impose`);
        continue;
      }

      // ── Remède 2 : une position que le groupe ne suit plus entièrement ──
      // Le tarif vend une teinte que le groupe ignore. On la lui rend, prise
      // au libellé composite lui-même et écrite comme le catalogue l'écrit.
      const propositions = [];
      let renonce = null;
      for (const m of positions) {
        if (groupes.some((g) => couvre(g.valeurs, m))) continue;
        // Le groupe en défaut est celui à qui il manque le moins — et il doit
        // être seul dans ce cas, sans quoi on ne sait pas lequel corriger.
        const scores = groupes
          .map((g) => ({ g, manque: manquantes(g.valeurs, m) }))
          .filter((s) => s.manque.length <= 2 && s.manque.length < m.length - 1)
          .sort((a, b) => a.manque.length - b.manque.length);
        if (!scores.length) {
          renonce = `position « ${m.join(" · ")} » : aucun groupe n'en tient l'essentiel`;
          break;
        }
        if (scores.length > 1 && scores[0].manque.length === scores[1].manque.length) {
          renonce = `position « ${m.join(" · ")} » : deux groupes à égalité, lequel corriger ?`;
          break;
        }
        const { g, manque } = scores[0];
        const teintes = manque.map((mot) => LEX.get(nu(mot)));
        if (teintes.some((t) => !t)) {
          const inconnus = manque.filter((mot) => !LEX.get(nu(mot)));
          renonce = `position « ${m.join(" · ")} » : ${inconnus.join(", ")} — graphie inconnue ou ambiguë`;
          break;
        }
        propositions.push({ groupe: g, teintes });
      }

      if (renonce) { ecarte(renonce); continue; }
      if (!propositions.length) { ecarte("lecture ambiguë sans position manquante"); continue; }

      // On ne complète que si cela rend vraiment la fiche lisible.
      const simule = groupes.map((g) => {
        const p = propositions.find((x) => x.groupe === g);
        return p ? { ...g, valeurs: [...g.valeurs, ...p.teintes] } : g;
      });
      if (!injectif(rattachement(simule, positions))) {
        ecarte("compléter les groupes ne suffit pas à lever l'ambiguïté");
        continue;
      }

      for (const p of propositions) {
        ajouts.push({ nom: v.nom, choix: comp.nom, groupe: p.groupe, teintes: p.teintes });
        p.groupe.valeurs = [...p.groupe.valeurs, ...p.teintes];
      }
    }
  }

  titre("CE QUI SERAIT RECOLLÉ");
  console.log(`\n   ${fusions.length} groupe(s) recollé(s)\n`);
  for (const p of fusions) {
    console.log(`   ${p.nom} — « ${p.choix} »`);
    console.log(`      « ${p.garde.nom} » absorbe « ${p.absorbe.nom} »`);
  }

  titre("CE QUI SERAIT COMPLÉTÉ");
  console.log(`\n   ${ajouts.length} groupe(s) complété(s)\n`);
  for (const a of ajouts) {
    console.log(`   ${a.nom} — « ${a.choix} »`);
    console.log(`      « ${a.groupe.nom} » reçoit ${a.teintes.map((t) => t.libelle).join(", ")}`);
    console.log(`      → ${a.groupe.valeurs.map((x) => x.libelle).join(", ")}`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses.slice(0, 12)) {
      console.log(`   ${r.nom} — « ${r.choix} »`);
      for (const m of r.positions) console.log(`      position : ${m}`);
      console.log(`      groupes : ${r.groupes.join(" · ")}`);
      console.log(`      ${r.motif}`);
    }
    if (refuses.length > 12) console.log(`   … et ${refuses.length - 12} autres`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of fusions) {
    const reprises = [...p.absorbe.valeurs].sort((a, b) => a.ordre - b.ordre);
    const debut = p.garde.valeurs.length - reprises.length;
    for (let i = 0; i < reprises.length; i += 1) {
      await prisma.valeurChoix.update({
        where: { id: reprises[i].id },
        // Les teintes reprises se rangent à la suite, sans bousculer l'ordre
        // déjà choisi pour celles qui étaient là.
        data: { choixId: p.garde.id, ordre: debut + i },
      });
    }
    await prisma.choix.delete({ where: { id: p.absorbe.id } });
    console.log(`   ${p.nom} → « ${p.garde.nom} » à ${p.garde.valeurs.length} teintes`);
  }

  for (const a of ajouts) {
    const debut = a.groupe.valeurs.length - a.teintes.length;
    for (let i = 0; i < a.teintes.length; i += 1) {
      const t = a.teintes[i];
      await prisma.valeurChoix.create({
        data: {
          choixId: a.groupe.id,
          libelle: t.libelle,
          ordre: debut + i,
          // La teinte reprend la pastille que le catalogue lui donne ailleurs,
          // sinon elle s'afficherait en gris au milieu des autres.
          couleur: t.couleur ?? null,
          imageUrl: t.imageUrl ?? null,
          modeleId: t.modeleId ?? null,
          // Pas de suffixe : le tarif ne décline pas la référence par cette
          // question ici, et en inventer un rendrait la fiche incommandable.
          suffixeReference: null,
        },
      });
    }
    console.log(`   ${a.nom} → « ${a.groupe.nom} » reçoit ${a.teintes.map((t) => t.libelle).join(", ")}`);
  }

  titre("CONTRÔLE");
  const [choix, valeurs] = await Promise.all([prisma.choix.count(), prisma.valeurChoix.count()]);
  console.log(`   choix ${choix} · valeurs ${valeurs}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
