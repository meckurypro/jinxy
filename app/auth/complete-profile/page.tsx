'use client'

// app/auth/complete-profile/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'checking' | 'username' | 'dob' | 'gender' | 'vibe'

const STEPS: Step[] = ['username', 'dob', 'gender', 'vibe']

const VIBES = [
  { value: 'relationship', label: 'A relationship' },
  { value: 'casual', label: 'Something casual' },
  { value: 'unsure', label: "I'm not sure yet" },
  { value: 'private', label: 'Prefer not to say' },
]

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('checking')
  const [username, setUsername] = useState('')
  const [dob, setDob] = useState({ day: '', month: '', year: '' })
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [vibe, setVibe] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userMeta, setUserMeta] = useState<{ name?: string; avatar?: string }>({})

  const stepIndex = STEPS.indexOf(step as any)
  const progress = stepIndex >= 0 ? (stepIndex / (STEPS.length - 1)) * 100 : 0

  // ── On mount: check if profile is already complete ────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/auth/login')
        return
      }

      setUserMeta({
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
        avatar: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? '',
      })

      const { data: profile } = await supabase
        .from('users')
        .select('username, date_of_birth, gender')
        .eq('id', user.id)
        .maybeSingle()

      const isComplete =
        !!profile?.username &&
        !!profile?.date_of_birth &&
        !!profile?.gender

      if (isComplete) {
        // Already done — stamp the cookie and skip to home
        document.cookie = 'jinxy-profile-complete=1; path=/; max-age=31536000; SameSite=Lax'
        router.replace('/home')
        return
      }

      // Profile incomplete — show the form
      setStep('username')
    }

    check()
  }, [])

  const goBack = () => {
    const i = STEPS.indexOf(step as any)
    if (i > 0) { setStep(STEPS[i - 1]); setError('') }
  }

  const handleUsernameNext = async () => {
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Letters, numbers and underscores only'); return }
    setLoading(true); setError('')
    const { data: taken } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()
    if (taken) { setError('Username taken. Try another.'); setLoading(false); return }
    setLoading(false)
    setStep('dob')
  }

  const handleDobNext = () => {
    const { day, month, year } = dob
    if (!day || !month || !year) { setError('Enter your full date of birth'); return }
    const age = new Date().getFullYear() - parseInt(year)
    if (age < 18) { setError('You must be 18 or older to use Jinxy'); return }
    if (age > 100) { setError('Enter a valid year'); return }
    setError('')
    setStep('gender')
  }

  const handleComplete = async () => {
    if (!vibe) { setError('Select an option to continue'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/login'); return }

    const dobDate = `${dob.year}-${dob.month.padStart(2, '0')}-${dob.day.padStart(2, '0')}`

    const { error: upsertError } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: userMeta.name || null,
      avatar_url: userMeta.avatar || null,
      username: username.toLowerCase(),
      date_of_birth: dobDate,
      gender,
      looking_for: vibe,
      role: 'client',
      current_mode: 'client',
      dark_mode: true,
      country: 'Nigeria',
    })

    if (upsertError) { setError(upsertError.message); setLoading(false); return }

    await supabase.from('client_profiles').upsert({ user_id: user.id })

    document.cookie = 'jinxy-profile-complete=1; path=/; max-age=31536000; SameSite=Lax'
    localStorage.setItem('jinxy-onboarded', 'true')
    router.replace('/home')
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-input)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15, outline: 'none',
  }

  const primaryBtn: React.CSSProperties = {
    width: '100%', padding: '16px',
    background: 'var(--pink)', color: 'white',
    border: 'none', borderRadius: 9999, cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
    boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
    opacity: loading ? 0.7 : 1,
    transition: 'opacity 200ms ease',
  }

  const secondaryBtn = (active = false): React.CSSProperties => ({
    width: '100%', padding: '18px 20px',
    background: active ? 'rgba(255,45,107,0.06)' : 'var(--bg-elevated)',
    border: `1.5px solid ${active ? 'var(--pink)' : 'var(--border)'}`,
    borderRadius: 16, cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 15,
    color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  })

  const checkmark = (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      background: 'var(--pink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )

  // ── Checking / spinner state ──────────────────────────────────────────────
  if (step === 'checking') {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--bg-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
          <path d="M12 2a10 10 0 0110 10" stroke="var(--pink, #FF2D6B)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
      }} />

      {/* Progress bar */}
      <div style={{ height: 2, width: '100%', background: 'var(--bg-elevated)', position: 'relative', flexShrink: 0 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${progress}%`, background: 'var(--pink)',
          transition: 'width 500ms ease',
        }} />
      </div>

      {/* Header */}
      <div className="relative px-6 pt-12 pb-2">
        {stepIndex > 0 && (
          <button onClick={goBack} className="mb-6 flex items-center"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {step === 'username' && userMeta.name && (
          <div className="flex items-center gap-3 mb-6">
            {userMeta.avatar && (
              <img src={userMeta.avatar} alt={userMeta.name} className="rounded-full"
                style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>Signed in as</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                {userMeta.name}
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          {step === 'username' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>
              Choose a username
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              This is how people will find you
            </p>
          </>}
          {step === 'dob' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>
              Your birthday
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              This helps people find each other by age
            </p>
          </>}
          {step === 'gender' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>
              What's your gender?
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              Tell us about your gender
            </p>
          </>}
          {step === 'vibe' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>
              I am looking for...
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              Provide us with further insights into your preferences
            </p>
          </>}
        </div>
      </div>

      {/* Step content */}
      <div className="relative flex-1 px-6 pb-12 space-y-3">

        {/* Username */}
        {step === 'username' && <>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
            }}>@</span>
            <input
              type="text"
              style={{ ...inputStyle, paddingLeft: 28 }}
              placeholder="yourhandle"
              value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleUsernameNext()}
              autoFocus autoCapitalize="none" autoCorrect="off"
            />
          </div>
          {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12 }}>{error}</p>}
          <button onClick={handleUsernameNext} disabled={loading || username.length < 3}
            style={{ ...primaryBtn, opacity: (loading || username.length < 3) ? 0.5 : 1 }}>
            {loading ? <Spinner /> : 'Continue'}
          </button>
        </>}

        {/* DOB */}
        {step === 'dob' && <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'day', placeholder: 'DD', max: 2 },
              { key: 'month', placeholder: 'MM', max: 2 },
              { key: 'year', placeholder: 'YYYY', max: 4 },
            ].map(f => (
              <input key={f.key} type="tel" inputMode="numeric" maxLength={f.max}
                placeholder={f.placeholder}
                style={{ ...inputStyle, textAlign: 'center' }}
                value={dob[f.key as keyof typeof dob]}
                onChange={e => { setDob(d => ({ ...d, [f.key]: e.target.value })); setError('') }} />
            ))}
          </div>
          {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12 }}>{error}</p>}
          <button onClick={handleDobNext} disabled={!dob.day || !dob.month || !dob.year}
            style={{ ...primaryBtn, opacity: (!dob.day || !dob.month || !dob.year) ? 0.5 : 1 }}>
            Continue
          </button>
        </>}

        {/* Gender */}
        {step === 'gender' && <>
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => { setGender(g as 'male' | 'female'); setStep('vibe') }}
              style={secondaryBtn(gender === g)}>
              <span className="capitalize">{g}</span>
              {gender === g && checkmark}
            </button>
          ))}
          <p className="text-center text-xs pt-2"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            You're free to change this later
          </p>
        </>}

        {/* Vibe */}
        {step === 'vibe' && <>
          {VIBES.map(v => (
            <button key={v.value} onClick={() => setVibe(v.value)} style={secondaryBtn(vibe === v.value)}>
              <span>{v.label}</span>
              {vibe === v.value && checkmark}
            </button>
          ))}
          <p className="text-center text-xs pt-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            You're free to change your mind later
          </p>
          {error && (
            <p className="text-center" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
              {error}
            </p>
          )}
          <button onClick={handleComplete} disabled={loading || !vibe}
            style={{ ...primaryBtn, opacity: (loading || !vibe) ? 0.5 : 1 }}>
            {loading ? <Spinner /> : "Let's go 🎉"}
          </button>
        </>}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
