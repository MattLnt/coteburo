import { Suspense } from "react";
import ConnexionContent from "./ConnexionContent";

export const metadata = { title: "Connexion · Côté BURO" };

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f7f4ef" }} />}>
      <ConnexionContent />
    </Suspense>
  );
}