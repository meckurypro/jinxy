'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'

export default function EditProfilePage() {
  const router = useRouter()
  const { profile, refresh } = useUser()
  const supabase = useSupabase()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Populate fields once profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setUsername(profile.username ?? '')
      setAvatarUrl(profile.avatar_url ?? '')
    }
  }, [profile?.id])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)
      await supabase.from('users').update({ avatar_url: url }).eq('id', profile.id)
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSave = async () => {
    if (!profile?.id) return
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Letters, numbers and underscores only'); return }

    setSaving(true)
    setError('')

    // Check uniqueness only if username changed
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
    setTimeout(() => { setSaved(false); router.back() }, 1200)
    setSaving(false)
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

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              src={avatarUrl}
              name={fullName || profile?.username || 'U'}
              size={88}
              showRing
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--pink)',
                border: '2px solid var(--bg-base)',
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? (
                <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin border-white" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Tap to change photo
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
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
              <span
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                }}
              >@</span>
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
          <p
            className="text-sm text-center"
            style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}
          >
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
