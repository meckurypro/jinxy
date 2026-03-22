// app/(client)/account/edit/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'

export default function EditProfilePage() {
  const router = useRouter()
  const { profile, refresh } = useUser()
  const supabase = useSupabase()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setUsername(profile.username ?? '')
    }
  }, [profile?.id])

  const handleSave = async () => {
    if (!profile?.id) return
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Letters, numbers and underscores only'); return }

    setSaving(true)
    setError('')

    if (username !== profile.username) {
      const { data: taken } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', profile.id)
        .maybeSingle()

      if (taken) {
        setError('Username already taken')
        setSaving(false)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: fullName.trim() || null,
        username: username.toLowerCase(),
      })
      .eq('id', profile.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    await refresh()
    setSaved(true)
    setSaving(false)
    setTimeout(() => { setSaved(false); router.back() }, 1200)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--bg-input)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
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
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
        </button>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
          Edit Profile
        </h1>
      </div>

      <div className="px-5 pb-8 space-y-6">

        {/* Avatar — read only */}
        <div className="flex flex-col items-center gap-2">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || 'U'}
            size={88}
          />
          {/* Change DP link — goes back to account page where AvatarViewer lives */}
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--pink)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Change display photo
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Full name</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Your name"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setError('') }}
            />
          </div>

          <div>
            <label style={labelStyle}>Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 16, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
              }}>@</span>
              <input
                type="text"
                style={{ ...inputStyle, paddingLeft: 28 }}
                placeholder="yourhandle"
                value={username}
                onChange={e => { setUsername(e.target.value.toLowerCase()); setError('') }}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
              value={profile?.email ?? ''}
              disabled
            />
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Contact support to change your email
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
            {error}
          </p>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full py-4 rounded-full text-base font-semibold text-white"
          style={{
            background: saved ? '#00D97E' : 'var(--pink)',
            boxShadow: saved
              ? '0 4px 20px rgba(0,217,126,0.35)'
              : '0 4px 20px rgba(255,45,107,0.35)',
            border: 'none',
            cursor: (saving || saved) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            opacity: saving ? 0.7 : 1,
            transition: 'all 300ms ease',
          }}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
