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

  // Redirect to /auth/confirm — a thin client page that sets the cookie
  // synchronously before navigating, avoiding the race where middleware
  // reads the next request before the browser has stored Set-Cookie.
  const confirmUrl = isProfileComplete
    ? `${origin}/auth/confirm?next=${encodeURIComponent(next)}`
    : `${origin}/auth/confirm?next=%2Fauth%2Fcomplete-profile`

  const response = NextResponse.redirect(confirmUrl)

  if (isProfileComplete) {
    response.cookies.set('jinxy-profile-complete', '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    response.cookies.delete('jinxy-profile-complete')
  }

  return response
}
