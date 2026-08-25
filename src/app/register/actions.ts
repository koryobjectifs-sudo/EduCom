'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Création d'un compte et de son établissement.
 *
 * ═══ QUATRE DÉFAUTS RÉELS, TROUVÉS À L'AUDIT DU 19 AOÛT 2026 ═══
 *
 * ⚠️ **1. DES ÉCOLES ORPHELINES.** L'école était créée, PUIS l'utilisateur, en
 * deux écritures indépendantes. Quand la seconde échouait — le journal du
 * serveur en porte deux occurrences, « Unique constraint failed on the fields:
 * (`email`) » — **l'école restait en base, vide et sans propriétaire**. Cinq
 * écoles fantômes existaient ainsi (« Kory », « SABA ACADEMY » ×2, « gomis »
 * ×2). Les deux écritures sont désormais dans une **transaction** : soit les
 * deux existent, soit aucune.
 *
 * ⚠️ **2. UN COMPTE EXISTANT CRÉAIT UNE ÉCOLE DE PLUS.** Quand l'adresse est
 * déjà inscrite, Supabase ne renvoie PAS d'erreur : il renvoie un utilisateur
 * factice avec `identities: []`, exprès, pour qu'on ne puisse pas savoir de
 * l'extérieur quelles adresses sont enregistrées. Le code lisait `data.user.id`
 * et fabriquait une école. C'était la principale usine à écoles fantômes.
 *
 * ⚠️ **3. LA CONFIRMATION PAR E-MAIL N'ÉTAIT PAS GÉRÉE.** Le projet Supabase a
 * `mailer_autoconfirm: false` : `signUp()` renvoie alors un utilisateur **sans
 * session**. Le code redirigeait quand même vers `/onboarding`, qui exige une
 * session et renvoie donc vers `/login` — sans un mot d'explication. La
 * personne venait de créer son compte et se retrouvait devant un formulaire de
 * connexion, persuadée que l'inscription avait échoué. L'action renvoie
 * maintenant un état explicite que l'écran sait afficher.
 *
 * ⚠️ **4. AUCUNE ADRESSE DE RETOUR.** `signUp()` n'envoyait pas
 * `emailRedirectTo` : le lien de confirmation ramenait vers l'URL de site
 * configurée chez Supabase, pas vers le parcours. Il pointe désormais sur
 * `/auth/callback`, qui ouvre la session puis renvoie au tableau de bord — lui
 * même dirigeant vers l'installation tant qu'elle n'est pas faite.
 *
 * ⚠️ **CE QUI N'A PAS ÉTÉ FAIT** : aucune protection n'a été désactivée pour
 * faire passer un test. La confirmation par e-mail reste exigée ; c'est un
 * réglage de projet, pas une décision de code (`rappel.md` §57).
 */

export type RegisterResult =
  | { error: string; dejaInscrit?: boolean }
  /** Compte créé, mais la session n'ouvrira qu'après confirmation de l'adresse. */
  | { confirmationRequise: true; email: string }

/** Messages Supabase → français, sans jamais inventer une cause. */
function messageFr(code: string | undefined, brut: string): string {
  switch (code) {
    case 'over_email_send_rate_limit':
      return "Le service d'envoi d'e-mails a atteint sa limite. Réessayez dans une heure, ou contactez-nous : c'est une limite de notre fournisseur, pas une erreur de votre part."
    case 'email_address_invalid':
      return "Cette adresse e-mail est refusée par notre service d'authentification. Utilisez une adresse courante (Gmail, Outlook, l'adresse de votre établissement…)."
    case 'weak_password':
      return "Mot de passe trop court : il faut au moins 6 caractères."
    case 'signup_disabled':
      return "Les inscriptions sont momentanément fermées."
    default:
      return brut || "L'inscription a échoué."
  }
}

export async function register(formData: FormData): Promise<RegisterResult | void> {
  const schoolName = (formData.get('schoolName') as string ?? '').trim()
  const firstName = (formData.get('firstName') as string ?? '').trim()
  const lastName = (formData.get('lastName') as string ?? '').trim()
  const email = (formData.get('email') as string ?? '').trim().toLowerCase()
  const password = formData.get('password') as string

  if (!schoolName || !email || !password || !firstName || !lastName) {
    return { error: 'Tous les champs sont requis.' }
  }

  // L'origine réelle de la requête : en développement `localhost:3000`, en
  // production le domaine servi. Écrire l'URL en dur ici enverrait les
  // utilisateurs du pilote vers la machine de développement.
  const entetes = await headers()
  const origine =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${entetes.get('x-forwarded-proto') ?? 'http'}://${entetes.get('host')}`

  let user, session
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName },
        emailRedirectTo: `${origine}/auth/callback?next=/welcome`,
      },
    })
    if (error) {
      return { error: messageFr((error as { code?: string }).code, error.message) }
    }
    user = data.user
    session = data.session
  } catch {
    return { error: "Impossible de joindre le service d'authentification." }
  }

  if (!user?.id) return { error: "L'inscription a échoué." }

  // ⚠️ Adresse déjà inscrite : Supabase renvoie un utilisateur factice avec
  // `identities: []` plutôt qu'une erreur, pour ne pas révéler quelles adresses
  // existent. On s'arrête ici — sans quoi on créerait une école de plus.
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return {
      error: "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « mot de passe oublié ».",
      dejaInscrit: true,
    }
  }

  try {
    // ⚠️ UNE SEULE TRANSACTION. Voir le défaut n°1 en tête de fichier.
    await prisma.$transaction(async (tx) => {
      const existant = await tx.user.findUnique({
        where: { id: user!.id },
        select: { id: true, schoolId: true },
      })
      // Reprise d'une inscription interrompue : le compte Auth existe déjà et
      // son école aussi. On ne recrée rien.
      if (existant?.schoolId) return

      const school = await tx.school.create({ data: { name: schoolName, email } })
      await tx.user.create({
        data: {
          id: user!.id, // même identifiant que Supabase Auth : c'est la jointure
          email,
          firstName,
          lastName,
          role: 'ADMIN',
          schoolId: school.id,
        },
      })
    })
  } catch (dbError) {
    console.error('Configuration de l\'espace — échec :', dbError)
    return { error: "Votre compte a été créé, mais la configuration de votre espace a échoué. Écrivez-nous : nous la terminons manuellement." }
  }

  revalidatePath('/', 'layout')

  // ⚠️ Sans session, rediriger serait un aller simple vers `/login`.
  if (!session) return { confirmationRequise: true, email }

  redirect('/onboarding')
}
