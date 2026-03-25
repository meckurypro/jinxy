// app/(client)/layout.tsx
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
      <div className="h-20" aria-hidden="true" /> {/* spacer so pages clear the fixed BottomNav */}
      <BottomNav mode="client" />
    </div>
  )
}
