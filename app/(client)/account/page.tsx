'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'

export default function AccountPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const handleSwitchToJinx = () => {
    router.push('/jinx/dashboard')
  }

  const menuSections = [
    {
      title: 'Account',
      items: [
        { label: 'Edit profile', icon: '👤', action: () => router.push('/account/edit') },
        { label: 'Security', icon: '🔒', action: () => router.push('/account/settings?section=security') },
        { label: 'Dark mode', icon: '🌙', action: () => router.push('/account/settings?section=appearance'), toggle: true },
        { label: 'Privacy', icon: '🛡️', action: () => router.push('/account/settings?section=privacy') },
      ],
    },
    {
      title: 'Intimacy Settings',
      items: [
        { label: 'My preferences', icon: '✨', action: () => router.push('/account/settings?section=preferences') },
        { label: 'Jinx Mode', icon: '💜', action: handleSwitchToJinx, highlight: true },
      ],
    },
    {
      title: 'Support & About',
      items: [
        { label: 'My subscription', icon: '⭐', action: () => router.push('/account/subscription') },
        { label: 'Help & support', icon: '💬', action: () => router.push('/account/help') },
        { label: 'Terms & policies', icon: '📄', action: () => router.push('/account/terms') },
      ],
    },
    {
      title: 'Actions',
      items: [
        { label: 'Report a problem', icon: '🚩', action: () => router.push('/account/report') },
        { label: 'Log out', icon: '👋', action: handleSignOut, danger: true },
      ],
    },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Profile header */}
      <div className="relative px-5 pt-14 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || 'U'}
            size={72}
            showRing
            onClick={() => router.push('/account/edit')}
          />
          <div className="flex-1 min-w-0">
            <h1
              className="font-display text-xl truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {profile?.full_name || profile?.username || 'Loading...'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              @{profile?.username}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 gap-3 p-4 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {[
            { label: 'Favourites', value: '—' },
            { label: 'Likes', value: '—' },
            { label: 'Jinxes', value: '—' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Credits */}
        {(profile?.jinxy_credits ?? 0) > 0 && (
          <div
            className="mt-3 flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'rgba(255,45,107,0.06)', border: '1px solid var(--border-pink)' }}
          >
            <div className="flex items-center gap-2">
              <span>💰</span>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                Jinxy Credits
              </p>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
              {formatCurrency(profile?.jinxy_credits ?? 0)}
            </p>
          </div>
        )}
      </div>

      {/* Menu sections */}
      <div className="relative px-5 pb-8 space-y-6">
        {menuSections.map(section => (
          <div key={section.title}>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
            >
              {section.title}
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150"
                  style={{
                    borderBottom: idx < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'transparent',
                  }}
                >
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{
                      color: (item as { danger?: boolean }).danger
                        ? 'var(--red)'
                        : (item as { highlight?: boolean }).highlight
                        ? '#9333EA'
                        : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {item.label}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
