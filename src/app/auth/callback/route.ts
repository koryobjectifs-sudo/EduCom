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
  // Si l'utilisateur vient d'arriver via Google, il existe dans Supabase Auth
  // mais n'a pas encore de School ni de User dans Prisma.
  // On le crée à la volée pour un onboarding immédiat.
  if (data?.user) {
    const { prisma } = await import('@/lib/prisma')
    
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: data.user.id },
        select: { id: true },
      })
      
      if (!dbUser) {
        const metadata = data.user.user_metadata || {}
        // On sépare le nom complet fourni par Google
        const fullName = metadata.full_name || ''
        const parts = fullName.split(' ')
        const firstName = metadata.first_name || parts[0] || 'Direction'
        const lastName = metadata.last_name || parts.slice(1).join(' ') || ''
        const email = data.user.email || ''
        const schoolName = `École de ${firstName}`

        await prisma.$transaction(async (tx) => {
          const school = await tx.school.create({ data: { name: schoolName, email } })
          await tx.user.create({
            data: {
              id: data.user.id,
              email,
              firstName,
              lastName,
              role: 'ADMIN',
              schoolId: school.id,
            },
          })
        })
        
        // Si c'est une création à la volée, on l'envoie vers la page de bienvenue
        // (même si l'URL demandait /dashboard, on préfère lui souhaiter la bienvenue).
        if (next === '/dashboard') {
          return NextResponse.redirect(`${origin}/welcome`)
        }
      }
    } catch (err) {
      console.error('Erreur lors de la création automatique OAuth:', err)
      // Si on échoue, on continue : le layout dashboard gérera l'erreur "espace_absent"
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
