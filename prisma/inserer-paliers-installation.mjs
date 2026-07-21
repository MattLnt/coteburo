import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const paliers = [
  { seuilMax: 1500, prix: 120, ordre: 0 },
  { seuilMax: 3000, prix: 240, ordre: 1 },
  { seuilMax: 5000, prix: 350, ordre: 2 },
  { seuilMax: 10000, prix: 550, ordre: 3 },
];

async function main() {
  const existants = await prisma.palierInstallation.count();
  if (existants > 0) {
    console.log(`⚠ ${existants} palier(s) déjà en base — rien inséré pour éviter les doublons.`);
    return;
  }
  await prisma.palierInstallation.createMany({ data: paliers });
  console.log(`✓ ${paliers.length} paliers d'installation insérés.`);
}

main().finally(() => prisma.$disconnect());