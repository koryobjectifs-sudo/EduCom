'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { normalizePhone, getPhoneSearchVariants } from '@/lib/phone'
import { generateAndStoreOtp, verifyStoredOtp } from '@/lib/otp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { WhatsAppClient } from '@/lib/whatsapp/client'
import { recordAudit } from '@/lib/audit'

function maskPhone(phone: string): string {
  if (phone.length < 6) return "••••••"
  return phone.slice(0, 4) + " ••• •• " + phone.slice(-2)
}

export interface RequestOtpState {
  success?: boolean
  error?: string
  phone?: string
  formatted?: string
  retryAfterSeconds?: number
}

export interface VerifyOtpState {
  success?: boolean
  error?: string
  destination?: string
}

/**
 * Valide et sécurise l'URL de redirection demandée.
 * Empêche formellement les redirections ouvertes (Open Redirect).
 */
function sanitizeDestination(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '/famille'
  const trimmed = url.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    // Si c'est une redirection vers /dashboard ou /login, orienter vers /famille
    if (trimmed === '/dashboard' || trimmed === '/login' || trimmed === '/famille/login') {
      return '/famille'
    }
    return trimmed
  }
  return '/famille'
}

/**
 * Demande d'envoi d'un code OTP par SMS / WhatsApp pour un parent.
 */
export async function requestParentOtp(rawPhone: string): Promise<RequestOtpState> {
  const norm = normalizePhone(rawPhone)
  if (!norm.isValid) {
    return { error: "Numéro de téléphone invalide. Veuillez saisir un numéro sénégalais ou international valide." }
  }

  // 1. Recherche d'éligibilité parent
  const searchVariants = getPhoneSearchVariants(norm.e164)
  const candidateParents = await prisma.user.findMany({
    where: {
      role: 'PARENT',
      phone: { in: searchVariants },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      schoolId: true,
      phone: true,
    },
  })

  if (candidateParents.length === 0) {
    return {
      error: "Ce numéro n'est associé à aucun compte famille EduCom. Veuillez contacter l'école de vos enfants pour vérifier votre numéro.",
    }
  }

  // Contrôle des doublons : ne jamais fusionner automatiquement
  if (candidateParents.length > 1) {
    const distinctIds = new Set(candidateParents.map((p) => p.id))
    if (distinctIds.size > 1) {
      return {
        error: "Ce numéro est associé à plusieurs dossiers distincts. Veuillez contacter le secrétariat de l'établissement pour clarifier votre fiche.",
      }
    }
  }

  const parent = candidateParents[0]

  // 2. Génération et stockage sécurisé de l'OTP
  const otpRes = await generateAndStoreOtp(norm.e164)
  if (!otpRes.success) {
    await recordAudit(
      { userId: parent.id, schoolId: parent.schoolId, role: "PARENT" },
      {
        action: "parentAuth.otpRateLimited",
        entity: "parentAuth",
        entityId: parent.id,
        outcome: "denied",
        details: {
          phone: maskPhone(norm.e164),
          retryAfterSeconds: otpRes.retryAfterSeconds,
        },
      }
    )
    return {
      error: otpRes.error,
      retryAfterSeconds: otpRes.retryAfterSeconds,
    }
  }

  const code = otpRes.code

  // 3. Traçabilité AuditLog de la demande (sans enregistrer le code brut)
  await recordAudit(
    { userId: parent.id, schoolId: parent.schoolId, role: "PARENT" },
    {
      action: "parentAuth.otpRequested",
      entity: "parentAuth",
      entityId: parent.id,
      outcome: "success",
      details: {
        phone: maskPhone(norm.e164),
      },
    }
  )

  // 4. Expédition du code (WhatsApp / SMS)
  const messageText = `EduCom : Votre code de vérification est ${code}. Il expire dans 10 minutes. Ne le partagez avec personne.`

  try {
    const wa = await WhatsAppClient.forSchool(parent.schoolId)
    await wa.sendTextMessage(norm.fullDigits, messageText)
  } catch {
    // Si l'école n'a pas WhatsApp configuré ou en environnement de dev sans Meta,
    // on consigne dans le log pour le développement / simulateur.
    console.info(`[EduCom OTP] Code pour ${norm.e164} : ${code}`)
  }

  return {
    success: true,
    phone: norm.e164,
    formatted: norm.national,
  }
}

