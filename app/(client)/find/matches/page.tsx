'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { VendorCard, type VendorCardData } from '@/components/client/VendorCard'
import { BookingListSkeleton } from '@/components/shared/Skeleton'
import { formatCurrency } from '@/lib/utils'

export default function MatchesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const supabase = useSupabase()

  const [vendors, setVendors] = useState<VendorCardData[]>([])
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!bookingId) { router.replace('/find'); return }
    fetchMatches()
  }, [bookingId])

  const fetchMatches = async () => {
    setLoading(true)

    // Get booking details
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingData) setBooking(bookingData)

    // Get accepted responses with vendor profiles
    const { data: responses } = await supabase
      .from('booking_responses')
      .select(`
        id,
        jinx_id,
        users!booking_responses_jinx_id_fkey (
          id, username, full_name, avatar_url
        ),
        jinx_profiles!inner (
          average_rating, total_jinxes, is_premium,
          min_hourly_rate, operating_area
        )
      `)
      .eq('booking_id', bookingId)
      .eq('status', 'accepted')
      .limit(4)

    if (responses) {
      const vendorList: VendorCardData[] = responses.map((r: Record<string, unknown>) => {
        const user = r.users as Record<string, unknown>
        const profile = r.jinx_profiles as Record<string, unknown>
        const rate = (profile.min_hourly_rate as number) || (bookingData?.client_budget as number) || 0
        const fare = 500 + Math.random() * 2000 // Placeholder — replace with actual fare calc
        return {
          id: r.jinx_id as string,
          username: user.username as string,
          full_name: user.full_name as string | null,
          avatar_url: user.avatar_url as string | null,
          average_rating: profile.average_rating as number,
          total_jinxes: profile.total_jinxes as number,
          is_premium: profile.is_premium as boolean,
          operating_area: profile.operating_area as string | undefined,
          min_hourly_rate: rate,
          agreed_rate: rate,
          transport_fare: Math.round(fare),
          total_cost: Math.round(rate + fare),
        }
      })
      setVendors(vendorList)
    }

    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!selected || !bookingId) return
    setConfirming(true)

    const selectedVendor = vendors.find(v => v.id === selected)
    if (!selectedVendor) return

    // Update booking with selected jinx and move to payment
    const { error } = await supabase
      .from('bookings')
      .update({
        jinx_id: selected,
        agreed_rate: selectedVendor.agreed_rate,
        transport_fare: selectedVendor.transport_fare,
        total_charged: selectedVendor.total_cost,
        platform_commission: (selectedVendor.agreed_rate || 0) * 0.12,
        vendor_payout: (selectedVendor.agreed_rate || 0) * 0.88,
        status: 'pending_payment',
      })
      .eq('id', bookingId)

    if (!error) {
      router.push(`/find/payment?booking=${bookingId}`)
    }

    setConfirming(false)
  }

  if (loading) {
    return (
      <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
        <div className="px-5 pt-14 pb-4">
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
            Finding your matches...
          </h1>
        </div>
        <BookingListSkeleton />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <p className="text-xs font-medium uppercase tracking-widest mb-2"
          style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
          {vendors.length} Match{vendors.length !== 1 ? 'es' : ''} Found
        </p>
        <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
          Time to choose.
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Tap a profile to view details, then confirm your pick.
        </p>
      </div>

      {/* Vendor list */}
      <div className="relative flex-1 px-5 pb-32 space-y-3 overflow-y-auto">
        {vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
              No matches yet.
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              The market is quiet. Try increasing your budget.
            </p>
            <button
              onClick={() => router.replace('/find')}
              className="px-6 py-3 rounded-full text-sm font-medium"
              style={{
                background: 'var(--pink)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Search again
            </button>
          </div>
        ) : (
          vendors.map(vendor => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              selected={selected === vendor.id}
              onSelect={() => {
                setSelected(selected === vendor.id ? null : vendor.id)
              }}
              showPrice
            />
          ))
        )}
      </div>

      {/* Sticky bottom CTA */}
      {selected && (
        <div
          className="fixed bottom-0 left-0 right-0 max-w-app mx-auto px-5 pb-8 pt-4"
          style={{
            background: 'linear-gradient(to top, var(--bg-base) 70%, transparent)',
          }}
        >
          <div
            className="flex items-center justify-between mb-3 px-4 py-2 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Total (service + transport)
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
              {formatCurrency(vendors.find(v => v.id === selected)?.total_cost ?? 0)}
            </p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-4 rounded-full text-base font-semibold text-white"
            style={{
              background: 'var(--pink)',
              boxShadow: '0 4px 20px rgba(255,45,107,0.4)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              opacity: confirming ? 0.7 : 1,
            }}
          >
            {confirming ? 'Confirming...' : 'Proceed to payment'}
          </button>
        </div>
      )}
    </div>
  )
}
