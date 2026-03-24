// app/(client)/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { BottomNav } from '@/components/shared/BottomNav'
import { BookingToast } from '@/components/shared/BookingToast'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!profile) return
    // If user is a Jinx in Jinx mode, redirect them to Jinx dashboard
    if (profile.role === 'jinx' && profile.current_mode === 'jinx') {
      router.replace('/jinx/dashboard')
    }
  }, [profile?.current_mode, loading])

  return (
    <div className="relative min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <BookingToast />
      {children}
      <BottomNav mode="client" />
    </div>
  )
}
