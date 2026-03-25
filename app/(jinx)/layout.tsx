// app/(jinx)/layout.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { JinxBottomNav } from '@/components/shared/JinxBottomNav'

export default function JinxLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!profile) { router.replace('/auth/login'); return }
    if (profile.current_mode !== 'jinx') { router.replace('/home'); return }
  }, [profile, loading])

  if (loading || !profile || profile.current_mode !== 'jinx') {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: '#0D0518' }}>
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="rgba(147,51,234,0.2)" strokeWidth="2" />
          <path d="M14 2a12 12 0 0112 12" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(147,51,234,0.04) 0%, transparent 50%)',
        zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
        <div className="h-20" aria-hidden="true" /> {/* spacer so pages clear the fixed JinxBottomNav */}
      </div>
      <JinxBottomNav />
    </div>
  )
}
