// app/(client)/find/matching/page.tsx
'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/hooks/useSupabase'

function MatchingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const supabase = useSupabase()

  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'matching' | 'expanding' | 'found'>('matching')
  const [acceptedCount, setAcceptedCount] = useState(0)
  const [declineReasons, setDeclineReasons] = useState<string[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!bookingId) { router.replace('/find'); return }

    intervalRef.current = setInterval(() => {
      setProgress(p => p >= 95 ? p : p + Math.random() * 3)
    }, 400)

    channelRef.current = supabase
      .channel(`booking-responses-${bookingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booking_responses',
        filter: `booking_id=eq.${bookingId}`,
      }, (payload) => {
        if (payload.new && (payload.new as Record<string, unknown>).status === 'accepted') {
          setAcceptedCount(prev => {
            const newCount = prev + 1
            if (newCount >= 2) {
              clearInterval(intervalRef.current!)
              setProgress(100)
              setPhase('found')
              setTimeout(() => router.replace(`/find/matches?booking=${bookingId}`), 1000)
            }
            return newCount
          })
        }
        if (payload.new && (payload.new as Record<string, unknown>).status === 'declined') {
          const reason = (payload.new as Record<string, unknown>).decline_reason as string
          if (reason) setDeclineReasons(prev => [...prev, reason])
        }
      })
      .subscribe()

    const timeout = setTimeout(async () => {
      clearInterval(intervalRef.current!)
      const { data: responses } = await supabase
        .from('booking_responses')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'accepted')

      if (responses && responses.length >= 1) {
        setPhase('found')
        setProgress(100)
        setTimeout(() => router.replace(`/find/matches?booking=${bookingId}`), 1000)
      } else {
        router.replace('/find?error=no_matches')
      }
    }, 3 * 60 * 1000)

    const expandTimer = setTimeout(() => setPhase('expanding'), 30000)

    return () => {
      clearInterval(intervalRef.current!)
      clearTimeout(timeout)
      clearTimeout(expandTimer)
      channelRef.current?.unsubscribe()
    }
  }, [bookingId])

  const phaseText = {
    matching: 'Matching you with a verified Jinx...',
    expanding: 'Expanding your search...',
    found: 'Matches found. Time to choose.',
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#0D0518' }}
    >
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(147,51,234,0.2) 0%, rgba(107,33,168,0.1) 40%, transparent 70%)',
      }} />

      {/* Radar rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="absolute rounded-full border" style={{
            width: `${i * 25}vw`, height: `${i * 25}vw`,
            maxWidth: `${i * 120}px`, maxHeight: `${i * 120}px`,
            borderColor: `rgba(147,51,234,${0.15 - i * 0.03})`,
            animation: `radar-pulse 2.5s ease-out ${i * 0.5}s infinite`,
          }} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Pulsing icon */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(107,33,168,0.2))',
            border: '1.5px solid rgba(147,51,234,0.4)',
            boxShadow: '0 0 40px rgba(147,51,234,0.3)',
            animation: 'glow-pulse 2s ease-in-out infinite',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 32S4 23 4 13a8 8 0 0116 0 8 8 0 0116 0C36 23 18 32 18 32z"
                fill="rgba(147,51,234,0.6)" stroke="rgba(147,51,234,0.9)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6B21A8, #9333EA)' }} />
        </div>

        <p className="text-xs mb-6 font-medium" style={{ color: 'rgba(147,51,234,0.8)', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>
          {Math.round(progress)}% loading
        </p>

        <h2 className="font-display text-2xl text-center mb-3 px-8"
          style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
          {phaseText[phase]}
        </h2>

        {acceptedCount > 0 && (
          <p className="text-sm mb-4" style={{ color: 'rgba(0,217,126,0.9)', fontFamily: 'var(--font-body)' }}>
            {acceptedCount} Jinx{acceptedCount > 1 ? 'es' : ''} interested
          </p>
        )}

        {declineReasons.length > 0 && (
          <div className="mt-2 px-4 py-2 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: 280 }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
              Some Jinxes passed. Consider adjusting your budget.
            </p>
          </div>
        )}

        <p className="text-xs mt-8 text-center px-8" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)' }}>
          Please don't close or minimize this window<br />while we find your match.
        </p>
      </div>

      <button
        onClick={async () => {
          if (bookingId) await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
          router.replace('/find')
        }}
        className="absolute bottom-12 text-sm"
        style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
      >
        Cancel search
      </button>

      <style jsx>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(147,51,234,0.3); }
          50%       { box-shadow: 0 0 60px rgba(147,51,234,0.5); }
        }
        @keyframes radar-pulse {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function MatchingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0D0518' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#9333EA', borderTopColor: 'transparent' }} />
      </div>
    }>
      <MatchingContent />
    </Suspense>
  )
}
