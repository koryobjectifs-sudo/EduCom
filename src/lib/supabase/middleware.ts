import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rafraîchissement de session et garde des routes protégées.
 *
 * ═══ POURQUOI CE FICHIER EXISTAIT SANS SERVIR ═══
 *
 * ⚠️ **Il n'y avait AUCUN `middleware.ts`.** Deux implémentations de
 * `updateSession` dormaient au dépôt — celle-ci et `src/utils/supabase/` — et
 * ni l'une ni l'autre n'était branchée. Conséquence, mesurée et non supposée :
 * `@supabase/ssr` ne peut pas écrire de cookie depuis un composant serveur (la
 * tentative est avalée par un `try/catch`, comme le veut Next). **Le jeton
 * rafraîchi n'était donc jamais conservé.** Au bout d'une heure, `getUser()`
 * échouait et l'utilisateur était renvoyé vers la connexion, au milieu de son
 * travail. Pour un pilote, c'est une déconnexion par heure et par personne.
 *
 * ⚠️ La version de `src/utils/supabase/` redirigeait **tout** ce qui n'est pas
 * `/login`, `/register` ou `/auth` vers la connexion : l'activer aurait rendu
 * la page d'accueil publique inaccessible. C'est probablement pour cela qu'elle
 * n'a jamais été branchée. Elle a été supprimée ; il ne reste qu'une
 * implémentation, celle-ci.
 *
 * ⚠️ **Cette garde ne remplace pas les contrôles des pages.** Chaque écran
 * vérifie déjà sa session et son établissement (`requireSchoolContext`,
 * `requireActionContext`) : c'est là que se joue la sécurité, parce qu'une
 * server action est appelable sans passer par une page. Le middleware n'est
 * qu'une première barrière, et il n'en dispense aucune autre.
 */
export async function updateSession(request: NextRequest) {
  // ⚠️ `NextResponse.next({ request })` — la forme montrée par la documentation
  // Supabase — produit une réponse **404** sous Next 16 : les pages protégées
  // redirigeaient correctement pendant que TOUTES les pages publiques
  // disparaissaient. La documentation de `proxy.js` du dépôt n'utilise que
  // `NextResponse.next()`. Ne pas « restaurer » l'argument.
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Le jeton rafraîchi doit repartir dans la réponse ; sans cela il est
          // perdu et la session expire au bout d'une heure.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // ⚠️ Ne rien écrire entre `createServerClient` et `getUser()` : c'est l'appel
  // qui rafraîchit le jeton et déclenche `setAll`.
  const { data: { user } } = await supabase.auth.getUser()

  const chemin = request.nextUrl.pathname
  const protege = chemin.startsWith('/dashboard') || chemin.startsWith('/onboarding')
  const pageAuth = chemin === '/login' || chemin === '/register'

  if (!user && protege) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // ⚠️ On garde où la personne voulait aller : après connexion elle y revient
    // au lieu d'être relâchée sur un tableau de bord générique.
    url.searchParams.set('suite', chemin)
    return NextResponse.redirect(url)
  }

  if (user && pageAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
