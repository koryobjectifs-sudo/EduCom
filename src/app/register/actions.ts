'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { 
  emailSchema, 
  passwordSchema, 
  personNameSchema, 
  schoolNameSchema, 
  phoneSchema 
} from '@/lib/validations'
import { checkRegisterRateLimit, logSecurityFailure } from '@/lib/rateLimit'
import { z } from 'zod'

export type RegisterResult =
  | { error: string; dejaInscrit?: boolean; fieldErrors?: Record<string, string> }
  /** Compte créé, mais la session n'ouvrira qu'après confirmation de l'adresse. */
  | { confirmationRequise: true; email: string }

const registerFormSchema = z.object({
  schoolName: schoolNameSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
  termsAccepted: z.literal(true, {
    message: "Veuillez accepter les CGU et la politique de confidentialité.",
  }),
})

/** Messages Supabase → français, sans jamais inventer une cause. */
function messageFr(code: string | undefined, brut: string): string {
  switch (code) {
    case 'over_email_send_rate_limit':
      return "Le service d'envoi d'e-mails a atteint sa limite. Réessayez dans une heure, ou contactez-nous : c'est une limite de notre fournisseur, pas une erreur de votre part."
    case 'email_address_invalid':
      return "Cette adresse e-mail est refusée par notre service d'authentification. Utilisez une adresse courante (Gmail, Outlook, l'adresse de votre établissement…)."
    case 'weak_password':
      return "Mot de passe trop court : il faut au moins 8 caractères."
    case 'signup_disabled':
      return "Les inscriptions sont momentanément fermées."
    default:
      return brut || "L'inscription a échoué."
  }
}

export async function register(formData: FormData): Promise<RegisterResult | void> {
  const entetes = await headers()
  const clientIp = entetes.get('x-forwarded-for')?.split(',')[0]?.trim() || entetes.get('x-real-ip') || '127.0.0.1'

  // ── Protection contre les bots : limiteur de débit IP ──
  const rateLimit = checkRegisterRateLimit(clientIp)
  if (!rateLimit.allowed) {
    logSecurityFailure({
      action: 'RATE_LIMIT_EXCEEDED',
      ip: clientIp,
      reason: 'Trop de tentatives d\'inscription (max 5 par heure)',
    })
    return {
      error: `Trop de tentatives depuis cette adresse. Veuillez patienter ${Math.ceil((rateLimit.retryAfterSeconds || 3600) / 60)} minute(s).`,
    }
  }

  const rawData = {
    schoolName: (formData.get('schoolName') as string ?? '').trim(),
    firstName: (formData.get('firstName') as string ?? '').trim(),
    lastName: (formData.get('lastName') as string ?? '').trim(),
    phone: (formData.get('phone') as string ?? '').trim(),
    email: (formData.get('email') as string ?? '').trim().toLowerCase(),
    password: formData.get('password') as string ?? '',
    termsAccepted: formData.get('termsAccepted') === 'on' || formData.get('termsAccepted') === 'true',
  }

  // ── Validation stricte côté serveur ──
  const parsed = registerFormSchema.safeParse(rawData)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as string
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message
      }
    })
    const firstErrorMessage = parsed.error.issues[0]?.message || "Veuillez vérifier les informations saisies."

    logSecurityFailure({
      action: 'INVALID_FORMAT',
      ip: clientIp,
      email: rawData.email,
      reason: firstErrorMessage,
    })

    return {
      error: firstErrorMessage,
      fieldErrors,
    }
  }

  const { schoolName, firstName, lastName, phone, email, password } = parsed.data

  const host = entetes.get('host') || 'localhost:3000'
  const proto = entetes.get('x-forwarded-proto') || 'http'
  const defaultOrigin = `${proto}://${host}`
  const origine = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultOrigin

  let user, session
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName, phone, schoolName },
        emailRedirectTo: `${origine}/auth/callback?next=/welcome`,
      },
    })
    if (error) {
      logSecurityFailure({
        action: 'REGISTER_FAILED',
        ip: clientIp,
        email,
        reason: error.message,
      })
      return { error: messageFr((error as { code?: string }).code, error.message) }
    }
    user = data.user
    session = data.session
  } catch (err: any) {
    logSecurityFailure({
      action: 'REGISTER_FAILED',
      ip: clientIp,
      email,
      reason: err?.message || 'Exception Supabase',
    })
    return { error: "Impossible de joindre le service d'authentification." }
  }

  if (!user?.id) return { error: "L'inscription a échoué." }

  // ⚠️ Adresse déjà inscrite : Supabase renvoie un utilisateur factice avec `identities: []`
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return {
      error: "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « mot de passe oublié ».",
      dejaInscrit: true,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existant = await tx.user.findUnique({
        where: { id: user!.id },
        select: { id: true, schoolId: true },
      })
      if (existant?.schoolId) return

      const school = await tx.school.create({
        data: {
          name: schoolName,
          email,
          phone,
          schoolActivated: false,
          onboardingCompleted: false,
          setupProgress: {
            classes: false,
            curriculum: false,
            calendar: false,
            students: false,
            teachers: false,
            payments: false,
          },
        },
      })
      await tx.user.create({
        data: {
          id: user!.id,
          email,
          firstName,
          lastName,
          phone,
          role: 'ADMIN',
          schoolId: school.id,
          emailVerified: Boolean(user!.email_confirmed_at),
          termsAcceptedAt: new Date(),
          termsVersion: "2026-09-v1",
        },
      })
    })
  } catch (dbError) {
    console.error('Configuration de l\'espace — échec :', dbError)
    logSecurityFailure({
      action: 'REGISTER_FAILED',
      ip: clientIp,
      email,
      reason: 'Transaction BD échouée',
    })
    return { error: "Votre compte a été créé, mais la configuration de votre espace a échoué. Écrivez-nous : nous la terminons manuellement." }
  }

  revalidatePath('/', 'layout')

  // Redirection systématique vers l'écran de confirmation e-mail tant que le compte n'est pas confirmé
  if (!user.email_confirmed_at) {
    return { confirmationRequise: true, email }
  }

  if (!session) {
    return { confirmationRequise: true, email }
  }

  redirect('/welcome')
}
