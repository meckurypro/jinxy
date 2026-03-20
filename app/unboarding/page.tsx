'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const slides = [
  {
    id: 'vibe',
    title: 'Vibe',
    subtitle: 'Find the spark.\nFeel the chemistry.',
    image: '/images/onboarding-1.jpg',
    accent: '#FF2D6B',
  },
  {
    id: 'discreet',
    title: 'Discreet',
    subtitle: 'Private by design.\nMutual by choice.',
    image: '/images/onboarding-2.jpg',
    accent: '#9333EA',
  },
  {
    id: 'jinx',
    title: 'Jinx',
    subtitle: "When the connection clicks,\nit's a Jinx.",
    image: '/images/onboarding-3.jpg',
    accent: '#FF2D6B',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [exiting, setExiting] = useState(false)

  const slide = slides[current]

  const handleNext = () => {
    if (current < slides.length - 1) {
      setExiting(true)
      setTimeout(() => {
        setCurrent(c => c + 1)
        setExiting(false)
      }, 300)
    } else {
      handleGetStarted()
    }
  }

  const handleGetStarted = () => {
    localStorage.setItem('jinxy-onboarded', 'true')
    router.push('/auth/signup')
  }

  const handleSignIn = () => {
    localStorage.setItem('jinxy-onboarded', 'true')
    router.push('/auth/login')
  }

  // Swipe support
  useEffect(() => {
    let startX = 0
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX
      if (diff > 60) handleNext()
      if (diff < -60 && current > 0) {
        setExiting(true)
        setTimeout(() => { setCurrent(c => c - 1); setExiting(false) }, 300)
      }
    }
    window.addEventListener('touchstart', onTouchStart)
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [current])

  return (
    <div className="screen screen-content-no-nav overflow-hidden">

      {/* Full-bleed image */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: exiting ? 0 : 1 }}
      >
        {/* Placeholder gradient bg — replace with actual images */}
        <div
          className="absolute inset-0"
          style={{
            background: current === 0
              ? 'linear-gradient(160deg, #1a0510 0%, #3d0a20 40%, #0a0a0f 100%)'
              : current === 1
              ? 'linear-gradient(160deg, #0d0518 0%, #2d0a5e 40%, #0a0a0f 100%)'
              : 'linear-gradient(160deg, #1a0510 0%, #3d0a20 40%, #0a0a0f 100%)',
          }}
        />

        {/* Decorative orb */}
        <div
          className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-20 blur-3xl transition-all duration-700"
          style={{ background: slide.accent }}
        />
        <div
          className="absolute top-40 left-0 w-48 h-48 rounded-full opacity-10 blur-3xl transition-all duration-700"
          style={{ background: current === 1 ? '#9333EA' : '#FF2D6B' }}
        />

        {/* Decorative photo placeholder — editorial layout */}
        <div className="absolute top-16 right-6 w-44 h-56 animate-float">
          <div
            className="w-full h-full rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,45,107,0.3), rgba(107,33,168,0.3))',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">📸</span>
            </div>
          </div>
        </div>

        <div className="absolute top-48 left-6 w-32 h-40 animate-float" style={{ animationDelay: '1s' }}>
          <div
            className="w-full h-full rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(255,45,107,0.2))',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
            }}
          />
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-12">

        {/* Gradient fade up */}
        <div
          className="absolute -top-32 left-0 right-0 h-32"
          style={{
            background: 'linear-gradient(to top, var(--bg-base), transparent)',
          }}
        />

        <div
          className="relative"
          style={{
            opacity: exiting ? 0 : 1,
            transform: exiting ? 'translateY(12px)' : 'translateY(0)',
            transition: 'all 300ms ease',
          }}
        >
          {/* Slide title */}
          <p
            className="text-xs font-body font-medium uppercase tracking-widest mb-2"
            style={{ color: slide.accent }}
          >
            {slide.id}
          </p>

          <h1
            className="font-display text-4xl mb-3"
            style={{
              color: 'var(--text-primary)',
              lineHeight: 1.15,
            }}
          >
            {slide.title}
          </h1>

          <p
            className="font-body text-base mb-8 whitespace-pre-line"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
          >
            {slide.subtitle}
          </p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="transition-all duration-300"
                style={{
                  width: i === current ? 24 : 6,
                  height: 6,
                  borderRadius: 9999,
                  background: i === current ? slide.accent : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleNext}
            className="btn btn-primary btn-full btn-lg mb-4"
            style={{
              background: slide.accent,
              boxShadow: `0 4px 24px ${slide.accent}55`,
            }}
          >
            {current < slides.length - 1 ? 'Continue' : 'Create an account'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <button
              onClick={handleSignIn}
              className="font-medium transition-colors"
              style={{ color: slide.accent }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
