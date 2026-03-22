import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Read session purely from cookies — zero network calls to Supabase.
  // The cookie name follows Supabase's naming convention: sb-<project-ref>-auth-token.
  // This is safe for routing decisions; actual session verification still happens
  // server-side in route handlers and client components via supabase.auth.getUser().
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!
    .replace('https://', '')
    .split('.')[0]

  const hasSession =
    request.cookies.has(`sb-${projectRef}-auth-token`) ||
    request.cookies.has(`sb-${projectRef}-auth-token.0`) // chunked cookie fallback

  // Logged-in user hits splash → skip it, go straight to app
  if (hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  const authRoutes = ['/auth/login', '/auth/signup', '/onboarding']
  const isAuthRoute = authRoutes.some(
    r => pathname === r || pathname.startsWith(r + '/')
  )

  // Logged-in user hits auth/onboarding route → send to app
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  const publicPrefixes = ['/', '/onboarding', '/auth', '/invite']
  const isPublicRoute = publicPrefixes.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  // Unauthenticated user hits a protected route → send to login
  if (!hasSession && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
