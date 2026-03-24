// app/(jinx)/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'

interface JinxProfile {
  is_active: boolean
  status: 'online' | 'offline' | 'busy'
  min_hourly_rate: number
  average_rating: number
  total_jinxes: number
  kyc_status: string
  operating_area: string | null
  is_premium: boolean
}

interface DashboardStats {
  pending_requests: number
  active_session: boolean
  earnings_this_month: number
  total_earnings: number
}

function Shimmer({ width, height, rounded = 8 }: { width: string | number; height: number; rounded?: number }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'rgba(147,51,234,0.08)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

export default function JinxDashboardPage() {
  const router = useRouter()
  const { profile, refresh } = useUser()
  const supabase = useSupabase()

  const [jinxProfile, setJinxProfile] = useState<JinxProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [switchingMode, setSwitchingMode] = useState(false)

  useEffect(() => {
    if (profile?.id) fetchData()
  }, [profile?.id])

  const fetchData = async () => {
    if (!profile?.id) return
    setLoading(true)

    const [jpRes, pendingRes, earningsRes] = await Promise.all([
      supabase.from('jinx_profiles').select(
        'is_active, status, min_hourly_rate, average_rating, total_jinxes, kyc_status, operating_area, is_premium'
      ).eq('user_id', profile.id).maybeSingle(),

      supabase.from('booking_responses').select('*', { count: 'exact', head: true })
        .eq('jinx_id', profile.id).eq('status', 'notified'),

      supabase.from('payments').select('amount')
        .eq('payee_id', profile.id)
        .eq('payment_status', 'completed')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])

    if (jpRes.data) setJinxProfile(jpRes.data as JinxProfile)

    const monthEarnings = (earningsRes.data ?? []).reduce((s: number, p: Record<string, unknown>) => s + (p.amount as number), 0)
    setStats({
      pending_requests: pendingRes.count ?? 0,
      active_session: false,
      earnings_this_month: monthEarnings,
      total_earnings: 0,
    })

    setLoading(false)
  }

  // Toggle online/offline status
  const handleToggleStatus = async () => {
    if (!profile?.id || togglingStatus) return
    if (jinxProfile?.kyc_status !== 'verified') {
      // KYC not done — show info (placeholder for now)
      alert('Complete KYC verification before going online.')
      return
    }
    setTogglingStatus(true)
    const newStatus = jinxProfile?.status === 'online' ? 'offline' : 'online'
    const { error } = await supabase
      .from('jinx_profiles')
      .update({ status: newStatus, is_active: newStatus === 'online' })
      .eq('user_id', profile.id)
    if (!error) {
      setJinxProfile(prev => prev ? { ...prev, status: newStatus as 'online' | 'offline', is_active: newStatus === 'online' } : prev)
    }
    setTogglingStatus(false)
  }

  // Switch back to client mode
  const handleSwitchToClient = async () => {
    if (!profile?.id || switchingMode) return
    setSwitchingMode(true)
    const { error } = await supabase
      .from('users')
      .update({ current_mode: 'client' })
      .eq('id', profile.id)
    if (!error) {
      await refresh()
      router.replace('/home')
    } else {
      setSwitchingMode(false)
    }
  }

  const isOnline = jinxProfile?.status === 'online'

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Purple top glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 30% at 50% 0%, rgba(147,51,234,0.08) 0%, transparent 50%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: 'rgba(147,51,234,0.7)', fontFamily: 'var(--font-body)' }}>
              Jinx Mode
            </p>
            <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
              {loading ? 'Loading...' : `Hey, ${profile?.full_name?.split(' ')[0] || profile?.username}`}
            </h1>
          </div>
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || 'J'}
            size={44}
          />
        </div>

        {/* Online toggle card */}
        <div className="p-4 rounded-2xl mb-4"
          style={{
            background: isOnline
              ? 'linear-gradient(135deg, rgba(0,217,126,0.08), rgba(0,180,100,0.04))'
              : 'var(--bg-surface)',
            border: `1.5px solid ${isOnline ? 'rgba(0,217,126,0.25)' : 'var(--border)'}`,
            transition: 'all 300ms ease',
          }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-0.5"
                style={{
                  color: isOnline ? '#00D97E' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  transition: 'color 300ms ease',
                }}>
                {loading ? '...' : isOnline ? 'You\'re online' : 'You\'re offline'}
              </p>
              <p className="text-xs"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {isOnline
                  ? 'Clients can find and book you'
                  : 'Go online to start receiving bookings'}
              </p>
            </div>
            {loading ? (
              <Shimmer width={52} height={28} rounded={14} />
            ) : (
              <button onClick={handleToggleStatus} disabled={togglingStatus}
                style={{
                  width: 52, height: 28, borderRadius: 14,
                  background: isOnline ? '#00D97E' : 'var(--bg-elevated)',
                  border: `1px solid ${isOnline ? '#00D97E' : 'var(--border)'}`,
                  cursor: togglingStatus ? 'not-allowed' : 'pointer',
                  position: 'relative', transition: 'all 300ms ease',
                  opacity: togglingStatus ? 0.6 : 1,
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3,
                  left: isOnline ? 27 : 3,
                  transition: 'left 300ms ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            )}
          </div>
        </div>

        {/* KYC pending banner */}
        {!loading && jinxProfile?.kyc_status !== 'verified' && (
          <div className="p-3 rounded-xl mb-4 flex items-center gap-3"
            style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div className="flex-1">
              <p className="text-xs font-medium"
                style={{ color: '#FFB800', fontFamily: 'var(--font-body)' }}>
                KYC verification pending
              </p>
              <p className="text-xs"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Complete verification to go online and receive bookings
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="px-5 mb-5">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Pending requests',
              value: loading ? null : stats?.pending_requests ?? 0,
              color: (stats?.pending_requests ?? 0) > 0 ? '#9333EA' : 'var(--text-primary)',
              action: () => router.push('/jinx/requests'),
              tappable: true,
            },
            {
              label: 'This month',
              value: loading ? null : formatCurrency(stats?.earnings_this_month ?? 0),
              color: 'var(--text-primary)',
              action: () => router.push('/jinx/earnings'),
              tappable: true,
            },
          ].map(stat => (
            <button key={stat.label} onClick={stat.action}
              className="p-4 rounded-2xl text-left"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              {stat.value === null ? (
                <div className="space-y-2">
                  <Shimmer width="60%" height={24} rounded={4} />
                  <Shimmer width="80%" height={12} rounded={4} />
                </div>
              ) : (
                <>
                  <p className="font-display text-2xl mb-1" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {stat.label}
                  </p>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 pb-6 space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Quick actions
        </p>

        {[
          { label: 'View requests',    icon: '📋', action: () => router.push('/jinx/requests'),  badge: stats?.pending_requests },
          { label: 'My schedule',      icon: '📅', action: () => router.push('/jinx/schedule') },
          { label: 'Earnings',         icon: '💰', action: () => router.push('/jinx/earnings') },
          { label: 'Edit Jinx profile',icon: '✏️', action: () => router.push('/jinx/profile') },
        ].map(item => (
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <span className="text-base w-6 text-center">{item.icon}</span>
            <span className="flex-1 text-sm font-medium"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              {item.label}
            </span>
            {item.badge ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: '#9333EA' }}>
                <span style={{ fontSize: 11, color: 'white', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        ))}

        {/* Switch to Client Mode */}
        <button onClick={handleSwitchToClient} disabled={switchingMode}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
          style={{ background: 'transparent', border: '1px solid var(--border)', cursor: switchingMode ? 'not-allowed' : 'pointer', opacity: switchingMode ? 0.6 : 1 }}>
          <span className="text-base w-6 text-center">🔄</span>
          <span className="flex-1 text-sm font-medium"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            {switchingMode ? 'Switching...' : 'Switch to Client Mode'}
          </span>
        </button>
      </div>

      <style jsx>{`
        @keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}
