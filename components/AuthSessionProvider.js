"use client";
import { SessionProvider } from "next-auth/react";

// Wrapper client dédié — nécessaire car SessionProvider doit être un composant client,
// alors que le layout du site est un composant serveur (il charge des données avec await).
export default function AuthSessionProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}