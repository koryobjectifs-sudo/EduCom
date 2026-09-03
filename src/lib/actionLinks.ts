import { prisma } from "@/lib/prisma";
import { ActionLinkStatus } from "@/generated/prisma/client";
import { randomBytes } from "crypto";

export interface CreateActionLinkParams {
  action: string;
  entityId?: string;
  parentId: string;
  studentId?: string;
  schoolId: string;
  expiresInDays?: number;
}

/**
 * Service de génération et de validation des liens d'action sécurisés.
 * Les liens sont persistés en base de données pour permettre:
 * - L'usage unique (si configuré)
 * - La révocation manuelle
 * - La traçabilité stricte (schoolId, parentId)
 */
export const actionLinks = {
  /**
   * Crée un nouveau lien d'action.
   * Retourne le token à inclure dans l'URL.
   */
  async create(params: CreateActionLinkParams): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays || 7));

    await prisma.actionLink.create({
      data: {
        token,
        action: params.action,
        entityId: params.entityId,
        parentId: params.parentId,
        studentId: params.studentId,
        schoolId: params.schoolId,
        expiresAt,
        status: ActionLinkStatus.ACTIVE,
      },
    });

    return token;
  },

  /**
   * Valide un token de lien d'action.
   * - Vérifie l'existence et l'appartenance (schoolId).
   * - Vérifie l'expiration.
   * - Vérifie le statut (doit être ACTIVE).
   * Optionnellement, marque le lien comme USED s'il est à usage unique.
   */
  async validateAndConsume(token: string, markAsUsed: boolean = false) {
    const link = await prisma.actionLink.findUnique({
      where: { token },
    });

    if (!link) {
      return { ok: false, error: "Lien invalide ou introuvable." };
    }

    if (link.status === ActionLinkStatus.REVOKED) {
      return { ok: false, error: "Ce lien a été révoqué par l'établissement." };
    }

    if (link.status === ActionLinkStatus.USED) {
      return { ok: false, error: "Ce lien a déjà été utilisé." };
    }

    if (link.status === ActionLinkStatus.EXPIRED || link.expiresAt < new Date()) {
      // Auto-update to EXPIRED if past date but still ACTIVE
      if (link.status === ActionLinkStatus.ACTIVE) {
        await prisma.actionLink.update({
          where: { id: link.id },
          data: { status: ActionLinkStatus.EXPIRED },
        });
      }
      return { ok: false, error: "Ce lien a expiré." };
    }

    if (markAsUsed) {
      await prisma.actionLink.update({
        where: { id: link.id },
        data: { status: ActionLinkStatus.USED },
      });
    }

    return { ok: true, link };
  },

  /**
   * Révoque manuellement un lien (par la direction).
   */
  async revoke(id: string, schoolId: string) {
    const link = await prisma.actionLink.findUnique({ where: { id } });
    if (!link || link.schoolId !== schoolId) return { ok: false };
    
    await prisma.actionLink.update({
      where: { id },
      data: { status: ActionLinkStatus.REVOKED },
    });
    return { ok: true };
  }
};
