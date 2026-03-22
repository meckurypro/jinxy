'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Dummy story data — replace with real Supabase fetch when stories feature is built
const MOCK_STORIES = [
  { id: '1', username: 'Selena', avatar: null, hasNew: true },
  { id: '2', username: 'Clara', avatar: null, hasNew: true },
  { id: '3', username: 'Fabian', avatar: null, hasNew: false },
  { id: '4', username: 'George', avatar: null, hasNew: true },
  { id: '5', username: 'Amaka', avatar: null, hasNew: false },
]

// Time-aware greeting line pools.
// {name} is replaced at render time with the user's first name or username.
const GREETING_LINES: Record<'morning' | 'afternoon' | 'evening' | 'night', string[]> = {
  morning: [
    "{name}, your next Jinx is up early too.",
    "Good things happen to those who rise, {name}.",
    "{name}, someone nearby is already thinking about you.",
  ],
  afternoon: [
    "{name}, someone's around you.",
    "Your next connection is closer than you think, {name}.",
    "{name}, the vibe is right.",
  ],
  evening: [
    "Good evening, {name}. The night is young.",
    "{name}, love is just around the corner.",
    "The best part of the day starts now, {name}.",
  ],
  night: [
    "{name}, someone's still out there.",
    "Night owl? So is your Jinx, {name}.",
    "Late night energy, {name}. Find your Jinx.",
  ],
}

function getTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function getGreetingLabel(slot: 'morning' | 'afternoon' | 'evening' | 'night'): string {
  const map = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Good night',
  }
  return map[slot]
}

