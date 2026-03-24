// middleware.ts
// Responsibilities:
//   1. Refresh Supabase auth session via @supabase/ssr (getUser — never getSession)
//   2. Redirect unauthenticated users to /auth/login
//   3. Redirect incomplete-profile users to /auth/complete-profile
//   4. Guard /jinx/* routes — require jinxy-mode=jinx cookie
//   5. Guard client routes — redirect jinx-mode users to /jinx/dashboard
//   6. Smart redirect for auth/onboarding routes when already authenticated

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Cookie written by your app when the user picks a mode */
export const MODE_COOKIE = 'jinxy-mode'

/** Cookie written by your app once profile setup is complete */
const PROFILE_COMPLETE_COOKIE = 'jinxy-profile-complete'

// ---------------------------------------------------------------------------
// Route classifications — centralised so they're easy to update
// ---------------------------------------------------------------------------

/** Fully public — no session required, never redirected away */
const PUBLIC_PREFIXES = ['/', '/onboarding', '/auth', '/invite']

/** Auth/onboarding routes — authenticated + complete users are bounced away */
const AUTH_PREFIXES = ['/auth/login', '/auth/signup', '/onboarding']

/** Profile-completion route — skip the incomplete-profile guard here */
const COMPLETE_PROFILE_PATH = '/auth/complete-profile'

/** Client routes accessible regardless of mode (e.g. mode-switch page) */
const MODE_AGNOSTIC_PREFIXES = ['/account']

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p === '/' ? '/' : p + '/')
  )
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Build a mutable response and create the Supabase client ────────────
  //
  // We MUST wire up both request and response cookies so that:
  //   a) getUser() can read the current session
  //   b) a refreshed token is written back to the browser
  //
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Write refreshed cookies into the request (for Server Components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild the response so the updated cookies reach the browser
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the token with the Supabase Auth server on every
  // request — the only safe option per official docs. getSession() must
  // never be used here because it does NOT revalidate.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── 2. Route classification ───────────────────────────────────────────────

  const isPublicRoute = matchesPrefix(pathname, PUBLIC_PREFIXES)
  const isAuthRoute = matchesPrefix(pathname, AUTH_PREFIXES)
  const isCompleteProfileRoute =
    pathname === COMPLETE_PROFILE_PATH ||
    pathname.startsWith(COMPLETE_PROFILE_PATH + '/')
  const isJinxRoute = pathname.startsWith('/jinx')
  const isModeAgnostic = matchesPrefix(pathname, MODE_AGNOSTIC_PREFIXES)

  // ── 3. Unauthenticated guard ──────────────────────────────────────────────

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    return NextResponse.redirect(loginUrl)
  }

  // ── 4. Incomplete-profile guard ───────────────────────────────────────────
  //
  // Only applied to authenticated users who haven't completed setup yet.
  // Skipped on: public routes, complete-profile itself, and jinx routes
  // (jinx layout handles its own checks).

  const hasCompleteProfile = request.cookies.has(PROFILE_COMPLETE_COOKIE)

  if (
    user &&
    !hasCompleteProfile &&
    !isPublicRoute &&
    !isCompleteProfileRoute &&
    !isJinxRoute
  ) {
    const dest = request.nextUrl.clone()
    dest.pathname = COMPLETE_PROFILE_PATH
    return NextResponse.redirect(dest)
  }

  // ── 5. Redirect authenticated users away from auth/onboarding routes ──────

  if (user && isAuthRoute) {
    const mode = request.cookies.get(MODE_COOKIE)?.value ?? 'client'
    const dest = request.nextUrl.clone()
    dest.pathname = mode === 'jinx' ? '/jinx/dashboard' : '/home'
    return NextResponse.redirect(dest)
  }

  // ── 6. Redirect fully set-up user away from complete-profile ─────────────

  if (user && hasCompleteProfile && isCompleteProfileRoute) {
    const dest = request.nextUrl.clone()
    dest.pathname = '/home'
    return NextResponse.redirect(dest)
  }

  // ── 7. Splash → app ───────────────────────────────────────────────────────

  if (user && hasCompleteProfile && pathname === '/') {
    const mode = request.cookies.get(MODE_COOKIE)?.value ?? 'client'
    const dest = request.nextUrl.clone()
    dest.pathname = mode === 'jinx' ? '/jinx/dashboard' : '/home'
    return NextResponse.redirect(dest)
  }

  // ── 8. Mode-based bidirectional route guard ───────────────────────────────

  if (user && !isPublicRoute && !isModeAgnostic) {
    const mode = request.cookies.get(MODE_COOKIE)?.value ?? 'client'

    if (isJinxRoute && mode !== 'jinx') {
      // Client-mode user trying to access jinx UI → send to client home
      const dest = request.nextUrl.clone()
      dest.pathname = '/home'
      return NextResponse.redirect(dest)
    }

    if (!isJinxRoute && mode === 'jinx') {
      // Jinx-mode user trying to access client UI → send to jinx dashboard
      const dest = request.nextUrl.clone()
      dest.pathname = '/jinx/dashboard'
      return NextResponse.redirect(dest)
    }
  }

  // ── 9. All good — pass through with (possibly refreshed) session ──────────
  return response
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     *   _next/static  — compiled assets
     *   _next/image   — image optimisation
     *   favicon.ico, icons, images, fonts — static files
     *   manifest.json — PWA manifest
     *   api           — API routes handle their own auth
     *   common image extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons|images|fonts|manifest\\.json|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
