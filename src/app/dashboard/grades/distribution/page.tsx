import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { pickCurrentTerm } from "@/lib/terms";
import { PageHeader } from "@/components/ui/PageHeader";
import { GERE_DISTRIBUTION, etatDistribution } from "@/lib/bulletinsParents";
import DistributionClient from "./DistributionClient";
import CommunauteIndisponible from "@/components/community/CommunauteIndisponible";

const PATH = "/dashboard/grades/distribution";
export const dynamic = "force-dynamic";

/**
 * Distribution des bulletins aux familles — 26 sept. 2026.
 * Dernière étape : saisie → validation (bon à tirer) → conseil de classe → distribution.
 */
export default async function DistributionPage({ searchParams }: { searchParams: Promise<{ termId?: string }> }) {
  const { user, schoolId } = await requireSchoolContext();
  const role = user.role as RoleType;
  if (!hasAccess(role, PATH) || !GERE_DISTRIBUTION.includes(role)) redirect(firstAllowedPath(role));

  const termes = await prisma.term.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true, createdAt: true },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });
  const { termId: demande } = await searchParams;
  const termId = termes.find((t) => t.id === demande)?.id ?? pickCurrentTerm(termes).current?.id ?? termes[0]?.id;

  let classes: Awaited<ReturnType<typeof etatDistribution>> = [];
  try {
    if (termId) classes = await etatDistribution({ userId: user.id, schoolId, role }, termId);
  } catch (e) {
    return <CommunauteIndisponible detail={(e as Error).message.split("\n").slice(-1)[0].slice(0, 200)} peutMettreAJour={role === "OWNER" || role === "ADMIN"} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Distribuer les bulletins"
        description="Dernière étape : après la validation du secrétariat et le conseil de classe, choisissez quand les familles reçoivent le bulletin. Avant, rien n'est visible côté parents."
      />
      <DistributionClient termes={termes.map((t) => ({ id: t.id, name: t.name }))} termId={termId ?? null} classes={classes} />
    </div>
  );
}
