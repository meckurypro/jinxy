// app/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()

      // Run auth check and minimum display timer IN PARALLEL.
      // Previously these were sequential: getUser() THEN setTimeout(1800).
      // Total wait was authLatency + 1800ms. Now it's max(authLatency, 1000ms).
      const [{ data: { user } }] = await Promise.all([
        supabase.auth.getUser(),
        new Promise<void>(r => setTimeout(r, 1000)),
      ])

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
    <div
      className="flex flex-col items-center justify-center min-h-dvh relative"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(255,45,107,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2"
          style={{
            background: 'linear-gradient(135deg, #FF2D6B 0%, #6B21A8 100%)',
            boxShadow: '0 8px 32px rgba(255, 45, 107, 0.4)',
            animation: 'glow-pulse 2s ease-in-out infinite',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 34s-16-9.5-16-20a8 8 0 0116 0 8 8 0 0116 0c0 10.5-16 20-16 20z"
              fill="white"
              opacity="0.9"
            />
          </svg>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 48,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          jinxy
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          Want a Jinx? Go Jinxy.
        </p>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-16 flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--pink)',
              opacity: 0.5,
              animation: `fade-in 0.6s ease ${i * 0.2}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
