// app/(client)/account/referrals/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'

interface ReferralRecord {
  id: string
  referee_id: string
  is_vendor_referral: boolean
  first_booking_completed: boolean
  credits_awarded: number
  created_at: string
  referee: {
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface FreeJinxReward {
  id: string
  status: 'active' | 'used' | 'expired'
  max_hourly_rate: number
  duration_hours: number
  app_contribution: number
  expires_at: string
  used_at: string | null
  source_jinx: {
    username: string
    full_name: string | null
  }
}

// Shimmer skeleton
function Shimmer({ width, height, rounded = 8 }: {
  width: string | number; height: number; rounded?: number
}) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'rgba(255,255,255,0.06)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor(diff / 3_600_000)
  if (d >= 1) return `${d}d ago`
  if (h >= 1) return `${h}h ago`
  return 'Just now'
}

export default function ReferralsPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [freeRewards, setFreeRewards] = useState<FreeJinxReward[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'client' | 'jinx'>('client')

  const referralCode = profile?.referral_code ?? ''
  const referralLink = `https://jinxy.app/join?ref=${referralCode}`

  // Credits earned from client referrals only
  const clientReferrals = referrals.filter(r => !r.is_vendor_referral)
  const jinxReferrals = referrals.filter(r => r.is_vendor_referral)
  const totalCreditsEarned = clientReferrals.reduce((s, r) => s + (r.credits_awarded ?? 0), 0)
  const activeRewards = freeRewards.filter(r => r.status === 'active')

  useEffect(() => {
    if (profile?.id) fetchData()
  }, [profile?.id])

  const fetchData = async () => {
    if (!profile?.id) return

    const [referralsRes, rewardsRes] = await Promise.all([
      supabase
        .from('referrals')
        .select(`
          id, referee_id, is_vendor_referral,
          first_booking_completed, credits_awarded, created_at,
          referee:users!referrals_referee_id_fkey (
            username, full_name, avatar_url
          )
        `)
        .eq('referrer_id', profile.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('free_jinx_rewards')
        .select(`
          id, status, max_hourly_rate, duration_hours,
          app_contribution, expires_at, used_at,
          source_jinx:users!free_jinx_rewards_source_jinx_id_fkey (
            username, full_name
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),
    ])

    if (referralsRes.data) setReferrals(referralsRes.data as unknown as ReferralRecord[])
    if (rewardsRes.data) setFreeRewards(rewardsRes.data as unknown as FreeJinxReward[])
    setLoading(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
    } catch {
      const el = document.createElement('textarea')
      el.value = referralLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'Join me on Jinxy',
      text: "I've been using Jinxy — on-demand companionship that actually works. Use my link to join.",
      url: referralLink,
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      handleCopy()
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(255,45,107,0.06) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
        </button>
        <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
          Referrals
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Share Jinxy. Earn rewards.
        </p>
      </div>

      <div className="relative px-5 pb-12 space-y-5">

        {/* Active free Jinx reward banner — shown prominently if exists */}
        {!loading && activeRewards.length > 0 && (
          <button
            onClick={() => router.push('/find')}
            className="w-full p-4 rounded-2xl text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(255,45,107,0.15), rgba(147,51,234,0.1))',
              border: '1.5px solid rgba(255,45,107,0.3)',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 20 }}>🎁</span>
                <p className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  You have {activeRewards.length} free Jinx{activeRewards.length > 1 ? 'es' : ''} waiting!
                </p>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'rgba(255,45,107,0.2)', color: 'var(--pink)', fontFamily: 'var(--font-body)' }}
              >
                Tap to use
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              {activeRewards[0] && (
                <>
                  {daysUntil(activeRewards[0].expires_at)} days left ·{' '}
                  2 hours · auto-applied at checkout
                </>
              )}
            </p>
          </button>
        )}

        {/* Credits balance */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,107,0.1), rgba(255,45,107,0.04))',
            border: '1.5px solid rgba(255,45,107,0.15)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1"
                style={{ color: 'rgba(255,45,107,0.7)', fontFamily: 'var(--font-body)' }}>
                Jinxy Credits balance
              </p>
              <p className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>
                {loading ? '—' : formatCurrency(profile?.jinxy_credits ?? 0)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Covers up to 50% of service fee on any booking
              </p>
            </div>
            <span style={{ fontSize: 32 }}>💰</span>
          </div>
        </div>

        {/* Referral link */}
        <div className="p-4 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Your referral link
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl mb-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="flex-1 text-sm truncate"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              {loading ? '...' : referralLink}
            </p>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all duration-200"
              style={{
                background: copied ? 'rgba(0,217,126,0.15)' : 'var(--bg-overlay)',
                color: copied ? '#00D97E' : 'var(--text-secondary)',
                border: `1px solid ${copied ? 'rgba(0,217,126,0.2)' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{
              background: 'var(--pink)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 2a2 2 0 100 4 2 2 0 000-4zM4 6a2 2 0 100 4 2 2 0 000-4zM12 10a2 2 0 100 4 2 2 0 000-4z"
                stroke="white" strokeWidth="1.5" />
              <path d="M5.8 7.4L10.2 5M5.8 8.6l4.4 2.4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Share my link
          </button>
        </div>

        {/* How it works — tabs */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            How it works
          </p>
          <div className="flex rounded-full p-1 mb-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {(['client', 'jinx'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="flex-1 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200"
                style={{
                  background: activeTab === t ? 'var(--pink)' : 'transparent',
                  color: activeTab === t ? 'white' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Refer a {t}
              </button>
            ))}
          </div>

          {activeTab === 'client' && (
            <div className="space-y-3">
              {[
                { step: '1', title: 'Share your link', body: 'Send your referral link to a friend. They sign up and complete KYC.' },
                { step: '2', title: 'They book their first Jinx', body: 'Once their first booking completes, you earn 5% of the service fee as Jinxy Credits — instantly.' },
                { step: '3', title: 'Keep earning', body: 'For every booking they make in the first 3 months, you earn 2% in Credits. No cap on referrals.' },
              ].map(item => (
                <div key={item.step} className="flex gap-4 p-4 rounded-2xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display text-sm"
                    style={{ background: 'rgba(255,45,107,0.12)', color: 'var(--pink)', fontWeight: 600 }}>
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(0,217,126,0.06)', border: '1px solid rgba(0,217,126,0.15)' }}>
                <p className="text-xs" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                  5% on first booking · 2% for 3 months after 🎉
                </p>
              </div>
            </div>
          )}

          {activeTab === 'jinx' && (
            <div className="space-y-3">
              {[
                { step: '1', title: 'Refer someone to become a Jinx', body: 'Share your link with someone who wants to earn on Jinxy. They sign up, complete KYC, and activate Jinx Mode.' },
                { step: '2', title: 'They complete their first session', body: 'Once their first Jinx session is paid out, your reward is automatically unlocked.' },
                { step: '3', title: 'You get a free 2-hour Jinx', body: "Jinxy covers the cost of a 2-hour session within the referred Jinx's price range. Automatically applied next time you book. Valid 60 days." },
              ].map(item => (
                <div key={item.step} className="flex gap-4 p-4 rounded-2xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display text-sm"
                    style={{ background: 'rgba(147,51,234,0.12)', color: '#9333EA', fontWeight: 600 }}>
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)' }}>
                <p className="text-xs" style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                  Auto-applied · No codes · Expires 60 days after their first payout 💜
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Referral history */}
        {!loading && referrals.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Your referrals ({referrals.length})
            </p>
            <div className="space-y-2">
              {referrals.map(ref => (
                <div key={ref.id} className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    {ref.referee?.avatar_url ? (
                      <img src={ref.referee.avatar_url} alt=""
                        className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium"
                        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                        {(ref.referee?.full_name || ref.referee?.username || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {ref.referee?.full_name || ref.referee?.username}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {ref.is_vendor_referral ? '💜 Jinx referral' : '👥 Client referral'} · {timeAgo(ref.created_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {ref.is_vendor_referral ? (
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: ref.first_booking_completed
                            ? 'rgba(0,217,126,0.1)' : 'rgba(255,184,0,0.1)',
                          color: ref.first_booking_completed ? '#00D97E' : '#FFB800',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {ref.first_booking_completed ? 'Rewarded' : 'Pending'}
                      </span>
                    ) : (
                      <p className="text-sm font-semibold"
                        style={{ color: (ref.credits_awarded ?? 0) > 0 ? '#00D97E' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        {(ref.credits_awarded ?? 0) > 0
                          ? `+${formatCurrency(ref.credits_awarded)}`
                          : 'Pending'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Free Jinx rewards history */}
        {!loading && freeRewards.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Free Jinx rewards
            </p>
            <div className="space-y-2">
              {freeRewards.map(reward => {
                const days = daysUntil(reward.expires_at)
                const statusColor = reward.status === 'active'
                  ? days <= 3 ? '#FF4D6A' : days <= 14 ? '#FFB800' : '#00D97E'
                  : reward.status === 'used' ? 'var(--text-muted)' : '#5C5875'
                const statusLabel = reward.status === 'active'
                  ? days <= 0 ? 'Expired' : `${days}d left`
                  : reward.status === 'used' ? 'Used' : 'Expired'

                return (
                  <div key={reward.id} className="p-3 rounded-2xl"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 18 }}>🎁</span>
                        <div>
                          <p className="text-sm font-medium"
                            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                            Free 2-hour Jinx
                          </p>
                          <p className="text-xs"
                            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                            From referring {reward.source_jinx?.full_name || reward.source_jinx?.username}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${statusColor}15`,
                          color: statusColor,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {reward.status === 'active' && (
                      <button
                        onClick={() => router.push('/find')}
                        className="w-full mt-3 py-2.5 rounded-full text-xs font-semibold text-white"
                        style={{
                          background: 'var(--pink)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          boxShadow: '0 4px 12px rgba(255,45,107,0.3)',
                        }}
                      >
                        Use now — auto-applied at booking
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading skeleton for history */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <Shimmer width={40} height={40} rounded={9999} />
                <div className="flex-1 space-y-2">
                  <Shimmer width="40%" height={12} rounded={4} />
                  <Shimmer width="60%" height={10} rounded={4} />
                </div>
                <Shimmer width={48} height={22} rounded={9999} />
              </div>
            ))}
          </div>
        )}

        {/* Rules */}
        <div className="p-4 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-2"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            Rules & limits
          </p>
          <ul className="space-y-1.5">
            {[
              'KYC required before any reward is awarded',
              'Referee must complete a real session before reward unlocks',
              'Credits expire 180 days after being earned',
              'Free Jinx reward expires 60 days after referred Jinx first payout',
              'Credits cover up to 50% of service fee only — transport is always cash',
              'Self-referral or abuse results in account suspension',
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>•</span>
                <p className="text-xs"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                  {rule}
                </p>
              </li>
            ))}
          </ul>
        </div>
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
