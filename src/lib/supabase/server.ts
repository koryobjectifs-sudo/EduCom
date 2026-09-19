import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { urlSupabase, cleAnonSupabase } from './config'

export async function createClient() {
  let cookieStore: any = null
  try {
    cookieStore = await cookies()
  } catch {
    // Hors contexte requête HTTP (scripts de test)
  }

  if (!cookieStore) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    return createSupabaseClient(urlSupabase(), cleAnonSupabase(), {
      auth: { persistSession: false },
    }) as any
  }

  return createServerClient(
    urlSupabase(),
    cleAnonSupabase(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
