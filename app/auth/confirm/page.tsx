'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/home'

  useEffect(() => {
    // Set the cookie client-side — this is guaranteed to land before the
    // next navigation because it happens synchronously before router.replace.
    if (next !== '/auth/complete-profile') {
      document.cookie = 'jinxy-profile-complete=1; path=/; max-age=31536000; SameSite=Lax'
    } else {
      // Clear stale cookie if profile is incomplete
      document.cookie = 'jinxy-profile-complete=; path=/; max-age=0'
    }
    router.replace(next)
  }, [next])

  // Blank screen for the ~100ms this takes — or add your splash/spinner
  return (
    <div style={{ 
      minHeight: '100dvh', 
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0110 10" stroke="var(--pink, #FF2D6B)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  )
}
