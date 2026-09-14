// Partie de la configuration NextAuth utilisable SANS accès base.
//
// Le middleware (proxy.js) tourne sur le runtime edge et ne fait que lire le
// JWT de session. S'il importait auth.js, il embarquerait avec lui le client
// Prisma — 80 Mo de moteurs de requête dans un bundle qui n'interroge jamais
// la base. C'est ce qui gonflait le stockage des fonctions chez Vercel.
//
// Le provider Credentials, seul à toucher la base (et bcrypt), vit dans
// auth.js et n'est chargé que côté Node, là où la connexion s'effectue
// réellement.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  // Complété dans auth.js. Le middleware n'a besoin d'aucun provider : il
  // vérifie un jeton déjà émis, il n'en émet pas.
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
};
