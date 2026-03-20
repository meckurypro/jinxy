import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  // IMPORTANT: use getUser() not getSession() — getSession() is not safe server-side
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Routes that never require auth
  const publicRoutes = ['/', '/onboarding', '/auth/login', '/auth/signup', '/auth/callback', '/auth/verify', '/invite']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  // Routes that logged-in users should not visit
  const authRoutes = ['/auth/login', '/auth/signup', '/onboarding']
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Skip Next.js internals, all static files, and the splash screen (/).
     * The splash screen does its own client-side auth check — running middleware
     * on it adds a full Supabase round-trip before the page even renders.
     *
     * Match everything EXCEPT:
     *   - _next/static, _next/image
     *   - favicon, icons, manifest, images
     *   - the root splash route itself (exact "/")
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
