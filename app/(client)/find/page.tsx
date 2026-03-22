// app/(client)/find/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DurationPicker, type DurationTier } from '@/components/client/DurationPicker'
import { FilterSheet, type FilterValues } from '@/components/client/FilterSheet'
import { formatCurrency, calculateTierPrice } from '@/lib/utils'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/hooks/useUser'

type Step = 'welcome' | 'budget'

interface FreeJinxReward {
  id: string
  max_hourly_rate: number
  duration_hours: number
  app_contribution: number
  expires_at: string
}

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

  // Free Jinx reward state
  const [activeReward, setActiveReward] = useState<FreeJinxReward | null>(null)
  const [rewardChecked, setRewardChecked] = useState(false)
  const [rewardMode, setRewardMode] = useState(false) // true = using free Jinx reward

  const budgetNum = parseInt(budget.replace(/,/g, '')) || 0

  // In reward mode, the effective budget = max_hourly_rate (hidden from user)
  // User sees topup amount if they want to go above that
  const effectiveBudget = rewardMode && activeReward
    ? activeReward.max_hourly_rate
    : budgetNum

  const estimatedTotal = effectiveBudget > 0
    ? calculateTierPrice(effectiveBudget, duration)
    : 0

  // Extra amount client pays if they chose a higher budget in reward mode
  const topupAmount = rewardMode && activeReward && budgetNum > activeReward.max_hourly_rate
    ? calculateTierPrice(budgetNum - activeReward.max_hourly_rate, duration)
    : 0

  useEffect(() => {
    if (profile?.id) checkForActiveReward()
  }, [profile?.id])

  const checkForActiveReward = async () => {
    if (!profile?.id) return

    const { data } = await supabase
      .from('free_jinx_rewards')
      .select('id, max_hourly_rate, duration_hours, app_contribution, expires_at')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true }) // use soonest-expiring first
      .limit(1)
      .maybeSingle()

    if (data) {
      setActiveReward(data as FreeJinxReward)
      // Auto-activate reward mode and set duration to emerald (2hrs)
      setRewardMode(true)
      setDuration('emerald')
    }

    setRewardChecked(true)
  }

  const handleSearch = async () => {
    const searchBudget = rewardMode && activeReward
      ? Math.max(activeReward.max_hourly_rate, budgetNum || activeReward.max_hourly_rate)
      : budgetNum

    if (!rewardMode && searchBudget < 1000) {
      setError('Minimum budget is ₦1,000')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: profile?.id,
          status: 'searching',
          duration_tier: duration,
          duration_hours: getDurationHours(duration),
          client_budget: searchBudget,
          is_adult: filters.includeAdult,
          // Store reward ID so payment page can apply it
          ...(rewardMode && activeReward ? {
            preferences: {
              interested_in: filters.interestedIn,
              preferred_ethnicity: filters.preferredEthnicity,
              body_type: filters.bodyType,
              age_min: filters.ageMin,
              age_max: filters.ageMax,
              free_jinx_reward_id: activeReward.id,
              reward_max_rate: activeReward.max_hourly_rate,
            },
          } : {
            preferences: {
              interested_in: filters.interestedIn,
              preferred_ethnicity: filters.preferredEthnicity,
              body_type: filters.bodyType,
              age_min: filters.ageMin,
              age_max: filters.ageMax,
            },
          }),
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
      ruby: 1, emerald: 2, gold: 6, platinum: 12, topaz: 24, diamond: 48,
    }
    return map[tier]
  }

  const daysUntilExpiry = activeReward
    ? Math.ceil((new Date(activeReward.expires_at).getTime() - Date.now()) / 86_400_000)
    : 0

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,45,107,0.06) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-2">
        <button
          onClick={() => step === 'welcome' ? router.back() : setStep('welcome')}
          className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
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

        {step === 'budget' && !rewardMode && (
          <>
            <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Set your budget
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              Per hour rate you're willing to pay
            </p>
          </>
        )}

        {step === 'budget' && rewardMode && (
          <>
            <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Your free Jinx
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              2 hours, covered. Want longer? Pay the difference.
            </p>
          </>
        )}
      </div>

      <div className="relative flex-1 px-5 pb-8 overflow-y-auto">

        {/* Welcome step */}
        {step === 'welcome' && (
          <div className="space-y-3 mt-4">

            {/* Free Jinx reward banner */}
            {rewardChecked && activeReward && (
              <div
                className="p-4 rounded-2xl mb-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,45,107,0.12), rgba(147,51,234,0.08))',
                  border: '1.5px solid rgba(255,45,107,0.25)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 24, flexShrink: 0 }}>🎁</span>
                  <div>
                    <p className="text-sm font-semibold mb-0.5"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      You have a free Jinx!
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                      2 hours · auto-applied · {daysUntilExpiry} days left
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Use my preferences */}
            <button
              onClick={() => setStep('budget')}
              className="w-full p-4 rounded-2xl text-left transition-all duration-200"
              style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-0.5"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    Use my preferences
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Stick with my saved vibe
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="var(--pink)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </button>

            {/* New vibe */}
            <button
              onClick={() => setFilterSheetOpen(true)}
              className="w-full p-4 rounded-2xl text-left transition-all duration-200"
              style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-0.5"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    New vibe
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Customise my preferences
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 5h12M4 8h8M6 11h4" stroke="var(--text-secondary)"
                      strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </button>

            {/* From favourites */}
            <button
              onClick={() => router.push('/account/favourites')}
              className="w-full p-4 rounded-2xl text-left transition-all duration-200"
              style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-0.5"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    From your favourites
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Pick from people you've liked
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 14S2 10 2 6a4 4 0 018 0 4 4 0 018 0c0 4-6 8-6 8z"
                      fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('budget')}
              className="w-full py-4 rounded-full text-base font-semibold text-white mt-2"
              style={{
                background: 'var(--pink)',
                boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {rewardMode ? "Use my free Jinx 🎁" : "Let's Go"}
            </button>
          </div>
        )}

        {/* Budget / Reward step */}
        {step === 'budget' && (
          <div className="space-y-5">

            {/* Reward mode banner */}
            {rewardMode && activeReward && (
              <div className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(0,217,126,0.06)',
                  border: '1px solid rgba(0,217,126,0.2)',
                }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium"
                    style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                    🎁 Free Jinx reward active
                  </p>
                  <button
                    onClick={() => setRewardMode(false)}
                    style={{
                      fontSize: 11, color: 'var(--text-muted)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Don't use
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'rgba(0,217,126,0.7)', fontFamily: 'var(--font-body)' }}>
                  Jinxy covers a 2-hour session. Want more time or a pricier Jinx?
                  You'll pay the difference below.
                </p>
              </div>
            )}

            {/* Duration picker */}
            <div>
              <label className="input-label">
                {rewardMode ? 'Duration (2hrs included free)' : 'Duration'}
              </label>
              <DurationPicker
                selected={duration}
                onChange={setDuration}
                hourlyRate={effectiveBudget}
                highlightTier={rewardMode ? 'emerald' : undefined}
              />
              {rewardMode && duration !== 'emerald' && (
                <p className="text-xs mt-1.5"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Your reward covers 2 hours. Extra time is charged at your budget rate.
                </p>
              )}
            </div>

            {/* Budget input — optional in reward mode (top-up) */}
            {!rewardMode ? (
              <div>
                <label className="input-label">Budget per hour (₦)</label>
                <div className="input-wrapper">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
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
            ) : (
              // Reward mode: optional top-up input
              <div>
                <label className="input-label">
                  Want a pricier Jinx? Set a higher budget (optional)
                </label>
                <div className="input-wrapper">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    ₦
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="input"
                    style={{ paddingLeft: 28 }}
                    placeholder={`Free up to ₦${activeReward?.max_hourly_rate?.toLocaleString()}/hr`}
                    value={budget}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setBudget(raw ? parseInt(raw).toLocaleString() : '')
                      setError('')
                    }}
                  />
                </div>
                <p className="text-xs mt-1.5"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Leave blank to use only your free reward budget
                </p>
              </div>
            )}

            {/* Cost summary */}
            {(effectiveBudget > 0 || rewardMode) && (
              <div className="p-4 rounded-2xl space-y-2"
                style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)' }}>
                {rewardMode && activeReward && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                      🎁 Jinxy covers
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                      {formatCurrency(activeReward.app_contribution)}
                    </p>
                  </div>
                )}
                {topupAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                      Your top-up
                    </p>
                    <p className="text-sm font-semibold"
                      style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                      {formatCurrency(topupAmount)}
                    </p>
                  </div>
                )}
                {!rewardMode && effectiveBudget > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                      Estimated service fee
                    </p>
                    <p className="text-base font-semibold"
                      style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                      {formatCurrency(estimatedTotal)}
                    </p>
                  </div>
                )}
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  + transport fare calculated at match time
                </p>
              </div>
            )}

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={loading || (!rewardMode && budgetNum < 1000)}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: (rewardMode || budgetNum >= 1000) ? 'var(--pink)' : 'var(--bg-overlay)',
                boxShadow: (rewardMode || budgetNum >= 1000) ? '0 4px 20px rgba(255,45,107,0.35)' : 'none',
                border: 'none',
                cursor: (rewardMode || budgetNum >= 1000) ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)',
                opacity: loading ? 0.7 : 1,
                transition: 'all 200ms ease',
              }}
            >
              {loading ? 'Searching...' : rewardMode ? 'Find my free Jinx 🎁' : 'Find my Jinx'}
            </button>
          </div>
        )}
      </div>

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
