import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { chargerCommunaute } from "@/lib/communityPage";
import Communaute from "@/components/community/Communaute";
import CommunauteIndisponible from "@/components/community/CommunauteIndisponible";

const PATH = "/dashboard/communications/communaute";
export const dynamic = "force-dynamic";

/**
 * Communauté — espace du personnel. Une seule page façon Slack (26 sept. 2026) :
 * canaux, classes et messages directs avec les familles.
 */
export default async function CommunautePage({ searchParams }: { searchParams: Promise<{ espace?: string; c?: string; form?: string }> }) {
  const { user, schoolId, school } = await requireSchoolContext();
  const role = user.role as RoleType;
  if (!hasAccess(role, PATH)) redirect(firstAllowedPath(role));

  const actor = { userId: user.id, schoolId, role };
  let donnees: Awaited<ReturnType<typeof chargerCommunaute>>;
  try {
    donnees = await chargerCommunaute(actor, await searchParams);
  } catch (e) {
    console.error("[communauté] chargement impossible :", (e as Error).message);
    return (
      <CommunauteIndisponible
        detail={(e as Error).message.split("\n").slice(-1)[0].slice(0, 200)}
        peutMettreAJour={role === "OWNER" || role === "ADMIN"}
      />
    );
  }

  return (
    <Communaute
      {...donnees}
      baseHref={PATH}
      ecole={school?.name ?? "Mon école"}
      sondagesHref={hasAccess(role, "/dashboard/communications/surveys") ? "/dashboard/communications/surveys" : null}
    />
  );
}
