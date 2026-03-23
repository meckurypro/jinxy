// app/(client)/find/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DurationPicker, type DurationTier } from '@/components/client/DurationPicker'
import { FilterSheet, type FilterValues } from '@/components/client/FilterSheet'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency, calculateTierPrice } from '@/lib/utils'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/hooks/useUser'

type Step = 'welcome' | 'budget' | 'searching' | 'results'

interface MatchedJinx {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  average_rating: number | null
  total_jinxes: number | null
  is_premium: boolean
  operating_area: string | null
  agreed_rate: number
  transport_fare: number
  total_cost: number
}

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

const SEARCH_MESSAGES = [
  'Scanning available Jinxes near you...',
  'Checking availability and ratings...',
  'Matching your preferences...',
  'Almost there...',
]

export default function FindPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { profile } = useUser()

  const [step, setStep] = useState<Step>('welcome')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [duration, setDuration] = useState<DurationTier>('ruby')
  const [budget, setBudget] = useState('')
  const [error, setError] = useState('')

  // Searching state
  const [searchProgress, setSearchProgress] = useState(0)
  const [searchMsgIdx, setSearchMsgIdx] = useState(0)
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)
  const msgRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Results state
  const [matches, setMatches] = useState<MatchedJinx[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [noMatchAdvice, setNoMatchAdvice] = useState('')

  // Free Jinx reward
  const [activeReward, setActiveReward] = useState<FreeJinxReward | null>(null)
  const [rewardChecked, setRewardChecked] = useState(false)
  const [rewardMode, setRewardMode] = useState(false)

  const budgetNum = parseInt(budget.replace(/,/g, '')) || 0
  const effectiveBudget = rewardMode && activeReward ? activeReward.max_hourly_rate : budgetNum
  const estimatedTotal = effectiveBudget > 0 ? calculateTierPrice(effectiveBudget, duration) : 0
  const topupAmount = rewardMode && activeReward && budgetNum > activeReward.max_hourly_rate
    ? calculateTierPrice(budgetNum - activeReward.max_hourly_rate, duration) : 0

  useEffect(() => {
    if (profile?.id) checkForReward()
  }, [profile?.id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe()
      if (progressRef.current) clearInterval(progressRef.current)
      if (msgRef.current) clearInterval(msgRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const checkForReward = async () => {
    const { data } = await supabase
      .from('free_jinx_rewards')
      .select('id, max_hourly_rate, duration_hours, app_contribution, expires_at')
      .eq('user_id', profile!.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (data) { setActiveReward(data as FreeJinxReward); setRewardMode(true); setDuration('emerald') }
    setRewardChecked(true)
  }

  const getDurationHours = (tier: DurationTier): number => {
    const map: Record<DurationTier, number> = { ruby: 1, emerald: 2, gold: 6, platinum: 12, topaz: 24, diamond: 48 }
    return map[tier]
  }

  // ─── Start search ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    const searchBudget = rewardMode && activeReward
      ? Math.max(activeReward.max_hourly_rate, budgetNum || activeReward.max_hourly_rate)
      : budgetNum

    if (!rewardMode && searchBudget < 1000) { setError('Minimum budget is ₦1,000'); return }

    setError('')
    setStep('searching')
    setSearchProgress(0)
    setSearchMsgIdx(0)

    // Animate progress bar
    progressRef.current = setInterval(() => {
      setSearchProgress(p => Math.min(p + 1.2, 90))
    }, 150) as unknown as NodeJS.Timeout

    // Cycle messages
    msgRef.current = setInterval(() => {
      setSearchMsgIdx(i => Math.min(i + 1, SEARCH_MESSAGES.length - 1))
    }, 3000) as unknown as NodeJS.Timeout

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: profile?.id,
        status: 'searching',
        duration_tier: duration,
        duration_hours: getDurationHours(duration),
        client_budget: searchBudget,
        is_adult: filters.includeAdult,
        preferences: {
          interested_in: filters.interestedIn,
          preferred_ethnicity: filters.preferredEthnicity,
          body_type: filters.bodyType,
          age_min: filters.ageMin,
          age_max: filters.ageMax,
          ...(rewardMode && activeReward ? {
            free_jinx_reward_id: activeReward.id,
            reward_max_rate: activeReward.max_hourly_rate,
          } : {}),
        },
      })
      .select()
      .single()

    if (bookingError || !booking) {
      clearSearch()
      setStep('budget')
      setError('Something went wrong. Try again.')
      return
    }

    setCurrentBookingId(booking.id)

    // Subscribe to booking_responses for this booking
    channelRef.current = supabase
      .channel(`find-responses-${booking.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'booking_responses',
        filter: `booking_id=eq.${booking.id}`,
      }, () => {
        // New response received — check if we have enough to show results
        checkAndShowResults(booking.id, searchBudget)
      })
      .subscribe()

    // Timeout: 3 minutes then check whatever we have
    timeoutRef.current = setTimeout(() => {
      checkAndShowResults(booking.id, searchBudget, true)
    }, 3 * 60 * 1000) as unknown as NodeJS.Timeout
  }

  const checkAndShowResults = async (bookingId: string, searchBudget: number, isTimeout = false) => {
    const { data: responses } = await supabase
      .from('booking_responses')
      .select(`
        id, jinx_id,
        users!booking_responses_jinx_id_fkey (
          id, username, full_name, avatar_url
        ),
        jinx_profiles (
          average_rating, total_jinxes, is_premium, min_hourly_rate, operating_area
        )
      `)
      .eq('booking_id', bookingId)
      .eq('status', 'accepted')
      .limit(4)

    clearSearch()

    if (!responses || responses.length === 0) {
      // No matches — give advice
      if (isTimeout) {
        setNoMatchAdvice(
          searchBudget < 15000
            ? `No Jinxes available at ₦${searchBudget.toLocaleString()}/hr right now. Try topping up to ₦${(searchBudget + 5000).toLocaleString()}+.`
            : 'No Jinxes matched at the moment. Try again in a few minutes or broaden your filters.'
        )
      }
      setMatches([])
      setStep('results')
      return
    }

    const jinxList: MatchedJinx[] = (responses as Record<string, unknown>[]).map(r => {
      const user = r.users as Record<string, unknown>
      const jp = r.jinx_profiles as Record<string, unknown>
      const rate = (jp?.min_hourly_rate as number) || searchBudget
      const fare = Math.round(500 + Math.random() * 2000)
      return {
        id: r.jinx_id as string,
        username: user.username as string,
        full_name: user.full_name as string | null,
        avatar_url: user.avatar_url as string | null,
        average_rating: jp?.average_rating as number | null,
        total_jinxes: jp?.total_jinxes as number | null,
        is_premium: (jp?.is_premium as boolean) ?? false,
        operating_area: jp?.operating_area as string | null,
        agreed_rate: rate,
        transport_fare: fare,
        total_cost: Math.round(rate * getDurationHours(duration) + fare),
      }
    })

    setSearchProgress(100)
    setMatches(jinxList)
    setNoMatchAdvice('')
    setStep('results')
  }

  const clearSearch = () => {
    channelRef.current?.unsubscribe()
    if (progressRef.current) clearInterval(progressRef.current)
    if (msgRef.current) clearInterval(msgRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const handleCancelSearch = async () => {
    clearSearch()
    if (currentBookingId) {
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', currentBookingId)
    }
    setStep('budget')
    setSearchProgress(0)
  }

  const handleConfirm = async () => {
    if (!selected || !currentBookingId) return
    setConfirming(true)
    const jinx = matches.find(m => m.id === selected)!
    const { error } = await supabase
      .from('bookings')
      .update({
        jinx_id: selected,
        agreed_rate: jinx.agreed_rate,
        transport_fare: jinx.transport_fare,
        total_charged: jinx.total_cost,
        platform_commission: jinx.agreed_rate * 0.12,
        status: 'pending_payment',
      })
      .eq('id', currentBookingId)
    if (!error) router.push(`/find/payment?booking=${currentBookingId}`)
    setConfirming(false)
  }

  const daysLeft = activeReward
    ? Math.ceil((new Date(activeReward.expires_at).getTime() - Date.now()) / 86_400_000) : 0

  // ─── Render ────────────────────────────────────────────────────────────────

  // SEARCHING screen — fullscreen, user cannot leave
  if (step === 'searching') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0D0518 0%, #0a0a14 100%)', zIndex: 100 }}>

        {/* Radar rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="absolute rounded-full border" style={{
              width: `${i * 22}vw`, height: `${i * 22}vw`,
              maxWidth: `${i * 110}px`, maxHeight: `${i * 110}px`,
              borderColor: `rgba(147,51,234,${0.18 - i * 0.03})`,
              animation: `radar-pulse 2.5s ease-out ${i * 0.5}s infinite`,
            }} />
          ))}
        </div>

        {/* Pulsing icon */}
        <div className="relative mb-8 z-10">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(107,33,168,0.2))',
            border: '1.5px solid rgba(147,51,234,0.4)',
            boxShadow: '0 0 40px rgba(147,51,234,0.3)',
            animation: 'glow-pulse 2s ease-in-out infinite',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 32S4 23 4 13a8 8 0 0116 0 8 8 0 0116 0C36 23 18 32 18 32z"
                fill="rgba(147,51,234,0.6)" stroke="rgba(147,51,234,0.9)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-56 h-1 rounded-full mb-3 overflow-hidden z-10"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${searchProgress}%`, background: 'linear-gradient(90deg, #6B21A8, #9333EA)' }} />
        </div>

        <p className="text-xs mb-6 font-medium z-10"
          style={{ color: 'rgba(147,51,234,0.7)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
          {Math.round(searchProgress)}%
        </p>

        <h2 className="font-display text-xl text-center mb-2 px-10 z-10"
          style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.35 }}>
          {SEARCH_MESSAGES[searchMsgIdx]}
        </h2>

        <p className="text-xs text-center mt-8 px-10 z-10"
          style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-body)' }}>
          Please keep this screen open while we find your Jinx
        </p>

        <button onClick={handleCancelSearch}
          className="absolute bottom-12 text-sm z-10"
          style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Cancel search
        </button>

        <style jsx>{`
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 40px rgba(147,51,234,0.3); }
            50%       { box-shadow: 0 0 64px rgba(147,51,234,0.55); }
          }
          @keyframes radar-pulse {
            0%   { transform: scale(0.6); opacity: 0.8; }
            100% { transform: scale(2.4); opacity: 0; }
          }
        `}</style>
      </div>
    )
  }

  // RESULTS screen
  if (step === 'results') {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
        }} />

        <div className="relative px-5 pt-14 pb-4">
          <button onClick={() => { setStep('budget'); setMatches([]); setSelected(null) }}
            className="mb-6 flex items-center gap-2"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {matches.length > 0 ? (
            <>
              <p className="text-xs font-medium uppercase tracking-widest mb-1"
                style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                {matches.length} Match{matches.length !== 1 ? 'es' : ''} Found
              </p>
              <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
                Time to choose.
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                Tap a profile to select, then confirm your pick.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
                No matches yet.
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                {noMatchAdvice || 'No Jinxes matched your preferences right now.'}
              </p>
            </>
          )}
        </div>

        <div className="relative flex-1 px-5 pb-32 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="flex flex-col gap-3 mt-4">
              <button onClick={() => { setBudget(''); setStep('budget') }}
                className="w-full py-4 rounded-full text-base font-semibold text-white"
                style={{ background: 'var(--pink)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 20px rgba(255,45,107,0.35)' }}>
                Try a higher budget
              </button>
              <button onClick={() => { setFilterSheetOpen(true) }}
                className="w-full py-4 rounded-full text-base font-medium"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Change my preferences
              </button>
              <button onClick={() => router.push('/home')}
                className="text-sm text-center mt-2"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Back to home
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(jinx => {
                const isSel = selected === jinx.id
                return (
                  <button key={jinx.id}
                    onClick={() => setSelected(isSel ? null : jinx.id)}
                    className="w-full text-left p-4 rounded-2xl transition-all duration-200"
                    style={{
                      background: isSel ? 'rgba(255,45,107,0.06)' : 'var(--bg-surface)',
                      border: `1.5px solid ${isSel ? 'var(--pink)' : 'var(--border)'}`,
                      boxShadow: isSel ? '0 0 0 3px rgba(255,45,107,0.1)' : 'none',
                    }}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar
                          src={jinx.avatar_url}
                          name={jinx.full_name || jinx.username}
                          size={56}
                        />
                        {jinx.is_premium && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: '#FFB800' }}>
                            <span style={{ fontSize: 10 }}>★</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate"
                          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                          {jinx.full_name || jinx.username}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {jinx.average_rating && (
                            <span className="text-xs" style={{ color: '#FFB800', fontFamily: 'var(--font-body)' }}>
                              ★ {jinx.average_rating.toFixed(1)}
                            </span>
                          )}
                          {jinx.total_jinxes != null && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                              {jinx.total_jinxes} Jinxes
                            </span>
                          )}
                          {jinx.operating_area && (
                            <span className="text-xs truncate" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                              · {jinx.operating_area}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold"
                          style={{ color: isSel ? 'var(--pink)' : 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                          {formatCurrency(jinx.total_cost)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                          incl. transport
                        </p>
                      </div>

                      {/* Checkmark */}
                      {isSel && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--pink)' }}>
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Confirm CTA */}
        {selected && (
          <div className="fixed bottom-0 left-0 right-0 max-w-app mx-auto px-5 pb-8 pt-4"
            style={{ background: 'linear-gradient(to top, var(--bg-base) 70%, transparent)' }}>
            <div className="flex items-center justify-between mb-3 px-4 py-2 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Service + transport
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                {formatCurrency(matches.find(m => m.id === selected)?.total_cost ?? 0)}
              </p>
            </div>
            <button onClick={handleConfirm} disabled={confirming}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: 'var(--pink)', boxShadow: '0 4px 20px rgba(255,45,107,0.4)',
                border: 'none', cursor: confirming ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', opacity: confirming ? 0.7 : 1,
              }}>
              {confirming ? 'Confirming...' : 'Proceed to payment'}
            </button>
          </div>
        )}

        <FilterSheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}
          values={filters} onChange={setFilters}
          onApply={() => { setStep('budget') }} />
      </div>
    )
  }

  // WELCOME + BUDGET steps
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,45,107,0.06) 0%, transparent 60%)',
      }} />

      <div className="relative px-5 pt-14 pb-2">
        <button
          onClick={() => step === 'welcome' ? router.back() : setStep('welcome')}
          className="mb-6"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {step === 'welcome' && (
          <>
            <p className="text-xs font-medium uppercase tracking-widest mb-2"
              style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>Find a Jinx</p>
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
            <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>Set your budget</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              Per hour rate you're willing to pay
            </p>
          </>
        )}

        {step === 'budget' && rewardMode && (
          <>
            <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>Your free Jinx</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
              2 hours, covered. Want longer? Pay the difference.
            </p>
          </>
        )}
      </div>

      <div className="relative flex-1 px-5 pb-8 overflow-y-auto">

        {/* WELCOME */}
        {step === 'welcome' && (
          <div className="space-y-3 mt-4">
            {rewardChecked && activeReward && (
              <div className="p-4 rounded-2xl mb-2" style={{
                background: 'linear-gradient(135deg, rgba(255,45,107,0.12), rgba(147,51,234,0.08))',
                border: '1.5px solid rgba(255,45,107,0.25)',
              }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: 24, flexShrink: 0 }}>🎁</span>
                  <div>
                    <p className="text-sm font-semibold mb-0.5"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      You have a free Jinx!
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                      2 hours · auto-applied · {daysLeft} days left
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setStep('budget')}
              className="w-full p-4 rounded-2xl text-left"
              style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    Use my preferences
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Stick with my saved vibe
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="var(--pink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </button>

            <button onClick={() => setFilterSheetOpen(true)}
              className="w-full p-4 rounded-2xl text-left"
              style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>New vibe</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Customise my preferences</p>
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 5h12M4 8h8M6 11h4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </button>

            <button onClick={() => router.push('/account/favourites')}
              className="w-full p-4 rounded-2xl text-left"
              style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>From your favourites</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Pick from people you've liked</p>
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

            <button onClick={() => setStep('budget')}
              className="w-full py-4 rounded-full text-base font-semibold text-white mt-2"
              style={{ background: 'var(--pink)', boxShadow: '0 4px 20px rgba(255,45,107,0.35)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {rewardMode ? "Use my free Jinx 🎁" : "Let's Go"}
            </button>
          </div>
        )}

        {/* BUDGET */}
        {step === 'budget' && (
          <div className="space-y-5 mt-2">
            {/* Reward banner */}
            {rewardMode && activeReward && (
              <div className="p-4 rounded-2xl"
                style={{ background: 'rgba(0,217,126,0.06)', border: '1px solid rgba(0,217,126,0.2)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                    🎁 Free Jinx reward active
                  </p>
                  <button onClick={() => setRewardMode(false)}
                    style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    Don't use
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'rgba(0,217,126,0.7)', fontFamily: 'var(--font-body)' }}>
                  2 hours covered. Want a pricier Jinx or more time? Pay the difference below.
                </p>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="text-xs font-medium uppercase tracking-widest mb-3 block"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Duration
              </label>
              <DurationPicker
                selected={duration}
                onChange={setDuration}
                hourlyRate={effectiveBudget}
                highlightTier={rewardMode ? 'emerald' : undefined}
              />
            </div>

            {/* Budget input */}
            {!rewardMode ? (
              <div>
                <label className="text-xs font-medium uppercase tracking-widest mb-2 block"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Budget per hour (₦)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 15,
                  }}>₦</span>
                  <input
                    type="tel" inputMode="numeric"
                    style={{
                      width: '100%', padding: '14px 16px 14px 28px',
                      background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                      borderRadius: 14, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
                    }}
                    placeholder="e.g. 30,000"
                    value={budget}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setBudget(raw ? parseInt(raw).toLocaleString() : '')
                      setError('')
                    }}
                  />
                </div>
                {error && <p className="mt-2 text-xs" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>{error}</p>}
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium uppercase tracking-widest mb-2 block"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Higher budget? (optional top-up)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 15,
                  }}>₦</span>
                  <input
                    type="tel" inputMode="numeric"
                    style={{
                      width: '100%', padding: '14px 16px 14px 28px',
                      background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                      borderRadius: 14, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
                    }}
                    placeholder={`Free up to ₦${activeReward?.max_hourly_rate?.toLocaleString()}/hr`}
                    value={budget}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setBudget(raw ? parseInt(raw).toLocaleString() : '')
                    }}
                  />
                </div>
              </div>
            )}

            {/* Cost summary */}
            {(effectiveBudget > 0 || rewardMode) && (
              <div className="p-4 rounded-2xl space-y-2"
                style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)' }}>
                {rewardMode && activeReward && (
                  <div className="flex justify-between">
                    <p className="text-sm" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>🎁 Jinxy covers</p>
                    <p className="text-sm font-semibold" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                      {formatCurrency(activeReward.app_contribution)}
                    </p>
                  </div>
                )}
                {topupAmount > 0 && (
                  <div className="flex justify-between">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Your top-up</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                      {formatCurrency(topupAmount)}
                    </p>
                  </div>
                )}
                {!rewardMode && effectiveBudget > 0 && (
                  <div className="flex justify-between">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Estimated service fee</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                      {formatCurrency(estimatedTotal)}
                    </p>
                  </div>
                )}
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  + transport calculated at match time
                </p>
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={!rewardMode && budgetNum < 1000}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: (rewardMode || budgetNum >= 1000) ? 'var(--pink)' : 'var(--bg-overlay)',
                boxShadow: (rewardMode || budgetNum >= 1000) ? '0 4px 20px rgba(255,45,107,0.35)' : 'none',
                border: 'none',
                cursor: (rewardMode || budgetNum >= 1000) ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)',
                transition: 'all 200ms ease',
              }}>
              {rewardMode ? 'Find my free Jinx 🎁' : 'Find my Jinx'}
            </button>
          </div>
        )}
      </div>

      <FilterSheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}
        values={filters} onChange={setFilters}
        onApply={() => setStep('budget')} />
    </div>
  )
}
