import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  // Create Supabase client only to refresh the session cookie.
  // We use getSession() here (NOT getUser()) — getSession() reads the cookie
  // locally with no network call to Supabase, so it never times out on cold
  // starts. The 404s you were seeing were caused by getUser() timing out in
  // the middleware on Vercel cold starts, which Next.js silently converts to 404.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() is local — reads the JWT from the cookie, no network round trip.
  // This is safe in middleware because we're only using it for routing decisions
  // and cookie refresh, not for anything security-critical.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const authPrefixes = ['/auth/login', '/auth/signup', '/onboarding']
  const isAuthRoute = authPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  const publicPrefixes = ['/', '/onboarding', '/auth', '/invite']
  const isPublicRoute = publicPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  // Logged-in user visiting auth/onboarding pages → send to app
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // Unauthenticated user visiting protected pages → send to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
