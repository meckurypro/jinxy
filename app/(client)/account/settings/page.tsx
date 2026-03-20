'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const section = searchParams.get('section') ?? 'general'
  const { profile, refresh } = useUser()
  const supabase = useSupabase()

  const [darkMode, setDarkMode] = useState(profile?.dark_mode ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleDarkMode = async (val: boolean) => {
    setDarkMode(val)
    document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light')
    localStorage.setItem('jinxy-theme', val ? 'dark' : 'light')

    if (profile?.id) {
      await supabase
        .from('users')
        .update({ dark_mode: val })
        .eq('id', profile.id)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await refresh()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
        </button>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
      </div>

      <div className="px-5 pb-8 space-y-6">

        {/* Appearance */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Appearance
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  Dark mode
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Easier on the eyes at night
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={e => toggleDarkMode(e.target.checked)}
                />
                <span className="switch-track" />
              </label>
            </div>
          </div>
        </div>

        {/* Account */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Account
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            {[
              { label: 'Change email', sub: profile?.email ?? '', action: () => {} },
              { label: 'Change country', sub: 'Nigeria', action: () => {} },
              { label: 'Delete account', sub: 'Permanently remove your account', action: () => {}, danger: true },
            ].map((item, idx, arr) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                style={{
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'transparent',
                }}
              >
                <div>
                  <p className="text-sm font-medium"
                    style={{
                      color: (item as { danger?: boolean }).danger ? 'var(--red)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {item.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {item.sub}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Notifications
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            {[
              { label: 'New matches', sub: 'When Jinxes accept your request' },
              { label: 'Messages', sub: 'New messages from your Jinx' },
              { label: 'Credits & rewards', sub: 'Referral earnings and expiry' },
            ].map((item, idx, arr) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-4 py-3.5"
                style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    {item.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {item.sub}
                  </p>
                </div>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="switch-track" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* App info */}
        <div className="text-center pt-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Jinxy v1.0.0 · Made with 💜 in Lagos
          </p>
        </div>
      </div>
    </div>
  )
}
