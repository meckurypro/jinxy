// app/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SplashPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [wordmarkVisible, setWordmarkVisible] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Staggered entrance — each element fades in separately
    const t1 = setTimeout(() => setVisible(true), 100)         // logo fades in
    const t2 = setTimeout(() => setWordmarkVisible(true), 600) // wordmark slides up
    const t3 = setTimeout(() => setTaglineVisible(true), 1000) // tagline fades in
    const t4 = setTimeout(() => setExiting(true), 2000)        // everything fades out
    const t5 = setTimeout(() => {
      const seen = localStorage.getItem('jinxy-onboarded')
      router.replace(seen ? '/auth/login' : '/onboarding')
    }, 2600)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      clearTimeout(t4); clearTimeout(t5)
    }
  }, [router])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100dvh',
        background: '#B8153F', // deep brand crimson — matches app dark palette
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        opacity: exiting ? 0 : 1,
        transition: exiting ? 'opacity 600ms cubic-bezier(0.4,0,0.2,1)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial light — gives depth without distraction */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Heart logo — scales up from 80% with a gentle spring feel */}
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(8px)',
        transition: 'opacity 700ms cubic-bezier(0.34,1.56,0.64,1), transform 700ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <Image
          src="/icons/jinxy.png"
          alt="Jinxy"
          width={96}
          height={96}
          priority
          style={{ borderRadius: 22, display: 'block' }}
        />
      </div>

      {/* Wordmark — slides up from below logo */}
      <div style={{
        opacity: wordmarkVisible ? 1 : 0,
        transform: wordmarkVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 700ms cubic-bezier(0.4,0,0.2,1), transform 700ms cubic-bezier(0.4,0,0.2,1)',
        // Force the image to render centered regardless of PNG canvas padding
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        paddingLeft: 24,
        paddingRight: 24,
      }}>
        <Image
          src="/icons/WBrandName.png"
          alt="jinxy"
          width={160}
          height={64}
          priority
          style={{
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
          }}
        />
      </div>

      {/* Tagline */}
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        textAlign: 'center',
        opacity: taglineVisible ? 1 : 0,
        transform: taglineVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        margin: 0,
      }}>
        Want a Jinx? Go Jinxy.
      </p>
    </div>
  )
}
