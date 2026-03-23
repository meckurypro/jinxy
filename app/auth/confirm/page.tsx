// app/auth/confirm/page.tsx
// Single source of truth for post-auth routing.
// Called by: login (email OTP), signup (email OTP), Google OAuth callback.
// Checks if profile is complete → sets cookie → routes accordingly.
// Never shows UI — just a spinner while it works.
'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/home'

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('username, date_of_birth, gender')
        .eq('id', user.id)
        .maybeSingle()

      const isComplete =
        !!profile?.username &&
        !!profile?.date_of_birth &&
        !!profile?.gender

      if (isComplete) {
        // ✅ Refresh the cookie on every login — prevents cookie-cleared issues
        document.cookie = 'jinxy-profile-complete=1; path=/; max-age=31536000; SameSite=Lax'
        router.replace(next)
      } else {
        // Clear the cookie in case it was stale
        document.cookie = 'jinxy-profile-complete=; path=/; max-age=0'
        router.replace('/auth/complete-profile')
      }
    }

    run()
  }, [])

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg className="animate-spin" width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" />
        <path d="M14 2a12 12 0 0112 12" stroke="#FF2D6B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh', background: 'var(--bg-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" />
          <path d="M14 2a12 12 0 0112 12" stroke="#FF2D6B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    }>
      <ConfirmInner />
    </Suspense>
  )
}
