import { createBrowserClient } from '@supabase/ssr'
import { urlSupabase, cleAnonSupabase } from './config'

export function createClient() {
  return createBrowserClient(
    urlSupabase(),
    cleAnonSupabase()
  )
}
