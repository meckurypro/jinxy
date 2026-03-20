'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

interface BookingRequest {
  id: string
  response_id: string
  status: string
  duration_tier: string
  duration_hours: number
  client_budget: number
  client_location_text: string | null
  is_adult: boolean
  created_at: string
  client: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

const TIER_HOURS: Record<string, number> = {
  ruby: 1, emerald: 3, gold: 6, platinum: 12, topaz: 24, diamond: 48,
}

export default function JinxRequestsPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.id) fetchRequests()
  }, [profile?.id])

  const fetchRequests = async () => {
    if (!profile?.id) return

    const { data } = await supabase
      .from('booking_responses')
      .select(`
        id,
        status,
        bookings!inner (
          id, duration_tier, duration_hours, client_budget,
          client_location_text, is_adult, created_at,
          client:users!bookings_client_id_fkey (
            id, username, full_name, avatar_url
          )
        )
      `)
      .eq('jinx_id', profile.id)
      .in('status', ['notified', 'accepted'])
      .order('created_at', { ascending: false })

    if (data) {
      const mapped: BookingRequest[] = data.map((r: Record<string, unknown>) => {
        const booking = r.bookings as Record<string, unknown>
        return {
          id: booking.id as string,
          response_id: r.id as string,
          status: r.status as string,
          duration_tier: booking.duration_tier as string,
          duration_hours: booking.duration_hours as number,
          client_budget: booking.client_budget as number,
          client_location_text: booking.client_location_text as string | null,
          is_adult: booking.is_adult as boolean,
          created_at: booking.created_at as string,
          client: booking.client as BookingRequest['client'],
        }
      })
      setRequests(mapped)
    }

    setLoading(false)
  }

  const handleRespond = async (responseId: string, bookingId: string, accept: boolean) => {
    setResponding(responseId)

    const { error } = await supabase
      .from('booking_responses')
      .update({
        status: accept ? 'accepted' : 'declined',
        decline_reason: accept ? null : 'not_available',
        responded_at: new Date().toISOString(),
      })
      .eq('id', responseId)

    if (!error) {
      setRequests(prev =>
        prev.map(r =>
          r.response_id === responseId
            ? { ...r, status: accept ? 'accepted' : 'declined' }
            : r
        )
      )
    }

    setResponding(null)
  }

  const pendingRequests = requests.filter(r => r.status === 'notified')
  const acceptedRequests = requests.filter(r => r.status === 'accepted')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(147,51,234,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
          Requests
        </h1>
        {pendingRequests.length > 0 && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            {pendingRequests.length} new request{pendingRequests.length > 1 ? 's' : ''} waiting
          </p>
        )}
      </div>

      <div className="relative px-5 pb-8 space-y-6">

        {/* Pending */}
        {pendingRequests.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
              New Requests
            </p>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div
                  key={req.response_id}
                  className="p-4 rounded-2xl"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1.5px solid rgba(147,51,234,0.2)',
                  }}
                >
                  {/* Client info */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar
                      src={req.client?.avatar_url}
                      name={req.client?.full_name || req.client?.username || 'C'}
                      size={48}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                        {req.client?.full_name || req.client?.username}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        {formatRelativeTime(req.created_at)}
                      </p>
                    </div>
                    {req.is_adult && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(255,45,107,0.1)', color: 'var(--pink)', fontFamily: 'var(--font-body)' }}
                      >
                        18+
                      </span>
                    )}
                  </div>

                  {/* Request details */}
                  <div
                    className="grid grid-cols-2 gap-2 p-3 rounded-xl mb-4"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    {[
                      { label: 'Duration', value: `${req.duration_tier} · ${req.duration_hours}hr` },
                      { label: 'Budget/hr', value: formatCurrency(req.client_budget) },
                      { label: 'Location', value: req.client_location_text || 'Lagos' },
                      { label: 'Your cut', value: formatCurrency(req.client_budget * 0.88) },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                          {item.label}
                        </p>
                        <p className="text-sm font-medium capitalize"
                          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(req.response_id, req.id, false)}
                      disabled={responding === req.response_id}
                      className="flex-1 py-3 rounded-full text-sm font-medium"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespond(req.response_id, req.id, true)}
                      disabled={responding === req.response_id}
                      className="flex-1 py-3 rounded-full text-sm font-semibold text-white"
                      style={{
                        background: '#9333EA',
                        boxShadow: '0 4px 16px rgba(147,51,234,0.4)',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        opacity: responding === req.response_id ? 0.7 : 1,
                      }}
                    >
                      {responding === req.response_id ? '...' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted — waiting for client */}
        {acceptedRequests.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Waiting for client
            </p>
            <div className="space-y-3">
              {acceptedRequests.map(req => (
                <div
                  key={req.response_id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <Avatar
                    src={req.client?.avatar_url}
                    name={req.client?.full_name || req.client?.username || 'C'}
                    size={44}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {req.client?.full_name || req.client?.username}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {req.duration_tier} · Waiting for selection
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded-full text-xs"
                    style={{ background: 'rgba(255,184,0,0.1)', color: '#FFB800', fontFamily: 'var(--font-body)' }}
                  >
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
              No requests yet.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Go online to start receiving requests.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
