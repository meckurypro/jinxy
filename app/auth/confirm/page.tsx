'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ConfirmInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/home'
  const supabase = createClient()

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id, username, date_of_birth, gender')
        .eq('id', user.id)
        .maybeSingle()

      const isComplete =
        !!profile?.username &&
        !!profile?.date_of_birth &&
        !!profile?.gender

      if (isComplete) {
        document.cookie = 'jinxy-profile-complete=1; path=/; max-age=31536000; SameSite=Lax'
        router.replace(next)
      } else {
        document.cookie = 'jinxy-profile-complete=; path=/; max-age=0'
        router.replace('/auth/complete-profile')
      }
    }

    run()
  }, [])

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0110 10" stroke="var(--pink, #FF2D6B)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  )
}
