// Recolle les groupes de finition qu'une position du tarif traverse.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/reparer-groupes-finition.mjs
//   node prisma/reparer-groupes-finition.mjs --appliquer
//
// LE DÉFAUT
//   Six fiches ont leur piétement réparti sur DEUX groupes : « Piétement
//   métal » porte le noir et le blanc, « Équerres » ou « Structure » porte
//   l'aluminium tout seul. Le tarif, lui, écrit une seule position —
//   ALUMINIUM · NOIR METAL · BLANC METAL — et aucun des deux groupes ne la
//   couvre. La référence ne peut donc pas se reconstruire.
//
//   Le client, lui, voit deux questions là où il n'y a qu'un choix, dont une
//   à réponse unique.
//
// LA PREUVE QUE C'EST BIEN UN DÉFAUT
//   « Voile de fond suspendu - Astro Direction » porte UN seul groupe,
//   « Équerres », avec ses trois valeurs — noir, blanc, aluminium — et passe
//   le test sans difficulté. C'est la forme entière ; les six autres en sont
//   la version cassée.
//
// LE NOM CONSERVÉ
//   Le nom le plus précis l'emporte sur le plus générique : « Équerres » et
//   « Structure » devant « Piétement métal ». Astro Direction le confirme
//   pour les voiles de fond. Pour les deux angles, « Structure » est le mot
//   de l'ancienne base, faute de contre-exemple.
//
// CE QUI N'EST PAS TOUCHÉ
//   Une fiche n'est recollée que si la RÉUNION de deux groupes couvre
//   exactement une position que ni l'un ni l'autre ne couvre seul. Tout
//   autre cas est laissé tel quel et signalé.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

// Un nom générique cède devant un nom qui désigne une pièce précise.
const GENERIQUE = /^(PIETEMENT|PIETEMENTS|FINITION|FINITIONS|STRUCTURE METAL|CORPS)/;

const correspond = (morceau, nomValeur) => {
  const k = nu(morceau);
  const kv = nu(nomValeur);
  if (!k || !kv) return false;
  if (k === kv) return true;
  if (k.startsWith(`${kv} `) || k.endsWith(` ${kv}`)) return true;
  if (kv.startsWith(`${k} `) || kv.endsWith(` ${k}`)) return true;
  const d = k.split(" ").pop();
  return d.length > 2 && kv.split(" ").pop() === d;
};

const couvre = (groupe, morceaux) =>
  morceaux.every((m) => groupe.finitions.some((f) => correspond(m, f.nom)));

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, declinaisons: true,
      groupesFinition: {
        select: { id: true, nom: true, ordre: true, finitions: { select: { id: true, nom: true, ordre: true } } },
      },
    },
  });

  const plan = [];
  const refuses = [];
  for (const v of vitrines) {
    const groupes = [...v.groupesFinition].sort((a, b) => a.ordre - b.ordre);
    if (groupes.length < 2) continue;
    const declinaisons = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const refs = declinaisons.find((d) => d.referencesParFinition)?.referencesParFinition;
    if (!refs) continue;
    const libelles = Object.keys(refs);
    const decoupe = libelles.map((l) => l.split(/\s+\/\s+|\s+-\s+/).map((s) => s.trim()).filter(Boolean));
    const K = decoupe[0]?.length || 0;
    if (!K || decoupe.some((m) => m.length !== K)) continue;

    // Un groupe qui couvre à lui seul une autre position sert déjà : il n'est
    // pas disponible pour en recoller une deuxième. Chez Envol Manager,
    // « Voiles de fond » tient la position 2, ce qui laisse une seule lecture
    // possible de la position 1.
    const pris = new Set();
    for (let j = 0; j < K; j += 1) {
      const m = [...new Set(decoupe.map((x) => x[j]))];
      for (const g of groupes) if (couvre(g, m)) pris.add(g.id);
    }

    for (let j = 0; j < K; j += 1) {
      const morceaux = [...new Set(decoupe.map((m) => m[j]))];
      if (groupes.some((g) => couvre(g, morceaux))) continue;   // position déjà couverte

      const libres = groupes.filter((g) => !pris.has(g.id));
      // Quelles paires de groupes couvrent la position une fois réunies ?
      const paires = [];
      for (let a = 0; a < libres.length; a += 1) {
        for (let b = a + 1; b < libres.length; b += 1) {
          const fusion = { finitions: [...libres[a].finitions, ...libres[b].finitions] };
          if (couvre(fusion, morceaux)) paires.push([libres[a], libres[b]]);
        }
      }
      if (paires.length !== 1) {
        refuses.push({
          nom: v.nom, position: j + 1, morceaux,
          motif: paires.length ? `${paires.length} paires possibles, aucune ne s'impose`
            : "aucune paire de groupes ne couvre cette position",
          groupes: groupes.map((g) => `${g.nom} (${g.finitions.length})`),
        });
        continue;
      }

      const [A, B] = paires[0];
      // Le nom le plus précis gagne ; à égalité, celui du groupe le plus fourni.
      const aGenerique = GENERIQUE.test(nu(A.nom));
      const bGenerique = GENERIQUE.test(nu(B.nom));
      let garde = A;
      let absorbe = B;
      if (aGenerique && !bGenerique) { garde = B; absorbe = A; }
      else if (aGenerique === bGenerique && B.finitions.length > A.finitions.length) { garde = B; absorbe = A; }

      plan.push({ vitrineId: v.id, nom: v.nom, position: j + 1, morceaux, garde, absorbe });
    }
  }

  titre("CE QUI SERAIT RECOLLÉ");
  console.log(`\n   ${plan.length} fiche(s)\n`);
  for (const p of plan) {
    const teintes = [...p.garde.finitions, ...p.absorbe.finitions]
      .sort((a, b) => a.ordre - b.ordre).map((f) => f.nom);
    console.log(`   ${p.nom}`);
    console.log(`      position ${p.position} du tarif : ${p.morceaux.join(" · ")}`);
    console.log(`      « ${p.garde.nom} » (${p.garde.finitions.length}) absorbe « ${p.absorbe.nom} » (${p.absorbe.finitions.length})`);
    console.log(`      → ${p.garde.nom} : ${teintes.join(", ")}`);
  }

  if (refuses.length) {
    titre("POSITIONS NON COUVERTES, LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) {
      console.log(`   ${r.nom} — position ${r.position}`);
      console.log(`      tarif : ${r.morceaux.join(" · ")}`);
      console.log(`      groupes : ${r.groupes.join(" · ")}`);
      console.log(`      ${r.motif}`);
    }
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plan) {
    const debut = p.garde.finitions.length;
    await prisma.finition.updateMany({
      where: { groupeId: p.absorbe.id },
      data: { groupeId: p.garde.id },
    });
    // Les teintes reprises se rangent à la suite, sans bousculer l'ordre
    // choisi pour celles qui étaient déjà là.
    const reprises = [...p.absorbe.finitions].sort((a, b) => a.ordre - b.ordre);
    for (let i = 0; i < reprises.length; i += 1) {
      await prisma.finition.update({ where: { id: reprises[i].id }, data: { ordre: debut + i } });
    }
    await prisma.groupeFinition.delete({ where: { id: p.absorbe.id } });
    console.log(`   ${p.nom} → « ${p.garde.nom} » à ${debut + reprises.length} teintes`);
  }

  titre("CONTRÔLE");
  const restants = await prisma.groupeFinition.count();
  const orphelines = await prisma.finition.count({ where: { groupe: { is: null } } }).catch(() => 0);
  console.log(`   groupes de finition en base : ${restants}`);
  console.log(`   finitions sans groupe       : ${orphelines}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
