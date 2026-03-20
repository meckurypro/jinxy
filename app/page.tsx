'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Small delay for splash feel
      await new Promise(r => setTimeout(r, 1800))

      if (user) {
        router.replace('/home')
      } else {
        const seen = localStorage.getItem('jinxy-onboarded')
        router.replace(seen ? '/auth/login' : '/onboarding')
      }
    }
    check()
  }, [router])

  return (
    <div className="screen screen-content-no-nav flex flex-col items-center justify-center"
      style={{ background: 'var(--bg-base)' }}>

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(255,45,107,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-3 animate-fade-in">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2 animate-glow"
          style={{
            background: 'linear-gradient(135deg, #FF2D6B 0%, #6B21A8 100%)',
            boxShadow: '0 8px 32px rgba(255, 45, 107, 0.4)',
          }}
        >
          {/* Placeholder heart icon — replace with actual app icon */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 34s-16-9.5-16-20a8 8 0 0116 0 8 8 0 0116 0c0 10.5-16 20-16 20z"
              fill="white"
              opacity="0.9"
            />
            <path
              d="M20 34s-16-9.5-16-20a8 8 0 0116 0"
              fill="white"
            />
          </svg>
        </div>

        <h1
          className="text-5xl font-display"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
        >
          jinxy
        </h1>

        <p
          className="text-sm font-body"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.04em' }}
        >
          Want a Jinx? Go Jinxy.
        </p>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-16 flex gap-1.5 animate-fade-in delay-500">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--pink)',
              animation: `fade-in 0.6s ease ${i * 0.2}s infinite alternate`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
    </div>
  )
}
