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

  // Check if user has a complete public profile.
  // A profile is only complete when username, date_of_birth, AND gender are all
  // present. We deliberately do NOT use a hardcoded fallback date — any missing
  // field means incomplete. This also handles the case where an admin deleted the
  // user from auth.users but the old row remains in the users table: the auth UID
  // changed on re-signup so maybeSingle() returns null → treated as new user.
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, date_of_birth, gender')
    .eq('id', user.id)
    .maybeSingle()

  const isProfileComplete =
    !!profile &&
    !!profile.username &&
    !!profile.date_of_birth &&
    !!profile.gender

  const response = isProfileComplete
    ? NextResponse.redirect(`${origin}${next}`)
    : NextResponse.redirect(`${origin}/auth/complete-profile`)

  // Set a lightweight cookie that middleware can read without a network call.
  // This lets middleware block half-onboarded users from accessing protected routes.
  // The cookie is intentionally not HttpOnly so the client can also read it if needed.
  if (isProfileComplete) {
    response.cookies.set('jinxy-profile-complete', '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    // Clear it in case a stale one exists (e.g. deleted and re-signed up)
    response.cookies.delete('jinxy-profile-complete')
  }

  return response
}
