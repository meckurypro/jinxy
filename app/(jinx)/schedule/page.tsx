// app/(jinx)/schedule/page.tsx — unchanged from original, just re-exporting with skeleton
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'

interface ScheduledBooking {
  id: string; status: string; duration_tier: string; duration_hours: number
  agreed_rate: number; vendor_payout: number; scheduled_at: string; session_ends_at: string
  client: { username: string; full_name: string | null; avatar_url: string | null }
}

function Shimmer({ width, height, rounded = 8 }: { width: string | number; height: number; rounded?: number }) {
  return <div style={{ width, height, borderRadius: rounded, background: 'rgba(147,51,234,0.08)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
}

export default function JinxSchedulePage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const [bookings, setBookings] = useState<ScheduledBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) fetchSchedule() }, [profile?.id])

  const fetchSchedule = async () => {
    if (!profile?.id) return
    const { data } = await supabase.from('bookings')
      .select(`id, status, duration_tier, duration_hours, agreed_rate, vendor_payout, scheduled_at, session_ends_at,
        client:users!bookings_client_id_fkey ( username, full_name, avatar_url )`)
      .eq('jinx_id', profile.id).in('status', ['confirmed','active'])
      .order('scheduled_at', { ascending: true })
    if (data) setBookings(data as unknown as ScheduledBooking[])
    setLoading(false)
  }

  const formatSessionTime = (start: string, hours: number) => {
    const s = new Date(start), e = new Date(s.getTime() + hours * 3_600_000)
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
    return `${s.toLocaleTimeString('en-NG', opts)} – ${e.toLocaleTimeString('en-NG', opts)}`
  }

  const formatDay = (date: string) => {
    const d = new Date(date), today = new Date(), tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const grouped = bookings.reduce<Record<string,ScheduledBooking[]>>((acc, b) => {
    const day = formatDay(b.scheduled_at)
    if (!acc[day]) acc[day] = []
    acc[day].push(b); return acc
  }, {})

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(147,51,234,0.06) 0%, transparent 60%)' }} />

      <div className="relative px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Schedule</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Your upcoming Jinxes</p>
      </div>

      <div className="relative px-5 pb-8">
        {loading ? (
          <div className="space-y-4 mt-2">
            {[1,2].map(i => (
              <div key={i}>
                <Shimmer width={80} height={14} rounded={4} />
                <div className="mt-3 space-y-3">
                  <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div className="flex gap-3 items-center">
                      <Shimmer width={48} height={48} rounded={9999} />
                      <div className="flex-1 space-y-2"><Shimmer width="40%" height={14} rounded={5}/><Shimmer width="60%" height={11} rounded={4}/></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="3" y="5" width="22" height="20" rx="3" stroke="var(--text-muted)" strokeWidth="1.5"/>
                <path d="M9 3v4M19 3v4M3 11h22" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>Nothing scheduled.</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Confirmed bookings will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, dayBookings]) => (
              <div key={day}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>{day}</p>
                <div className="space-y-3">
                  {dayBookings.map(booking => (
                    <button key={booking.id} onClick={() => router.push(`/jinx/requests/${booking.id}`)}
                      className="w-full p-4 rounded-2xl text-left"
                      style={{ background: 'var(--bg-surface)', border: booking.status === 'active' ? '1.5px solid rgba(0,217,126,0.3)' : '1px solid var(--border)' }}>
                      <div className="flex items-start gap-3">
                        <Avatar src={booking.client?.avatar_url} name={booking.client?.full_name || booking.client?.username || 'C'} size={48}
                          showStatus={booking.status === 'active'} status="available" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                              {booking.client?.full_name || booking.client?.username}
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: booking.status === 'active' ? 'rgba(0,217,126,0.1)' : 'rgba(255,184,0,0.1)', color: booking.status === 'active' ? '#00D97E' : '#FFB800', fontFamily: 'var(--font-body)' }}>
                              {booking.status === 'active' ? 'In session' : 'Confirmed'}
                            </span>
                          </div>
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                            🕐 {formatSessionTime(booking.scheduled_at, booking.duration_hours)}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                              {booking.duration_tier} · {booking.duration_hours}hr
                            </span>
                            <p className="text-sm font-semibold" style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                              {formatCurrency(booking.vendor_payout ?? 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  )
}
