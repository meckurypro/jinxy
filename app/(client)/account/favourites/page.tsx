// app/(client)/account/favourites/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'

interface FavouriteJinx {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  is_verified: boolean
  liked_at: string
  jinx_profile: {
    min_hourly_rate: number | null
    average_rating: number | null
    total_jinxes: number | null
    operating_area: string | null
  } | null
}

function Shimmer({ width, height, rounded = 8 }: { width: string | number; height: number; rounded?: number }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'rgba(255,255,255,0.06)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

export default function FavouritesPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const [favourites, setFavourites] = useState<FavouriteJinx[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.id) fetchFavourites()
  }, [profile?.id])

  const fetchFavourites = async () => {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('profile_likes')
      .select(`
        created_at,
        jinx:users!profile_likes_jinx_id_fkey (
          id, username, full_name, avatar_url, is_verified
        ),
        jinx_profile:jinx_profiles!profile_likes_jinx_id_fkey (
          min_hourly_rate, average_rating, total_jinxes, operating_area
        )
      `)
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })

    if (data) {
      const list: FavouriteJinx[] = (data as Record<string, unknown>[]).map(row => {
        const j = row.jinx as Record<string, unknown>
        const jp = row.jinx_profile as Record<string, unknown> | null
        return {
          id: j.id as string,
          username: j.username as string,
          full_name: j.full_name as string | null,
          avatar_url: j.avatar_url as string | null,
          is_verified: j.is_verified as boolean,
          liked_at: row.created_at as string,
          jinx_profile: jp ? {
            min_hourly_rate: jp.min_hourly_rate as number | null,
            average_rating: jp.average_rating as number | null,
            total_jinxes: jp.total_jinxes as number | null,
            operating_area: jp.operating_area as string | null,
          } : null,
        }
      })
      setFavourites(list)
    }
    setLoading(false)
  }

  const handleRemove = async (jinxId: string) => {
    if (!profile?.id) return
    setRemoving(jinxId)
    await supabase
      .from('profile_likes')
      .delete()
      .eq('client_id', profile.id)
      .eq('jinx_id', jinxId)
    setFavourites(prev => prev.filter(f => f.id !== jinxId))
    setRemoving(null)
  }

  const formatRate = (rate: number | null) =>
    rate ? `₦${rate.toLocaleString()}/hr` : null

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <button onClick={() => router.back()}
          className="mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>Back</span>
        </button>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
            Favourites
          </h1>
          {!loading && favourites.length > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {favourites.length} saved
            </span>
          )}
        </div>
      </div>

      <div className="relative px-5 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <Shimmer width={56} height={56} rounded={9999} />
                <div className="flex-1 space-y-2">
                  <Shimmer width="45%" height={14} rounded={5} />
                  <Shimmer width="30%" height={11} rounded={4} />
                </div>
                <Shimmer width={72} height={32} rounded={9999} />
              </div>
            ))}
          </div>
        ) : favourites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 24S3 17.5 3 11a7 7 0 0114 0 7 7 0 0114 0c0 6.5-17 13-17 13z"
                  stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <p className="font-display text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
              No favourites yet
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Like a Jinx's profile and they'll appear here.
            </p>
            <button
              onClick={() => router.push('/find')}
              className="px-6 py-3 rounded-full text-sm font-semibold text-white"
              style={{
                background: 'var(--pink)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
              }}
            >
              Find a Jinx
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {favourites.map(fav => (
              <div key={fav.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>

                {/* Avatar — taps to profile */}
                <button onClick={() => router.push(`/jinx/${fav.id}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <Avatar
                    src={fav.avatar_url}
                    name={fav.full_name || fav.username}
                    size={56}
                  />
                </button>

                {/* Info */}
                <button onClick={() => router.push(`/jinx/${fav.id}`)}
                  className="flex-1 min-w-0 text-left"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                      {fav.full_name || fav.username}
                    </p>
                    {fav.is_verified && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" flexShrink="0">
                        <circle cx="7" cy="7" r="7" fill="#FF2D6B" />
                        <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {fav.jinx_profile?.average_rating && (
                      <span className="text-xs" style={{ color: '#FFB800', fontFamily: 'var(--font-body)' }}>
                        ★ {fav.jinx_profile.average_rating.toFixed(1)}
                      </span>
                    )}
                    {fav.jinx_profile?.min_hourly_rate && (
                      <span className="text-xs" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                        {formatRate(fav.jinx_profile.min_hourly_rate)}
                      </span>
                    )}
                    {fav.jinx_profile?.operating_area && (
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        · {fav.jinx_profile.operating_area}
                      </span>
                    )}
                  </div>
                </button>

                {/* Book CTA */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/find?jinx=${fav.id}`)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{
                      background: 'var(--pink)', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      boxShadow: '0 2px 8px rgba(255,45,107,0.3)',
                    }}
                  >
                    Book
                  </button>
                  <button
                    onClick={() => handleRemove(fav.id)}
                    disabled={removing === fav.id}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      cursor: removing === fav.id ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-body)',
                      opacity: removing === fav.id ? 0.5 : 1,
                    }}
                  >
                    {removing === fav.id ? '...' : 'Unlike'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
