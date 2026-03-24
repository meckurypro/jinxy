// app/(client)/account/become-jinx/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'

type Step = 'gender' | 'orientation' | 'ethnicity' | 'body_type' | 'skin_tone' | 'bio' | 'area' | 'rate' | 'adult' | 'done'

const STEPS: Step[] = ['gender', 'orientation', 'ethnicity', 'body_type', 'skin_tone', 'bio', 'area', 'rate', 'adult']

// enum orientation_type: {straight, bi, gay, lesbian}
const ORIENTATIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay',      label: 'Gay' },
  { value: 'lesbian',  label: 'Lesbian' },
  { value: 'bi',       label: 'Bisexual' },
]

const ETHNICITIES = ['Edo', 'Efik', 'Hausa', 'Igbo', 'Ijaw', 'Other', 'Tiv', 'Yoruba']

// enum body_type: {slim, athletic, curvy, plus_size, muscular, average}
const BODY_TYPES = [
  { value: 'slim',      label: 'Slim' },
  { value: 'athletic',  label: 'Athletic' },
  { value: 'average',   label: 'Average' },
  { value: 'curvy',     label: 'Curvy' },
  { value: 'plus_size', label: 'Plus size' },
  { value: 'muscular',  label: 'Muscular' },
]

// enum skin_tone: {very_light, light, medium, tan, dark, very_dark, obsidian}
// Run in Supabase before deploying: ALTER TYPE skin_tone ADD VALUE 'obsidian' AFTER 'very_dark';
const SKIN_TONES = [
  { value: 'very_light', label: 'Very light',  color: '#F5DEB3' },
  { value: 'light',      label: 'Light',        color: '#DEB887' },
  { value: 'medium',     label: 'Medium',       color: '#C8A07A' },
  { value: 'tan',        label: 'Tan',          color: '#A0714F' },
  { value: 'dark',       label: 'Dark',         color: '#7B4F2E' },
  { value: 'very_dark',  label: 'Very dark',    color: '#4A2E1A' },
  { value: 'obsidian',   label: 'Obsidian',     color: '#1A0D07' },
]

function Spinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
      <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export default function BecomeJinxPage() {
  const router = useRouter()
  const { profile, refresh } = useUser()
  const supabase = useSupabase()

  const [step, setStep] = useState<Step>('gender')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Gender is locked to whatever was set at sign-up — never editable here
  const lockedGender = profile?.gender ?? ''

  const [orientation, setOrientation]       = useState('')
  const [ethnicity, setEthnicity]           = useState('')
  const [bodyType, setBodyType]             = useState('')
  const [skinTone, setSkinTone]             = useState('')
  const [bio, setBio]                       = useState('')
  const [operatingArea, setOperatingArea]   = useState('')
  const [minRate, setMinRate]               = useState('')
  const [isAdultEnabled, setIsAdultEnabled] = useState(false)

  const stepIndex = STEPS.indexOf(step)
  const progress  = (stepIndex / (STEPS.length - 1)) * 100

  const goBack = () => {
    if (stepIndex === 0) { router.back(); return }
    setStep(STEPS[stepIndex - 1])
    setError('')
  }

  const goNext = () => {
    setError('')
    setStep(STEPS[stepIndex + 1])
  }

  const handleComplete = async () => {
    if (!profile?.id) {
      setError('Session could not be loaded. Please refresh and try again.')
      return
    }

    const rateNum = parseInt(minRate.replace(/,/g, ''))
    if (!rateNum || rateNum < 1000) {
      setError('Minimum rate must be at least ₦1,000')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: existing, error: checkError } = await supabase
        .from('jinx_profiles')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (checkError) throw checkError

      const profilePayload = {
        user_id:          profile.id,
        gender:           lockedGender as 'male' | 'female',  // enum gender_type: {male, female}
        orientation,                                           // enum orientation_type: {straight, bi, gay, lesbian}
        skin_tone:        skinTone,                            // enum skin_tone: {very_light, light, medium, tan, dark, very_dark, obsidian}
        body_type:        bodyType,                            // enum body_type: {slim, athletic, curvy, plus_size, muscular, average}
        ethnicity,
        bio:              bio.trim() || null,
        operating_area:   operatingArea.trim() || null,
        min_hourly_rate:  rateNum,
        is_adult_enabled: isAdultEnabled,
        is_active:        false,
        kyc_status:       'pending',   // enum kyc_status: {pending, submitted, approved, rejected, expired}
        status:           'offline',   // enum vendor_status: {offline, available, busy, unavailable}
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('jinx_profiles')
          .update(profilePayload)
          .eq('user_id', profile.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('jinx_profiles')
          .insert(profilePayload)
        if (insertError) throw insertError
      }

      // user_role enum: {client, moderator_admin, support_admin, marketing_admin, analytics_admin, superadmin}
      // — no vendor/jinx role exists; role stays 'client', only current_mode changes
      // user_mode enum: {client, jinx}
      const { error: userError } = await supabase
        .from('users')
        .update({ current_mode: 'jinx' })
        .eq('id', profile.id)
      if (userError) throw userError

      await supabase
        .from('client_profiles')
        .upsert({ user_id: profile.id }, { onConflict: 'user_id' })

// Sync the mode cookie so middleware routes correctly
document.cookie = 'jinxy-mode=jinx; path=/; max-age=31536000; SameSite=Lax'

await refresh()

setStep('done')
setTimeout(() => router.push('/jinx/dashboard'), 1800)

    } catch (err: unknown) {
      console.error('[become-jinx] error:', err)
      const message =
        err instanceof Error ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err)
      setError(message || 'Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const primaryBtn = (disabled = false): React.CSSProperties => ({
    width: '100%', padding: '16px',
    background: disabled ? 'var(--bg-elevated)' : '#9333EA',
    color: disabled ? 'var(--text-muted)' : 'white',
    border: 'none', borderRadius: 9999,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
    boxShadow: disabled ? 'none' : '0 4px 20px rgba(147,51,234,0.35)',
    opacity: loading ? 0.7 : 1,
    transition: 'all 200ms ease',
  })

  const chipBtn = (selected: boolean): React.CSSProperties => ({
    padding: '14px 20px', borderRadius: 14,
    background: selected ? 'rgba(147,51,234,0.1)' : 'var(--bg-elevated)',
    border: `1.5px solid ${selected ? '#9333EA' : 'var(--border)'}`,
    color: selected ? '#9333EA' : 'var(--text-primary)',
    cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'all 150ms ease',
    width: '100%',
  })

  const checkmark = (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: '#9333EA',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )

  if (step === 'done') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0D0518 0%, #0a0a14 100%)' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(147,51,234,0.2)', border: '1.5px solid rgba(147,51,234,0.5)', boxShadow: '0 0 40px rgba(147,51,234,0.4)' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M6 18l8 8 16-16" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="font-display text-3xl mb-3 text-center px-8" style={{ color: 'white', lineHeight: 1.3 }}>
          Welcome to<br/>
          <span style={{ color: '#9333EA', fontStyle: 'italic' }}>Jinx Mode</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Taking you to your dashboard...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(147,51,234,0.06) 0%, transparent 60%)',
      }} />

      <div style={{ height: 2, background: 'var(--bg-elevated)', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, #6B21A8, #9333EA)',
          transition: 'width 400ms ease',
        }} />
      </div>

      <div className="relative px-6 pt-12">
        <button onClick={goBack} className="mb-6 flex items-center"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
          Step {stepIndex + 1} of {STEPS.length}
        </p>

        {step === 'gender'      && <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Your gender</h1>}
        {step === 'orientation' && <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Your orientation</h1>}
        {step === 'ethnicity'   && <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Your ethnicity</h1>}
        {step === 'body_type'   && <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Your body type</h1>}
        {step === 'skin_tone'   && <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Your skin tone</h1>}
        {step === 'bio' && <>
          <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Your bio</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Tell clients a little about yourself</p>
        </>}
        {step === 'area' && <>
          <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Operating area</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Where are you based? e.g. Lekki, Lagos</p>
        </>}
        {step === 'rate' && <>
          <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>Your hourly rate</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Minimum you'll accept per hour</p>
        </>}
        {step === 'adult' && <>
          <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>18+ services</h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Are you open to adult bookings?</p>
        </>}
      </div>

      <div className="relative flex-1 px-6 pb-12 mt-6 space-y-3">

        {/* Gender — pre-filled and locked */}
        {step === 'gender' && (
          <>
            {['male', 'female'].map(g => {
              const isSelected = lockedGender === g
              return (
                <div key={g} style={{
                  ...chipBtn(isSelected),
                  cursor: 'default',
                  opacity: isSelected ? 1 : 0.35,
                }}>
                  <span className="capitalize">{g}</span>
                  {isSelected && checkmark}
                </div>
              )
            })}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
              Set during sign-up
            </p>
            <button onClick={goNext} style={primaryBtn(false)}>Continue</button>
          </>
        )}

        {/* Orientation — enum orientation_type: {straight, bi, gay, lesbian} */}
        {step === 'orientation' && (
          <>
            {ORIENTATIONS.map(o => (
              <button key={o.value} onClick={() => setOrientation(o.value)} style={chipBtn(orientation === o.value)}>
                <span>{o.label}</span>
                {orientation === o.value && checkmark}
              </button>
            ))}
            <button onClick={goNext} disabled={!orientation} style={primaryBtn(!orientation)}>Continue</button>
          </>
        )}

        {/* Ethnicity */}
        {step === 'ethnicity' && (
          <>
            <div className="flex flex-wrap gap-2">
              {ETHNICITIES.map(e => (
                <button key={e} onClick={() => setEthnicity(e)}
                  className="px-4 py-2.5 rounded-full text-sm transition-all"
                  style={{
                    background: ethnicity === e ? 'rgba(147,51,234,0.1)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${ethnicity === e ? '#9333EA' : 'var(--border)'}`,
                    color: ethnicity === e ? '#9333EA' : 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}>
                  {e}
                </button>
              ))}
            </div>
            <button onClick={goNext} disabled={!ethnicity} style={primaryBtn(!ethnicity)}>Continue</button>
          </>
        )}

        {/* Body type — enum body_type: {slim, athletic, curvy, plus_size, muscular, average} */}
        {step === 'body_type' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {BODY_TYPES.map(bt => (
                <button key={bt.value} onClick={() => setBodyType(bt.value)}
                  className="py-3 rounded-2xl text-sm transition-all"
                  style={{
                    background: bodyType === bt.value ? 'rgba(147,51,234,0.1)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${bodyType === bt.value ? '#9333EA' : 'var(--border)'}`,
                    color: bodyType === bt.value ? '#9333EA' : 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}>
                  {bt.label}
                </button>
              ))}
            </div>
            <button onClick={goNext} disabled={!bodyType} style={primaryBtn(!bodyType)}>Continue</button>
          </>
        )}

        {/* Skin tone — enum skin_tone: {very_light, light, medium, tan, dark, very_dark, obsidian} */}
        {step === 'skin_tone' && (
          <>
            <div className="grid grid-cols-4 gap-3">
              {SKIN_TONES.map(st => (
                <button key={st.value} onClick={() => setSkinTone(st.value)}
                  className="flex flex-col items-center gap-2"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: st.color,
                    border: `3px solid ${skinTone === st.value ? '#9333EA' : 'transparent'}`,
                    boxShadow: skinTone === st.value ? '0 0 0 2px rgba(147,51,234,0.3)' : 'none',
                    transition: 'all 150ms ease',
                  }} />
                  <span style={{
                    fontSize: 10, color: skinTone === st.value ? '#9333EA' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)', textAlign: 'center',
                  }}>{st.label}</span>
                </button>
              ))}
            </div>
            <button onClick={goNext} disabled={!skinTone} style={primaryBtn(!skinTone)}>Continue</button>
          </>
        )}

        {/* Bio */}
        {step === 'bio' && (
          <>
            <div>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 150))}
                placeholder="I'm a fun, energetic companion based in Lagos..."
                rows={5}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                  borderRadius: 14, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
                  resize: 'none', lineHeight: 1.6,
                }}
              />
              <p className="text-right text-xs mt-1"
                style={{ color: bio.length >= 140 ? '#FF4D6A' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {bio.length}/150
              </p>
            </div>
            <button onClick={goNext} style={primaryBtn(false)}>
              {bio.trim() ? 'Continue' : 'Skip for now'}
            </button>
          </>
        )}

        {/* Operating area */}
        {step === 'area' && (
          <>
            <input type="text" value={operatingArea}
              onChange={e => setOperatingArea(e.target.value)}
              placeholder="e.g. Lekki, Lagos" autoFocus
              style={{
                width: '100%', padding: '14px 16px',
                background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                borderRadius: 14, color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
              }} />
            <button onClick={goNext} style={primaryBtn(false)}>
              {operatingArea.trim() ? 'Continue' : 'Skip for now'}
            </button>
          </>
        )}

        {/* Rate */}
        {step === 'rate' && (
          <>
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
                placeholder="e.g. 25,000" autoFocus
                style={{
                  width: '100%', padding: '14px 16px 14px 28px',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                  borderRadius: 14, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
                }} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
              Clients whose budget is below this won't see your profile
            </p>
            {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</p>}
            <button onClick={goNext}
              disabled={!minRate || parseInt(minRate.replace(/,/g, '')) < 1000}
              style={primaryBtn(!minRate || parseInt(minRate.replace(/,/g, '')) < 1000)}>
              Continue
            </button>
          </>
        )}

        {/* Adult toggle */}
        {step === 'adult' && (
          <>
            <div className="p-4 rounded-2xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-0.5"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                    Enable 18+ bookings
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Clients looking for adult companions will find you
                  </p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={isAdultEnabled}
                    onChange={e => setIsAdultEnabled(e.target.checked)} />
                  <span className="switch-track" />
                </label>
              </div>
            </div>

            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(147,51,234,0.7)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                You can change this anytime from your Jinx settings. All bookings are subject to Jinxy's terms of service.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl"
                style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)' }}>
                <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5 }}>
                  {error}
                </p>
              </div>
            )}

            <button onClick={handleComplete} disabled={loading} style={primaryBtn(loading)}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Spinner /> Setting up your profile...
                  </span>
                : "Let's go 🎉"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
