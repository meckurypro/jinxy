// app/(jinx)/jinx/profile/edit/page.tsx
// Edit Jinx profile fields: bio, area, rate, adult toggle, body_type, skin_tone
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'

const BODY_TYPES = ['slim', 'athletic', 'average', 'curvy', 'plus_size', 'muscular']

const SKIN_TONES = [
  { value: 'very_light', label: 'Very light', color: '#F5DEB3' },
  { value: 'light',      label: 'Light',      color: '#DEB887' },
  { value: 'medium',     label: 'Medium',     color: '#C8A07A' },
  { value: 'tan',        label: 'Tan',        color: '#A0714F' },
  { value: 'dark',       label: 'Dark',       color: '#7B4F2E' },
  { value: 'very_dark',  label: 'Very dark',  color: '#4A2E1A' },
  { value: 'obsidian',   label: 'Obsidian',   color: '#1A0D07' },
]

export default function JinxProfileEditPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [bio, setBio]                       = useState('')
  const [operatingArea, setOperatingArea]   = useState('')
  const [minRate, setMinRate]               = useState('')
  const [bodyType, setBodyType]             = useState('')
  const [skinTone, setSkinTone]             = useState('')
  const [isAdultEnabled, setIsAdultEnabled] = useState(false)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => { if (profile?.id) fetchProfile() }, [profile?.id])

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('jinx_profiles')
      .select('bio, operating_area, min_hourly_rate, body_type, skin_tone, is_adult_enabled')
      .eq('user_id', profile!.id)
      .maybeSingle()
    if (data) {
      setBio(data.bio ?? '')
      setOperatingArea(data.operating_area ?? '')
      setMinRate(data.min_hourly_rate ? data.min_hourly_rate.toLocaleString() : '')
      setBodyType(data.body_type ?? '')
      setSkinTone(data.skin_tone ?? '')
      setIsAdultEnabled(data.is_adult_enabled ?? false)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    const rateNum = parseInt(minRate.replace(/,/g, ''))
    if (!rateNum || rateNum < 1000) {
      setError('Minimum rate must be at least ₦1,000')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('jinx_profiles')
      .update({
        bio:              bio.trim() || null,
        operating_area:   operatingArea.trim() || null,
        min_hourly_rate:  rateNum,
        body_type:        bodyType,
        skin_tone:        skinTone,
        is_adult_enabled: isAdultEnabled,
      })
      .eq('user_id', profile!.id)
    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true)
    setSaving(false)
    setTimeout(() => { setSaved(false); router.back() }, 1200)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-input)', border: '1.5px solid var(--border)',
    borderRadius: 14, color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
  }

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-7 h-7 rounded-full border-2 animate-spin"
        style={{ borderColor: '#9333EA', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14 }}>Back</span>
        </button>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Edit Jinx profile</h1>
      </div>

      {/* Form */}
      <div className="px-5 pb-28 space-y-6">

        {/* Bio */}
        <div>
          <label className="text-xs font-medium uppercase tracking-widest block mb-2"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Bio
          </label>
          <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 150))} rows={4}
            placeholder="Tell clients about yourself..."
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
          <p className="text-right text-xs mt-1"
            style={{ color: bio.length >= 140 ? '#FF4D6A' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            {bio.length}/150
          </p>
        </div>

        {/* Operating area */}
        <div>
          <label className="text-xs font-medium uppercase tracking-widest block mb-2"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Operating area
          </label>
          <input type="text" value={operatingArea} onChange={e => setOperatingArea(e.target.value)}
            placeholder="e.g. Lekki, Lagos" style={inputStyle} />
        </div>

        {/* Min rate */}
        <div>
          <label className="text-xs font-medium uppercase tracking-widest block mb-2"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Minimum hourly rate (₦)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 15,
            }}>₦</span>
            <input type="tel" inputMode="numeric" value={minRate}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9]/g, '')
                setMinRate(raw ? parseInt(raw).toLocaleString() : '')
                setError('')
              }}
              placeholder="e.g. 25,000"
              style={{ ...inputStyle, paddingLeft: 28 }} />
          </div>
          {error && (
            <p className="mt-2 text-xs" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Body type */}
        <div>
          <label className="text-xs font-medium uppercase tracking-widest block mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Body type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {BODY_TYPES.map(bt => (
              <button key={bt} onClick={() => setBodyType(bt)}
                className="py-2.5 rounded-xl text-sm capitalize transition-all"
                style={{
                  background: bodyType === bt ? 'rgba(147,51,234,0.12)' : 'var(--bg-elevated)',
                  border: `1.5px solid ${bodyType === bt ? '#9333EA' : 'var(--border)'}`,
                  color: bodyType === bt ? '#9333EA' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                {bt.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Skin tone */}
        <div>
          <label className="text-xs font-medium uppercase tracking-widest block mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Skin tone
          </label>
          <div className="grid grid-cols-4 gap-3">
            {SKIN_TONES.map(st => (
              <button key={st.value} onClick={() => setSkinTone(st.value)}
                className="flex flex-col items-center gap-1.5"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: st.color,
                  border: `3px solid ${skinTone === st.value ? '#9333EA' : 'transparent'}`,
                  boxShadow: skinTone === st.value ? '0 0 0 2px rgba(147,51,234,0.3)' : 'none',
                  transition: 'all 150ms ease',
                }} />
                <span style={{
                  fontSize: 10, textAlign: 'center',
                  color: skinTone === st.value ? '#9333EA' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {st.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Adult toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              18+ bookings
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Accept adult booking requests
            </p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={isAdultEnabled}
              onChange={e => setIsAdultEnabled(e.target.checked)} />
            <span className="switch-track" />
          </label>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || saved}
          className="w-full py-4 rounded-full text-base font-semibold text-white"
          style={{
            background: saved ? '#00D97E' : '#9333EA',
            boxShadow: saved ? '0 4px 20px rgba(0,217,126,0.35)' : '0 4px 20px rgba(147,51,234,0.35)',
            border: 'none',
            cursor: (saving || saved) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            opacity: saving ? 0.7 : 1,
            transition: 'all 300ms ease',
          }}>
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
