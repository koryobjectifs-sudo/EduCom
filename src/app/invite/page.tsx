import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InviteAcceptForm from "./InviteAcceptForm";
import Link from "next/link";
import { Shield } from "lucide-react";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-500 mb-6">Ce lien d'invitation est manquant ou invalide.</p>
          <Link href="/" className="text-primary font-medium hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { school: true }
  });

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation introuvable</h1>
          <p className="text-gray-500 mb-6">Cette invitation n'existe pas ou a été annulée.</p>
          <Link href="/" className="text-primary font-medium hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (invitation.status === "ACCEPTED") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Déjà acceptée</h1>
          <p className="text-gray-500 mb-6">Cette invitation a déjà été utilisée. Connectez-vous à votre compte.</p>
          <Link href="/login" className="inline-block px-6 py-2 bg-primary text-white font-medium rounded-xl hover:bg-primary/90">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            {invitation.school.logo ? (
              <img src={invitation.school.logo} alt="Logo" className="h-10 w-10 object-contain" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {invitation.school.name.charAt(0)}
              </span>
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Rejoignez {invitation.school.name}
          </h2>
          <p className="mt-3 text-gray-500">
            Vous avez été invité(e) en tant que <span className="font-semibold text-gray-700">{invitation.role}</span>. Créez votre compte pour commencer.
          </p>
        </div>

        <InviteAcceptForm email={invitation.email} token={token} />
      </div>
    </div>
  );
}
