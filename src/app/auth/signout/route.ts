import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Destroy session on the server
  await supabase.auth.signOut()

  // Clear cache for the whole site so back button doesn't show protected pages
  revalidatePath('/', 'layout')

  return NextResponse.redirect(new URL('/login', request.url), {
    status: 303,
  })
}
