import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { urlSupabase, cleAnonSupabase } from './config'

/**
 * Rafraîchissement de session et garde des routes protégées.
 *
 * Règles absolues de sécurité :
 * - Confirmation d'e-mail OBLIGATOIRE : aucun accès à /dashboard ou /onboarding sans e-mail confirmé.
 * - Tout compte non confirmé est redirigé vers /verify-email.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    urlSupabase(),
    cleAnonSupabase(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const chemin = request.nextUrl.pathname
  const protege = chemin.startsWith('/dashboard') || chemin.startsWith('/onboarding') || chemin.startsWith('/welcome')
  const pageAuth = chemin === '/login' || chemin === '/register'
  const isVerifyEmailPage = chemin === '/verify-email'

  if (!user && protege) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('suite', chemin)
    return NextResponse.redirect(url)
  }

  // ⚠️ BLOCAGE STRICT COMPTE NON CONFIRMÉ
  const isEmailConfirmed = Boolean(user?.email_confirmed_at)

  if (user && !isEmailConfirmed && protege) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-email'
    if (user.email) {
      url.searchParams.set('email', user.email)
    }
    return NextResponse.redirect(url)
  }

  if (user && isEmailConfirmed && isVerifyEmailPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && isEmailConfirmed && pageAuth) {
    if (!request.nextUrl.searchParams.has('erreur')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}
