// app/(jinx)/account/page.tsx
// Jinx-mode account page. Shows jinx profile stats and earnings info.
// Primary CTA is "Switch to Client Mode" using useSwitchMode hook.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useSwitchMode } from '@/lib/hooks/useSwitchMode'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'

interface JinxStats {
  totalJinxes: number
  totalEarnings: number
  averageRating: number
  totalFollowers: number
}

function Shimmer({ width, height, rounded = 8 }: {
  width: string | number
  height: number
  rounded?: number
}) {
  return (
    <div style={{
      width, height, borderRadius: rounded, flexShrink: 0,
      background: 'rgba(147,51,234,0.08)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

export default function JinxAccountPage() {
  const router = useRouter()
  const { profile, loading: profileLoading, refresh } = useUser()
  const supabase = useSupabase()
  const { switchTo, switching } = useSwitchMode()

  const [stats, setStats] = useState<JinxStats | null>(null)

  const isProfileLoading = profileLoading || !profile

  useEffect(() => {
    if (profile?.id) fetchJinxStats()
  }, [profile?.id])

  const fetchJinxStats = async () => {
    if (!profile?.id) return
    const [jinxProfileRes, earningsRes] = await Promise.all([
      supabase
        .from('jinx_profiles')
        .select('total_jinxes, average_rating, total_followers')
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('payments')
        .select('amount', { count: 'exact' })
        .eq('payee_id', profile.id)
        .eq('payment_status', 'released'),
    ])

    const jp = jinxProfileRes.data
    const totalEarnings = (earningsRes.data ?? []).reduce(
      (sum, p) => sum + (p.amount ?? 0), 0
    )

    setStats({
      totalJinxes: jp?.total_jinxes ?? 0,
      totalEarnings,
      averageRating: jp?.average_rating ?? 0,
      totalFollowers: jp?.total_followers ?? 0,
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'jinxy-mode=; path=/; max-age=0'
    document.cookie = 'jinxy-profile-complete=; path=/; max-age=0'
    router.replace('/auth/login')
  }

  interface MenuItem {
    label: string
    icon: string
    action: () => void
    description?: string
    highlight?: boolean
    danger?: boolean
    disabled?: boolean
  }

  interface MenuSection {
    title: string
    items: MenuItem[]
  }

  const menuSections: MenuSection[] = [
    {
      title: 'Mode',
      items: [
        {
          label: switching ? 'Switching...' : 'Switch to Client Mode',
          icon: '🔄',
          action: () => switchTo('client'),
          highlight: true,
          description: 'Browse and book Jinxes',
          disabled: switching,
        },
      ],
    },
    {
      title: 'Jinx Profile',
      items: [
        { label: 'Edit Jinx profile',     icon: '✏️', action: () => router.push('/jinx/profile/edit') },
        { label: 'Availability',          icon: '📅', action: () => router.push('/jinx/availability') },
        { label: 'Non-negotiables',       icon: '🚫', action: () => router.push('/jinx/non-negotiables') },
        { label: 'KYC verification',      icon: '🪪', action: () => router.push('/jinx/kyc') },
      ],
    },
    {
      title: 'Earnings',
      items: [
        { label: 'Earnings & payouts',    icon: '💸', action: () => router.push('/jinx/earnings') },
        { label: 'Referrals & Credits',   icon: '💰', action: () => router.push('/jinx/referrals') },
        { label: 'My subscription',       icon: '⭐', action: () => router.push('/jinx/subscription') },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Edit profile',          icon: '👤', action: () => router.push('/jinx/account/edit') },
        { label: 'Appearance & security', icon: '🔒', action: () => router.push('/jinx/account/settings') },
        { label: 'Privacy',               icon: '🛡️', action: () => router.push('/jinx/account/settings?section=privacy') },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help & support',        icon: '💬', action: () => router.push('/jinx/help') },
        { label: 'Terms & policies',      icon: '📄', action: () => router.push('/jinx/terms') },
        { label: 'Report a problem',      icon: '🚩', action: () => router.push('/jinx/report') },
      ],
    },
    {
      title: 'Actions',
      items: [
        { label: 'Log out', icon: '👋', action: handleSignOut, danger: true },
      ],
    },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Purple tint */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(147,51,234,0.08) 0%, transparent 60%)',
      }} />

      {/* ── Profile header ─────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-14 pb-6">
        <div className="flex items-center gap-4 mb-5">
          {isProfileLoading ? (
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(147,51,234,0.08)',
              animation: 'skeleton-pulse 1.5s ease-in-out infinite',
            }} />
          ) : (
            <Avatar
              src={profile?.avatar_url ?? null}
              name={profile?.full_name || profile?.username || 'J'}
              size={72}
            />
          )}

          <div className="flex-1 min-w-0">
            {isProfileLoading ? (
              <div className="space-y-2">
                <Shimmer width="60%" height={20} rounded={6} />
                <Shimmer width="40%" height={14} rounded={4} />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile?.full_name || profile?.username || '—'}
                  </h1>
                  {/* Always show Jinx badge in jinx mode */}
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{ background: 'rgba(147,51,234,0.15)', color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                    Jinx
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  @{profile?.username}
                </p>
              </>
            )}
          </div>

          {!isProfileLoading && (
            <button onClick={() => router.push('/jinx/moments')}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>
              Moments
            </button>
          )}
        </div>

        {/* Jinx stats */}
        <div className="grid grid-cols-4 gap-0 rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {stats === null ? (
            [0, 1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center py-4 gap-2"
                style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <Shimmer width={32} height={20} rounded={4} />
                <Shimmer width={36} height={10} rounded={3} />
              </div>
            ))
          ) : (
            <>
              {[
                { value: stats.totalJinxes,                    label: 'Jinxes' },
                { value: formatCurrency(stats.totalEarnings),  label: 'Earned' },
                { value: stats.averageRating.toFixed(1),       label: 'Rating' },
                { value: stats.totalFollowers,                 label: 'Followers' },
              ].map((stat, i) => (
                <div key={stat.label} className="flex flex-col items-center py-4"
                  style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <p className="text-base font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
                    {stat.value}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Credits */}
        {!isProfileLoading && (profile?.jinxy_credits ?? 0) > 0 && (
          <button onClick={() => router.push('/jinx/referrals')}
            className="w-full flex items-center justify-between p-3 rounded-xl mb-2"
            style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)', cursor: 'pointer' }}>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                Jinxy Credits
              </p>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
              {formatCurrency(profile?.jinxy_credits ?? 0)}
            </p>
          </button>
        )}
      </div>

      {/* ── Menu sections ──────────────────────────────────────────────────── */}
      <div className="relative px-5 pb-8 space-y-6">
        {menuSections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {section.title}
            </p>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {section.items.map((item, idx) => (
                <button key={item.label} onClick={item.action} disabled={item.disabled}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderBottom: idx < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'transparent',
                  }}>
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block" style={{
                      color: item.danger ? 'var(--red)' : item.highlight ? '#9333EA' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="text-xs block mt-0.5"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        {item.description}
                      </span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
