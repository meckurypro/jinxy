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
  const [useCredits, setUseCredits] = useState(false)

  useEffect(() => {
    if (!bookingId) { router.replace('/find'); return }
    fetchBooking()
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)
  }, [bookingId])

  const fetchBooking = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        users!bookings_jinx_id_fkey (
          username, full_name, avatar_url
        )
      `)
      .eq('id', bookingId)
      .single()

    if (data) {
      setBooking(data)
      setJinx(data.users as Record<string, unknown>)
    }
    setLoading(false)
  }

  const totalCharged = (booking?.total_charged as number) ?? 0
  const maxCreditsUsable = Math.floor(totalCharged * 0.5)
  const availableCredits = profile?.jinxy_credits ?? 0
  const actualCredits = useCredits ? Math.min(maxCreditsUsable, availableCredits) : 0
  const cashAmount = totalCharged - actualCredits

  const handlePay = async () => {
    if (!booking || !profile) return
    setPaying(true)
    const reference = `jinxy_${bookingId}_${Date.now()}`

    if (cashAmount > 0 && window.PaystackPop) {
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: profile.email,
        amount: cashAmount * 100,
        currency: 'NGN',
        reference,
        metadata: { booking_id: bookingId, credits_used: actualCredits },
        callback: async (response: { reference: string }) => {
          await confirmPayment(response.reference)
        },
        onClose: () => setPaying(false),
      })
      handler.openIframe()
    } else {
      await confirmPayment(reference)
    }
  }

  const confirmPayment = async (paystackReference: string) => {
    const { error } = await supabase.rpc('process_booking_payment', {
      p_booking_id: bookingId,
      p_credits_amount: actualCredits,
      p_cash_amount: cashAmount,
      p_payment_method: useCredits && actualCredits > 0 ? 'mixed' : 'card',
      p_paystack_reference: paystackReference,
    })
    if (!error) {
      router.replace(`/find/confirmed?booking=${bookingId}`)
    } else {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--pink)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <div className="px-5 pt-14 pb-6">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>Payment</h1>
      </div>

      <div className="flex-1 px-5 pb-32 space-y-4">
        {/* Booking summary */}
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--pink-glow)', border: '1px solid var(--border-pink)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C10 2 4 6 4 11a6 6 0 0012 0C16 6 10 2 10 2z" fill="var(--pink)" fillOpacity="0.8" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                {(jinx?.full_name as string) || (jinx?.username as string)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {booking?.duration_tier as string} · {booking?.duration_hours as number}hr session
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Service fee', value: formatCurrency((booking?.agreed_rate as number) ?? 0) },
              { label: 'Transport fare', value: formatCurrency((booking?.transport_fare as number) ?? 0) },
            ].map(row => (
              <div key={row.label} className="flex justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{row.label}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{row.value}</p>
              </div>
            ))}
            <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>Total</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>{formatCurrency(totalCharged)}</p>
            </div>
          </div>
        </div>

        {/* Credits toggle */}
        {availableCredits > 0 && (
          <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  Use Jinxy Credits
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  {formatCurrency(availableCredits)} available · saves {formatCurrency(Math.min(maxCreditsUsable, availableCredits))}
                </p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={useCredits} onChange={e => setUseCredits(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            {useCredits && (
              <div className="mt-3 flex justify-between text-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Credits applied</p>
                <p style={{ color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  -{formatCurrency(actualCredits)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payment methods info */}
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Pay with</p>
          {[
            { label: 'Card', icon: '💳' },
            { label: 'Google Pay', icon: 'G' },
            { label: 'Apple Pay', icon: '🍎' },
          ].map(method => (
            <div key={method.label} className="flex items-center gap-3 p-3 rounded-xl mb-2 last:mb-0"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <span className="text-base">{method.icon}</span>
              <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                {method.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pay button */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-app mx-auto px-5 pb-8 pt-4"
        style={{ background: 'linear-gradient(to top, var(--bg-base) 70%, transparent)' }}
      >
        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full py-4 rounded-full text-base font-semibold text-white"
          style={{
            background: 'var(--pink)',
            boxShadow: '0 4px 20px rgba(255,45,107,0.4)',
            border: 'none',
            cursor: paying ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            opacity: paying ? 0.7 : 1,
          }}
        >
          {paying ? 'Processing...' : `Pay ${formatCurrency(cashAmount)}`}
        </button>
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Secured by Paystack · No scams, no surprises
        </p>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--pink)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}
