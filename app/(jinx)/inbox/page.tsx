// app/(jinx)/messages/page.tsx
// Mirrors client messages but queries as jinx_id
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
  client: { id: string; username: string; full_name: string | null; avatar_url: string | null }
  unread_count: number
  last_message_content: string | null
  last_message_time: string | null
}

function Shimmer({ width, height, rounded = 8 }: { width: string | number; height: number; rounded?: number }) {
  return <div style={{ width, height, borderRadius: rounded, background: 'rgba(147,51,234,0.08)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
}

export default function JinxMessagesPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) fetchConversations() }, [profile?.id])

  const fetchConversations = async () => {
    if (!profile?.id) return
    const { data: convData } = await supabase
      .from('conversations')
      .select(`id, booking_id, is_active, updated_at, client:users!conversations_client_id_fkey ( id, username, full_name, avatar_url )`)
      .eq('jinx_id', profile.id)
      .eq('jinx_deleted', false)
      .order('updated_at', { ascending: false })

    if (!convData || convData.length === 0) { setLoading(false); return }

    const lastMsgPromises = (convData as Record<string,unknown>[]).map(c =>
      supabase.from('messages').select('conversation_id, content, created_at, sender_id, is_read')
        .eq('conversation_id', c.id as string).order('created_at', { ascending: false }).limit(1).maybeSingle()
    )
    const unreadPromises = (convData as Record<string,unknown>[]).map(c =>
      supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id as string).eq('is_read', false).neq('sender_id', profile.id)
    )
    const [lastMsgs, unreads] = await Promise.all([Promise.all(lastMsgPromises), Promise.all(unreadPromises)])

    setConversations((convData as unknown as ConversationItem[]).map((conv, idx) => {
      const lastMsg = lastMsgs[idx]?.data as Record<string,unknown> | null
      return {
        ...conv,
        last_message_content: lastMsg?.content as string ?? null,
        last_message_time: lastMsg?.created_at as string ?? null,
        unread_count: unreads[idx]?.count ?? 0,
      }
    }))
    setLoading(false)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="px-5 pt-14 pb-4">
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Messages</h1>
      </div>

      {loading ? (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Shimmer width={52} height={52} rounded={9999} />
              <div className="flex-1 space-y-2"><Shimmer width="35%" height={12} rounded={5}/><Shimmer width="60%" height={10} rounded={4}/></div>
              <Shimmer width={28} height={10} rounded={5} />
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-8">
          <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>No messages yet.</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Messages open once a booking is confirmed and paid.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {conversations.map(conv => (
            <button key={conv.id}
              onClick={() => router.push(`/jinx/messages/${conv.booking_id}`)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left"
              style={{ background: conv.unread_count > 0 ? 'rgba(147,51,234,0.03)' : 'transparent' }}>
              <Avatar src={conv.client?.avatar_url} name={conv.client?.full_name || conv.client?.username || 'C'} size={52}
                showStatus status={conv.is_active ? 'available' : 'offline'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm truncate" style={{ color: conv.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontWeight: conv.unread_count > 0 ? 600 : 400 }}>
                    {conv.client?.full_name || conv.client?.username}
                  </p>
                  <p className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {conv.last_message_time ? formatRelativeTime(conv.last_message_time) : ''}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs truncate flex-1" style={{ color: conv.unread_count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {conv.last_message_content ?? (conv.is_active ? 'Session active' : 'Session ended')}
                  </p>
                  {conv.unread_count > 0 && (
                    <div className="ml-2 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#9333EA' }}>
                      <span className="text-white" style={{ fontSize: 10, fontFamily: 'var(--font-body)' }}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <style jsx>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  )
}
