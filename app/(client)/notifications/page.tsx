// app/(client)/notifications/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { formatRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  data: Record<string, unknown> | null
}

function Skeleton() {
  return (
    <div className="space-y-px">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-3 px-5 py-4">
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.06)',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }} />
          <div className="flex-1 space-y-2 pt-1">
            <div style={{ height: 13, width: '55%', borderRadius: 5, background: 'rgba(255,255,255,0.06)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 11, width: '80%', borderRadius: 5, background: 'rgba(255,255,255,0.06)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) fetchAndMarkRead()
  }, [profile?.id])

  const fetchAndMarkRead = async () => {
    if (!profile?.id) return
    setLoading(true)

    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, is_read, created_at, data')
      .eq('user_id', profile.id)
      .in('type', ['system', 'admin'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setNotifications(data as Notification[])
      // Mark all fetched as read
      const unreadIds = (data as Notification[]).filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in('id', unreadIds)
      }
    }

    setLoading(false)
  }

  const handleTap = (notif: Notification) => {
    const screen = notif.data?.screen as string | undefined
    if (screen) router.push(screen)
  }

  const todayStr = new Date().toDateString()
  const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString()

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr).toDateString()
    if (d === todayStr) return 'Today'
    if (d === yesterdayStr) return 'Yesterday'
    return new Date(dateStr).toLocaleDateString('en-NG', { month: 'long', day: 'numeric' })
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.04) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </h1>
          <div style={{ width: 28 }} />
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4C10.13 4 7 7.13 7 11V17L5 19V20H23V19L21 17V11C21 7.13 17.87 4 14 4Z"
                stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
              <path d="M11 20C11 21.66 12.34 23 14 23C15.66 23 17 21.66 17 20"
                stroke="var(--text-muted)" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
            All clear
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            No messages from Jinxy yet.
          </p>
        </div>
      ) : (
        <div className="pb-6">
          {notifications.map((notif, idx) => {
            const thisDate = new Date(notif.created_at).toDateString()
            const prevDate = idx > 0 ? new Date(notifications[idx - 1].created_at).toDateString() : null
            const showSep = idx === 0 || thisDate !== prevDate

            return (
              <div key={notif.id}>
                {showSep && (
                  <div className="flex items-center gap-3 px-5 py-2">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <p className="text-xs flex-shrink-0"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                      {getDateLabel(notif.created_at)}
                    </p>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                )}

                <button
                  onClick={() => handleTap(notif)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left transition-all duration-150"
                  style={{
                    background: notif.is_read ? 'transparent' : 'rgba(255,45,107,0.025)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: notif.is_read ? 'var(--bg-elevated)' : 'rgba(255,45,107,0.08)',
                      border: `1px solid ${notif.is_read ? 'var(--border)' : 'rgba(255,45,107,0.15)'}`,
                    }}>
                    <span style={{ fontSize: 18 }}>
                      {notif.type === 'admin' ? '🔔' : '📢'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm"
                        style={{
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-body)',
                          fontWeight: notif.is_read ? 400 : 600,
                          lineHeight: 1.4,
                        }}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        {!notif.is_read && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pink)' }} />
                        )}
                        <p className="text-xs"
                          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs"
                      style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                      {notif.body}
                    </p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
