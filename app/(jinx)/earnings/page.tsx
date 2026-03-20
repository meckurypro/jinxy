'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

interface EarningRecord {
  id: string
  amount: number
  created_at: string
  booking_id: string | null
  booking?: {
    duration_tier: string
    client: { username: string; full_name: string | null }
  }
}

interface MonthSummary {
  label: string
  total: number
  count: number
}

export default function JinxEarningsPage() {
  const { profile } = useUser()
  const supabase = useSupabase()

  const [earnings, setEarnings] = useState<EarningRecord[]>([])
  const [summary, setSummary] = useState<MonthSummary[]>([])
  const [totalAllTime, setTotalAllTime] = useState(0)
  const [thisMonth, setThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingPayout, setPendingPayout] = useState(0)

  useEffect(() => {
    if (profile?.id) fetchEarnings()
  }, [profile?.id])

  const fetchEarnings = async () => {
    if (!profile?.id) return

    const { data: payments } = await supabase
      .from('payments')
      .select(`
        id, amount, created_at, booking_id,
        bookings (
          duration_tier,
          client:users!bookings_client_id_fkey (
            username, full_name
          )
        )
      `)
      .eq('payee_id', profile.id)
      .eq('transaction_type', 'vendor_payout')
      .order('created_at', { ascending: false })

    if (payments) {
      setEarnings(payments as unknown as EarningRecord[])

      // Calculate totals
      const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0)
      setTotalAllTime(total)

      // This month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const monthTotal = payments
        .filter(p => new Date(p.created_at) >= startOfMonth)
        .reduce((s, p) => s + (p.amount ?? 0), 0)
      setThisMonth(monthTotal)

      // Monthly summary (last 6 months)
      const months: Record<string, { total: number; count: number }> = {}
      payments.forEach(p => {
        const d = new Date(p.created_at)
        const key = d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
        if (!months[key]) months[key] = { total: 0, count: 0 }
        months[key].total += p.amount ?? 0
        months[key].count += 1
      })

      const summaryArr: MonthSummary[] = Object.entries(months)
        .slice(0, 6)
        .map(([label, { total, count }]) => ({ label, total, count }))
      setSummary(summaryArr)
    }

    // Pending payouts (held payments)
    const { data: held } = await supabase
      .from('payments')
      .select('amount')
      .eq('payee_id', profile.id)
      .eq('payment_status', 'held')

    if (held) {
      setPendingPayout(held.reduce((s, p) => s + (p.amount ?? 0), 0))
    }

    setLoading(false)
  }

  const maxMonth = Math.max(...summary.map(m => m.total), 1)

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(147,51,234,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
          Earnings
        </h1>
      </div>

      <div className="relative px-5 pb-8 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              This month
            </p>
            <p className="text-xl font-semibold font-display" style={{ color: '#9333EA' }}>
              {formatCurrency(thisMonth)}
            </p>
          </div>
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              All time
            </p>
            <p className="text-xl font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalAllTime)}
            </p>
          </div>
        </div>

        {/* Pending payout */}
        {pendingPayout > 0 && (
          <div
            className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: '#FFB800', fontFamily: 'var(--font-body)' }}>
                Pending payout
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Released when session completes
              </p>
            </div>
            <p className="text-base font-semibold" style={{ color: '#FFB800', fontFamily: 'var(--font-body)' }}>
              {formatCurrency(pendingPayout)}
            </p>
          </div>
        )}

        {/* Monthly bar chart */}
        {summary.length > 0 && (
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-medium uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Monthly breakdown
            </p>
            <div className="flex items-end gap-2 h-24">
              {summary.reverse().map(month => (
                <div key={month.label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${(month.total / maxMonth) * 80}px`,
                      background: 'linear-gradient(180deg, #9333EA, rgba(147,51,234,0.3))',
                      minHeight: 4,
                    }}
                  />
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 9 }}>
                    {month.label.split(' ')[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Transaction History
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#9333EA', borderTopColor: 'transparent' }} />
            </div>
          ) : earnings.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
                No earnings yet.
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Complete your first Jinx to start earning.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {earnings.map(earning => (
                <div
                  key={earning.id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(147,51,234,0.1)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="8" stroke="#9333EA" strokeWidth="1.5" />
                      <path d="M9 5.5v7M7 8h3.5C11.33 8 12 8.67 12 9.5S11.33 11 10.5 11H7"
                        stroke="#9333EA" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {(earning.booking as Record<string, unknown>)?.client
                        ? ((earning.booking as Record<string, unknown>).client as Record<string, unknown>)?.full_name as string
                          || ((earning.booking as Record<string, unknown>).client as Record<string, unknown>)?.username as string
                        : 'Jinx session'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {formatRelativeTime(earning.created_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0"
                    style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                    +{formatCurrency(earning.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
