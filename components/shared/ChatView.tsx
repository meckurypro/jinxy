// components/shared/ChatView.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
}

interface ConversationMeta {
  id: string
  is_active: boolean
  jinx: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  client: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface ChatViewProps {
  bookingId: string
  /** Where the back chevron navigates to */
  backHref: string
  /** Where the "Booking" pill navigates to */
  bookingHref: string
}

export function ChatView({ bookingId, backHref, bookingHref }: ChatViewProps) {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [conversation, setConversation] = useState<ConversationMeta | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!bookingId || !profile?.id) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: conv } = await supabase
        .from('conversations')
        .select(`
          id, is_active,
          jinx:users!conversations_jinx_id_fkey (
            id, username, full_name, avatar_url
          ),
          client:users!conversations_client_id_fkey (
            id, username, full_name, avatar_url
          )
        `)
        .eq('booking_id', bookingId)
        .single()

      if (!conv) { setLoading(false); return }
      setConversation(conv as unknown as ConversationMeta)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })

      if (msgs) setMessages(msgs as Message[])

      // Mark incoming as read
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conv.id)
        .neq('sender_id', profile.id)
        .eq('is_read', false)

      setLoading(false)

      channel = supabase
        .channel(`messages-${conv.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conv.id}`,
          },
          payload => {
            setMessages(prev => [...prev, payload.new as Message])
            if (payload.new.sender_id !== profile.id) {
              supabase
                .from('messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', payload.new.id)
                .then(() => {})
            }
          }
        )
        .subscribe()
    }

    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [bookingId, profile?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !conversation?.id || !profile?.id || sending) return
    if (!conversation.is_active) return

    setSending(true)
    const content = input.trim()
    setInput('')

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: profile.id,
      content,
    })

    if (error) setInput(content)
    setSending(false)
    inputRef.current?.focus()
  }

  const otherUser =
    profile?.id === conversation?.jinx?.id
      ? conversation?.client
      : conversation?.jinx

  const isActive = conversation?.is_active ?? false

  // Group messages by calendar date
  const groupedMessages = messages.reduce<{ date: string; messages: Message[] }[]>(
    (groups, msg) => {
      const date = new Date(msg.created_at).toLocaleDateString('en-NG', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      const last = groups[groups.length - 1]
      if (last && last.date === date) {
        last.messages.push(msg)
      } else {
        groups.push({ date, messages: [msg] })
      }
      return groups
    },
    []
  )

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-14 pb-3 sticky top-0 z-10"
        style={{
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => router.push(backHref)}
          style={{
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {loading ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="rounded-full flex-shrink-0"
              style={{ width: 40, height: 40, background: 'var(--bg-elevated)' }} />
            <div className="space-y-1.5">
              <div style={{ height: 12, width: 100, background: 'var(--bg-elevated)', borderRadius: 6 }} />
              <div style={{ height: 10, width: 60, background: 'var(--bg-elevated)', borderRadius: 6 }} />
            </div>
          </div>
        ) : (
          <>
            <Avatar
              src={otherUser?.avatar_url ?? null}
              name={otherUser?.full_name || otherUser?.username || 'U'}
              size={40}
              showStatus
              status={isActive ? 'available' : 'offline'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                {otherUser?.full_name || otherUser?.username}
              </p>
              <p className="text-xs"
                style={{
                  color: isActive ? '#00D97E' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                }}>
                {isActive ? 'Session active' : 'Session ended'}
              </p>
            </div>

            <button
              onClick={() => router.push(bookingHref)}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Booking
            </button>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i}
                className={`flex items-end gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="rounded-full flex-shrink-0"
                  style={{ width: 28, height: 28, background: 'var(--bg-elevated)' }} />
                <div style={{
                  height: 40, width: `${40 + i * 15}%`,
                  background: 'var(--bg-elevated)', borderRadius: 16,
                }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Say hello 👋
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map(group => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <p className="text-xs flex-shrink-0"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {group.date}
                  </p>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === profile?.id
                  const prevMsg = group.messages[i - 1]
                  const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id)

                  return (
                    <div key={msg.id}
                      className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwn && (
                        <div className="w-7 flex-shrink-0">
                          {showAvatar && (
                            <Avatar
                              src={otherUser?.avatar_url ?? null}
                              name={otherUser?.full_name || otherUser?.username || 'U'}
                              size={28}
                            />
                          )}
                        </div>
                      )}

                      <div className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                        style={{
                          background: isOwn ? 'var(--pink)' : 'var(--bg-elevated)',
                          borderBottomRightRadius: isOwn ? 4 : undefined,
                          borderBottomLeftRadius: !isOwn ? 4 : undefined,
                        }}>
                        <p className="text-sm"
                          style={{
                            color: isOwn ? 'white' : 'var(--text-primary)',
                            fontFamily: 'var(--font-body)',
                            lineHeight: 1.5,
                          }}>
                          {msg.content}
                        </p>
                        <p className="text-right mt-0.5"
                          style={{
                            fontSize: 10,
                            color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                            fontFamily: 'var(--font-body)',
                          }}>
                          {new Date(msg.created_at).toLocaleTimeString('en-NG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {isOwn && (
                            <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'calc(12px + var(--safe-bottom, 0px))',
        }}
      >
        {isActive ? (
          <>
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--bg-input)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
              placeholder="Message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: input.trim() ? 'var(--pink)' : 'var(--bg-elevated)',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                boxShadow: input.trim() ? '0 4px 12px rgba(255,45,107,0.4)' : 'none',
                transition: 'all 200ms ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l2 6-2 6 12-6z"
                  fill={input.trim() ? 'white' : 'var(--text-muted)'} />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex-1 text-center py-2">
            <p className="text-xs"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              This session has ended. Chat is read-only.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
