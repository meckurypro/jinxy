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

    setSwitching(true)

    // Always write the cookie first — this is what the middleware reads.
    // Even if current_mode already matches in the DB, the cookie may be stale
    // (e.g. after a fresh login or cross-device session), so we always set it.
    setModeCookie(mode)

    if (profile.current_mode !== mode) {
      const { error } = await supabase
        .from('users')
        .update({ current_mode: mode })
        .eq('id', profile.id)

      if (error) {
        console.error('[useSwitchMode] failed to update current_mode:', error)
        // Revert cookie on failure
        setModeCookie(profile.current_mode as UserMode)
        setSwitching(false)
        return
      }
    }

    // Refresh local profile state so useUser reflects new current_mode
    await refresh()

    // Navigate — middleware will now allow the destination
    router.replace(mode === 'jinx' ? '/jinx/dashboard' : '/home')
    // setSwitching(false) intentionally omitted — component unmounts on navigation
  }

  return { switchTo, switching }
}
