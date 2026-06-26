import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ⚠️ Modifie ces deux valeurs avant de lancer
const EMAIL = "admin@coteburo.fr";
const PASSWORD = "Admin1234!";
const NOM = "Admin";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { password: hash, nom: NOM },
    create: { email: EMAIL, password: hash, nom: NOM, role: "ADMIN" },
  });
  console.log("✅ Compte admin prêt :", user.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());