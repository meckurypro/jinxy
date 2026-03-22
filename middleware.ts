// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Session check (cookie-based, zero network calls) ──────────────────────
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
    .replace('https://', '')
    .split('.')[0]

  const hasSession =
    request.cookies.has(`sb-${projectRef}-auth-token`) ||
    request.cookies.has(`sb-${projectRef}-auth-token.0`)

  // Profile completion is tracked via a separate lightweight cookie set by
  // /auth/callback after verifying the users table. This lets us distinguish
  // between a user who is authenticated but hasn't finished onboarding vs one
  // who is fully set up — without making any Supabase network calls here.
  const hasCompleteProfile = request.cookies.has('jinxy-profile-complete')

  // ── Route classification ───────────────────────────────────────────────────

  // Routes that are always accessible regardless of auth state
  const publicPrefixes = ['/', '/onboarding', '/auth', '/invite']
  const isPublicRoute = publicPrefixes.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  // Auth/onboarding routes — redirect away if user is already fully set up
  const authRoutes = ['/auth/login', '/auth/signup', '/onboarding']
  const isAuthRoute = authRoutes.some(
    r => pathname === r || pathname.startsWith(r + '/')
  )

  // The complete-profile page is public (auth/ prefix) but needs special handling:
  // a user with a complete profile should not be able to return to it
  const isCompleteProfileRoute = pathname === '/auth/complete-profile' ||
    pathname.startsWith('/auth/complete-profile/')

  // ── Redirect logic ────────────────────────────────────────────────────────

  // No session at all → only public routes allowed
  if (!hasSession && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Has session but no complete profile:
  // - Allow /auth/complete-profile through (they need to finish)
  // - Block access to all other protected routes → push to complete-profile
  if (hasSession && !hasCompleteProfile && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
  }

  // Fully set up user hits splash → skip to app
  if (hasSession && hasCompleteProfile && pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Fully set up user hits auth/onboarding routes → send to app
  if (hasSession && hasCompleteProfile && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Fully set up user tries to go back to complete-profile → send to app
  if (hasSession && hasCompleteProfile && isCompleteProfileRoute) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
