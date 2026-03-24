// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
    .replace('https://', '').split('.')[0]
  const hasSession =
    request.cookies.has(`sb-${projectRef}-auth-token`) ||
    request.cookies.has(`sb-${projectRef}-auth-token.0`)
  const hasCompleteProfile = request.cookies.has('jinxy-profile-complete')

  // Route classification
  const publicPrefixes = ['/', '/onboarding', '/auth', '/invite']
  const isPublicRoute = publicPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'))

  const authRoutes = ['/auth/login', '/auth/signup', '/onboarding']
  const isAuthRoute = authRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))

  const isCompleteProfileRoute = pathname === '/auth/complete-profile' || pathname.startsWith('/auth/complete-profile/')

  // Jinx routes — require role=jinx + current_mode=jinx
  // We can't check DB in middleware without network call, so we rely on
  // the (jinx)/layout.tsx to redirect if mode is wrong. Middleware just
  // ensures they're authenticated.
  const isJinxRoute = pathname.startsWith('/jinx/')

  // No session → only public routes
  if (!hasSession && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Has session, incomplete profile, not on a public or complete-profile route
  if (hasSession && !hasCompleteProfile && !isPublicRoute && !isJinxRoute) {
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
