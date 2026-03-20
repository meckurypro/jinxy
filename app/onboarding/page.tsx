// app/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const slides = [
  {
    id: 'vibe',
    label: 'Vibe',
    title: 'Find the spark.',
    subtitle: 'Feel the chemistry.',
    accent: '#FF2D6B',
    bg: 'radial-gradient(ellipse 80% 60% at 70% 30%, rgba(255,45,107,0.25) 0%, transparent 70%)',
  },
  {
    id: 'discreet',
    label: 'Discreet',
    title: 'Private by design.',
    subtitle: 'Mutual by choice.',
    accent: '#9333EA',
    bg: 'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(147,51,234,0.25) 0%, transparent 70%)',
  },
  {
    id: 'jinx',
    label: 'Jinx',
    title: 'When the connection clicks,',
    subtitle: "it's a Jinx.",
    accent: '#FF2D6B',
    bg: 'radial-gradient(ellipse 80% 60% at 60% 50%, rgba(255,45,107,0.2) 0%, rgba(147,51,234,0.15) 50%, transparent 70%)',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const slide = slides[current]

  const goTo = (index: number) => {
    if (animating || index === current) return
    setAnimating(true)
    setTimeout(() => {
      setCurrent(index)
      setAnimating(false)
    }, 250)
  }

  const handleNext = () => {
    if (current < slides.length - 1) {
      goTo(current + 1)
    } else {
      localStorage.setItem('jinxy-onboarded', 'true')
      router.push('/auth/signup')
    }
  }

  const handleSignIn = () => {
    localStorage.setItem('jinxy-onboarded', 'true')
    router.push('/auth/login')
  }

  useEffect(() => {
    let startX = 0
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX
      if (diff > 60 && current < slides.length - 1) goTo(current + 1)
      if (diff < -60 && current > 0) goTo(current - 1)
    }
    window.addEventListener('touchstart', onTouchStart)
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [current, animating])

  return (
    <div
      className="relative flex flex-col min-h-dvh overflow-hidden"
      style={{ background: '#0A0A0F' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: slide.bg }}
      />

      {/* Decorative orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl transition-all duration-700"
          style={{
            background: slide.accent,
            top: '10%',
            right: '-10%',
            opacity: 0.1,
            transform: `scale(${animating ? 0.8 : 1})`,
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full blur-2xl transition-all duration-700"
          style={{
            background: current === 1 ? '#9333EA' : '#FF2D6B',
            bottom: '30%',
            left: '-5%',
            opacity: 0.08,
          }}
        />
      </div>

      {/* Logo top */}
      <div className="relative px-6 pt-16 pb-4">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '-0.03em',
            fontStyle: 'italic',
          }}
        >
          jinxy
        </h1>
      </div>

      {/* Center illustration */}
      <div className="relative flex-1 flex items-center justify-center px-6">
        <div
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(12px)' : 'translateY(0)',
            transition: 'all 300ms ease',
          }}
        >
          <div className="relative mx-auto" style={{ width: 192, height: 256 }}>
            {/* Back card */}
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background: `linear-gradient(135deg, ${slide.accent}22, ${slide.accent}08)`,
                border: `1px solid ${slide.accent}20`,
                transform: 'rotate(6deg) translateY(8px)',
              }}
            />
            {/* Front card */}
            <div
              className="absolute inset-0 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(26,26,36,0.9), rgba(34,34,47,0.8))',
                border: `1px solid ${slide.accent}30`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${slide.accent}15`,
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${slide.accent}, ${current === 1 ? '#6B21A8' : '#C41751'})`,
                  boxShadow: `0 8px 24px ${slide.accent}50`,
                }}
              >
                {current === 0 && (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 28s-13-7.5-13-16a7 7 0 0114 0 7 7 0 0114 0c0 8.5-15 16-15 16z"
                      fill="white" fillOpacity="0.9" />
                  </svg>
                )}
                {current === 1 && (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="4" y="8" width="24" height="18" rx="3" stroke="white" strokeWidth="2" strokeOpacity="0.9" />
                    <path d="M4 14l12 7 12-7" stroke="white" strokeWidth="2" strokeOpacity="0.9" />
                    <circle cx="24" cy="8" r="5" fill="white" fillOpacity="0.9" />
                  </svg>
                )}
                {current === 2 && (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4C16 4 6 10 6 18a10 10 0 0020 0C26 10 16 4 16 4z"
                      fill="white" fillOpacity="0.9" />
                    <path d="M16 12v8M12 16h8" stroke={slide.accent} strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      <div className="relative px-6 pb-14">
        <div
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            transition: 'all 300ms ease',
          }}
        >
          {/* Label */}
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: slide.accent, fontFamily: 'var(--font-body)' }}
          >
            {slide.label}
          </p>

          {/* Title */}
          <h2
            className="mb-1 leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'rgba(255,255,255,0.95)' }}
          >
            {slide.title}
          </h2>
          <h2
            className="mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: slide.accent, fontStyle: 'italic' }}
          >
            {slide.subtitle}
          </h2>

          {/* Progress dots */}
          <div className="flex gap-2 mb-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === current ? 28 : 6,
                  height: 6,
                  borderRadius: 9999,
                  background: i === current ? slide.accent : 'rgba(255,255,255,0.15)',
                  transition: 'all 300ms ease',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleNext}
            className="w-full font-medium text-base text-white rounded-full mb-4"
            style={{
              fontFamily: 'var(--font-body)',
              padding: '16px 32px',
              background: slide.accent,
              boxShadow: `0 4px 24px ${slide.accent}55`,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
          >
            {current < slides.length - 1 ? 'Continue' : 'Create an account'}
          </button>

          {/* Sign in link */}
          <p
            className="text-center text-sm"
            style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}
          >
            Already have an account?{' '}
            <button
              onClick={handleSignIn}
              style={{
                color: slide.accent,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
              }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
