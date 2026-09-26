import { requireFamilyContext } from "@/lib/familyContext";
import { chargerCommunaute } from "@/lib/communityPage";
import Communaute from "@/components/community/Communaute";
import CommunauteIndisponible from "@/components/community/CommunauteIndisponible";

export const dynamic = "force-dynamic";

/**
 * Communauté — espace famille (26 sept. 2026, une seule page façon Slack).
 * Le parent voit le canal général, les classes de SES enfants, les canaux où
 * il est invité, et SES messages directs avec l'école. Jamais de message
 * direct entre parents.
 */
export default async function CommunauteFamillePage({ searchParams }: { searchParams: Promise<{ espace?: string; c?: string; form?: string }> }) {
  const { user, schoolId, role, school } = await requireFamilyContext();
  const actor = { userId: user.id, schoolId, role };
  let donnees: Awaited<ReturnType<typeof chargerCommunaute>>;
  try {
    donnees = await chargerCommunaute(actor, await searchParams);
  } catch (e) {
    console.error("[communauté] chargement impossible :", (e as Error).message);
    return <CommunauteIndisponible detail={(e as Error).message.split("\n").slice(-1)[0].slice(0, 200)} />;
  }

  return (
    <div className="h-[calc(100dvh-7rem)] min-h-[480px] md:h-[calc(100dvh-5.5rem)]">
      <Communaute {...donnees} baseHref="/famille/communaute" ecole={school.name} sondagesHref={null} />
    </div>
  );
}
