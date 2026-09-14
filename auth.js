import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { limiter } from "@/lib/limiteDebit";

// Configuration COMPLÈTE — celle qui touche la base. Réservée au runtime Node.
// Le middleware, lui, part de auth.config.js : sans cette séparation il
// embarquait le client Prisma dans son bundle edge.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase();

        // Sans frein, un mot de passe se devine à la chaîne. Dix essais par
        // quart d'heure et par compte : un humain qui hésite passe, un script
        // non. Le refus se confond volontairement avec un mauvais mot de
        // passe — dire « trop de tentatives » apprendrait que le compte existe.
        if (!limiter(`connexion:${email}`, 10, 15 * 60_000).ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(String(credentials.password), user.password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.nom, role: user.role };
      },
    }),
  ],
});
