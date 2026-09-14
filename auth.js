import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

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

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(String(credentials.password), user.password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.nom, role: user.role };
      },
    }),
  ],
});
