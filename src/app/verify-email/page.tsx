import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export const metadata = {
  title: "Vérifiez votre boîte mail — EduCom",
  description: "Confirmez votre adresse e-mail pour activer l'espace de votre établissement.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ground flex items-center justify-center">Chargement...</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
