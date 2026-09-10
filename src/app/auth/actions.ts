'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { requireActionContext } from '@/lib/actionContext'
import { revalidatePath } from 'next/cache'
import { emailSchema } from '@/lib/validations'
import { checkResendRateLimit, logSecurityFailure } from '@/lib/rateLimit'

/**
 * Renvoie un e-mail de confirmation par adresse e-mail ou pour l'utilisateur connecté.
 */
export async function resendVerificationEmailAction(targetEmail?: string) {
  const entetes = await headers()
  const clientIp = entetes.get('x-forwarded-for')?.split(',')[0]?.trim() || entetes.get('x-real-ip') || '127.0.0.1'

  let emailToUse = (targetEmail || '').trim().toLowerCase()
  let userId: string | null = null

  if (!emailToUse) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      emailToUse = user.email.toLowerCase()
      userId = user.id
    }
  }

  if (!emailToUse) {
    return { success: false, error: "Adresse e-mail requise." }
  }

  // Validation format e-mail
  const emailVal = emailSchema.safeParse(emailToUse)
  if (!emailVal.success) {
    return { success: false, error: emailVal.error.issues[0]?.message || "Adresse e-mail invalide." }
  }

  // Limitation de débit : 1 par minute, max 5 par heure
  const rateLimitKey = `${clientIp}:${emailToUse}`
  const limitCheck = checkResendRateLimit(rateLimitKey)
  if (!limitCheck.allowed) {
    return {
      success: false,
      error: limitCheck.reason || "Trop de demandes de renvoi. Veuillez patienter.",
      retryAfterSeconds: limitCheck.retryAfterSeconds,
    }
  }

  // 1. Si on a un utilisateur en base, vérifier s'il est déjà confirmé
  const dbUser = await prisma.user.findFirst({
    where: { email: emailToUse },
    select: { id: true, email: true, emailVerified: true },
  })

  if (dbUser?.emailVerified) {
    return { success: true, alreadyVerified: true, message: "Votre adresse e-mail est déjà confirmée." }
  }

  // 2. Synchronisation Supabase Admin si déjà vérifié dans Supabase Auth
  if (dbUser?.id || userId) {
    const targetUid = dbUser?.id || userId!
    try {
      const admin = createAdminClient()
      const { data: supaUser, error: supaErr } = await admin.auth.admin.getUserById(targetUid)

      if (!supaErr && supaUser?.user?.email_confirmed_at) {
        await prisma.user.update({
          where: { id: targetUid },
          data: { emailVerified: true },
        })
        revalidatePath('/dashboard', 'layout')
        return {
          success: true,
          alreadyVerified: true,
          message: "Votre adresse e-mail est confirmée avec succès.",
        }
      }
    } catch (adminErr) {
      console.warn("[resendVerificationEmailAction] Impossible de vérifier l'état Supabase Admin:", adminErr)
    }
  }

  const host = entetes.get('host') || 'localhost:3000'
  const proto = entetes.get('x-forwarded-proto') || 'http'
  const defaultOrigin = `${proto}://${host}`
  const origine = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultOrigin

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailToUse,
      options: {
        emailRedirectTo: `${origine}/auth/callback?next=/welcome`,
      },
    })

    if (error) {
      console.error("[resendVerificationEmailAction] Échec d'envoi Supabase Auth:", {
        email: emailToUse,
        status: error.status,
        code: (error as any).code,
        message: error.message,
      })

      if (error.status === 429 || (error as any).code === 'over_email_send_rate_limit') {
        return {
          success: false,
          error: "Veuillez patienter avant de demander un nouvel envoi d'e-mail.",
          retryAfterSeconds: 60,
        }
      }

      return {
        success: false,
        error: error.message || "Impossible d'envoyer l'e-mail de confirmation.",
      }
    }

    return {
      success: true,
      message: `Un lien de confirmation a été envoyé à ${emailToUse}.`,
    }
  } catch (err: any) {
    console.error("[resendVerificationEmailAction] Exception non gérée:", err)
    return { success: false, error: err.message || "Erreur réseau lors de l'envoi." }
  }
}
