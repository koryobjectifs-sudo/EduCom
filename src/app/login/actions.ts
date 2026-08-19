'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * ⚠️ Les messages de Supabase arrivaient **en anglais** dans une interface
 * entièrement française : « Invalid login credentials », « Email not confirmed ».
 * Le second est le plus important du pilote : tant que l'adresse n'est pas
 * confirmée, la connexion échoue, et la personne ne pouvait pas savoir que la
 * cause était un e-mail qu'elle n'avait pas ouvert.
 */
function messageFr(code: string | undefined, brut: string): string {
  switch (code) {
    case 'invalid_credentials':
      return "Adresse e-mail ou mot de passe incorrect."
    case 'email_not_confirmed':
      return "Votre adresse n'est pas encore confirmée. Ouvrez le lien que nous vous avons envoyé par e-mail, puis revenez ici."
    case 'over_request_rate_limit':
      return "Trop de tentatives. Patientez une minute avant de réessayer."
    default:
      return brut || "La connexion a échoué."
  }
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  // ⚠️ `suite` vient de `proxy.ts`, qui l'ajoute quand une page protégée a été
  // demandée sans session. Sans cette reprise, le paramètre serait une promesse
  // morte : on renverrait tout le monde au tableau de bord générique.
  const demande = (formData.get('suite') as string) ?? ''
  const suite = demande.startsWith('/') && !demande.startsWith('//') ? demande : '/dashboard'

  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes("fetch failed")) {
        return { error: "Problème de connexion réseau. Veuillez vérifier votre connexion et réessayer." }
      }
      return { error: messageFr((error as { code?: string }).code, error.message) }
    }
  } catch (err: any) {
    if (err?.message?.includes("fetch failed")) {
      return { error: "Problème de connexion réseau. Veuillez vérifier votre connexion et réessayer." }
    }
    return { error: "Erreur de connexion au serveur d'authentification." }
  }

  redirect(suite)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
