// app/(jinx)/account/page.tsx
// Jinx-mode account page. Shows Jinx stats, profile info, and Jinx-specific menu.
// "Switch to Client Mode" is prominent here too.
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'

interface JinxStats { total_jinxes: number; average_rating: number; total_earnings: number }

function Shimmer({ width, height, rounded = 8 }: { width: string | number; height: number; rounded?: number }) {
  return <div style={{ width, height, borderRadius: rounded, background: 'rgba(147,51,234,0.08)', animation: 'skeleton-pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
}

export default function JinxAccountPage() {
  const router = useRouter()
  const { profile, loading: profileLoading, refresh } = useUser()
  const supabase = useSupabase()
  const [stats, setStats] = useState<JinxStats | null>(null)
  const [switching, setSwitching] = useState(false)

  const isLoading = profileLoading || !profile

  useEffect(() => { if (profile?.id) fetchStats() }, [profile?.id])

  const fetchStats = async () => {
    if (!profile?.id) return
    const [jpRes, earningsRes] = await Promise.all([
      supabase.from('jinx_profiles').select('total_jinxes, average_rating').eq('user_id', profile.id).maybeSingle(),
      supabase.from('payments').select('amount').eq('payee_id', profile.id).eq('payment_status', 'completed').eq('transaction_type', 'vendor_payout'),
    ])
    const totalEarnings = (earningsRes.data ?? []).reduce((s, p) => s + ((p as Record<string,unknown>).amount as number ?? 0), 0)
    setStats({ total_jinxes: jpRes.data?.total_jinxes ?? 0, average_rating: jpRes.data?.average_rating ?? 0, total_earnings: totalEarnings })
  }

  const handleSwitchToClient = async () => {
    if (!profile?.id || switching) return
    setSwitching(true)
    const { error } = await supabase.from('users').update({ current_mode: 'client' }).eq('id', profile.id)
    if (!error) { await refresh(); router.replace('/home') } else setSwitching(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'jinxy-profile-complete=; path=/; max-age=0'
    router.replace('/auth/login')
  }

  const menuSections = [
    {
      title: 'Jinx Profile',
      items: [
        { label: 'Edit Jinx profile',  icon: '✏️', action: () => router.push('/jinx/profile/edit') },
        { label: 'Availability',       icon: '📅', action: () => router.push('/jinx/schedule') },
        { label: 'Non-negotiables',    icon: '🚫', action: () => router.push('/jinx/profile/non-negotiables') },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Edit personal profile', icon: '👤', action: () => router.push('/account/edit') },
        { label: 'Security',              icon: '🔒', action: () => router.push('/account/settings') },
        { label: 'Moments',               icon: '📸', action: () => router.push('/account/moments') },
        { label: 'Notifications',         icon: '🔔', action: () => router.push('/jinx/notifications') },
      ],
    },
    {
      title: 'Earn',
      items: [
        { label: 'Referrals & Credits', icon: '💰', action: () => router.push('/account/referrals') },
        { label: 'Earnings',            icon: '📊', action: () => router.push('/jinx/earnings') },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help & support',   icon: '💬', action: () => router.push('/account/help') },
        { label: 'Terms & policies', icon: '📄', action: () => router.push('/account/terms') },
        { label: 'Report a problem', icon: '🚩', action: () => router.push('/account/report') },
      ],
    },
    {
      title: 'Mode',
      items: [
        { label: switching ? 'Switching...' : 'Switch to Client Mode', icon: '🔄', action: handleSwitchToClient, muted: true, disabled: switching },
        { label: 'Log out', icon: '👋', action: handleSignOut, danger: true },
      ],
    },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(147,51,234,0.06) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-6">
        <div className="flex items-center gap-4 mb-5">
          {isLoading ? (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(147,51,234,0.08)', animation: 'skeleton-pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
          ) : (
            <Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.username || 'J'} size={72} />
          )}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-2"><Shimmer width="60%" height={20} rounded={6}/><Shimmer width="40%" height={14} rounded={4}/></div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile?.full_name || profile?.username || '—'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{ background: 'rgba(147,51,234,0.15)', color: '#9333EA', fontFamily: 'var(--font-body)' }}>Jinx</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>@{profile?.username}</p>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {stats === null ? (
            [0,1,2].map(i => (
              <div key={i} className="flex flex-col items-center py-4 gap-2"
                style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <Shimmer width={32} height={20} rounded={4}/><Shimmer width={48} height={12} rounded={3}/>
              </div>
            ))
          ) : (
            <>
              <div className="flex flex-col items-center py-4" style={{ borderRight: '1px solid var(--border)' }}>
                <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>{stats.total_jinxes}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Jinxes</p>
              </div>
              <div className="flex flex-col items-center py-4" style={{ borderRight: '1px solid var(--border)' }}>
                <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
                  {stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '—'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Rating</p>
              </div>
              <div className="flex flex-col items-center py-4">
                <p className="text-lg font-semibold font-display" style={{ color: '#9333EA' }}>{formatCurrency(stats.total_earnings)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Earned</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="relative px-5 pb-8 space-y-6">
        {menuSections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {section.title}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {section.items.map((item: Record<string,unknown>, idx: number) => (
                <button key={item.label as string}
                  onClick={item.action as () => void}
                  disabled={!!(item.disabled)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 disabled:opacity-50"
                  style={{ borderBottom: idx < section.items.length - 1 ? '1px solid var(--border)' : 'none', background: 'transparent' }}>
                  <span className="text-base w-6 text-center">{item.icon as string}</span>
                  <span className="flex-1 text-sm font-medium" style={{
                    color: item.danger ? 'var(--red)' : item.muted ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}>{item.label as string}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  )
}
