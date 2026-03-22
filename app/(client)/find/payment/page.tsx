// app/(client)/find/payment/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/hooks/useUser'
import { formatCurrency } from '@/lib/utils'

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void }
    }
  }
}

// Skeleton shimmer
function Shimmer({ width, height, rounded = 8 }: {
  width: string | number; height: number; rounded?: number
}) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'rgba(255,255,255,0.06)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const supabase = useSupabase()
  const { profile } = useUser()

  const [booking, setBooking] = useState<Record<string, unknown> | null>(null)
  const [jinx, setJinx] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [useCredits, setUseCredits] = useState(false)

  useEffect(() => {
    if (!bookingId) { router.replace('/find'); return }
    fetchBooking()

    // Load Paystack script
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script')
      script.id = 'paystack-script'
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [bookingId])

  const fetchBooking = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, duration_tier, duration_hours,
        agreed_rate, transport_fare, total_charged, status,
        users!bookings_jinx_id_fkey (
          username, full_name, avatar_url
        )
      `)
      .eq('id', bookingId)
      .single()

    if (data) {
      setBooking(data)
      // Supabase returns joined rows as array — take first element
      const usersRaw = data.users
      const jinxData = Array.isArray(usersRaw) ? usersRaw[0] : usersRaw
      setJinx(jinxData as unknown as Record<string, unknown>)
    }
    setLoading(false)
  }

  // ─── Payment maths ───────────────────────────────────────────────────────
  const totalCharged = (booking?.total_charged as number) ?? 0
  const transportFare = (booking?.transport_fare as number) ?? 0
  const serviceFee = (booking?.agreed_rate as number) ?? 0

  const availableCredits = profile?.jinxy_credits ?? 0
  // Credits can cover up to 50% of SERVICE FEE only — transport always real money
  const maxCreditsApplicable = Math.floor(serviceFee * 0.5)
  const creditsToApply = useCredits
    ? Math.min(maxCreditsApplicable, availableCredits)
    : 0
  // Cash = full total minus credits applied
  const cashAmount = totalCharged - creditsToApply

  // ─── Payment flow ─────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!booking || !profile) return
    setPayError('')
    setPaying(true)

    const reference = `jinxy_${bookingId}_${Date.now()}`

    if (cashAmount > 0) {
      // Paystack handles the cash portion
      if (!window.PaystackPop) {
        setPayError('Payment provider failed to load. Please refresh and try again.')
        setPaying(false)
        return
      }

      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: profile.email,
        amount: Math.round(cashAmount * 100), // Paystack uses kobo
        currency: 'NGN',
        reference,
        metadata: {
          booking_id: bookingId,
          credits_used: creditsToApply,
          custom_fields: [
            { display_name: 'Booking ID', variable_name: 'booking_id', value: bookingId },
          ],
        },
        callback: async (response: { reference: string; status: string }) => {
          // Paystack confirmed — now deduct credits and confirm booking
          await onPaystackSuccess(response.reference)
        },
        onClose: () => {
          // User closed Paystack modal without paying
          setPaying(false)
        },
      })

      handler.openIframe()
    } else {
      // Paying entirely with credits (edge case — 100% covered by credits)
      await onPaystackSuccess(reference)
    }
  }

  const onPaystackSuccess = async (paystackReference: string) => {
    // Step 1: Deduct credits from DB if applicable
    if (creditsToApply > 0 && profile?.id) {
      const { error: creditsError } = await supabase.rpc('deduct_jinxy_credits', {
        p_user_id: profile.id,
        p_amount: creditsToApply,
        p_booking_id: bookingId,
      })

      if (creditsError) {
        // Credits deduction failed — don't block, but log
        console.error('Credits deduction failed:', creditsError.message)
      }
    }

    // Step 2: Record payment and confirm booking
    const { error: paymentError } = await supabase.from('payments').insert({
      booking_id: bookingId,
      payer_id: profile?.id,
      amount: totalCharged,
      credits_used: creditsToApply,
      cash_amount: cashAmount,
      currency: 'NGN',
      payment_method: creditsToApply > 0 && cashAmount > 0 ? 'mixed' : cashAmount === 0 ? 'credits' : 'card',
      payment_status: 'completed',
      transaction_type: 'booking_payment',
      paystack_reference: paystackReference,
    })

    if (paymentError) {
      setPayError('Payment recorded but confirmation failed. Contact support.')
      setPaying(false)
      return
    }

    // Step 3: Update booking status to confirmed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)

    if (bookingError) {
      setPayError('Booking confirmation failed. Contact support with reference: ' + paystackReference)
      setPaying(false)
      return
    }

    // Step 4: Navigate to confirmation screen
    router.replace(`/find/confirmed?booking=${bookingId}`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
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
        </button>
        <h1 className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>
          Payment
        </h1>
      </div>

      <div className="relative flex-1 px-5 pb-36 space-y-4 overflow-y-auto">

        {/* Booking summary — skeleton while loading */}
        <div className="p-4 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

          {loading ? (
            // Skeleton for booking summary
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                <div className="space-y-2 flex-1">
                  <Shimmer width="50%" height={14} rounded={6} />
                  <Shimmer width="35%" height={11} rounded={4} />
                </div>
              </div>
              <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between">
                    <Shimmer width="30%" height={12} rounded={4} />
                    <Shimmer width="20%" height={12} rounded={4} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Jinx info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C10 2 4 6 4 11a6 6 0 0012 0C16 6 10 2 10 2z"
                      fill="var(--pink)" fillOpacity="0.8" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {(jinx?.full_name as string) || (jinx?.username as string)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {booking?.duration_tier as string} · {booking?.duration_hours as number}hr session
                  </p>
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    Service fee
                  </p>
                  <p className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {formatCurrency(serviceFee)}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                    Transport fare
                  </p>
                  <p className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {formatCurrency(transportFare)}
                  </p>
                </div>

                {/* Credits deduction line — only shown when toggle is on */}
                {creditsToApply > 0 && (
                  <div className="flex justify-between">
                    <p className="text-sm" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                      Jinxy Credits
                    </p>
                    <p className="text-sm font-medium" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                      -{formatCurrency(creditsToApply)}
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-2 mt-1"
                  style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {creditsToApply > 0 ? 'You pay' : 'Total'}
                  </p>
                  <p className="text-sm font-semibold"
                    style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                    {formatCurrency(cashAmount)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Jinxy Credits toggle — only show when loaded and credits available */}
        {!loading && availableCredits > 0 && (
          <div className="p-4 rounded-2xl"
            style={{
              background: useCredits ? 'rgba(0,217,126,0.04)' : 'var(--bg-surface)',
              border: `1px solid ${useCredits ? 'rgba(0,217,126,0.2)' : 'var(--border)'}`,
              transition: 'all 200ms ease',
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  Use Jinxy Credits
                </p>
                <p className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  {formatCurrency(availableCredits)} available
                  {maxCreditsApplicable > 0 && (
                    <> · saves up to {formatCurrency(Math.min(maxCreditsApplicable, availableCredits))}</>
                  )}
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={useCredits}
                  onChange={e => setUseCredits(e.target.checked)}
                />
                <span className="switch-track" />
              </label>
            </div>

            {useCredits && creditsToApply > 0 && (
              <div className="mt-3 pt-3 space-y-1"
                style={{ borderTop: '1px solid rgba(0,217,126,0.15)' }}>
                <p className="text-xs" style={{ color: 'rgba(0,217,126,0.7)', fontFamily: 'var(--font-body)' }}>
                  ✓ {formatCurrency(creditsToApply)} credits will be deducted after payment succeeds
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Credits cover up to 50% of service fee only. Transport is always paid in cash.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payment methods */}
        {!loading && (
          <div className="p-4 rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Pay with Paystack
            </p>
            {[
              { label: 'Card (Visa / Mastercard)', icon: '💳' },
              { label: 'Bank transfer', icon: '🏦' },
              { label: 'USSD', icon: '📱' },
            ].map(method => (
              <div key={method.label}
                className="flex items-center gap-3 p-3 rounded-xl mb-2 last:mb-0"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <span className="text-base">{method.icon}</span>
                <span className="text-sm font-medium flex-1"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  {method.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {payError && (
          <div className="p-3 rounded-xl"
            style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)' }}>
            <p className="text-xs text-center"
              style={{ color: '#FF4D6A', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
              {payError}
            </p>
          </div>
        )}
      </div>

      {/* Pay button — sticky bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-app mx-auto px-5 pb-8 pt-4"
        style={{ background: 'linear-gradient(to top, var(--bg-base) 70%, transparent)' }}
      >
        {loading ? (
          <Shimmer width="100%" height={56} rounded={9999} />
        ) : (
          <>
            <button
              onClick={handlePay}
              disabled={paying || cashAmount < 0}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: 'var(--pink)',
                boxShadow: '0 4px 20px rgba(255,45,107,0.4)',
                border: 'none',
                cursor: paying ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
                opacity: paying ? 0.7 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              {paying
                ? 'Processing...'
                : cashAmount === 0
                ? `Pay with credits · ${formatCurrency(creditsToApply)}`
                : `Pay ${formatCurrency(cashAmount)}`
              }
            </button>
            <p className="text-xs text-center mt-2"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Secured by Paystack · No scams, no surprises
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--pink)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}
