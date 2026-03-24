// app/(jinx)/notifications/page.tsx
// All notification types for Jinx (not just system — also booking requests, payouts, etc.)
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { formatRelativeTime } from '@/lib/utils'

interface Notification {
  id: string; type: string; title: string; body: string
  is_read: boolean; created_at: string; data: Record<string,unknown> | null
}

const TYPE_ICON: Record<string, string> = {
  system: '📢', admin: '🔔', booking_request: '📋', match_found: '💜',
  payout: '💰', payment_received: '💵', booking_confirmed: '✅',
  session_started: '🟢', session_ended: '🏁', default: '🔔',
}

export default function JinxNotificationsPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) fetchAndMarkRead() }, [profile?.id])

  const fetchAndMarkRead = async () => {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, is_read, created_at, data')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(60)
    if (data) {
      setNotifications(data as Notification[])
      const unreadIds = (data as Notification[]).filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length > 0) await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', unreadIds)
    }
    setLoading(false)
  }

  const handleTap = (notif: Notification) => {
    const screen = notif.data?.screen as string | undefined
    if (screen) router.push(screen)
  }

  const todayStr = new Date().toDateString()
  const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString()
  const getDateLabel = (d: string) => {
    const ds = new Date(d).toDateString()
    if (ds === todayStr) return 'Today'
    if (ds === yesterdayStr) return 'Yesterday'
    return new Date(d).toLocaleDateString('en-NG', { month: 'long', day: 'numeric' })
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(147,51,234,0.06) 0%, transparent 60%)' }} />

      <div className="relative px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          <div style={{ width: 28 }} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#9333EA', borderTopColor: 'transparent' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-8">
          <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>All clear</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>No notifications yet.</p>
        </div>
      ) : (
        <div className="pb-6">
          {notifications.map((notif, idx) => {
            const thisDate = new Date(notif.created_at).toDateString()
            const prevDate = idx > 0 ? new Date(notifications[idx-1].created_at).toDateString() : null
            const showSep = idx === 0 || thisDate !== prevDate
            return (
              <div key={notif.id}>
                {showSep && (
                  <div className="flex items-center gap-3 px-5 py-2">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{getDateLabel(notif.created_at)}</p>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                )}
                <button onClick={() => handleTap(notif)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left transition-all duration-150"
                  style={{ background: notif.is_read ? 'transparent' : 'rgba(147,51,234,0.025)', borderBottom: '1px solid var(--border)' }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: notif.is_read ? 'var(--bg-elevated)' : 'rgba(147,51,234,0.1)', border: `1px solid ${notif.is_read ? 'var(--border)' : 'rgba(147,51,234,0.2)'}` }}>
                    <span style={{ fontSize: 18 }}>{TYPE_ICON[notif.type] ?? TYPE_ICON.default}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: notif.is_read ? 400 : 600, lineHeight: 1.4 }}>{notif.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        {!notif.is_read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9333EA' }} />}
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{formatRelativeTime(notif.created_at)}</p>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>{notif.body}</p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
