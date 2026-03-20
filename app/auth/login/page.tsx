// app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'method' | 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('method')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmailSubmit = async () => {
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) { setError(error.message) } else { setStep('otp') }
    setLoading(false)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
    if (newOtp.every(d => d) && newOtp.join('').length === 6) verifyOtp(newOtp.join(''))
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus()
  }

  const verifyOtp = async (token: string) => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      setError('Invalid code. Try again.')
      setOtp(['', '', '', '', '', ''])
      setLoading(false)
      document.getElementById('otp-0')?.focus()
    } else {
      router.replace('/home')
    }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,45,107,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="relative px-6 pt-16 pb-8">
        {step !== 'method' && (
          <button
            onClick={() => { setStep(step === 'otp' ? 'email' : 'method'); setError('') }}
            className="mb-8 flex items-center gap-2"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
          </button>
        )}
        <h1
          className="mb-2"
          style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)' }}
        >
          {step === 'method' && 'Welcome back.'}
          {step === 'email' && "What's your email?"}
          {step === 'otp' && 'Verification code'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          {step === 'method' && 'Good to see you again.'}
          {step === 'email' && "We'll send you a code to sign in."}
          {step === 'otp' && `Code sent to ${email}`}
        </p>
      </div>

      {/* Content */}
      <div className="relative flex-1 px-6">

        {/* Method */}
        {step === 'method' && (
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center gap-3 rounded-2xl transition-all duration-200"
              style={{
                padding: '14px 20px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)',
                fontSize: 15,
              }}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button
              onClick={() => setStep('email')}
              className="w-full flex items-center gap-3 rounded-2xl transition-all duration-200"
              style={{
                padding: '14px 20px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)',
                fontSize: 15,
              }}
            >
              <MailIcon />
              <span>Continue with email</span>
            </button>

            <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium" style={{ color: 'var(--pink)' }}>
                Sign Up
              </Link>
            </p>
          </div>
        )}

        {/* Email */}
        {step === 'email' && (
          <div className="space-y-4">
            <div>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
                autoFocus
                autoComplete="email"
              />
              {error && <p className="mt-2 text-xs" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>{error}</p>}
            </div>
            <button
              onClick={handleEmailSubmit}
              disabled={loading || !email}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: email ? 'var(--pink)' : 'var(--bg-overlay)',
                border: 'none',
                cursor: email ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)',
                boxShadow: email ? '0 4px 20px rgba(255,45,107,0.35)' : 'none',
              }}
            >
              {loading ? <Spinner /> : 'Send code'}
            </button>
          </div>
        )}

        {/* OTP */}
        {step === 'otp' && (
          <div>
            <div className="flex gap-2 mb-4 justify-between">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
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
                    borderRadius: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'all 150ms ease',
                    boxShadow: digit ? '0 0 0 3px rgba(255,45,107,0.15)' : 'none',
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && <p className="text-xs mb-4 text-center" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>{error}</p>}
            {loading && <div className="flex justify-center py-4"><Spinner /></div>}
            <button
              onClick={() => { setOtp(['', '', '', '', '', '']); handleEmailSubmit() }}
              className="w-full text-sm mt-2 py-3"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Didn't receive a code? Resend
            </button>
          </div>
        )}
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
