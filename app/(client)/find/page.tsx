// app/(client)/find/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DurationPicker, type DurationTier } from '@/components/client/DurationPicker'
import { FilterSheet, type FilterValues } from '@/components/client/FilterSheet'
import { formatCurrency, calculateTierPrice } from '@/lib/utils'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/hooks/useUser'

type Step = 'welcome' | 'budget' | 'searching'

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

// Broadcast animation messages — gives impression of sending out, not waiting
const BROADCAST_MESSAGES = [
  'Sending your request to nearby Jinxes...',
  'Notifying available Jinxes in your area...',
  'Your request is live — Jinxes are reviewing it...',
  'Request sent! You\'ll hear back soon.',
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

  // Broadcast state — brief animation then redirect to home
  const [broadcastProgress, setBroadcastProgress] = useState(0)
  const [broadcastMsgIdx, setBroadcastMsgIdx] = useState(0)
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)
  const msgRef = useRef<NodeJS.Timeout | null>(null)

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
      if (progressRef.current) clearInterval(progressRef.current)
      if (msgRef.current) clearInterval(msgRef.current)
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

  // ─── Broadcast & go ───────────────────────────────────────────────────────
  // Creates booking, shows a 4-second broadcast animation, then sends user
  // to /home. Jinx responses come in async — user gets notified via the
  // Jinxes tab dot + a toast. No waiting on this screen.
  const handleSearch = async () => {
    const searchBudget = rewardMode && activeReward
      ? Math.max(activeReward.max_hourly_rate, budgetNum || activeReward.max_hourly_rate)
      : budgetNum

    if (!rewardMode && searchBudget < 1000) { setError('Minimum budget is ₦1,000'); return }

    setError('')
    setStep('searching')
    setBroadcastProgress(0)
    setBroadcastMsgIdx(0)

    // Create booking first
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
      setStep('budget')
      setError('Something went wrong. Try again.')
      return
    }

    setCurrentBookingId(booking.id)

    // Animate progress to 100% over ~4 seconds, cycling through messages
    const DURATION = 4000
    const TICK = 80
    const totalTicks = DURATION / TICK
    let tick = 0

    // Use window.setInterval explicitly to avoid NodeJS/browser type conflict
    const intervalId = window.setInterval(() => {
      tick++
      const pct = Math.min((tick / totalTicks) * 100, 100)
      setBroadcastProgress(pct)

      // Cycle message every quarter of the duration
      const msgIdx = Math.min(
        Math.floor(tick / (totalTicks / BROADCAST_MESSAGES.length)),
        BROADCAST_MESSAGES.length - 1
      )
      setBroadcastMsgIdx(msgIdx)

      if (pct >= 100) {
        window.clearInterval(intervalId)
        // Brief pause at 100% so user reads "Request sent!" then go home
        window.setTimeout(() => {
          router.replace('/home')
        }, 700)
      }
    }, TICK)

    // Store as number so clearInterval works without type issues
    progressRef.current = intervalId as unknown as NodeJS.Timeout
  }

  const handleCancelSearch = async () => {
    if (progressRef.current) clearInterval(progressRef.current)
    if (msgRef.current) clearInterval(msgRef.current)
    if (currentBookingId) {
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', currentBookingId)
    }
    setStep('budget')
    setBroadcastProgress(0)
  }

  const daysLeft = activeReward
    ? Math.ceil((new Date(activeReward.expires_at).getTime() - Date.now()) / 86_400_000) : 0

  // ─── Render ────────────────────────────────────────────────────────────────

  // BROADCAST screen — fullscreen, auto-advances to home after ~4s
  if (step === 'searching') {
    const isDone = broadcastProgress >= 100
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0D0518 0%, #0a0a14 100%)', zIndex: 100 }}>

        {/* Radar rings — broadcasting outward */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="absolute rounded-full border" style={{
              width: `${i * 20}vw`, height: `${i * 20}vw`,
              maxWidth: `${i * 100}px`, maxHeight: `${i * 100}px`,
              borderColor: `rgba(255,45,107,${0.2 - i * 0.03})`,
              animation: `radar-pulse 3s ease-out ${i * 0.6}s infinite`,
            }} />
          ))}
        </div>

        {/* Central icon */}
        <div className="relative mb-8 z-10">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{
            background: isDone
              ? 'linear-gradient(135deg, rgba(0,217,126,0.25), rgba(0,180,100,0.15))'
              : 'linear-gradient(135deg, rgba(255,45,107,0.25), rgba(180,20,60,0.15))',
            border: `1.5px solid ${isDone ? 'rgba(0,217,126,0.5)' : 'rgba(255,45,107,0.4)'}`,
            boxShadow: isDone
              ? '0 0 40px rgba(0,217,126,0.3)'
              : '0 0 40px rgba(255,45,107,0.3)',
            transition: 'all 400ms ease',
            animation: isDone ? 'none' : 'glow-pulse 2s ease-in-out infinite',
          }}>
            {isDone ? (
              // Checkmark when done
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16l7 7 13-13" stroke="#00D97E" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              // Broadcast / signal icon
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="20" r="4" fill="rgba(255,45,107,0.9)" />
                <path d="M9 11C11.8 8.2 15.2 6.5 18 6.5C20.8 6.5 24.2 8.2 27 11"
                  stroke="rgba(255,45,107,0.6)" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M5 7C9 3 13.5 1 18 1C22.5 1 27 3 31 7"
                  stroke="rgba(255,45,107,0.3)" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-56 h-1 rounded-full mb-3 overflow-hidden z-10"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full"
            style={{
              width: `${broadcastProgress}%`,
              background: isDone
                ? 'linear-gradient(90deg, #00D97E, #00B864)'
                : 'linear-gradient(90deg, #C41751, #FF2D6B)',
              transition: 'width 80ms linear, background 400ms ease',
            }} />
        </div>

        {/* Message */}
        <h2 className="font-display text-xl text-center mb-3 px-10 z-10"
          style={{
            color: isDone ? 'rgba(0,217,126,0.9)' : 'rgba(255,255,255,0.9)',
            lineHeight: 1.35, transition: 'color 400ms ease',
          }}>
          {BROADCAST_MESSAGES[broadcastMsgIdx]}
        </h2>

        {/* Subtitle */}
        <p className="text-xs text-center px-10 z-10"
          style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
          {isDone
            ? 'Taking you back to home...'
            : 'You\'ll get a notification when a Jinx responds.\nFeel free to browse while you wait.'}
        </p>

        {/* Cancel — only visible before done, sits above bottom nav */}
        {!isDone && (
          <button onClick={handleCancelSearch}
            className="absolute text-sm z-10"
            style={{
              bottom: 'calc(var(--nav-height, 72px) + var(--safe-bottom, 0px) + 20px)',
              color: 'rgba(255,255,255,0.3)', background: 'none',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
            Cancel request
          </button>
        )}

        <style jsx>{`
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 40px rgba(255,45,107,0.3); }
            50%       { box-shadow: 0 0 64px rgba(255,45,107,0.55); }
          }
          @keyframes radar-pulse {
            0%   { transform: scale(0.5); opacity: 0.9; }
            100% { transform: scale(2.8); opacity: 0; }
          }
        `}</style>
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
