// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {}
        },
      },
    }
  )

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    console.error('Session exchange error:', sessionError.message)
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_user`)
  }

  // Check if user has a complete public profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, date_of_birth, gender')
    .eq('id', user.id)
    .maybeSingle()

  // No profile at all, or profile is incomplete (placeholder DOB means never completed)
  const isNewUser = !profile
  const isIncomplete = profile && (
    !profile.username ||
    profile.date_of_birth === '2000-01-01' ||
    !profile.gender
  )

  if (isNewUser || isIncomplete) {
    // Redirect to profile completion page
    return NextResponse.redirect(`${origin}/auth/complete-profile`)
  }

  // Existing complete user — send to app
  return NextResponse.redirect(`${origin}${next}`)
}
