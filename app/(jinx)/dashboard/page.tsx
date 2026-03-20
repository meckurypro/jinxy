'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { StatusToggle } from '@/components/jinx/StatusToggle'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

interface RecentBooking {
  id: string
  status: string
  duration_tier: string
  vendor_payout: number
  created_at: string
  client: { username: string; full_name: string | null; avatar_url: string | null }
}

export default function JinxDashboardPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [jinxProfile, setJinxProfile] = useState<Record<string, unknown> | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [pendingRequests, setPendingRequests] = useState(0)
  const [monthlyEarnings, setMonthlyEarnings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) fetchData()
  }, [profile?.id])

  const fetchData = async () => {
    if (!profile?.id) return

    // Fetch jinx profile
    const { data: jp } = await supabase
      .from('jinx_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .single()

    setJinxProfile(jp)

    // Fetch pending requests
    const { count } = await supabase
      .from('booking_responses')
      .select('*', { count: 'exact', head: true })
      .eq('jinx_id', profile.id)
      .eq('status', 'notified')

    setPendingRequests(count ?? 0)

    // Fetch recent bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id, status, duration_tier, vendor_payout, created_at,
        client:users!bookings_client_id_fkey (
          username, full_name, avatar_url
        )
      `)
      .eq('jinx_id', profile.id)
      .in('status', ['completed', 'active', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(5)

    if (bookings) setRecentBookings(bookings as unknown as RecentBooking[])

    // Monthly earnings
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('payee_id', profile.id)
      .eq('transaction_type', 'vendor_payout')
      .gte('created_at', startOfMonth.toISOString())

    const total = (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
    setMonthlyEarnings(total)

    setLoading(false)
  }

  const statusValue = (jinxProfile?.status as string ?? 'offline') as
    'offline' | 'available' | 'busy' | 'unavailable'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      {/* Background glow — purple for jinx mode */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(147,51,234,0.08) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-0.5"
              style={{ color: 'rgba(147,51,234,0.8)', fontFamily: 'var(--font-body)' }}>
              {greeting}
            </p>
            <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name?.split(' ')[0] || profile?.username || 'Jinx'}
            </h1>
          </div>
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || 'J'}
            size={44}
            onClick={() => router.push('/account')}
          />
        </div>

        {/* Status toggle */}
        {profile?.id && (
          <StatusToggle
            userId={profile.id}
            initialStatus={statusValue}
            onStatusChange={() => fetchData()}
          />
        )}
      </div>

      {/* Stats row */}
      <div className="relative px-5 mt-5 grid grid-cols-3 gap-3">
        {[
          {
            label: 'This month',
            value: formatCurrency(monthlyEarnings),
            sub: 'Earnings',
            color: '#9333EA',
          },
          {
            label: 'Total',
            value: jinxProfile?.total_jinxes?.toString() ?? '0',
            sub: 'Jinxes',
            color: 'var(--pink)',
          },
          {
            label: 'Rating',
            value: (jinxProfile?.average_rating as number) > 0
              ? (jinxProfile?.average_rating as number).toFixed(1)
              : '—',
            sub: '/ 5.0',
            color: '#FFB800',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="p-3 rounded-2xl text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {stat.label}
            </p>
            <p className="text-base font-semibold" style={{ color: stat.color, fontFamily: 'var(--font-body)' }}>
              {stat.value}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Pending requests banner */}
      {pendingRequests > 0 && (
        <button
          onClick={() => router.push('/jinx/requests')}
          className="relative mx-5 mt-4 w-[calc(100%-40px)] p-4 rounded-2xl flex items-center justify-between"
          style={{
            background: 'rgba(147,51,234,0.1)',
            border: '1.5px solid rgba(147,51,234,0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(147,51,234,0.2)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 3h3L10 6l1 3-3-2-3 2 1-3-2.5-2H6.5L8 1z"
                  fill="#9333EA" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                {pendingRequests} new request{pendingRequests > 1 ? 's' : ''}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Tap to view and respond
              </p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="#9333EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Recent activity */}
      <div className="relative px-5 mt-6 pb-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Recent Jinxes
        </p>

        {recentBookings.length === 0 ? (
          <div
            className="p-8 rounded-2xl text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <p className="font-display text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>
              No Jinxes yet.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Go online to start receiving requests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBookings.map(booking => (
              <button
                key={booking.id}
                onClick={() => router.push(`/jinx/requests/${booking.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <Avatar
                  src={booking.client?.avatar_url}
                  name={booking.client?.full_name || booking.client?.username || 'C'}
                  size={44}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {booking.client?.full_name || booking.client?.username}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {booking.duration_tier} · {formatRelativeTime(booking.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold"
                    style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                    {formatCurrency(booking.vendor_payout ?? 0)}
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: booking.status === 'completed'
                        ? 'rgba(0,217,126,0.1)' : 'rgba(255,184,0,0.1)',
                      color: booking.status === 'completed' ? '#00D97E' : '#FFB800',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {booking.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
