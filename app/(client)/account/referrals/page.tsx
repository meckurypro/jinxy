// app/(client)/account/referrals/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'

interface ReferralStats {
  total_referred: number
  active_referrals: number
  total_credits_earned: number
  pending_credits: number
}

interface ReferralRecord {
  id: string
  referee_username: string
  referee_avatar: string | null
  status: 'pending' | 'active' | 'expired'
  credits_earned: number
  created_at: string
}

export default function ReferralsPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [stats, setStats] = useState<ReferralStats>({
    total_referred: 0,
    active_referrals: 0,
    total_credits_earned: 0,
    pending_credits: 0,
  })
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'client' | 'jinx'>('client')

  const referralCode = profile?.username ?? ''
  const referralLink = `https://jinxy.app/join?ref=${referralCode}`

  useEffect(() => {
    if (profile?.id) fetchData()
  }, [profile?.id])

  const fetchData = async () => {
    if (!profile?.id) return
    setLoading(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = referralLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: 'Join me on Jinxy',
      text: 'I\'ve been using Jinxy — on-demand companionship that actually works. Use my link to join.',
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

      {/* Background */}
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
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
        </button>
        <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
          Referrals
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Share Jinxy. Earn Credits.
        </p>
      </div>

      <div className="relative px-5 pb-12 space-y-5">

        {/* Credits balance card */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,107,0.12), rgba(107,33,168,0.08))',
            border: '1.5px solid rgba(255,45,107,0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1"
                style={{ color: 'rgba(255,45,107,0.7)', fontFamily: 'var(--font-body)' }}>
                Jinxy Credits balance
              </p>
              <p className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(profile?.jinxy_credits ?? 0)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Usable on up to 50% of any booking
              </p>
            </div>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,45,107,0.15)', border: '1px solid rgba(255,45,107,0.2)' }}
            >
              <span style={{ fontSize: 28 }}>💰</span>
            </div>
          </div>
        </div>

        {/* Referral link card */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Your referral link
          </p>
          <div
            className="flex items-center gap-2 p-3 rounded-xl mb-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <p
              className="flex-1 text-sm truncate"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            >
              {referralLink}
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

        {/* How it works — tabs for client vs jinx referral */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            How it works
          </p>

          <div
            className="flex rounded-full p-1 mb-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            {(['client', 'jinx'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="flex-1 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200"
                style={{
                  background: activeTab === t ? 'var(--pink)' : 'transparent',
                  color: activeTab === t ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
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
                {
                  step: '1',
                  title: 'Share your link',
                  body: 'Send your referral link to a friend. They sign up and complete their first Jinx.',
                },
                {
                  step: '2',
                  title: 'They book their first Jinx',
                  body: 'Once their first booking completes, you earn 5% of the service fee as Jinxy Credits.',
                },
                {
                  step: '3',
                  title: 'Keep earning',
                  body: 'For every subsequent booking they make in the first 3 months, you earn 2% in Credits. No cap.',
                },
              ].map(item => (
                <div
                  key={item.step}
                  className="flex gap-4 p-4 rounded-2xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display text-sm"
                    style={{ background: 'rgba(255,45,107,0.12)', color: 'var(--pink)', fontWeight: 600 }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}

              <div
                className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(0,217,126,0.06)', border: '1px solid rgba(0,217,126,0.15)' }}
              >
                <p className="text-xs" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                  5% on first booking · 2% for 3 months after 🎉
                </p>
              </div>
            </div>
          )}

          {activeTab === 'jinx' && (
            <div className="space-y-3">
              {[
                {
                  step: '1',
                  title: 'Refer someone to become a Jinx',
                  body: 'Share your link with someone who wants to earn as a Jinx. They sign up and complete KYC.',
                },
                {
                  step: '2',
                  title: 'They complete their first session',
                  body: 'Once their first Jinx session completes successfully, your reward is unlocked.',
                },
                {
                  step: '3',
                  title: 'You get a free Jinx',
                  body: 'Your reward is one free Jinx session with that specific vendor — paid from Jinxy\'s launch budget.',
                },
              ].map(item => (
                <div
                  key={item.step}
                  className="flex gap-4 p-4 rounded-2xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display text-sm"
                    style={{ background: 'rgba(147,51,234,0.12)', color: '#9333EA', fontWeight: 600 }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}

              <div
                className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)' }}
              >
                <p className="text-xs" style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                  1 free Jinx per vendor you refer 💜
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fine print */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            Rules & limits
          </p>
          <ul className="space-y-1.5">
            {[
              'KYC verification required before credits are awarded',
              'Referee must complete a real session before any reward unlocks',
              'Credits expire 180 days after being earned',
              'Credits cover up to 50% of service fee only (not transport)',
              'Abuse or self-referral will result in account suspension',
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>•</span>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                  {rule}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
