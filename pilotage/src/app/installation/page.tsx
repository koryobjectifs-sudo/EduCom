import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { estLocal } from "@/lib/acces";
import { installer } from "@/lib/connexion";
import Carte from "@/components/Carte";
import FormAcces from "@/components/FormAcces";

export const dynamic = "force-dynamic";

/**
 * Premier compte du pilotage. Fermé dès qu'un compte existe, et JAMAIS
 * ouvert en ligne (Vercel) : on le crée en local, sur la même base.
 */
export default async function Installation() {
  const n = await prisma.pilotageAccount.count().catch(() => -1);
  if (n === -1) {
    return (
      <Carte titre="Base pas prête" sous="La table du pilotage n'existe pas encore.">
        <p className="text-[13px] text-text">Dans EduCom, cliquez sur « Mettre à jour la base », puis rechargez cette page.</p>
      </Carte>
    );
  }
  if (n > 0 || !(await estLocal())) redirect("/connexion");
  return (
    <Carte titre="Créer l'accès" sous="Une seule fois. 12 caractères minimum pour le mot de passe.">
      <FormAcces action={installer} installation />
    </Carte>
  );
}