/**
 * Vérification du code OTP et création de la session Supabase Auth pour le parent.
 */
export async function verifyParentOtp(
  phone: string,
  code: string,
  suite?: string
): Promise<VerifyOtpState> {
  const norm = normalizePhone(phone)
  if (!norm.isValid) {
    return { error: "Numéro de téléphone invalide." }
  }

  if (!code || code.trim().length < 6) {
    return { error: "Le code de vérification doit comporter 6 chiffres." }
  }

  // 1. Recherche du parent dans la base EduCom
  const searchVariants = getPhoneSearchVariants(norm.e164)
  const candidateParents = await prisma.user.findMany({
    where: {
      role: 'PARENT',
      phone: { in: searchVariants },
    },
    include: {
      memberships: { where: { active: true } },
    },
  })

  const parent = candidateParents[0] || null

  // 2. Vérification du code OTP
  const verifyRes = await verifyStoredOtp(norm.e164, code)
  if (!verifyRes.valid) {
    if (parent) {
      await recordAudit(
        { userId: parent.id, schoolId: parent.schoolId, role: "PARENT" },
        {
          action: "parentAuth.otpFailed",
          entity: "parentAuth",
          entityId: parent.id,
          outcome: "failure",
          details: {
            phone: maskPhone(norm.e164),
            reason: verifyRes.error,
          },
        }
      )
    }
    return { error: verifyRes.error }
  }

  if (!parent) {
    return { error: "Compte parent introuvable. Veuillez réessayer." }
  }

  try {
    const adminClient = createAdminClient()

    // 3. Provisionnement JIT (Just-In-Time) dans Supabase Auth si inexistant
    const { data: authUserData } = await adminClient.auth.admin.getUserById(parent.id)
    if (!authUserData?.user) {
      const { error: createErr } = await adminClient.auth.admin.createUser({
        id: parent.id,
        email: parent.email,
        email_confirm: true,
        phone: norm.e164,
        phone_confirm: true,
        user_metadata: {
          firstName: parent.firstName,
          lastName: parent.lastName,
          role: 'PARENT',
        },
      })

      if (createErr && !createErr.message.includes('already exists')) {
        console.error('[verifyParentOtp] Erreur création utilisateur Supabase Auth:', createErr)
        return { error: "Impossible de créer la session d'authentification. Veuillez réessayer." }
      }
    } else {
      // S'assurer que le compte est marqué confirmé
      await adminClient.auth.admin.updateUserById(parent.id, {
        email_confirm: true,
        phone_confirm: true,
      })
    }

    // 4. Génération d'un jeton d'authentification pour connexion par cookie SSR
    const linkRes = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: parent.email,
    })

    const hashedToken = linkRes.data?.properties?.hashed_token
    if (!hashedToken) {
      return { error: "Erreur lors de la génération de session sécurisée." }
    }

    // 5. Établissement de la session Supabase Auth (écrit les cookies HTTP-only)
    const supabase = await createClient()
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    })

    if (verifyErr) {
      console.error('[verifyParentOtp] Erreur verifyOtp Supabase SSR:', verifyErr)
      return { error: "Erreur lors de l'enregistrement de la session." }
    }

    // 6. Mise à jour de la confirmation e-mail dans Prisma
    if (!parent.emailVerified) {
      await prisma.user.update({
        where: { id: parent.id },
        data: { emailVerified: true },
      })
    }

    // 7. Détermination de la destination
    const destination = sanitizeDestination(suite)

    // 8. Traçabilité AuditLog de la session établie
    await recordAudit(
      { userId: parent.id, schoolId: parent.schoolId, role: "PARENT" },
      {
        action: "parentAuth.otpVerified",
        entity: "parentAuth",
        entityId: parent.id,
        outcome: "success",
        details: {
          phone: maskPhone(norm.e164),
          destination,
        },
      }
    )

    return {
      success: true,
      destination,
    }
  } catch (err: any) {
    console.error('[verifyParentOtp] Erreur inattendue:', err)
    return { error: "Une erreur est survenue lors de la connexion. Veuillez réessayer." }
  }
}

/**
 * Déconnexion dédiée de l'Espace Famille.
 */
export async function logoutParent(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/famille/login')
}
