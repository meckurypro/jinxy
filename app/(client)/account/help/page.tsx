// app/(client)/account/help/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FAQS = [
  {
    category: 'Booking',
    items: [
      {
        q: 'How does a Jinx booking work?',
        a: 'You set your budget and duration, then Jinxy matches you with available Jinxes nearby. You pick your favourite from up to 4 matches, pay, and your Jinx is confirmed. Chat opens immediately after payment.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'You can cancel before your Jinx confirms. Once confirmed, cancellations may be subject to a fee depending on how close to the session time you cancel. Check our cancellation policy in Terms & Policies.',
      },
      {
        q: 'What happens if no Jinx accepts my request?',
        a: 'If no match is found within 3 minutes, your search expands. If still no match, you\'re returned to the search screen with a suggestion to adjust your budget or try again at a different time.',
      },
      {
        q: 'What is a Missed Jinx?',
        a: 'If a Jinx you\'ve favourited is unavailable when you try to book them, Jinxy records it as a Missed Jinx and notifies them. It\'s a nudge — your interest, silently noted.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        q: 'What payment methods are accepted?',
        a: 'Jinxy accepts card payments, Google Pay, and Apple Pay — all processed securely through Paystack. You can also use Jinxy Credits (earned through referrals) for up to 50% of any booking.',
      },
      {
        q: 'What are Jinxy Credits?',
        a: 'Jinxy Credits are in-app currency earned by referring new users. Credits can cover up to 50% of a service fee. Transport fares must always be paid with real money. Credits expire 180 days after being earned.',
      },
      {
        q: 'Is transport included in the price?',
        a: 'Transport fares are calculated separately using Google Maps (base ₦500 + ₦150/km) and are paid directly to your Jinx. They are shown clearly before you confirm your booking.',
      },
    ],
  },
  {
    category: 'Safety',
    items: [
      {
        q: 'How are Jinxes verified?',
        a: 'Every Jinx goes through our KYC process using Dojah — NIN verification and facial recognition. We also enforce strict 18+ age checks. Unverified users cannot make or receive bookings.',
      },
      {
        q: 'How does live tracking work?',
        a: 'Live tracking activates 60 minutes before your session. Both you and your Jinx can see each other on the map. You\'ll get distance alerts at 15 minutes, 5 minutes, and when they arrive. Tracking turns off automatically when the session ends.',
      },
      {
        q: 'What if I feel unsafe during a session?',
        a: 'End the session and report it immediately using the Report a Problem feature. For emergencies, always call local emergency services (112 in Nigeria). Your safety is the top priority.',
      },
    ],
  },
  {
    category: 'Account',
    items: [
      {
        q: 'Can I use Jinxy as both a client and a Jinx?',
        a: 'Yes. One account, two modes. Switch between Client Mode and Jinx Mode from your account settings. Your earnings, ratings, and bookings are tracked separately for each mode.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Account → Settings → Delete account. Your data will be permanently removed within 30 days. This action cannot be undone.',
      },
    ],
  },
]

export default function HelpPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('Booking')
  const [expandedQ, setExpandedQ] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const categories = FAQS.map(f => f.category)

  const filteredFaqs = searchQuery.trim()
    ? FAQS.flatMap(f => f.items).filter(
        item =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQS.find(f => f.category === activeCategory)?.items ?? []

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.04) 0%, transparent 60%)',
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
          Help & Support
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Find answers or get in touch
        </p>
      </div>

     <div className="relative px-5 pb-28 space-y-4">

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="7" cy="7" r="5" stroke="var(--text-muted)" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 36px',
              background: 'var(--bg-input)',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full text-xs font-medium flex-shrink-0 transition-all duration-200"
                style={{
                  background: activeCategory === cat ? 'var(--pink)' : 'var(--bg-elevated)',
                  color: activeCategory === cat ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${activeCategory === cat ? 'var(--pink)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* FAQs */}
        <div className="space-y-2">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-display text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>No results found</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Try different words or contact us below
              </p>
            </div>
          ) : (
            filteredFaqs.map((item, idx) => {
              const isOpen = expandedQ === item.q
              return (
                <div
                  key={idx}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => setExpandedQ(isOpen ? null : item.q)}
                    className="w-full flex items-center justify-between px-4 py-4 text-left"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <p className="text-sm font-medium pr-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {item.q}
                    </p>
                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      style={{
                        flexShrink: 0,
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms ease',
                      }}
                    >
                      <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                      <p className="text-sm pt-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Contact options */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3 px-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Still need help?
          </p>
          <div className="space-y-2">
            {[
              {
                icon: '✉️',
                label: 'Email support',
                sub: 'support@jinxy.app · We reply within 24hrs',
                href: 'mailto:support@jinxy.app',
              },
              {
                icon: '🚨',
                label: 'Report a problem',
                sub: 'Something broken or urgent',
                href: '/account/report',
                isInternal: true,
              },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => item.isInternal ? router.push(item.href) : window.open(item.href)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {item.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {item.sub}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
