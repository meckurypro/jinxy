// app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'method' | 'email' | 'otp' | 'username' | 'dob' | 'gender' | 'vibe'

const STEP_INDEX: Record<Step, number> = {
  method: 0, email: 1, otp: 2, username: 3, dob: 4, gender: 5, vibe: 6,
}
const TOTAL_STEPS = 5

const VIBES = [
  { value: 'relationship', label: 'A relationship' },
  { value: 'casual', label: 'Something casual' },
  { value: 'unsure', label: "I'm not sure yet" },
  { value: 'private', label: 'Prefer not to say' },
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('method')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [username, setUsername] = useState('')
  const [dob, setDob] = useState({ day: '', month: '', year: '' })
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [vibe, setVibe] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const progress = STEP_INDEX[step] > 0
    ? ((STEP_INDEX[step] - 1) / (TOTAL_STEPS - 1)) * 100
    : 0

  const goBack = () => {
    const steps: Step[] = ['method', 'email', 'otp', 'username', 'dob', 'gender', 'vibe']
    const i = steps.indexOf(step)
    if (i > 0) { setStep(steps[i - 1]); setError('') }
  }

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmailSubmit = async () => {
    if (!email.includes('@')) { setError('Enter a valid email'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) { setError(error.message) } else { setStep('otp') }
    setLoading(false)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) document.getElementById(`sotp-${index + 1}`)?.focus()
    if (newOtp.every(d => d) && newOtp.join('').length === 6) verifyOtp(newOtp.join(''))
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      document.getElementById(`sotp-${index - 1}`)?.focus()
  }

  const verifyOtp = async (token: string) => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      setError('Invalid code. Try again.')
      setOtp(['', '', '', '', '', ''])
      setLoading(false)
      document.getElementById('sotp-0')?.focus()
    } else {
      setStep('username')
      setLoading(false)
    }
  }

  const handleUsernameNext = async () => {
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Letters, numbers and underscores only'); return }
    setLoading(true); setError('')
    const { data } = await supabase.from('users').select('id').eq('username', username.toLowerCase()).maybeSingle()
    if (data) { setError('Username taken. Try another.'); setLoading(false); return }
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

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      username: username.toLowerCase(),
      date_of_birth: dobDate,
      gender,
    })

    if (error) { setError(error.message); setLoading(false); return }
    await supabase.from('client_profiles').upsert({ user_id: user.id })
    router.replace('/home')
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-input)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    outline: 'none',
  }

  const primaryBtn = {
    width: '100%', padding: '16px',
    background: 'var(--pink)',
    color: 'white',
    border: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
  }

  const secondaryBtn = (active = false) => ({
    width: '100%', padding: '18px 20px',
    background: active ? 'rgba(255,45,107,0.06)' : 'var(--bg-elevated)',
    border: `1.5px solid ${active ? 'var(--pink)' : 'var(--border)'}`,
    borderRadius: 16,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  })

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
      }} />

      {/* Progress bar */}
      {step !== 'method' && (
        <div style={{ height: 2, width: '100%', background: 'var(--bg-elevated)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${progress}%`, background: 'var(--pink)',
            transition: 'width 500ms ease',
          }} />
        </div>
      )}

      {/* Header */}
      <div className="relative px-6 pt-14">
        {step !== 'method' && (
          <button onClick={goBack} className="mb-6 flex items-center"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <div className="mb-8">
          {step === 'method' && (
            <>
              <div style={{ width: 40, height: 2, background: 'var(--pink)', marginBottom: 16 }} />
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 8 }}>
                Craving company?<br />
                <span style={{ color: 'var(--pink)', fontStyle: 'italic' }}>You're not alone.</span>
              </h1>
            </>
          )}
          {step === 'email' && <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)' }}>What's your email?</h1>}
          {step === 'otp' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>Verification code</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>Sent to {email}</p>
          </>}
          {step === 'username' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>Choose a username</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>Let's get to know each other</p>
          </>}
          {step === 'dob' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>Your birthday</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>This helps people find each other by age</p>
          </>}
          {step === 'gender' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>What's your gender?</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>Tell us about your gender</p>
          </>}
          {step === 'vibe' && <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>I am looking for...</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>Provide us with further insights into your preferences</p>
          </>}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 px-6 pb-12 space-y-3">

        {/* Method */}
        {step === 'method' && <>
          <button onClick={handleGoogle} disabled={loading}
            style={{ ...secondaryBtn(), gap: 12 }}>
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>
          <div className="flex items-center gap-3 py-2">
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <button onClick={() => setStep('email')} style={{ ...secondaryBtn(), gap: 12 }}>
            <MailIcon />
            <span>Continue with email</span>
          </button>
          <p className="pt-4 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'var(--pink)', fontWeight: 500 }}>Sign In</Link>
          </p>
        </>}

        {/* Email */}
        {step === 'email' && <>
          <div>
            <input type="email" style={inputStyle} placeholder="your@email.com"
              value={email} onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()} autoFocus />
            {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12, marginTop: 8 }}>{error}</p>}
          </div>
          <button onClick={handleEmailSubmit} disabled={loading || !email} style={primaryBtn}>
            {loading ? <Spinner /> : 'Continue'}
          </button>
        </>}

        {/* OTP */}
        {step === 'otp' && <>
          <div className="flex gap-2 justify-between">
            {otp.map((digit, i) => (
              <input key={i} id={`sotp-${i}`} type="tel" inputMode="numeric" maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="text-center text-xl font-semibold"
                style={{
                  width: 48, height: 56,
                  background: 'var(--bg-input)',
                  border: `1.5px solid ${digit ? 'var(--pink)' : 'var(--border)'}`,
                  borderRadius: 14,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 150ms ease',
                  boxShadow: digit ? '0 0 0 3px rgba(255,45,107,0.15)' : 'none',
                }}
                autoFocus={i === 0} />
            ))}
          </div>
          {error && <p className="text-center" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12 }}>{error}</p>}
          {loading && <div className="flex justify-center py-4"><Spinner /></div>}
        </>}

        {/* Username */}
        {step === 'username' && <>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>@</span>
            <input type="text" style={{ ...inputStyle, paddingLeft: 28 }} placeholder="yourhandle"
              value={username} onChange={e => { setUsername(e.target.value.toLowerCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleUsernameNext()}
              autoFocus autoCapitalize="none" autoCorrect="off" />
            {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12, marginTop: 8 }}>{error}</p>}
          </div>
          <button onClick={handleUsernameNext} disabled={loading || username.length < 3} style={primaryBtn}>
            {loading ? <Spinner /> : 'Continue'}
          </button>
        </>}

        {/* DOB */}
        {step === 'dob' && <>
          <div className="grid grid-cols-3 gap-3">
            {[{ key: 'day', placeholder: 'DD', max: 2 }, { key: 'month', placeholder: 'MM', max: 2 }, { key: 'year', placeholder: 'YYYY', max: 4 }].map(f => (
              <input key={f.key} type="tel" inputMode="numeric" maxLength={f.max}
                placeholder={f.placeholder}
                style={{ ...inputStyle, textAlign: 'center' }}
                value={dob[f.key as keyof typeof dob]}
                onChange={e => { setDob(d => ({ ...d, [f.key]: e.target.value })); setError('') }} />
            ))}
          </div>
          {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12 }}>{error}</p>}
          <button onClick={handleDobNext} disabled={!dob.day || !dob.month || !dob.year} style={primaryBtn}>
            Continue
          </button>
        </>}

        {/* Gender */}
        {step === 'gender' && <>
          {['male', 'female'].map(g => (
            <button key={g} onClick={() => { setGender(g as 'male' | 'female'); setStep('vibe') }}
              style={secondaryBtn(gender === g)}>
              <span className="capitalize">{g}</span>
              {gender === g && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          ))}
          <p className="text-center text-xs pt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>You're free to change this later</p>
        </>}

        {/* Vibe */}
        {step === 'vibe' && <>
          {VIBES.map(v => (
            <button key={v.value} onClick={() => setVibe(v.value)} style={secondaryBtn(vibe === v.value)}>
              <span>{v.label}</span>
              {vibe === v.value && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          ))}
          <p className="text-center text-xs pt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>You're free to change your mind later</p>
          {error && <p className="text-center" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 12 }}>{error}</p>}
          <button onClick={handleComplete} disabled={loading || !vibe} style={primaryBtn}>
            {loading ? <Spinner /> : 'Continue'}
          </button>
        </>}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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
