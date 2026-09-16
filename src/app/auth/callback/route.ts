import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Retour du lien de confirmation d'adresse (et de tout lien e-mail Supabase).
 *
 * ⚠️ **La destination par défaut était `/`** — la page d'accueil publique. Une
 * personne qui venait de confirmer son adresse se retrouvait donc devant
 * l'argumentaire commercial, connectée sans le savoir, sans aucune indication
 * de la marche à suivre. Elle est maintenant renvoyée vers `/dashboard`, qui
 * dirige lui-même vers `/onboarding` tant que l'installation n'est pas faite :
 * une seule règle, tenue à un seul endroit.
 *
 * ⚠️ `next` vient de l'URL, donc de l'extérieur. Seuls les chemins internes
 * sont acceptés — sans ce contrôle, un lien `?next=https://ailleurs` ferait de
 * cette route un tremplin de redirection ouverte, et le lien porterait le nom
 * de domaine d'EduCom.
 *
 * ⚠️ L'erreur n'est plus muette : `/login?erreur=…` affiche une phrase. Le code
 * précédent renvoyait `?error=Invalid_Auth_Code`, que la page de connexion ne
 * lisait pas — l'utilisateur voyait un formulaire vide et rien d'autre.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const demande = searchParams.get('next') ?? '/dashboard'
  const next = demande.startsWith('/') && !demande.startsWith('//') ? demande : '/dashboard'

  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (errorParam) {
    console.error('OAuth callback error:', errorParam, errorDescription)
    // Supabase a bloqué l'authentification (ex: e-mail déjà utilisé par un compte sans Google)
    return NextResponse.redirect(`${origin}/login?erreur=connexion_refusee`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erreur=lien_incomplet`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Le cas de loin le plus fréquent : lien déjà utilisé, ou expiré.
    return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`)
  }

  // ⚠️ INTERCEPTION "FAST & SECURE" POUR GOOGLE OAUTH
  // Si l'utilisateur vient d'arriver via Google, il existe dans Supabase Auth.
  // On synchronise son compte ou on crée son établissement à la volée.
  if (data?.user) {
    const { prisma } = await import('@/lib/prisma')
    
    try {
      const email = (data.user.email || '').trim().toLowerCase()
      
      // Recherche par id ou par email pour réconciliation fluide
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: data.user.id },
            ...(email ? [{ email }] : []),
          ],
        },
      })
      
      if (!existingUser) {
        const metadata = data.user.user_metadata || {}
        const fullName = metadata.full_name || metadata.name || ''
        const parts = fullName.trim().split(/\s+/)
        const firstName = metadata.first_name || metadata.given_name || parts[0] || 'Direction'
        const lastName = metadata.last_name || metadata.family_name || parts.slice(1).join(' ') || ''
        const schoolName = `École de ${firstName}`

        await prisma.$transaction(async (tx) => {
          const school = await tx.school.create({
            data: {
              name: schoolName,
              email,
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
              id: data.user.id,
              email,
              firstName,
              lastName,
              role: 'ADMIN',
              schoolId: school.id,
              emailVerified: true,
              termsAcceptedAt: new Date(),
              termsVersion: '2026-09-v1',
            },
          })
        })
        
        return NextResponse.redirect(`${origin}/welcome`)
      } else {
        // Utilisateur existant : synchroniser l'id Supabase si différent et valider l'e-mail
        if (existingUser.id !== data.user.id) {
          await prisma.$executeRaw`UPDATE "User" SET id = ${data.user.id}, "emailVerified" = true WHERE id = ${existingUser.id}`
        } else if (!existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: data.user.id },
            data: { emailVerified: true },
          })
        }
      }
    } catch (err) {
      console.error('Erreur lors de la création ou synchronisation automatique OAuth:', err)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
