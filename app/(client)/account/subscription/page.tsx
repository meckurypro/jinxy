// app/(client)/account/subscription/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'

const CLIENT_FEATURES = [
  { icon: '🔍', label: 'Browse verified Jinxes', included: true },
  { icon: '💬', label: 'In-session chat', included: true },
  { icon: '📍', label: 'Live session tracking', included: true },
  { icon: '❤️', label: 'Favourites list', included: true },
  { icon: '🎟️', label: 'Invite links', included: true },
  { icon: '💰', label: 'Jinxy Credits via referrals', included: true },
  { icon: '📅', label: 'Advance bookings', included: true },
]

const JINX_FREE_FEATURES = [
  { icon: '📩', label: 'Receive booking requests', included: true },
  { icon: '🖼️', label: 'Up to 5 Moments', included: true },
  { icon: '⭐', label: 'Ratings & reviews', included: true },
  { icon: '🔗', label: '1 active invite link', included: true },
]

const JINX_PRO_FEATURES = [
  { icon: '🚀', label: 'Algorithm boost in search results', included: true },
  { icon: '🖼️', label: 'More Moments slots', included: true },
  { icon: '🔗', label: 'Unlimited active invite links', included: true },
  { icon: '📢', label: 'Broadcast to past clients', included: true },
  { icon: '📅', label: 'Accept advance bookings while busy', included: true },
  { icon: '🛣️', label: 'Auto road-time buffering', included: true },
  { icon: '✦', label: 'Pro badge on profile', included: true },
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
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
        </button>
        <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
          My Subscription
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          What's included in your plan
        </p>
      </div>

      <div className="relative px-5 pb-12 space-y-5">

        {/* Client plan card — always free */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,107,0.08), rgba(255,45,107,0.04))',
            border: '1.5px solid rgba(255,45,107,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                  Client
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(255,45,107,0.15)', color: 'var(--pink)', fontFamily: 'var(--font-body)' }}
                >
                  Always Free
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                Everything you need to find your Jinx
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,45,107,0.15)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C10 2 4 6 4 11C4 14.31 6.69 17 10 17C13.31 17 16 14.31 16 11C16 6 10 2 10 2Z"
                  fill="var(--pink)" fillOpacity="0.8" />
              </svg>
            </div>
          </div>

          <div className="space-y-2.5">
            {CLIENT_FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,217,126,0.15)' }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#00D97E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  <span className="mr-1.5">{f.icon}</span>{f.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Jinx Mode section */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3 px-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Jinx Mode Plans
          </p>

          {/* Jinx Free */}
          <div
            className="p-5 rounded-2xl mb-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                    Jinx — Free
                  </h2>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  Start receiving requests today
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(147,51,234,0.1)' }}
              >
                <span style={{ fontSize: 18 }}>💜</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {JINX_FREE_FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,217,126,0.15)' }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#00D97E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    <span className="mr-1.5">{f.icon}</span>{f.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Jinx Pro */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(147,51,234,0.1), rgba(107,33,168,0.06))',
              border: '1.5px solid rgba(147,51,234,0.3)',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                    Jinx Pro
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(255,183,0,0.15)', color: '#FFB700', fontFamily: 'var(--font-body)' }}
                  >
                    ✦ Premium
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  Maximise your earnings potential
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl" style={{ color: '#9333EA' }}>₦20,000</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>/month</p>
              </div>
            </div>

            <div className="space-y-2.5 mb-5">
              {JINX_PRO_FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(147,51,234,0.2)' }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#9333EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    <span className="mr-1.5">{f.icon}</span>{f.label}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/jinx/dashboard')}
              className="w-full py-3.5 rounded-full text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #9333EA, #6B21A8)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 4px 20px rgba(147,51,234,0.4)',
              }}
            >
              Switch to Jinx Mode to subscribe
            </button>
          </div>
        </div>

        {/* Note */}
        <p className="text-xs text-center px-4" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
          Jinxy clients never pay a subscription — ever. You only pay per Jinx. 🎉
        </p>
      </div>
    </div>
  )
}
