import { cache } from "react";
import { hasAccess, RoleType } from "@/lib/permissions";
import { headers } from "next/headers";
import { resolveSchoolContext, ActiveMembershipInfo } from "@/lib/schoolContext";
import { etatAbonnement, actionPermiseEnLectureSeule } from "@/lib/subscription";

/**
 * Contexte d'autorisation commun aux server actions.
 *
 * Une server action est un point d'entrée HTTP à part entière : elle est
 * appelable directement, sans passer par l'écran qui l'invoque normalement.
 * Tout ce qu'elle reçoit en argument vient donc du client et ne peut jamais
 * être considéré comme fiable — en particulier un `schoolId`, qui déterminerait
 * alors *quel établissement* la requête écrit.
 *
 * SÉCURITÉ ABSOLUE :
 * - Résolution contextuelle multi-écoles (SchoolMembership).
 * - Bloque toute action si l'adresse e-mail de l'utilisateur n'est pas confirmée.
 */

/**
 * Seuls chemins d'ACTION ouverts au rôle `PARENT` : son espace famille
 * (`/famille/…`) et la demande de document (`/dashboard/documents`, chemin
 * EXACT — `submitDocumentRequest`). Voir la garde plus bas.
 */
export function isParentActionPath(path: string): boolean {
  return path === "/famille" || path.startsWith("/famille/") || path === "/dashboard/documents";
}

export type ActionContext = {
  userId: string;
  schoolId: string;
  role: RoleType;
  emailVerified: boolean;
  school?: { id: string; name: string; activeAcademicYear: string | null } | null;
  memberships?: ActiveMembershipInfo[];
  activeMembership?: ActiveMembershipInfo | null;
  isFallback?: boolean;
};

export type ActionAuth =
  | { ok: true; ctx: ActionContext }
  | { ok: false; error: string };

export type ActionContextOptions = {
  allowUnverifiedEmail?: boolean;
  /**
   * L'action ne fait que LIRE (get…, list…, preview…). Elle reste permise quand
   * l'abonnement est en lecture seule. Par défaut, une action est une écriture.
   */
  lecture?: boolean;
};

export const MESSAGE_LECTURE_SEULE =
  "Votre abonnement EduCom est arrivé à échéance : l'espace est en lecture seule. Réglez l'abonnement (menu Administration → Abonnement) pour modifier à nouveau. Aucune donnée n'est supprimée.";

/**
 * Vrai si la requête en cours est une server action (en-tête `Next-Action`).
 * Un rendu de page n'en porte pas : la lecture seule ne bloque donc JAMAIS
 * l'affichage d'un écran, seulement les actions qui écrivent.
 */
async function estServerAction(): Promise<boolean> {
  try {
    return (await headers()).has("next-action");
  } catch {
    return false;
  }
}

/**
 * Authentifie l'appelant et résout son établissement actif selon ses droits vérifiés.
 *
 * @param requiredPath Chemin dont l'accès est exigé (ex. `/dashboard/settings`).
 *   Si omis, seule l'authentification et l'adhésion active sont vérifiées.
 * @param options Options d'autorisation (ex. allowUnverifiedEmail pour renvoi d'e-mail).
 */
export const requireActionContext = cache(async function requireActionContext(
  requiredPath?: string,
  options?: ActionContextOptions
): Promise<ActionAuth> {
  const result = await resolveSchoolContext({
    allowUnverifiedEmail: options?.allowUnverifiedEmail,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const { context } = result;
  const role = context.role;

  if (requiredPath && !hasAccess(role, requiredPath)) {
    return { ok: false, error: "Vous n'avez pas les droits nécessaires pour cette action." };
  }

  // ═══ 23 septembre 2026 — un droit de LECTURE n'est pas un droit d'ÉCRITURE ═══
  //
  // ⚠️ Faille mesurée : `PARENT` liste `/dashboard/settings$` et
  // `/dashboard/students$` pour pouvoir OUVRIR ces pages (vue « Mon compte »,
  // fiche de ses enfants). Or les server actions de ces écrans se gardent avec
  // le même chemin — un parent passait donc `updateSchoolSettings` (nom, logo,
  // CACHET et SIGNATURE de l'école), `deleteStudents`, `createStudent`,
  // l'import d'élèves, `setStudentPhoto`, la connexion WhatsApp…
  //
  // Un parent n'écrit que dans son espace. Liste blanche fermée : tout autre
  // chemin d'action est refusé, quel que soit ce que `hasAccess` accorde en
  // lecture. Ajouter ici un chemin = décision explicite, jamais par défaut.
  if (role === "PARENT" && requiredPath && !isParentActionPath(requiredPath)) {
    return { ok: false, error: "Vous n'avez pas les droits nécessaires pour cette action." };
  }

  // ═══ 25 septembre 2026 — abonnement en lecture seule ═══
  //
  // Échéance dépassée depuis plus de GRACE_DAYS : on consulte, on n'écrit
  // plus. Limité aux server actions (un rendu de page n'est jamais bloqué) ;
  // les actions de lecture passent `{ lecture: true }` ; la page Abonnement
  // reste toujours utilisable pour payer.
  if (!options?.lecture && !actionPermiseEnLectureSeule(requiredPath) && (await estServerAction())) {
    // Échec OUVERT volontaire : c'est une règle de facturation, pas un
    // contrôle d'accès aux données. Une table absente ne doit jamais bloquer
    // le travail d'une école.
    const abonnement = await etatAbonnement(context.schoolId).catch((e: Error) => {
      console.error("[abonnement] état indisponible — lecture seule non appliquée :", e.message);
      return null;
    });
    if (abonnement?.etat === "LECTURE_SEULE") {
      return { ok: false, error: MESSAGE_LECTURE_SEULE };
    }
  }

  return {
    ok: true,
    ctx: {
      userId: context.user.id,
      schoolId: context.schoolId,
      role,
      emailVerified: context.user.emailVerified ?? false,
      school: context.school,
      memberships: context.memberships,
      activeMembership: context.activeMembership,
      isFallback: context.isFallback,
    },
  };
});

