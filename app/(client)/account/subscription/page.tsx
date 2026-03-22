// app/(client)/account/subscription/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { formatCurrency } from '@/lib/utils'

const CLIENT_PERKS = [
  { icon: '🔍', label: 'Browse verified Jinxes' },
  { icon: '📍', label: 'Live session tracking' },
  { icon: '💬', label: 'In-session chat' },
  { icon: '❤️', label: 'Favourites & liked profiles' },
  { icon: '🎟️', label: 'Invite links — share & receive' },
  { icon: '📅', label: 'Advance bookings' },
  { icon: '💰', label: 'Earn Jinxy Credits via referrals' },
]

export default function SubscriptionPage() {
  const router = useRouter()
  const { profile } = useUser()

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-6">
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
          My Subscription
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          What's included in your account
        </p>
      </div>

      <div className="relative px-5 pb-12 space-y-5">

        {/* Current plan card */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,107,0.08), rgba(255,45,107,0.03))',
            border: '1.5px solid rgba(255,45,107,0.15)',
          }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>
                  Client
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgba(0,217,126,0.12)',
                    color: '#00D97E',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Always free
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                You only pay per Jinx — never a subscription.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {CLIENT_PERKS.map(perk => (
              <div key={perk.label} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,217,126,0.12)' }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#00D97E" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  <span className="mr-1.5">{perk.icon}</span>{perk.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Credits balance — taps through to referrals */}
        <button
          onClick={() => router.push('/account/referrals')}
          className="w-full p-4 rounded-2xl text-left"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-0.5"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                💰 Jinxy Credits
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {(profile?.jinxy_credits ?? 0) > 0
                  ? 'Usable on up to 50% of any booking'
                  : 'Refer friends to earn credits'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold font-display"
                style={{
                  color: (profile?.jinxy_credits ?? 0) > 0 ? 'var(--pink)' : 'var(--text-muted)',
                }}>
                {formatCurrency(profile?.jinxy_credits ?? 0)}
              </p>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </button>

        {/* Note */}
        <p className="text-xs text-center px-4"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
          Jinxy clients never pay a subscription — ever.{'\n'}You only pay per Jinx. 🎉
        </p>
      </div>
    </div>
  )
}
