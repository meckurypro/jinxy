// app/(client)/account/terms/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SECTIONS = [
  {
    id: 'terms',
    title: 'Terms of Service',
    lastUpdated: 'March 2026',
    content: [
      {
        heading: 'Acceptance of Terms',
        body: 'By accessing or using Jinxy, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app. Jinxy is an on-demand companionship platform connecting clients with verified companions ("Jinxes") for legitimate social experiences.',
      },
      {
        heading: 'Eligibility',
        body: 'You must be at least 18 years old to use Jinxy. By creating an account, you confirm that you are 18 or older and that all information you provide is accurate. We enforce strict age verification and reserve the right to terminate accounts in violation of this policy.',
      },
      {
        heading: 'User Conduct',
        body: 'You agree to use Jinxy only for lawful purposes. You must not harass, threaten, or harm any other user. All interactions through Jinxy — including during live sessions — must remain within the agreed scope of the booking. Jinxy does not facilitate or condone illegal activity of any kind.',
      },
      {
        heading: 'Bookings & Payments',
        body: 'All payments are processed securely through Paystack. Jinxy charges a 12% platform commission on each service transaction. Transport fares are passed in full to the Jinx. Refunds are subject to our cancellation policy. Jinxy Credits are non-transferable and expire 180 days after being earned.',
      },
      {
        heading: 'Account Termination',
        body: 'We reserve the right to suspend or terminate your account at any time for violations of these terms, fraudulent activity, or behaviour that endangers the safety of other users. You may also delete your account at any time from the settings page.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'March 2026',
    content: [
      {
        heading: 'Data We Collect',
        body: 'We collect the information you provide when you sign up (name, email, date of birth, gender), your preferences, booking history, and usage data. For safety and matching purposes, we also collect approximate location data when you use the app.',
      },
      {
        heading: 'How We Use Your Data',
        body: 'Your data is used to operate the platform, improve our matching algorithm, process payments, ensure safety, and communicate with you about your account. We never sell your personal data to third parties.',
      },
      {
        heading: 'Data Sharing',
        body: 'We share limited profile data with other users as required for the matching and booking process. We share payment data with Paystack for transaction processing. We may share data with law enforcement if required by law.',
      },
      {
        heading: 'Your Rights',
        body: 'You have the right to access, correct, or delete your personal data at any time. You can download your data or request account deletion from your account settings. We comply with applicable data protection regulations.',
      },
      {
        heading: 'Cookies & Tracking',
        body: 'Jinxy uses cookies and similar technologies to keep you signed in and improve your experience. We do not use tracking cookies for advertising purposes. Jinxy products are ad-free.',
      },
    ],
  },
  {
    id: 'community',
    title: 'Community Guidelines',
    lastUpdated: 'March 2026',
    content: [
      {
        heading: 'Respect & Dignity',
        body: 'Every person on Jinxy deserves to be treated with respect. Harassment, discrimination, or abusive language will not be tolerated and will result in immediate account suspension.',
      },
      {
        heading: 'Authentic Profiles',
        body: 'Your profile must accurately represent you. Using someone else\'s photos, providing false information, or impersonating another person is strictly prohibited. All users must pass identity verification (KYC).',
      },
      {
        heading: 'Safe Interactions',
        body: 'Your safety is our priority. We encourage all users to meet initially in public places, share their location with a trusted person, and use Jinxy\'s live tracking feature during sessions. Report anything that feels unsafe immediately.',
      },
      {
        heading: 'Zero Tolerance',
        body: 'Jinxy has a zero-tolerance policy for sexual exploitation, human trafficking, and any activity that endangers the welfare of our users. Violations will be reported to the relevant authorities.',
      },
    ],
  },
]

export default function TermsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('terms')
  const [expandedHeadings, setExpandedHeadings] = useState<string[]>([])

  const section = SECTIONS.find(s => s.id === activeSection)!

  const toggleHeading = (heading: string) => {
    setExpandedHeadings(prev =>
      prev.includes(heading)
        ? prev.filter(h => h !== heading)
        : [...prev, heading]
    )
  }

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
          Terms & Policies
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Last updated {section.lastUpdated}
        </p>
      </div>

      {/* Section tabs */}
      <div className="relative px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="px-4 py-2 rounded-full text-xs font-medium flex-shrink-0 transition-all duration-200"
              style={{
                background: activeSection === s.id ? 'var(--pink)' : 'var(--bg-elevated)',
                color: activeSection === s.id ? 'white' : 'var(--text-muted)',
                border: `1px solid ${activeSection === s.id ? 'var(--pink)' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative px-5 pb-12 space-y-3">
        {section.content.map((item, idx) => {
          const isExpanded = expandedHeadings.includes(item.heading)
          return (
            <div
              key={idx}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => toggleHeading(item.heading)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <p className="text-sm font-medium pr-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  {item.heading}
                </p>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  style={{
                    flexShrink: 0,
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms ease',
                  }}
                >
                  <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {isExpanded && (
                <div
                  className="px-4 pb-4"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <p
                    className="text-sm pt-3"
                    style={{
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      lineHeight: 1.7,
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* Contact */}
        <div
          className="p-4 rounded-2xl text-center"
          style={{ background: 'rgba(255,45,107,0.04)', border: '1px solid rgba(255,45,107,0.1)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
            Questions about our policies?{' '}
            <a
              href="mailto:legal@jinxy.app"
              style={{ color: 'var(--pink)', textDecoration: 'none', fontWeight: 500 }}
            >
              legal@jinxy.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
