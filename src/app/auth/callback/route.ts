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
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Le cas de loin le plus fréquent : lien déjà utilisé, ou expiré.
    return NextResponse.redirect(`${origin}/login?erreur=lien_invalide`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
