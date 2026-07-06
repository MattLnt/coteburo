import { Suspense } from "react";
import InscriptionContent from "./InscriptionContent";

export const metadata = { title: "Créer un compte · Côté BURO" };

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f7f4ef" }} />}>
      <InscriptionContent />
    </Suspense>
  );
}