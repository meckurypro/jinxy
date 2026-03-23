// app/auth/signup/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'method' | 'email' | 'otp'

// After OTP verified on signup, we go to complete-profile directly.
// complete-profile handles username/dob/gender/vibe and then sets the cookie.
// We do NOT duplicate the profile-collection steps here.

function SignupInner() {
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmailSubmit = async () => {
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) {
      if (error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')) {
        setError('This email already has an account.')
        // Offer login link rendered below
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
    const { error, data } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) {
      setOtpError('Invalid or expired code. Try again.')
      setOtp('')
      setLoading(false)
      return
    }

    // Check if this user already has a complete profile (e.g. they signed up before)
    // Route through confirm to decide — confirm will send them to /home if already done
    router.replace('/auth/confirm?next=/home')
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setLoading(true); setOtpError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (!error) setResendCooldown(60)
    setLoading(false)
  }

  const goBack = () => {
    if (step === 'otp') { setStep('email'); setOtp(''); setOtpError('') }
    else if (step === 'email') { setStep('method'); setError('') }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg-input)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15, outline: 'none',
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
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

        {step === 'method' && (
          <div>
            <div style={{ width: 40, height: 2, background: 'var(--pink)', marginBottom: 16 }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 8 }}>
              Craving company?<br />
              <span style={{ color: 'var(--pink)', fontStyle: 'italic' }}>You're not alone.</span>
            </h1>
          </div>
        )}
        {step === 'email' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>
              What's your email?
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              We'll send you a verification code.
            </p>
          </div>
        )}
        {step === 'otp' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 }}>
              Check your email
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              We sent a code to {email}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 px-6 pb-12 space-y-3">

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

          <p className="pt-4 text-center" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'var(--pink)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </>}

        {step === 'email' && <>
          <div>
            <input type="email" autoFocus autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
              style={inputStyle} />
            {error && (
              <div style={{ marginTop: 10 }}>
                <p style={{ color: 'var(--red)', fontFamily: 'var(--font-body)', fontSize: 13 }}>{error}</p>
                {error.includes('already') && (
                  <Link href="/auth/login"
                    style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>
                    Sign in instead →
                  </Link>
                )}
              </div>
            )}
          </div>
          <button onClick={handleEmailSubmit} disabled={loading || !email}
            style={{
              width: '100%', padding: '16px', background: 'var(--pink)',
              color: 'white', border: 'none', borderRadius: 9999,
              cursor: (!email || loading) ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
              boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
              opacity: (!email || loading) ? 0.5 : 1, transition: 'opacity 200ms ease',
            }}>
            {loading ? <Spinner /> : 'Continue'}
          </button>
        </>}

        {step === 'otp' && <>
          <div>
            <input type="tel" inputMode="numeric" autoFocus autoComplete="one-time-code"
              placeholder="––––––"
              value={otp}
              onChange={e => handleOtpChange(e.target.value)}
              style={{
                ...inputStyle,
                fontSize: 28, fontWeight: 600,
                letterSpacing: '0.25em', textAlign: 'center',
                border: `1.5px solid ${otp.length > 0 ? 'var(--pink)' : 'var(--border)'}`,
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
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </>}
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
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