export default function HomePage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)
  const [lineVisible, setLineVisible] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)

  const timeSlot = getTimeSlot()
  const greetingLabel = getGreetingLabel(timeSlot)
  const lines = GREETING_LINES[timeSlot]

  // Fetch display name from public.users (full_name preferred, username fallback)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', user.id)
        .single()
      if (profile) {
        // Use first word of full_name if available, else username
        const name = profile.full_name
          ? profile.full_name.trim().split(' ')[0]
          : profile.username
        setDisplayName(name)
      }
    })

    // Simulate map load
    const t = setTimeout(() => setMapLoaded(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Cycle through greeting lines every 20 minutes with a fade transition.
  // Only starts after the display name has loaded so the first line always
  // shows the correct name for its full duration.
  useEffect(() => {
    if (!displayName || lines.length <= 1) return
    const interval = setInterval(() => {
      // Fade out
      setLineVisible(false)
      setTimeout(() => {
        setLineIndex(i => (i + 1) % lines.length)
        // Fade back in
        setLineVisible(true)
      }, 400)
    }, 20 * 60 * 1000) // 20 minutes
    return () => clearInterval(interval)
  }, [displayName, lines.length])

  const currentLine = lines[lineIndex].replace('{name}', displayName || 'you')

  return (
    <div className="relative w-full" style={{ minHeight: '100dvh' }}>

      {/* FULL BLEED MAP */}
      <div
        ref={mapRef}
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: mapLoaded ? 1 : 0 }}
      >
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(160deg, #0f1923 0%, #0a1520 50%, #0d1a2e 100%)',
          }}
        >
          {/* Map grid lines */}
          <svg
            className="absolute inset-0 w-full h-full opacity-20"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Fake road lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', opacity: 0.15 }}>
            <path d="M 0 300 Q 200 280 400 310 T 800 290" stroke="#4A90B8" strokeWidth="3" fill="none" />
            <path d="M 50 0 Q 80 200 60 400 T 80 800" stroke="#4A90B8" strokeWidth="2" fill="none" />
            <path d="M 0 450 Q 150 430 300 460 T 600 440" stroke="#4A90B8" strokeWidth="2" fill="none" />
            <path d="M 200 0 Q 220 150 210 300 T 230 600" stroke="#888" strokeWidth="1.5" fill="none" />
          </svg>

          {/* Activity pins */}
          {[
            { x: '30%', y: '35%', type: 'active' },
            { x: '60%', y: '45%', type: 'active' },
            { x: '45%', y: '60%', type: 'active' },
            { x: '70%', y: '30%', type: 'inactive' },
          ].map((pin, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: pin.x, top: pin.y, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: pin.type === 'active'
                    ? 'rgba(255, 45, 107, 0.9)'
                    : 'rgba(26, 26, 36, 0.8)',
                  border: '2px solid',
                  borderColor: pin.type === 'active' ? '#FF2D6B' : 'rgba(255,255,255,0.1)',
                  boxShadow: pin.type === 'active' ? '0 0 16px rgba(255,45,107,0.5)' : 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1C7 1 2 4.5 2 8C2 10.76 4.24 13 7 13C9.76 13 12 10.76 12 8C12 4.5 7 1 7 1Z"
                    fill="white"
                    fillOpacity="0.9"
                  />
                </svg>
              </div>
              {pin.type === 'active' && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(255, 45, 107, 0.3)', animationDuration: '2s' }}
                />
              )}
            </div>
          ))}

          {/* User location pin */}
          <div
            className="absolute"
            style={{ left: '50%', top: '55%', transform: 'translate(-50%, -50%)' }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ background: '#4A90E2', boxShadow: '0 0 12px rgba(74,144,226,0.8)' }}
            />
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(74,144,226,0.3)', animationDuration: '2s' }}
            />
          </div>
        </div>
      </div>

      {/* Map loading skeleton */}
      {!mapLoaded && (
        <div className="absolute inset-0 skeleton" />
      )}

      {/* TOP OVERLAY */}
      <div
        className="absolute top-0 left-0 right-0 z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.6) 60%, transparent 100%)',
          paddingTop: 'var(--safe-top)',
        }}
      >
        <div className="px-5 pt-4 pb-2">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <button className="flex flex-col" onClick={() => {}}>
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                <path d="M1 1H21M1 8H21M1 15H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <h1
              className="font-display text-xl"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              jinxy
            </h1>

            <button
              className="relative w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={() => router.push('/notifications')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C7.24 2 5 4.24 5 7V11L3 13V14H17V13L15 11V7C15 4.24 12.76 2 10 2Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 14C8 15.1 8.9 16 10 16C11.1 16 12 15.1 12 14" stroke="white" strokeWidth="1.5" />
              </svg>
              <div
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ background: 'var(--pink)', border: '1.5px solid var(--bg-base)' }}
              />
            </button>
          </div>

          {/* Stories — Jinx stories only, no add button */}
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {MOCK_STORIES.map(story => (
              <button
                key={story.id}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
                onClick={() => router.push(`/story/${story.id}`)}
              >
                <div
                  className="w-14 h-14 rounded-full p-0.5"
                  style={{
                    background: story.hasNew
                      ? 'linear-gradient(135deg, #FF2D6B, #FF6B9D)'
                      : 'rgba(255,255,255,0.15)',
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: `hsl(${parseInt(story.id) * 60}, 50%, 30%)`,
                      border: '2px solid var(--bg-base)',
                    }}
                  >
                    <span className="text-sm font-medium text-white">
                      {story.username[0]}
                    </span>
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                  {story.username}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM OVERLAY */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-5"
        style={{
          background: 'linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.7) 60%, transparent 100%)',
          paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 20px)',
        }}
      >
        {/* Greeting */}
        <div className="mb-4">
          <p
            className="text-xs font-medium mb-0.5"
            style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            {greetingLabel}
          </p>
          {/* Rotating line with fade transition */}
          <p
            className="font-display text-lg"
            style={{
              color: 'var(--text-primary)',
              opacity: lineVisible ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}
          >
            {currentLine}
          </p>
        </div>

        {/* Find a Jinx button */}
        <button
          onClick={() => router.push('/find')}
          className="btn btn-primary btn-full btn-lg animate-glow"
          style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.01em' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C10 2 4 6 4 11C4 14.31 6.69 17 10 17C13.31 17 16 14.31 16 11C16 6 10 2 10 2Z" fill="white" fillOpacity="0.9" />
            <path d="M10 7V13M7.5 10H12.5" stroke="#FF2D6B" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Find a Jinx
        </button>

        <p className="text-xs text-center mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Showing available Jinxes near you
        </p>
      </div>
    </div>
  )
}
