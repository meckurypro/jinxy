'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'

export default function ConfirmedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const supabase = useSupabase()

  const [booking, setBooking] = useState<Record<string, unknown> | null>(null)
  const [jinx, setJinx] = useState<Record<string, unknown> | null>(null)
  const [client, setClient] = useState<Record<string, unknown> | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!bookingId) { router.replace('/home'); return }
    fetchBooking()
    setTimeout(() => setVisible(true), 100)
  }, [bookingId])

  const fetchBooking = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        jinx:users!bookings_jinx_id_fkey (
          id, username, full_name, avatar_url
        ),
        client:users!bookings_client_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .eq('id', bookingId)
      .single()

    if (data) {
      setBooking(data)
      setJinx(data.jinx as Record<string, unknown>)
      setClient(data.client as Record<string, unknown>)
    }
  }

  const handleSayHello = () => {
    router.push(`/messages/${bookingId}`)
  }

  const handleTrack = () => {
    router.push(`/jinxes/${bookingId}/track`)
  }

  const clientName = (client?.full_name as string)?.split(' ')[0] || 'you'

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#0A0A0F' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,45,107,0.12) 0%, rgba(107,33,168,0.08) 50%, transparent 70%)',
        }}
      />

      {/* Confetti particles */}
      {visible && Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
          style={{
            background: i % 3 === 0 ? 'var(--pink)' : i % 3 === 1 ? '#9333EA' : '#FFB800',
            left: `${10 + Math.random() * 80}%`,
            top: `${Math.random() * 60}%`,
            animation: `confetti-fall ${1 + Math.random() * 2}s ease-out ${Math.random() * 0.5}s both`,
            opacity: 0,
          }}
        />
      ))}

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center px-8 text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Overlapping avatars */}
        <div className="relative flex items-center justify-center mb-8" style={{ height: 80 }}>
          {/* Client avatar */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-80px)',
              zIndex: 1,
            }}
          >
            <Avatar
              src={client?.avatar_url as string | null}
              name={(client?.full_name as string) || (client?.username as string) || 'C'}
              size={64}
              showRing
            />
          </div>

          {/* Heart */}
          <div
            className="absolute z-10 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--pink)',
              boxShadow: '0 0 20px rgba(255,45,107,0.6)',
              animation: 'heartbeat 2s ease-in-out infinite',
            }}
          >
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
              <path d="M7 11S1 7 1 4a3 3 0 016 0 3 3 0 016 0c0 3-6 7-6 7z"
                fill="white" />
            </svg>
          </div>

          {/* Jinx avatar */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(16px)',
              zIndex: 1,
            }}
          >
            <Avatar
              src={jinx?.avatar_url as string | null}
              name={(jinx?.full_name as string) || (jinx?.username as string) || 'J'}
              size={64}
              showRing
            />
          </div>
        </div>

        {/* Title */}
        <h1
          className="font-display text-4xl mb-3"
          style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}
        >
          It's a Jinx,{' '}
          <span style={{ color: 'var(--pink)', fontStyle: 'italic' }}>
            {clientName}!
          </span>
        </h1>

        <p
          className="text-sm mb-10"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
        >
          Start a conversation now with each other
        </p>

        {/* CTAs */}
        <div className="w-full space-y-3">
          <button
            onClick={handleSayHello}
            className="w-full py-4 rounded-full text-base font-semibold text-white"
            style={{
              background: 'var(--pink)',
              boxShadow: '0 4px 24px rgba(255,45,107,0.45)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Say hello 👋
          </button>

          <button
            onClick={handleTrack}
            className="w-full py-4 rounded-full text-base font-medium"
            style={{
              background: 'transparent',
              border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Track
          </button>
        </div>

        {/* Go home */}
        <button
          onClick={() => router.replace('/home')}
          className="mt-6 text-sm"
          style={{
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Back to home
        </button>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(180deg); opacity: 0; }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14%       { transform: scale(1.2); }
          28%       { transform: scale(1); }
          42%       { transform: scale(1.1); }
          70%       { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
