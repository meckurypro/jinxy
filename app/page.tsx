// app/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Phase = 'logo' | 'crossfade' | 'brand' | 'done'

export default function SplashPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('logo')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('crossfade'), 1000)
    const t2 = setTimeout(() => setPhase('brand'), 1400)
    const t3 = setTimeout(() => {
      setPhase('done')
      const seen = localStorage.getItem('jinxy-onboarded')
      router.replace(seen ? '/auth/login' : '/onboarding')
    }, 3000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [router])

  return (
    <div className="relative w-full min-h-dvh overflow-hidden">

      {/* === PHASE 1: White screen + heart logo === */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: '#FFFFFF',
          opacity: phase === 'logo' ? 1 : phase === 'crossfade' ? 0 : 0,
          transition: phase === 'crossfade' ? 'opacity 400ms ease' : 'none',
          zIndex: 2,
        }}
      >
        <div
          style={{
            opacity: phase === 'logo' ? 1 : 0,
            transform: phase === 'logo' ? 'scale(1)' : 'scale(0.92)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            animation: phase === 'logo' ? 'fadeScaleIn 700ms ease forwards' : undefined,
          }}
        >
          <Image
            src="/icons/jinxy.png"
            alt="Jinxy"
            width={120}
            height={120}
            priority
            style={{ borderRadius: 28 }}
          />
        </div>
      </div>

      {/* === PHASE 2: Dark pink screen + centered white wordmark === */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{
          background: '#C4174A', // darker, richer pink matching the app's deep brand color
          opacity: phase === 'brand' || phase === 'done' ? 1 : 0,
          transition: 'opacity 500ms ease',
          zIndex: 1,
        }}
      >
        {/* Subtle vignette for depth */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.15) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Centered white wordmark */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            opacity: phase === 'brand' || phase === 'done' ? 1 : 0,
            transform: phase === 'brand' || phase === 'done' ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 600ms ease 200ms, transform 600ms ease 200ms',
          }}
        >
          <Image
            src="/icons/WBrandName.png"
            alt="jinxy"
            width={180}
            height={72}
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.08em',
            textAlign: 'center',
            opacity: phase === 'brand' || phase === 'done' ? 1 : 0,
            transform: phase === 'brand' || phase === 'done' ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 600ms ease 500ms, transform 600ms ease 500ms',
          }}
        >
          Want a Jinx? Go Jinxy.
        </p>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
