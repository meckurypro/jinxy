// components/shared/BookingToast.tsx
// Slim toast bar that appears at top of screen when a Jinx responds to a booking.
// Sits above everything (z-60). Tapping it navigates to /jinxes. 
// Auto-dismisses after 8s. User can also swipe up or tap × to dismiss.
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'

interface ToastData {
  message: string
  bookingId: string
}

export function BookingToast() {
  const router = useRouter()
  const { profile } = useUser()
  const [toast, setToast] = useState<ToastData | null>(null)
  const [visible, setVisible] = useState(false)
  const dismissTimer = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // Touch swipe-up to dismiss
  const touchStartY = useRef(0)

  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()

    // Subscribe to new booking_responses for this client's searching bookings
    channelRef.current = supabase
      .channel(`client-booking-responses-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'booking_responses',
        filter: `client_id=eq.${profile.id}`,
      }, (payload) => {
        const data = payload.new as Record<string, unknown>
        if (data.status === 'accepted') {
          showToast('A Jinx is interested in your request! Tap to review.', data.booking_id as string)
        }
      })
      // Also listen for booking_responses where booking belongs to this client
      // via notifications table (more reliable)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        const data = payload.new as Record<string, unknown>
        if (data.type === 'match_found') {
          const notifData = data.data as Record<string, unknown> | null
          const bookingId = notifData?.booking_id as string | undefined
          showToast(data.body as string || 'A Jinx responded to your request!', bookingId ?? '')
        }
      })
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [profile?.id])

  const showToast = (message: string, bookingId: string) => {
    setToast({ message, bookingId })
    // Animate in
    requestAnimationFrame(() => setVisible(true))
    // Auto dismiss after 8s
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(dismiss, 8000) as unknown as NodeJS.Timeout
  }

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => setToast(null), 300) // wait for slide-out animation
  }

  const handleTap = () => {
    dismiss()
    router.push('/jinxes')
  }

  if (!toast) return null

  return (
    <div
      onClick={handleTap}
      onTouchStart={e => { touchStartY.current = e.touches[0].clientY }}
      onTouchEnd={e => {
        const dy = touchStartY.current - e.changedTouches[0].clientY
        if (dy > 40) dismiss() // swipe up to dismiss
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1)',
        paddingTop: 'var(--safe-top, 0px)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        margin: '8px 12px 0',
        padding: '12px 16px',
        background: 'rgba(20,10,30,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 16,
        border: '1px solid rgba(255,45,107,0.25)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,45,107,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Pulsing pink dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--pink)',
            boxShadow: '0 0 8px rgba(255,45,107,0.8)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            background: 'rgba(255,45,107,0.4)',
            animation: 'toast-ping 1.5s ease-out infinite',
          }} />
        </div>

        {/* Message */}
        <p style={{
          flex: 1,
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          color: 'rgba(255,255,255,0.9)',
          lineHeight: 1.4,
        }}>
          {toast.message}
        </p>

        {/* Dismiss */}
        <button
          onClick={e => { e.stopPropagation(); dismiss() }}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes toast-ping {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
