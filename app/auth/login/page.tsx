// app/auth/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'method' | 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('method')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Always route through confirm — it sets the cookie and decides where to go
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmailSubmit = async () => {
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // shouldCreateUser: false → error if email not registered, better UX
      options: { shouldCreateUser: false },
    })
    if (error) {
      // If user doesn't exist, guide them to signup
      if (error.message.toLowerCase().includes('not found') ||
          error.message.toLowerCase().includes('signups not allowed') ||
          error.message.toLowerCase().includes('no user')) {
        setError("No account found. Did you mean to sign up?")
      } else {
        setError(error.message)
      }
    } else {
      setStep('otp')
      setResendCooldown(60)
    }
    setLoading(false)
  }

  const handleOtpChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 8)
    setOtp(clean)
    setOtpError('')
    if (clean.length >= 6) verifyOtp(clean)
  }

  const verifyOtp = async (token: string) => {
    setLoading(true); setOtpError('')
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      setOtpError('Invalid or expired code. Try again.')
      setOtp('')
      setLoading(false)
    } else {
      // ✅ KEY FIX: route through /auth/confirm so the profile-complete cookie
      // is always set/refreshed, regardless of auth method used
      router.replace('/auth/confirm?next=/home')
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true); setOtpError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (!error) setResendCooldown(60)
    setLoading(false)
  }

  const goBack = () => {
    if (step === 'otp') { setStep('email'); setOtp(''); setOtpError('') }
    else if (step === 'email') { setStep('method'); setError('') }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,45,107,0.06) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-6 pt-16 pb-8">
        {step !== 'method' && (
          <button onClick={goBack} className="mb-8 flex items-center gap-2"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14 }}>Back</span>
          </button>
        )}

        <h1 className="mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)' }}>
          {step === 'method' && 'Welcome back.'}
          {step === 'email' && "What's your email?"}
          {step === 'otp' && 'Check your email'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          {step === 'method' && 'Good to see you again.'}
          {step === 'email' && "We'll send you a sign-in code."}
          {step === 'otp' && `We sent a code to ${email}`}
        </p>
      </div>

      {/* Content */}
      <div className="relative flex-1 px-6 space-y-3">

        {step === 'method' && <>
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center gap-3 rounded-2xl transition-all duration-150"
            style={{
              padding: '14px 20px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', color: 'var(--text-primary)', fontSize: 15,
            }}>
            <GoogleIcon /><span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 12 }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <button onClick={() => setStep('email')}
            className="w-full flex items-center gap-3 rounded-2xl"
            style={{
              padding: '14px 20px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', color: 'var(--text-primary)', fontSize: 15,
            }}>
            <MailIcon /><span>Continue with email</span>
          </button>

          {error && <p className="text-xs text-center" style={{ color: 'var(--red)', fontFamily: 'var(--font-body)' }}>{error}</p>}

          <p className="pt-4 text-center" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
            Don't have an account?{' '}
            <Link href="/auth/signup" style={{ color: 'var(--pink)', fontWeight: 500 }}>Sign up</Link>
          </p>
        </>}

        {step === 'email' && <>
          <div>
            <input type="email" autoFocus autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'var(--bg-input)', border: '1.5px solid var(--border)',
                borderRadius: 14, color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none',
              }} />
            {error && (
              <div style={{ marginTop: 10 }}>
                <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</p>
                {error.includes('sign up') && (
                  <Link href="/auth/signup" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>
                    Create an account →
                  </Link>
                )}
              </div>
            )}
          </div>
          <button onClick={handleEmailSubmit} disabled={loading || !email}
            style={{
              width: '100%', padding: '16px', background: 'var(--pink)',
              color: 'white', border: 'none', borderRadius: 9999, cursor: (!email || loading) ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
              boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
              opacity: (!email || loading) ? 0.5 : 1, transition: 'opacity 200ms ease',
            }}>
            {loading ? <Spinner /> : 'Send code'}
          </button>
        </>}

        {step === 'otp' && <>
          <div>
            <input type="tel" inputMode="numeric" autoFocus autoComplete="one-time-code"
              placeholder="––––––"
              value={otp}
              onChange={e => handleOtpChange(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'var(--bg-input)',
                border: `1.5px solid ${otp.length > 0 ? 'var(--pink)' : 'var(--border)'}`,
                borderRadius: 14, color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 600,
                letterSpacing: '0.25em', textAlign: 'center', outline: 'none',
                boxShadow: otp.length > 0 ? '0 0 0 3px rgba(255,45,107,0.15)' : 'none',
                transition: 'all 150ms ease',
              }} />
            {otpError && (
              <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                {otpError}
              </p>
            )}
          </div>

          {loading && <div className="flex justify-center py-2"><Spinner /></div>}

          <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
            style={{
              width: '100%', padding: '12px', background: 'none', border: 'none',
              cursor: resendCooldown > 0 ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--pink)',
            }}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </>}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function Spinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
      <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
