// app/(jinx)/jinx/profile/page.tsx
// Jinx's own profile view — exactly what clients see, plus edit CTA.
// Stats (jinxes, rating) live here, not on dashboard.
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'

interface JinxProfile {
  bio: string | null
  operating_area: string | null
  min_hourly_rate: number
  gender: string
  orientation: string
  body_type: string
  skin_tone: string
  ethnicity: string
  is_active: boolean
  status: string
  average_rating: number
  total_jinxes: number
  is_premium: boolean
  kyc_status: string
  is_adult_enabled: boolean
}

interface Media { id: string; storage_path: string; media_type: string }

function Shimmer({ width, height, rounded = 8 }: { width: string | number; height: number; rounded?: number }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'rgba(147,51,234,0.08)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

export default function JinxProfilePage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const [jinxProfile, setJinxProfile] = useState<JinxProfile | null>(null)
  const [moments, setMoments] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) fetchProfile() }, [profile?.id])

  const fetchProfile = async () => {
    if (!profile?.id) return
    const [jpRes, mediaRes] = await Promise.all([
      supabase.from('jinx_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
      supabase.from('media').select('id, storage_path, media_type')
        .eq('user_id', profile.id).eq('category', 'moment').eq('is_active', true)
        .order('display_order', { ascending: true }),
    ])
    if (jpRes.data) setJinxProfile(jpRes.data as JinxProfile)
    if (mediaRes.data) setMoments(mediaRes.data as Media[])
    setLoading(false)
  }

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—'

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(147,51,234,0.06) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>My profile</h1>
          <button onClick={() => router.push('/jinx/profile/edit')}
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: 'rgba(147,51,234,0.12)', color: '#9333EA',
              border: '1px solid rgba(147,51,234,0.25)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
            Edit
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username || 'J'}
              size={80}
            />
            {!loading && jinxProfile && (
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2"
                style={{
                  background: jinxProfile.status === 'online' ? '#00D97E' : '#5C5875',
                  borderColor: 'var(--bg-base)',
                }} />
            )}
          </div>
          <div>
            <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name || profile?.username}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              @{profile?.username}
            </p>
            {!loading && jinxProfile && (
              <div className="flex items-center gap-2 mt-1">
                {jinxProfile.average_rating > 0 && (
                  <span className="text-xs" style={{ color: '#FFB800', fontFamily: 'var(--font-body)' }}>
                    ★ {jinxProfile.average_rating.toFixed(1)}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  {jinxProfile.total_jinxes} Jinxes
                </span>
                {jinxProfile.operating_area && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    · {jinxProfile.operating_area}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative px-5 pb-28 space-y-5">

        {/* Bio */}
        {loading ? (
          <div className="space-y-2">
            <Shimmer width="100%" height={16} rounded={5} />
            <Shimmer width="70%" height={16} rounded={5} />
          </div>
        ) : jinxProfile?.bio ? (
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6 }}>
            {jinxProfile.bio}
          </p>
        ) : (
          <button onClick={() => router.push('/jinx/profile/edit')}
            className="text-sm"
            style={{ color: '#9333EA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + Add a bio
          </button>
        )}

        {/* Rate + KYC */}
        {!loading && jinxProfile && (
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 rounded-xl text-center"
              style={{ background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.15)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'rgba(147,51,234,0.7)', fontFamily: 'var(--font-body)' }}>
                Rate from
              </p>
              <p className="text-base font-semibold" style={{ color: '#9333EA', fontFamily: 'var(--font-body)' }}>
                {formatCurrency(jinxProfile.min_hourly_rate)}/hr
              </p>
            </div>
            <div className="flex-1 p-3 rounded-xl text-center"
              style={{
                background: jinxProfile.kyc_status === 'verified' ? 'rgba(0,217,126,0.08)' : 'rgba(255,184,0,0.08)',
                border: `1px solid ${jinxProfile.kyc_status === 'verified' ? 'rgba(0,217,126,0.2)' : 'rgba(255,184,0,0.2)'}`,
              }}>
              <p className="text-xs mb-0.5" style={{
                color: jinxProfile.kyc_status === 'verified' ? '#00D97E' : '#FFB800',
                fontFamily: 'var(--font-body)',
              }}>KYC</p>
              <p className="text-base font-semibold capitalize" style={{
                color: jinxProfile.kyc_status === 'verified' ? '#00D97E' : '#FFB800',
                fontFamily: 'var(--font-body)',
              }}>
                {jinxProfile.kyc_status}
              </p>
            </div>
          </div>
        )}

        {/* Profile details */}
        {!loading && jinxProfile && (
          <div className="p-4 rounded-2xl space-y-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              About me
            </p>
            {[
              { label: 'Gender',      value: capitalize(jinxProfile.gender) },
              { label: 'Orientation', value: capitalize(jinxProfile.orientation) },
              { label: 'Ethnicity',   value: jinxProfile.ethnicity },
              { label: 'Body type',   value: capitalize(jinxProfile.body_type) },
              { label: 'Skin tone',   value: capitalize(jinxProfile.skin_tone) },
              { label: '18+ enabled', value: jinxProfile.is_adult_enabled ? 'Yes' : 'No' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  {item.label}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Moments */}
        {moments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Moments
              </p>
              <button onClick={() => router.push('/account/moments')}
                style={{ color: '#9333EA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12 }}>
                Manage
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moments.slice(0, 6).map(m => (
                <div key={m.id} className="rounded-xl overflow-hidden"
                  style={{ aspectRatio: '3/4', background: 'var(--bg-elevated)' }}>
                  {m.media_type === 'video' ? (
                    <video src={m.storage_path} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={m.storage_path} alt="Moment" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}
