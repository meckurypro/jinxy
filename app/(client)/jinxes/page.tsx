'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatRelativeTime, formatCurrency } from '@/lib/utils'

type Filter = 'all' | 'ongoing' | 'completed' | 'missed'

interface Booking {
  id: string
  status: string
  duration_tier: string
  total_charged: number
  created_at: string
  scheduled_at: string | null
  jinx: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

const STATUS_TAG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Ongoing',   color: '#00D97E', bg: 'rgba(0,217,126,0.1)' },
  confirmed: { label: 'Ongoing',   color: '#FFB800', bg: 'rgba(255,184,0,0.1)' },
  completed: { label: 'Completed', color: '#5C5875', bg: 'rgba(92,88,117,0.1)' },
  cancelled: { label: 'Missed',    color: '#FF4D6A', bg: 'rgba(255,77,106,0.1)' },
  disputed:  { label: 'Disputed',  color: '#FF8A00', bg: 'rgba(255,138,0,0.1)' },
}

const FILTERS: Filter[] = ['all', 'ongoing', 'completed', 'missed']

// Inline skeleton — no external component needed
function BookingsSkeleton() {
  return (
    <div className="space-y-3 mt-3">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="w-full flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="rounded-full flex-shrink-0"
            style={{ width: 48, height: 48, background: 'var(--bg-elevated)' }}
          />
          <div className="flex-1 space-y-2">
            <div style={{ height: 12, width: '40%', background: 'var(--bg-elevated)', borderRadius: 6 }} />
            <div style={{ height: 10, width: '25%', background: 'var(--bg-elevated)', borderRadius: 6 }} />
          </div>
          <div className="text-right space-y-2">
            <div style={{ height: 12, width: 60, background: 'var(--bg-elevated)', borderRadius: 6 }} />
            <div style={{ height: 10, width: 40, background: 'var(--bg-elevated)', borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function JinxesPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [filter, setFilter] = useState<Filter>('all')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) fetchBookings()
  }, [profile?.id])

  const fetchBookings = async () => {
    if (!profile?.id) return
    setLoading(true)

    const { data } = await supabase
      .from('bookings')
      .select(`
        id, status, duration_tier, total_charged, created_at, scheduled_at,
        jinx:users!bookings_jinx_id_fkey (
          id, username, full_name, avatar_url
        )
      `)
      .eq('client_id', profile.id)
      .not('jinx_id', 'is', null)
      .order('created_at', { ascending: false })

    if (data) setBookings(data as unknown as Booking[])
    setLoading(false)
  }

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true
    if (filter === 'ongoing') return ['active', 'confirmed'].includes(b.status)
    if (filter === 'completed') return b.status === 'completed'
    if (filter === 'missed') return b.status === 'cancelled'
    return true
  })

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <h1
          className="font-display text-2xl mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          My Jinxes
        </h1>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium capitalize flex-shrink-0 transition-all duration-200"
              style={{
                background: filter === f ? 'var(--pink)' : 'var(--bg-elevated)',
                color: filter === f ? 'white' : 'var(--text-muted)',
                border: `1px solid ${filter === f ? 'var(--pink)' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-6">
        {loading ? (
          <BookingsSkeleton />
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {/* Empty icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path
                  d="M14 4C14 4 6 9 6 15C6 19.42 9.58 23 14 23C18.42 23 22 19.42 22 15C22 9 14 4 14 4Z"
                  stroke="var(--text-muted)" strokeWidth="1.5" fill="none"
                />
                <path d="M14 10V16M11 13H17" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p
              className="font-display text-xl mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {filter === 'all' ? 'No Jinxes yet.' : `No ${filter} Jinxes.`}
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
            >
              {filter === 'all' ? 'The night is young.' : 'Try a different filter.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/find')}
                className="px-6 py-3 rounded-full text-sm font-medium text-white"
                style={{
                  background: 'var(--pink)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
                }}
              >
                Find a Jinx
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {filteredBookings.map(booking => {
              const tag = STATUS_TAG[booking.status] ?? STATUS_TAG.completed
              return (
                <button
                  key={booking.id}
                  onClick={() => router.push(`/jinxes/${booking.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-200"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Avatar
                    src={booking.jinx?.avatar_url}
                    name={booking.jinx?.full_name || booking.jinx?.username || 'J'}
                    size={48}
                    showStatus={booking.status === 'active'}
                    status="available"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                    >
                      {booking.jinx?.full_name || booking.jinx?.username}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: tag.bg, color: tag.color, fontFamily: 'var(--font-body)' }}
                      >
                        {tag.label}
                      </span>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                      >
                        {formatRelativeTime(booking.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}
                    >
                      {formatCurrency(booking.total_charged ?? 0)}
                    </p>
                    <p
                      className="text-xs capitalize"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                    >
                      {booking.duration_tier}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
