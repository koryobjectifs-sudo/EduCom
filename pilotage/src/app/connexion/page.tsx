import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pilote, estLocal } from "@/lib/acces";
import { seConnecter } from "@/lib/connexion";
import Carte from "@/components/Carte";
import FormAcces from "@/components/FormAcces";

export const dynamic = "force-dynamic";

export default async function Connexion() {
  if (await pilote()) redirect("/");
  const aucun = (await prisma.pilotageAccount.count().catch(() => -1)) === 0;
  return (
    <Carte titre="Connexion" sous="Outil réservé à l'équipe EduCom.">
      <FormAcces action={seConnecter} />
      {aucun && (await estLocal()) && (
        <p className="mt-4 text-center text-[12.5px] text-text-soft">Premier lancement ? <Link href="/installation" className="font-semibold text-primary underline">Créer l&apos;accès</Link></p>
      )}
    </Carte>
  );
}
