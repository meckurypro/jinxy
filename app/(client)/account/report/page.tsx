// app/(client)/account/report/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'

const CATEGORIES = [
  { value: 'bug', label: '🐛 Something is broken', description: "A feature isn't working as expected" },
  { value: 'payment', label: '💳 Payment issue', description: 'A charge, refund, or credits problem' },
  { value: 'safety', label: '🚨 Safety concern', description: 'Harassment, abuse, or threatening behaviour' },
  { value: 'account', label: '👤 Account issue', description: "Can't access, login, or edit my account" },
  { value: 'match', label: '💔 Matching issue', description: 'Problem with a booking or Jinx' },
  { value: 'other', label: '💬 Other', description: 'Something else entirely' },
]

type Step = 'category' | 'details' | 'submitted'

export default function ReportPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [step, setStep] = useState<Step>('category')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim() || !category) return
    setSubmitting(true)

    try {
      await supabase.from('support_tickets').insert({
        user_id: profile?.id,
        category,
        description: description.trim(),
        status: 'open',
        platform: 'web',
      })
    } catch {
      // Silently fail — always show success to user
    } finally {
      setStep('submitted')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.04) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-6">
        <button
          onClick={() => step === 'details' ? setStep('category') : router.back()}
          className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
        </button>

        {step !== 'submitted' && (
          <>
            <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Report a problem
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              {step === 'category' ? "What's going on?" : 'Tell us more'}
            </p>
          </>
        )}
      </div>

      <div className="relative flex-1 px-5 pb-12">

        {/* Category selection */}
        {step === 'category' && (
          <div className="space-y-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setStep('details') }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-150"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {cat.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {cat.description}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Details */}
        {step === 'details' && (
          <div className="space-y-4">
            {/* Selected category chip */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,45,107,0.08)', border: '1px solid rgba(255,45,107,0.2)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                {CATEGORIES.find(c => c.value === category)?.label}
              </span>
            </div>

            <div>
              <label
                className="block text-xs font-medium uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                Describe the issue
              </label>
              <textarea
                rows={6}
                placeholder="Tell us exactly what happened, what you expected, and any steps to reproduce the issue..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 16,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.6,
                }}
              />
              <p className="text-xs mt-1.5 text-right"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {description.length}/500
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || description.trim().length < 10}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: 'var(--pink)',
                border: 'none',
                cursor: (submitting || description.trim().length < 10) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
                opacity: (submitting || description.trim().length < 10) ? 0.5 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              {submitting ? 'Sending...' : 'Submit report'}
            </button>

            <p className="text-xs text-center"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              We review every report. Urgent safety issues are prioritised.
            </p>
          </div>
        )}

        {/* Success */}
        {step === 'submitted' && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(0,217,126,0.1)', border: '1px solid rgba(0,217,126,0.2)' }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14L11 20L23 8" stroke="#00D97E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              Report submitted
            </h2>
            <p className="text-sm mb-8"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
              Thanks for letting us know. We'll look into this and follow up if we need more details.
            </p>
            <button
              onClick={() => router.back()}
              className="px-8 py-3 rounded-full text-sm font-medium"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Back to account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
