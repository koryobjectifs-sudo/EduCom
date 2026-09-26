import { redirect } from "next/navigation";
import { requireSchoolContext } from "@/lib/documentContext";
import { hasAccess, firstAllowedPath, type RoleType } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import CommunauteIndisponible from "@/components/community/CommunauteIndisponible";
import { classesDuBilan, chargerSemaineClasse, semaineValide, actionsPerso } from "@/lib/bilanSemaine";
import { lundiDe, jourDe } from "@/lib/bilanRegles";
import BilanClient from "./BilanClient";

const PATH = "/dashboard/grades/bilan-semaine";
export const dynamic = "force-dynamic";

/**
 * Bilan de la semaine — 26 sept. 2026 (demande de Kory). L'enseignant évalue
 * chaque matière de sa classe, signale leçons et devoirs, et envoie aux
 * parents un bilan avec des actions pour le week-end. Règles : `lib/bilanRegles.ts`.
 */
export default async function BilanSemainePage({ searchParams }: { searchParams: Promise<{ classId?: string; semaine?: string }> }) {
  const { user, schoolId } = await requireSchoolContext();
  const role = user.role as RoleType;
  if (!hasAccess(role, PATH)) redirect(firstAllowedPath(role));
  const actor = { userId: user.id, schoolId, role };
  const sp = await searchParams;

  const classes = await classesDuBilan(actor);
  const classId = classes.find((c) => c.id === sp.classId)?.id ?? classes[0]?.id ?? null;
  const semaine = semaineValide(sp.semaine);

  let bilan: Awaited<ReturnType<typeof chargerSemaineClasse>> = null;
  let perso: Record<string, string> = {};
  try {
    if (classId) bilan = await chargerSemaineClasse(actor, classId, semaine);
    perso = await actionsPerso(schoolId);
  } catch (e) {
    return (
      <CommunauteIndisponible
        titre="Le bilan de la semaine n'est pas encore prêt sur cette base."
        detail={(e as Error).message.split("\n").slice(-1)[0].slice(0, 200)}
        peutMettreAJour={role === "OWNER" || role === "ADMIN"}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bilan de la semaine"
        description="Notez au fil des jours ce qui va et ce qui ne va pas, matière par matière. Les parents reçoivent le point du jour si vous le souhaitez, et le bilan complet en fin de semaine."
      />
      <BilanClient
        classes={classes.map((c) => ({ id: c.id, nom: c.name }))}
        bilan={bilan}
        semaineActuelle={lundiDe().toISOString()}
        aujourdhui={jourDe().toISOString()}
        actionsPerso={perso}
        direction={role === "OWNER" || role === "ADMIN"}
      />
    </div>
  );
}
