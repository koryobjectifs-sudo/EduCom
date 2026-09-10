import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

async function handleSignOut(request: Request) {
  const supabase = await createClient()

  // Destroy session on Supabase
  await supabase.auth.signOut()

  // Explicitly clear all auth cookies
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  for (const c of allCookies) {
    if (c.name.startsWith('sb-') || c.name.includes('supabase') || c.name.includes('auth')) {
      cookieStore.delete(c.name)
    }
  }

  // Clear cache for the whole site
  revalidatePath('/', 'layout')

  const response = NextResponse.redirect(new URL('/login', request.url), {
    status: 303,
  })

  // Also expire cookies directly on response headers
  for (const c of allCookies) {
    if (c.name.startsWith('sb-') || c.name.includes('supabase') || c.name.includes('auth')) {
      response.cookies.delete(c.name)
    }
  }

  return response
}

export async function POST(request: Request) {
  return handleSignOut(request)
}

export async function GET(request: Request) {
  return handleSignOut(request)
}

