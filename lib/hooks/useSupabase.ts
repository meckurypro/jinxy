'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useSupabase(): SupabaseClient {
  const supabase = useMemo(() => createClient(), [])
  return supabase
}
