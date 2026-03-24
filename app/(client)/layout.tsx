// app/(client)/layout.tsx
// Client mode layout.
// If the user is in jinx mode, redirect them to the jinx dashboard.
// /account is whitelisted so the mode-switch page is always reachable.
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { BottomNav } from '@/components/shared/BottomNav'
import { BookingToast } from '@/components/shared/BookingToast'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading || !profile) return

    if (profile.current_mode === 'jinx') {
      // Allow /account so users can always reach the mode-switch option
      // even if they land here from a stale link or back-navigation
      const isAccountPage = pathname?.startsWith('/account')
      if (!isAccountPage) {
        router.replace('/jinx/dashboard')
      }
    }
  }, [profile?.current_mode, loading, pathname])

  return (
    <div className="relative min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <BookingToast />
      {children}
      <BottomNav mode="client" />
    </div>
  )
}
