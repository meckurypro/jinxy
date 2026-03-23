// components/shared/BottomNav.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CLIENT_TABS = [
  { id: 'home',     href: '/home',     label: 'Home',     icon: HomeIcon },
  { id: 'jinxes',   href: '/jinxes',   label: 'Jinxes',   icon: JinxesIcon },
  { id: 'find',     href: '/find',     label: '',         icon: FindIcon, center: true },
  { id: 'messages', href: '/messages', label: 'Messages', icon: MessagesIcon },
  { id: 'account',  href: '/account',  label: 'Account',  icon: AccountIcon },
]

const JINX_TABS = [
  { id: 'dashboard',    href: '/jinx/dashboard',    label: 'Home',     icon: HomeIcon },
  { id: 'requests',     href: '/jinx/requests',     label: 'Requests', icon: JinxesIcon },
  { id: 'availability', href: '/jinx/availability', label: '',         icon: AvailabilityIcon, center: true },
  { id: 'earnings',     href: '/jinx/earnings',     label: 'Earnings', icon: EarningsIcon },
  { id: 'account',      href: '/account',           label: 'Account',  icon: AccountIcon },
]

interface Dots {
  home: boolean      // unread system/admin notifications
  messages: boolean  // unread messages or invite links
  jinxes: boolean    // booking/session updates
}

interface BottomNavProps {
  mode?: 'client' | 'jinx'
}

export function BottomNav({ mode = 'client' }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const tabs = mode === 'jinx' ? JINX_TABS : CLIENT_TABS
  const [dots, setDots] = useState<Dots>({ home: false, messages: false, jinxes: false })

  useEffect(() => {
    fetchDots()
    const interval = setInterval(fetchDots, 60_000)
    return () => clearInterval(interval)
  }, [])

  const fetchDots = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [sysRes, msgRes, bookingRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .in('type', ['system', 'admin']),

        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .in('type', ['message', 'invite']),

        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .in('type', ['booking_confirmed', 'booking_cancelled', 'session_started', 'session_ended', 'match_found']),
      ])

      setDots({
        home: (sysRes.count ?? 0) > 0,
        messages: (msgRes.count ?? 0) > 0,
        jinxes: (bookingRes.count ?? 0) > 0,
      })
    } catch {
      // Silently fail — dots just won't show
    }
  }

  const getDot = (tabId: string): boolean => {
    if (tabId === 'home') return dots.home
    if (tabId === 'messages') return dots.messages
    if (tabId === 'jinxes') return dots.jinxes
    return false
  }

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        const Icon = tab.icon
        const hasDot = getDot(tab.id)

        if ((tab as { center?: boolean }).center) {
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className="relative -mt-6 flex items-center justify-center"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: mode === 'jinx'
                    ? 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)'
                    : 'linear-gradient(135deg, #FF2D6B 0%, #C41751 100%)',
                  boxShadow: mode === 'jinx'
                    ? '0 4px 20px rgba(147,51,234,0.5), 0 0 0 4px rgba(147,51,234,0.1)'
                    : '0 4px 20px rgba(255,45,107,0.5), 0 0 0 4px rgba(255,45,107,0.1)',
                  transform: isActive ? 'scale(0.95)' : 'scale(1)',
                }}
              >
                <Icon active={isActive} mode={mode} />
              </div>
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            className="flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200"
            style={{
              color: isActive ? 'var(--pink)' : 'var(--text-muted)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div
              className="relative"
              style={{
                transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'transform 200ms ease',
              }}
            >
              <Icon active={isActive} mode={mode} />
              {hasDot && (
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 7, height: 7,
                    background: '#FF2D6B',
                    border: '1.5px solid var(--bg-base)',
                    top: -1, right: -1,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 500,
              fontFamily: 'var(--font-body)',
              color: isActive
                ? (mode === 'jinx' ? '#9333EA' : 'var(--pink)')
                : 'var(--text-muted)',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function HomeIcon({ active }: { active: boolean; mode?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3L19 9.5V19C19 19.55 18.55 20 18 20H14V15H8V20H4C3.45 20 3 19.55 3 19V9.5Z"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function JinxesIcon({ active }: { active: boolean; mode?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="4"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
        stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11h8M7 7.5h5M7 14.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function FindIcon({ active, mode }: { active: boolean; mode?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M13 5C13 5 7 9.5 7 14.5C7 17.81 9.69 20.5 13 20.5C16.31 20.5 19 17.81 19 14.5C19 9.5 13 5 13 5Z"
        fill="white" fillOpacity="0.9" />
      <path d="M13 10V17M10 13.5H16"
        stroke={mode === 'jinx' ? '#9333EA' : '#FF2D6B'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MessagesIcon({ active }: { active: boolean; mode?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 4H18C18.55 4 19 4.45 19 5V14C19 14.55 18.55 15 18 15H7L3 19V5C3 4.45 3.45 4 4 4Z"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AccountIcon({ active }: { active: boolean; mode?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
        stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 19C3 15.69 6.69 13 11 13C15.31 13 19 15.69 19 19"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AvailabilityIcon({ active }: { active: boolean; mode?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="8" fill="white" fillOpacity="0.9" />
      <path d="M13 9V13.5L16 16" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EarningsIcon({ active }: { active: boolean; mode?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 3C11 3 5 6 5 11C5 14.31 7.69 17 11 17C14.31 17 17 14.31 17 11C17 6 11 3 11 3Z"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
        stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 7.5V14.5M9 9.5H12.5C13.33 9.5 14 10.17 14 11C14 11.83 13.33 12.5 12.5 12.5H9"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
