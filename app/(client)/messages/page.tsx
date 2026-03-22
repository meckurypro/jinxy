'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatRelativeTime } from '@/lib/utils'

interface ConversationItem {
  id: string
  booking_id: string
  is_active: boolean
  updated_at: string
  jinx: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  unread_count: number
  last_message_content: string | null
  last_message_time: string | null
}

// Inline skeleton — no external component needed
function ConversationsSkeleton() {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <div
            className="rounded-full flex-shrink-0"
            style={{ width: 52, height: 52, background: 'var(--bg-elevated)' }}
          />
          <div className="flex-1 space-y-2">
            <div style={{ height: 12, width: '35%', background: 'var(--bg-elevated)', borderRadius: 6 }} />
            <div style={{ height: 10, width: '60%', background: 'var(--bg-elevated)', borderRadius: 6 }} />
          </div>
          <div style={{ height: 10, width: 28, background: 'var(--bg-elevated)', borderRadius: 6 }} />
        </div>
      ))}
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) fetchConversations()
  }, [profile?.id])

  const fetchConversations = async () => {
    if (!profile?.id) return

    // Fetch conversations with their most recent message in one go.
    // We select messages ordered by created_at desc and limit 1 via
    // a nested select — avoids N+1 round trips.
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, booking_id, is_active, updated_at,
        jinx:users!conversations_jinx_id_fkey (
          id, username, full_name, avatar_url
        ),
        messages (
          content, created_at, sender_id, is_read
        )
      `)
      .eq('client_id', profile.id)
      .eq('client_deleted', false)
      .order('updated_at', { ascending: false })

    if (data) {
      const enriched: ConversationItem[] = (data as any[]).map(conv => {
        // Messages come back unordered — sort desc and take the first
        const sorted = (conv.messages ?? []).sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const lastMsg = sorted[0] ?? null
        const unread = sorted.filter(
          (m: any) => !m.is_read && m.sender_id !== profile.id
        ).length

        return {
          id: conv.id,
          booking_id: conv.booking_id,
          is_active: conv.is_active,
          updated_at: conv.updated_at,
          jinx: conv.jinx,
          last_message_content: lastMsg?.content ?? null,
          last_message_time: lastMsg?.created_at ?? null,
          unread_count: unread,
        }
      })
      setConversations(enriched)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
          Messages
        </h1>
      </div>

      {loading ? (
        <ConversationsSkeleton />
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 5H23C23.55 5 24 5.45 24 6V19C24 19.55 23.55 20 23 20H9L4 25V6C4 5.45 4.45 5 5 5Z"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
            No messages yet.
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
          >
            Messages open once you've confirmed a Jinx and paid.
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => router.push(`/messages/${conv.booking_id}`)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all duration-150"
              style={{
                background: conv.unread_count > 0
                  ? 'rgba(255,45,107,0.02)'
                  : 'transparent',
              }}
            >
              <div className="relative flex-shrink-0">
                <Avatar
                  src={conv.jinx?.avatar_url}
                  name={conv.jinx?.full_name || conv.jinx?.username || 'J'}
                  size={52}
                  showStatus
                  status={conv.is_active ? 'available' : 'offline'}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p
                    className="text-sm truncate"
                    style={{
                      color: conv.unread_count > 0
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontWeight: conv.unread_count > 0 ? 600 : 400,
                    }}
                  >
                    {conv.jinx?.full_name || conv.jinx?.username}
                  </p>
                  <p
                    className="text-xs flex-shrink-0 ml-2"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                  >
                    {conv.last_message_time
                      ? formatRelativeTime(conv.last_message_time)
                      : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <p
                    className="text-xs truncate flex-1"
                    style={{
                      color: conv.unread_count > 0
                        ? 'var(--text-secondary)'
                        : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {conv.last_message_content ??
                      (conv.is_active ? 'Session active' : 'Session ended')}
                  </p>
                  {conv.unread_count > 0 && (
                    <div
                      className="ml-2 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--pink)' }}
                    >
                      <span
                        className="text-white"
                        style={{ fontSize: 10, fontFamily: 'var(--font-body)' }}
                      >
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
