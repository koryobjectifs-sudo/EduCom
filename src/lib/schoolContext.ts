import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { type RoleType } from "@/lib/permissions";
import type { User, School, Role } from "@/generated/prisma/client";

export const ACTIVE_SCHOOL_COOKIE_NAME = "educom_active_school";

export interface ActiveMembershipInfo {
  id: string;
  userId: string;
  schoolId: string;
  role: RoleType;
  isPrimary: boolean;
  active: boolean;
  school: {
    id: string;
    name: string;
    logo: string | null;
    primaryColor: string | null;
    onboardingCompleted: boolean;
    activeAcademicYear: string | null;
  };
}

export interface ResolvedSchoolContext {
  user: User;
  schoolId: string;
  school: School;
  role: RoleType;
  memberships: ActiveMembershipInfo[];
  activeMembership: ActiveMembershipInfo | null;
  isFallback: boolean;
}

export interface ResolveSchoolContextOptions {
  explicitUserId?: string;
  requestedSchoolId?: string;
  allowUnverifiedEmail?: boolean;
}

export type ResolveSchoolContextResult =
  | { ok: true; context: ResolvedSchoolContext }
  | { ok: false; error: string; redirectUrl?: string };

/**
 * Résolution centralisée et sécurisée du contexte d'établissement et de rôle.
 *
 * ORDRE DE PRIORITÉ :
 * 1. Utilisateur authentifié (Supabase Auth ou mode Dev test)
 * 2. Vérification e-mail (sauf si allowUnverifiedEmail)
 * 3. Récupération des adhésions actives (SchoolMembership WHERE active = true)
 * 4. Si cookie 'educom_active_school' présent :
 *    -> Vérifier que l'utilisateur possède une adhésion ACTIVE pour cette école
 *    -> Si oui : adopter cette école et le rôle associé
 *    -> Si non (cookie forgé ou obsolète) : rejet du cookie et repli sécurisé
 * 5. Si pas de cookie valide : adhésion primaire (isPrimary = true), sinon première adhésion active
 * 6. Si AUCUNE adhésion active en base (Fallback compatibilité) :
 *    -> Repli sur User.schoolId et User.role (isFallback = true)
 * 7. Si aucun établissement valide : accès refusé / redirection
 */
