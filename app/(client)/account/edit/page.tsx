'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'

export default function EditProfilePage() {
  const router = useRouter()
  const { profile, refresh } = useUser()
  const supabase = useSupabase()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')

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
      const url = data.publicUrl + `?t=${Date.now()}`
      setAvatarUrl(url)

      await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', profile.id)
    }

    setUploading(false)
  }

  const handleSave = async () => {
    if (!profile?.id) return
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Letters, numbers and underscores only'); return }

    setSaving(true)
    setError('')

    // Check username uniqueness (only if changed)
    if (username !== profile.username) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', profile.id)
        .maybeSingle()

      if (data) {
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
    } else {
      await refresh()
      setSaved(true)
      setTimeout(() => { setSaved(false); router.back() }, 1000)
    }

    setSaving(false)
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
          Edit Profile
        </h1>
      </div>

      <div className="px-5 pb-8 space-y-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              src={avatarUrl || profile?.avatar_url}
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="input-label">Full name</label>
            <input
              type="text"
              className="input"
              placeholder="Your name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">Username</label>
            <div className="input-wrapper">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >@</span>
              <input
                type="text"
                className="input"
                style={{ paddingLeft: 28 }}
                placeholder="yourhandle"
                value={username}
                onChange={e => { setUsername(e.target.value.toLowerCase()); setError('') }}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              value={profile?.email ?? ''}
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Contact support to change your email
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-center" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
            {error}
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full py-4 rounded-full text-base font-semibold text-white"
          style={{
            background: saved ? '#00D97E' : 'var(--pink)',
            boxShadow: saved ? '0 4px 20px rgba(0,217,126,0.35)' : '0 4px 20px rgba(255,45,107,0.35)',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
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
