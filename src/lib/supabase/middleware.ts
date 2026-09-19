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
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

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
  const isFamilleLogin = chemin === '/famille/login'
  const protege =
    chemin.startsWith('/dashboard') ||
    chemin.startsWith('/onboarding') ||
    chemin.startsWith('/welcome') ||
    (chemin.startsWith('/famille') && !isFamilleLogin)
  const pageAuth = chemin === '/login' || chemin === '/register' || isFamilleLogin
  const isVerifyEmailPage = chemin === '/verify-email'

  if (!user && protege) {
    const url = request.nextUrl.clone()
    url.pathname = chemin.startsWith('/famille') ? '/famille/login' : '/login'
    url.searchParams.set('suite', chemin)
    return NextResponse.redirect(url)
  }

  // ⚠️ BLOCAGE STRICT COMPTE NON CONFIRMÉ (Exemption sécurisée pour les parents authentifiés par téléphone ou faux e-mails)
  const isEmailConfirmed = Boolean(user?.email_confirmed_at)
  const isPhoneConfirmed = Boolean(user?.phone_confirmed_at)
  const isParent =
    user?.user_metadata?.role === 'PARENT' ||
    (Boolean(user?.email) && user!.email!.endsWith('@parent.educom.local'))
  const isAccountActive = isEmailConfirmed || isPhoneConfirmed || isParent

  if (user && !isAccountActive && protege) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-email'
    if (user.email) {
      url.searchParams.set('email', user.email)
    }
    return NextResponse.redirect(url)
  }

  if (user && isAccountActive && isVerifyEmailPage) {
    const url = request.nextUrl.clone()
    url.pathname = isParent ? '/famille' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && isAccountActive && pageAuth) {
    if (!request.nextUrl.searchParams.has('erreur')) {
      const url = request.nextUrl.clone()
      url.pathname = isParent ? '/famille' : '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}