export const resolveSchoolContext = cache(async function resolveSchoolContext(
  options?: ResolveSchoolContextOptions
): Promise<ResolveSchoolContextResult> {
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Hors contexte requête HTTP (ex: tests automatisés ou scripts)
  }

  // Support Local Test Mode (Développement uniquement)
  if (process.env.NODE_ENV === "development" && cookieStore) {
    const testSchoolId = cookieStore.get("dev_test_school_id")?.value;
    const testUserId = cookieStore.get("dev_test_user_id")?.value;

    if (testSchoolId && testUserId) {
      const dbUser = await prisma.user.findUnique({ where: { id: testUserId } });
      const school = await prisma.school.findUnique({ where: { id: testSchoolId } });
      if (dbUser && school) {
        if (!options?.allowUnverifiedEmail && !dbUser.emailVerified) {
          return {
            ok: false,
            error: "E-mail non vérifié",
            redirectUrl: `/verify-email?email=${encodeURIComponent(dbUser.email)}`,
          };
        }
        return {
          ok: true,
          context: {
            user: dbUser,
            schoolId: testSchoolId,
            school,
            role: dbUser.role as RoleType,
            memberships: [
              {
                id: "dev-membership",
                userId: dbUser.id,
                schoolId: school.id,
                role: dbUser.role as RoleType,
                isPrimary: true,
                active: true,
                school: {
                  id: school.id,
                  name: school.name,
                  logo: school.logo,
                  primaryColor: school.primaryColor,
                  onboardingCompleted: school.onboardingCompleted,
                  activeAcademicYear: school.activeAcademicYear,
                },
              },
            ],
            activeMembership: null,
            isFallback: true,
          },
        };
      }
    }
  }

  // 1. Authentification
  let authUserId = options?.explicitUserId;
  let authEmailConfirmedAt: string | null = null;

  if (!authUserId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "Non authentifié", redirectUrl: "/login" };
    }
    authUserId = user.id;
    authEmailConfirmedAt = user.email_confirmed_at ?? null;
  }

  // Récupération de l'utilisateur
  let dbUser = await prisma.user.findUnique({ where: { id: authUserId } });
  if (!dbUser) {
    return { ok: false, error: "Compte introuvable", redirectUrl: "/login" };
  }

  // Synchronisation automatique si l'e-mail a été confirmé via Supabase
  if (!dbUser.emailVerified && authEmailConfirmedAt) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { emailVerified: true },
    });
    dbUser = { ...dbUser, emailVerified: true };
  }

  // 2. Contrôle de confirmation d'e-mail (exemption pour les parents vérifiés par téléphone ou à e-mail synthétique)
  const isParentAccount = dbUser.role === "PARENT" || dbUser.email.endsWith("@parent.educom.local");
  if (!options?.allowUnverifiedEmail && !dbUser.emailVerified && !isParentAccount) {
    return {
      ok: false,
      error: "Confirmation d'e-mail requise",
      redirectUrl: `/verify-email?email=${encodeURIComponent(dbUser.email)}`,
    };
  }

  // 3. Récupération des adhésions actives
  const rawMemberships = await prisma.schoolMembership.findMany({
    where: {
      userId: dbUser.id,
      active: true,
    },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          logo: true,
          primaryColor: true,
          onboardingCompleted: true,
          activeAcademicYear: true,
        },
      },
    },
    orderBy: [
      { isPrimary: "desc" },
      { createdAt: "asc" },
    ],
  });

  const memberships: ActiveMembershipInfo[] = rawMemberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    schoolId: m.schoolId,
    role: m.role as RoleType,
    isPrimary: m.isPrimary,
    active: m.active,
    school: m.school,
  }));

  // 4. Détermination de l'école demandée (priorité : option passée > cookie)
  const requestedSchoolId =
    options?.requestedSchoolId ||
    cookieStore?.get(ACTIVE_SCHOOL_COOKIE_NAME)?.value ||
    null;


  let activeMembership: ActiveMembershipInfo | null = null;
  let activeSchoolId: string | null = null;
  let activeRole: RoleType = dbUser.role as RoleType;
  let isFallback = false;

  if (memberships.length > 0) {
    if (requestedSchoolId) {
      // Sécurité stricte : vérification d'appartenance effective
      const matching = memberships.find((m) => m.schoolId === requestedSchoolId);
      if (matching) {
        activeMembership = matching;
      }
    }

    // Si pas de cookie ou cookie invalide/non autorisé : sélection de la primaire ou première
    if (!activeMembership) {
      activeMembership = memberships.find((m) => m.isPrimary) || memberships[0];
    }

    activeSchoolId = activeMembership.schoolId;
    activeRole = activeMembership.role;
  } else {
    // 5. Fallback compatibilité ascendante : User.schoolId
    isFallback = true;
    activeSchoolId = dbUser.schoolId;
    activeRole = dbUser.role as RoleType;
  }

  if (!activeSchoolId) {
    return {
      ok: false,
      error: "Aucun établissement rattaché à ce compte",
      redirectUrl: "/login?erreur=espace_absent",
    };
  }

  // Chargement complet de l'école active
  const activeSchool = await prisma.school.findUnique({
    where: { id: activeSchoolId },
  });

  if (!activeSchool) {
    return {
      ok: false,
      error: "Établissement introuvable",
      redirectUrl: "/login?erreur=espace_absent",
    };
  }

  // On synchronise virtuellement dbUser.role avec le rôle actif de l'établissement
  const contextualUser: User = {
    ...dbUser,
    role: activeRole as Role,
    schoolId: activeSchoolId,
  };

  return {
    ok: true,
    context: {
      user: contextualUser,
      schoolId: activeSchoolId,
      school: activeSchool,
      role: activeRole,
      memberships,
      activeMembership,
      isFallback,
    },
  };
});
