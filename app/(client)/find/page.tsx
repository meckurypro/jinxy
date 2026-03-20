'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DurationPicker, type DurationTier } from '@/components/client/DurationPicker'
import { FilterSheet, type FilterValues } from '@/components/client/FilterSheet'
import { formatCurrency, calculateTierPrice } from '@/lib/utils'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/hooks/useUser'

type Step = 'welcome' | 'filters' | 'budget'

const DEFAULT_FILTERS: FilterValues = {
  interestedIn: 'girls',
  preferredEthnicity: [],
  bodyType: [],
  ageMin: 18,
  ageMax: 35,
  includeAdult: false,
}

export default function FindPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { profile } = useUser()

  const [step, setStep] = useState<Step>('welcome')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [duration, setDuration] = useState<DurationTier>('ruby')
  const [budget, setBudget] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const budgetNum = parseInt(budget.replace(/,/g, '')) || 0
  const estimatedTotal = budgetNum > 0 ? calculateTierPrice(budgetNum, duration) : 0

  const handleSearch = async () => {
    if (budgetNum < 1000) {
      setError('Minimum budget is ₦1,000')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create a booking record in 'searching' state
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: profile?.id,
          status: 'searching',
          duration_tier: duration,
          duration_hours: getDurationHours(duration),
          client_budget: budgetNum,
          is_adult: filters.includeAdult,
          preferences: {
            interested_in: filters.interestedIn,
            preferred_ethnicity: filters.preferredEthnicity,
            body_type: filters.bodyType,
            age_min: filters.ageMin,
            age_max: filters.ageMax,
          },
        })
        .select()
        .single()

      if (bookingError || !booking) {
        setError('Something went wrong. Try again.')
        setLoading(false)
        return
      }

      router.push(`/find/matching?booking=${booking.id}`)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const getDurationHours = (tier: DurationTier): number => {
    const map: Record<DurationTier, number> = {
      ruby: 1, emerald: 3, gold: 6, platinum: 12, topaz: 24, diamond: 48,
    }
    return map[tier]
  }

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,45,107,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-2">
        <button
          onClick={() => step === 'welcome' ? router.back() : setStep('welcome')}
          className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {step === 'welcome' && (
          <>
            <p className="text-xs font-medium uppercase tracking-widest mb-2"
              style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
              Find a Jinx
            </p>
            <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Ready to find your
            </h1>
            <h1 className="font-display text-3xl" style={{ color: 'var(--pink)', fontStyle: 'italic' }}>
              perfect Jinx?
            </h1>
          </>
        )}

        {step === 'budget' && (
          <>
            <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Set your budget
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              Per hour rate you're willing to pay
            </p>
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 px-5 pb-8 overflow-y-auto">

        {/* Welcome step */}
        {step === 'welcome' && (
          <div className="space-y-4 animate-slide-up">
            {/* Use saved preferences or new vibe */}
            <div className="space-y-3 mt-4">
              {/* Saved preferences */}
              <button
                onClick={() => setStep('budget')}
                className="w-full p-4 rounded-2xl text-left transition-all duration-200"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      Use my preferences
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      Stick with my saved vibe
                    </p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 12L10 8L6 4" stroke="var(--pink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* New vibe */}
              <button
                onClick={() => setFilterSheetOpen(true)}
                className="w-full p-4 rounded-2xl text-left transition-all duration-200"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1.5px solid var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      New vibe
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      Customise my preferences
                    </p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 5h12M4 8h8M6 11h4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* From favourites */}
              <button
                onClick={() => router.push('/account/favourites')}
                className="w-full p-4 rounded-2xl text-left transition-all duration-200"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1.5px solid var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      From your favourites
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      Pick from people you've liked
                    </p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 14S2 10 2 6a4 4 0 018 0 4 4 0 018 0c0 4-6 8-6 8z"
                        fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep('budget')}
              className="w-full py-4 rounded-full text-base font-semibold text-white mt-4"
              style={{
                background: 'var(--pink)',
                boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Let's Go
            </button>
          </div>
        )}

        {/* Budget + Duration step */}
        {step === 'budget' && (
          <div className="space-y-6 animate-slide-up">

            {/* Budget input */}
            <div>
              <label className="input-label">Budget per hour (₦)</label>
              <div className="input-wrapper">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 font-medium"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                >
                  ₦
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="input"
                  style={{ paddingLeft: 28 }}
                  placeholder="e.g. 30,000"
                  value={budget}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setBudget(raw ? parseInt(raw).toLocaleString() : '')
                    setError('')
                  }}
                />
              </div>
              {error && (
                <p className="mt-2 text-xs" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
                  {error}
                </p>
              )}
            </div>

            {/* Duration picker */}
            <div>
              <label className="input-label">Duration</label>
              <DurationPicker
                selected={duration}
                onChange={setDuration}
                hourlyRate={budgetNum}
              />
            </div>

            {/* Total estimate */}
            {budgetNum > 0 && (
              <div
                className="p-4 rounded-2xl"
                style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    Estimated service fee
                  </p>
                  <p className="text-base font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                    {formatCurrency(estimatedTotal)}
                  </p>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  + transport fare calculated at match time
                </p>
              </div>
            )}

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={loading || budgetNum < 1000}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: budgetNum >= 1000 ? 'var(--pink)' : 'var(--bg-overlay)',
                boxShadow: budgetNum >= 1000 ? '0 4px 20px rgba(255,45,107,0.35)' : 'none',
                border: 'none',
                cursor: budgetNum >= 1000 ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)',
                opacity: loading ? 0.7 : 1,
                transition: 'all 200ms ease',
              }}
            >
              {loading ? 'Searching...' : 'Find my Jinx'}
            </button>
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        values={filters}
        onChange={setFilters}
        onApply={() => setStep('budget')}
      />
    </div>
  )
}
