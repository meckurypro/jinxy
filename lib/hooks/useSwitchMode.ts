// lib/hooks/useSwitchMode.ts
// Single source of truth for mode switching.
// Writes current_mode to DB, sets the MODE_COOKIE so middleware can read it
// immediately on the next request, refreshes the user profile, then navigates.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/hooks/useUser'

export type UserMode = 'client' | 'jinx'

const MODE_COOKIE = 'jinxy-mode'

function setModeCookie(mode: UserMode) {
  // Accessible to JS (not httpOnly) because middleware also reads it via
  // request.cookies — which reads the cookie header, not document.cookie.
  // SameSite=Lax is safe for same-origin navigation.
  const maxAge = 60 * 60 * 24 * 365 // 1 year
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function useSwitchMode() {
  const router = useRouter()
  const supabase = useSupabase()
  const { profile, refresh } = useUser()
  const [switching, setSwitching] = useState(false)

  const switchTo = async (mode: UserMode) => {
    if (!profile?.id || switching) return
    if (profile.current_mode === mode) {
      // Already in the right mode — just navigate
      router.replace(mode === 'jinx' ? '/jinx/dashboard' : '/home')
      return
    }

    setSwitching(true)

    const { error } = await supabase
      .from('users')
      .update({ current_mode: mode })
      .eq('id', profile.id)

    if (error) {
      console.error('[useSwitchMode] failed to update current_mode:', error)
      setSwitching(false)
      return
    }

    // Write cookie immediately so middleware sees the new mode on next navigation
    setModeCookie(mode)

    // Refresh local profile state
    await refresh()

    // Navigate — middleware will now allow the destination
    router.replace(mode === 'jinx' ? '/jinx/dashboard' : '/home')

    // Note: setSwitching(false) is intentionally omitted here — the component
    // will unmount on navigation so there's no state to reset.
  }

  return { switchTo, switching }
}
