import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes that never require auth — always let these through immediately
  // before even attempting a Supabase call.
  const publicPrefixes = [
    '/',
    '/onboarding',
    '/auth',   // covers /auth/login, /auth/signup, /auth/callback, /auth/verify
    '/invite',
  ]
  const isPublicRoute = publicPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  // Auth routes redirect logged-in users away
  const authPrefixes = ['/auth/login', '/auth/signup', '/onboarding']
  const isAuthRoute = authPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  // For public routes that don't need redirecting logged-in users,
  // skip the Supabase call entirely — no network round trip.
  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next({ request })
  }

  // At this point: either a protected route (needs auth check to gate it)
  // or an auth route (needs auth check to redirect away if already logged in).
  // Wrap in try/catch so a misconfigured Supabase never causes a 404.
  try {
    let supabaseResponse = NextResponse.next({ request })

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

    const { data: { user } } = await supabase.auth.getUser()

    // Not logged in and trying to access a protected route → redirect to login
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    // Logged in but on an auth/onboarding route → redirect to app
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (err) {
    // If Supabase is misconfigured or throws, never block the request.
    // Just let Next.js serve the page — the page itself will handle auth state.
    console.error('[middleware] Supabase error:', err)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
