// app/(client)/account/preferences/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'

const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Plus-size', 'Muscular']
const ETHNICITIES = ['African', 'Arab', 'Asian', 'Caribbean', 'Caucasian', 'Hispanic', 'Mixed', 'South Asian']
const SKIN_TONES = [
  { label: 'Very fair', color: '#F5D5B8' },
  { label: 'Fair', color: '#E8B98A' },
  { label: 'Medium', color: '#C68642' },
  { label: 'Olive', color: '#A0694A' },
  { label: 'Brown', color: '#6E3B2A' },
  { label: 'Dark', color: '#3B1A0A' },
]

interface Prefs {
  interested_in: 'men' | 'women' | 'both'
  age_min: number
  age_max: number
  body_type: string[]
  ethnicity: string[]
  skin_tone: string[]
  include_adult: boolean
}

const DEFAULT_PREFS: Prefs = {
  interested_in: 'women',
  age_min: 18,
  age_max: 35,
  body_type: [],
  ethnicity: [],
  skin_tone: [],
  include_adult: false,
}

export default function PreferencesPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [adultConfirmOpen, setAdultConfirmOpen] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('client_profiles')
      .select('preferences')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...data.preferences })
        }
      })
  }, [profile?.id])

  const update = (key: keyof Prefs, value: unknown) => {
    setPrefs(p => ({ ...p, [key]: value }))
  }

  const toggleArray = (key: 'body_type' | 'ethnicity' | 'skin_tone', val: string) => {
    setPrefs(p => {
      const arr = p[key] as string[]
      return {
        ...p,
        [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val],
      }
    })
  }

  const handleSave = async () => {
    if (!profile?.id) return
    setSaving(true)
    await supabase
      .from('client_profiles')
      .update({ preferences: prefs })
      .eq('user_id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); router.back() }, 1200)
  }

  const toggleAdult = (val: boolean) => {
    if (val) {
      setAdultConfirmOpen(true)
    } else {
      update('include_adult', false)
    }
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 9999,
    border: `1.5px solid ${active ? 'var(--pink)' : 'var(--border)'}`,
    background: active ? 'rgba(255,45,107,0.08)' : 'var(--bg-elevated)',
    color: active ? 'var(--pink)' : 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  })

  const sectionLabel = (text: string) => (
    <p className="text-xs font-medium uppercase tracking-widest mb-3"
      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
      {text}
    </p>
  )

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
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
        <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
          My Preferences
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          These shape who Jinxy matches you with
        </p>
      </div>

     <div className="relative px-5 pb-36 space-y-7">

        {/* Interested in */}
        <div>
          {sectionLabel('I\'m interested in')}
          <div className="flex gap-2">
            {(['women', 'men', 'both'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => update('interested_in', opt)}
                style={{ ...chipStyle(prefs.interested_in === opt), flex: 1, padding: '12px 8px' }}
              >
                {opt === 'women' ? '👩 Women' : opt === 'men' ? '👨 Men' : '👥 Both'}
              </button>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div>
          {sectionLabel('Age range')}
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                {prefs.age_min} – {prefs.age_max} years
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Min age</label>
                  <span className="text-xs font-medium" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>{prefs.age_min}</span>
                </div>
                <input
                  type="range" min={18} max={prefs.age_max - 1} value={prefs.age_min}
                  onChange={e => update('age_min', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--pink)' }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Max age</label>
                  <span className="text-xs font-medium" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>{prefs.age_max === 60 ? '60+' : prefs.age_max}</span>
                </div>
                <input
                  type="range" min={prefs.age_min + 1} max={60} value={prefs.age_max}
                  onChange={e => update('age_max', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--pink)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Body type */}
        <div>
          {sectionLabel('Body type')}
          <div className="flex flex-wrap gap-2">
            {BODY_TYPES.map(bt => (
              <button
                key={bt}
                onClick={() => toggleArray('body_type', bt)}
                style={chipStyle(prefs.body_type.includes(bt))}
              >
                {bt}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Select all that apply · Leave empty for any
          </p>
        </div>

        {/* Ethnicity */}
        <div>
          {sectionLabel('Ethnicity')}
          <div className="flex flex-wrap gap-2">
            {ETHNICITIES.map(eth => (
              <button
                key={eth}
                onClick={() => toggleArray('ethnicity', eth)}
                style={chipStyle(prefs.ethnicity.includes(eth))}
              >
                {eth}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Select all that apply · Leave empty for any
          </p>
        </div>

        {/* Skin tone */}
        <div>
          {sectionLabel('Skin tone')}
          <div className="flex gap-3">
            {SKIN_TONES.map(st => {
              const active = prefs.skin_tone.includes(st.label)
              return (
                <button
                  key={st.label}
                  onClick={() => toggleArray('skin_tone', st.label)}
                  style={{
                    width: 40, height: 40,
                    borderRadius: '50%',
                    background: st.color,
                    border: active ? '3px solid var(--pink)' : '3px solid transparent',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 0 1px var(--pink)' : '0 0 0 1px rgba(255,255,255,0.1)',
                    transition: 'all 150ms ease',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {active && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)',
                    }}>
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Leave empty for any
          </p>
        </div>

        {/* Adult content — 18+ */}
        <div>
          {sectionLabel('Content')}
          <div
            className="flex items-center justify-between p-4 rounded-2xl"
            style={{
              background: prefs.include_adult ? 'rgba(255,45,107,0.06)' : 'var(--bg-surface)',
              border: `1px solid ${prefs.include_adult ? 'rgba(255,45,107,0.2)' : 'var(--border)'}`,
              transition: 'all 200ms ease',
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  Adult content
                </p>
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{ background: 'rgba(255,45,107,0.15)', color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: 10 }}
                >
                  18+
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Include adult-rated Jinxes in your matches
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={prefs.include_adult}
                onChange={e => toggleAdult(e.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-app mx-auto px-5 pb-8 pt-4"
        style={{ background: 'linear-gradient(to top, var(--bg-base) 70%, transparent)' }}
      >
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full py-4 rounded-full text-base font-semibold text-white"
          style={{
            background: saved ? '#00D97E' : 'var(--pink)',
            border: 'none',
            cursor: (saving || saved) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            boxShadow: saved ? '0 4px 20px rgba(0,217,126,0.35)' : '0 4px 20px rgba(255,45,107,0.35)',
            opacity: saving ? 0.7 : 1,
            transition: 'all 300ms ease',
          }}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>

      {/* Adult content confirmation sheet */}
      {adultConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setAdultConfirmOpen(false)}
        >
          <div
            className="w-full max-w-app px-5 pb-10 pt-5 rounded-t-3xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--border)' }} />
            <div className="text-center mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(255,45,107,0.1)', border: '1px solid rgba(255,45,107,0.2)' }}
              >
                <span style={{ fontSize: 24 }}>🔞</span>
              </div>
              <h2 className="font-display text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Adult content
              </h2>
              <p className="text-sm px-4" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                By enabling this, you confirm that you are 18 or older and consent to seeing adult-rated profiles and content on Jinxy. This setting can be turned off at any time.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { update('include_adult', true); setAdultConfirmOpen(false) }}
                className="w-full py-4 rounded-full text-sm font-semibold text-white"
                style={{
                  background: 'var(--pink)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
                }}
              >
                I confirm, I'm 18+
              </button>
              <button
                onClick={() => setAdultConfirmOpen(false)}
                className="w-full py-3.5 rounded-full text-sm font-medium"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
