'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'method' | 'email' | 'otp' | 'username' | 'dob' | 'gender' | 'vibe'

const TOTAL_STEPS = 5 // after method selection
const STEP_INDEX: Record<Step, number> = {
  method: 0, email: 1, otp: 2, username: 3, dob: 4, gender: 5, vibe: 6
}

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

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
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
    // Check uniqueness
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

    // Store vibe in client profile
    await supabase.from('client_profiles').upsert({
      user_id: user.id,
    })

    router.replace('/home')
  }

  const goBack = () => {
    const steps: Step[] = ['method', 'email', 'otp', 'username', 'dob', 'gender', 'vibe']
    const i = steps.indexOf(step)
    if (i > 0) { setStep(steps[i - 1]); setError('') }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Progress bar — shown after method selection */}
      {step !== 'method' && (
        <div className="relative h-0.5 w-full" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="absolute left-0 top-0 h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--pink)' }}
          />
        </div>
      )}

      {/* Header */}
      <div className="relative px-6 pt-14">
        {step !== 'method' && (
          <button
            onClick={goBack}
            className="mb-6 flex items-center gap-2 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <div className="mb-8">
          {step === 'method' && (
            <>
              <div
                className="w-10 h-0.5 mb-4"
                style={{ background: 'var(--pink)' }}
              />
              <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Craving company?<br />
                <span style={{ color: 'var(--pink)', fontStyle: 'italic' }}>You're not alone.</span>
              </h1>
            </>
          )}
          {step === 'email' && (
            <h1 className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>
              What's your email?
            </h1>
          )}
          {step === 'otp' && (
            <>
              <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
                Verification code
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sent to {email}
              </p>
            </>
          )}
          {step === 'username' && (
            <>
              <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
                Choose a username
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Let's get to know each other
              </p>
            </>
          )}
          {step === 'dob' && (
            <>
              <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
                Your birthday
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This helps people find each other by age
              </p>
            </>
          )}
          {step === 'gender' && (
            <>
              <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
                What's your gender?
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Tell us about your gender
              </p>
            </>
          )}
          {step === 'vibe' && (
            <>
              <h1 className="font-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
                I am looking for...
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Provide us with further insights into your preferences
              </p>
            </>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="relative flex-1 px-6 pb-12">

        {/* Method */}
        {step === 'method' && (
          <div className="animate-slide-up space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="btn btn-secondary btn-full"
              style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 20px' }}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button
              onClick={() => setStep('email')}
              className="btn btn-secondary btn-full"
              style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 20px' }}
            >
              <MailIcon />
              <span>Continue with email</span>
            </button>

            <p className="pt-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium" style={{ color: 'var(--pink)' }}>
                Sign In
              </Link>
            </p>
          </div>
        )}

        {/* Email */}
        {step === 'email' && (
          <div className="animate-slide-up space-y-4">
            <div>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                autoFocus
              />
              {error && <p className="mt-2 text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
            </div>
            <button onClick={handleEmailSubmit} disabled={loading || !email} className="btn btn-primary btn-full">
              {loading ? <Spinner /> : 'Continue'}
            </button>
          </div>
        )}

        {/* OTP */}
        {step === 'otp' && (
          <div className="animate-slide-up">
            <div className="flex gap-2 mb-4 justify-between">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`sotp-${i}`}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="text-center text-xl font-semibold"
                  style={{
                    width: 48, height: 56,
                    background: 'var(--bg-input)',
                    border: `1.5px solid ${digit ? 'var(--pink)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'all 150ms ease',
                    boxShadow: digit ? '0 0 0 3px var(--pink-glow)' : 'none',
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && <p className="text-xs mb-4 text-center" style={{ color: 'var(--red)' }}>{error}</p>}
            {loading && <div className="flex justify-center py-4"><Spinner /></div>}
          </div>
        )}

        {/* Username */}
        {step === 'username' && (
          <div className="animate-slide-up space-y-4">
            <div>
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
                  onKeyDown={e => e.key === 'Enter' && handleUsernameNext()}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              {error && <p className="mt-2 text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
            </div>
            <button onClick={handleUsernameNext} disabled={loading || username.length < 3} className="btn btn-primary btn-full">
              {loading ? <Spinner /> : 'Continue'}
            </button>
          </div>
        )}

        {/* Date of birth */}
        {step === 'dob' && (
          <div className="animate-slide-up space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'day', placeholder: 'DD', max: 2 },
                { key: 'month', placeholder: 'MM', max: 2 },
                { key: 'year', placeholder: 'YYYY', max: 4 },
              ].map(field => (
                <input
                  key={field.key}
                  type="tel"
                  inputMode="numeric"
                  className="input text-center"
                  placeholder={field.placeholder}
                  maxLength={field.max}
                  value={dob[field.key as keyof typeof dob]}
                  onChange={e => {
                    setDob(d => ({ ...d, [field.key]: e.target.value }))
                    setError('')
                  }}
                />
              ))}
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
            <button onClick={handleDobNext} disabled={!dob.day || !dob.month || !dob.year} className="btn btn-primary btn-full">
              Continue
            </button>
          </div>
        )}

        {/* Gender */}
        {step === 'gender' && (
          <div className="animate-slide-up space-y-3">
            {['male', 'female'].map(g => (
              <button
                key={g}
                onClick={() => { setGender(g as 'male' | 'female'); setStep('vibe') }}
                className="btn-secondary btn btn-full"
                style={{
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  borderColor: gender === g ? 'var(--pink)' : 'var(--border)',
                  background: gender === g ? 'var(--pink-glow)' : 'var(--bg-elevated)',
                }}
              >
                <span className="capitalize">{g}</span>
                {gender === g && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--pink)' }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
            <p className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
              You're free to change this later
            </p>
          </div>
        )}

        {/* Vibe */}
        {step === 'vibe' && (
          <div className="animate-slide-up space-y-3">
            {VIBES.map(v => (
              <button
                key={v.value}
                onClick={() => setVibe(v.value)}
                className="btn btn-secondary btn-full"
                style={{
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  borderColor: vibe === v.value ? 'var(--pink)' : 'var(--border)',
                  background: vibe === v.value ? 'var(--pink-glow)' : 'var(--bg-elevated)',
                }}
              >
                <span>{v.label}</span>
                {vibe === v.value && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--pink)' }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
            <p className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
              You're free to change your mind later
            </p>
            {error && <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>}
            <button onClick={handleComplete} disabled={loading || !vibe} className="btn btn-primary btn-full mt-4">
              {loading ? <Spinner /> : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
