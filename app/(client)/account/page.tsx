'use client'

// app/(client)/account/page.tsx

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'
import ImageCropper from '@/components/shared/ImageCropper'

interface Stats {
  favourites: number
  likes: number
  jinxes: number
}

interface AvatarMoment {
  id: string
  storage_path: string
}

function Shimmer({ width, height, rounded = 8 }: {
  width: string | number; height: number; rounded?: number
}) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'rgba(255,255,255,0.06)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      flexShrink: 0,
    }} />
  )
}

// Convert File to base64 dataURL for ImageCropper
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AccountPage() {
  const router = useRouter()
  const { profile, loading: profileLoading, refresh } = useUser()
  const supabase = useSupabase()

  const [stats, setStats] = useState<Stats | null>(null)
  const [avatarMoment, setAvatarMoment] = useState<AvatarMoment | null | undefined>(undefined)
  const [showAvatarViewer, setShowAvatarViewer] = useState(false)

  useEffect(() => {
    if (profile?.id) {
      fetchStats()
      fetchAvatarMoment()
    }
  }, [profile?.id])

  const fetchStats = async () => {
    if (!profile?.id) return
    const [favsResult, likesResult, jinxesResult] = await Promise.all([
      supabase.from('profile_likes').select('*', { count: 'exact', head: true }).eq('client_id', profile.id),
      supabase.from('media_likes').select('media_id, media!inner(user_id)', { count: 'exact', head: true }).eq('media.user_id', profile.id),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('client_id', profile.id).eq('status', 'completed'),
    ])
    setStats({
      favourites: favsResult.count ?? 0,
      likes: likesResult.count ?? 0,
      jinxes: jinxesResult.count ?? 0,
    })
  }

  const fetchAvatarMoment = async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('media')
      .select('id, storage_path')
      .eq('user_id', profile.id)
      .eq('category', 'moment')
      .eq('is_active', true)
      .eq('is_avatar', true)
      .maybeSingle()
    setAvatarMoment(data ?? null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'jinxy-profile-complete=; path=/; max-age=0'
    router.replace('/auth/login')
  }

  const isProfileLoading = profileLoading || !profile
  const avatarSrc = avatarMoment?.storage_path ?? profile?.avatar_url ?? null

  const menuSections = [
    {
      title: 'Account',
      items: [
        { label: 'Edit profile', icon: '👤', action: () => router.push('/account/edit') },
        { label: 'Appearance & security', icon: '🔒', action: () => router.push('/account/settings') },
        { label: 'Privacy', icon: '🛡️', action: () => router.push('/account/settings?section=privacy') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { label: 'My preferences', icon: '✨', action: () => router.push('/account/preferences') },
        { label: 'Switch to Jinx Mode', icon: '💜', action: () => router.push('/jinx/dashboard'), highlight: true },
      ],
    },
    {
      title: 'Earn',
      items: [
        { label: 'Referrals & Credits', icon: '💰', action: () => router.push('/account/referrals') },
        { label: 'My subscription', icon: '⭐', action: () => router.push('/account/subscription') },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help & support', icon: '💬', action: () => router.push('/account/help') },
        { label: 'Terms & policies', icon: '📄', action: () => router.push('/account/terms') },
        { label: 'Report a problem', icon: '🚩', action: () => router.push('/account/report') },
      ],
    },
    {
      title: 'Actions',
      items: [
        { label: 'Log out', icon: '👋', action: handleSignOut, danger: true },
      ],
    },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.05) 0%, transparent 60%)',
      }} />

      <div className="relative px-5 pt-14 pb-6">

        {/* Avatar + name row */}
        <div className="flex items-center gap-4 mb-5">
          {isProfileLoading ? (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              animation: 'skeleton-pulse 1.5s ease-in-out infinite',
              flexShrink: 0,
            }} />
          ) : (
            <button
              onClick={() => setShowAvatarViewer(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            >
              <Avatar src={avatarSrc} name={profile?.full_name || profile?.username || 'U'} size={72} />
            </button>
          )}

          <div className="flex-1 min-w-0">
            {isProfileLoading ? (
              <div className="space-y-2">
                <Shimmer width="60%" height={20} rounded={6} />
                <Shimmer width="40%" height={14} rounded={4} />
              </div>
            ) : (
              <>
                <h1 className="font-display text-xl truncate" style={{ color: 'var(--text-primary)' }}>
                  {profile?.full_name || profile?.username || '—'}
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  @{profile?.username}
                </p>
              </>
            )}
          </div>

          {!isProfileLoading && (
            <button
              onClick={() => router.push('/account/moments')}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Moments
            </button>
          )}
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {stats === null ? (
            [0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center py-4 gap-2"
                style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <Shimmer width={32} height={20} rounded={4} />
                <Shimmer width={48} height={12} rounded={3} />
              </div>
            ))
          ) : (
            <>
              <button
                onClick={() => router.push('/account/favourites')}
                className="flex flex-col items-center py-4"
                style={{ borderRight: '1px solid var(--border)', background: 'transparent' }}
              >
                <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
                  {stats.favourites}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Favourites
                </p>
              </button>
              <div className="flex flex-col items-center py-4" style={{ borderRight: '1px solid var(--border)' }}>
                <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
                  {stats.likes}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Likes
                </p>
              </div>
              <button
                onClick={() => router.push('/jinxes')}
                className="flex flex-col items-center py-4"
                style={{ background: 'transparent' }}
              >
                <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
                  {stats.jinxes}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Jinxes
                </p>
              </button>
            </>
          )}
        </div>

        {/* Credits */}
        {!isProfileLoading && (profile?.jinxy_credits ?? 0) > 0 && (
          <button
            onClick={() => router.push('/account/referrals')}
            className="w-full flex items-center justify-between p-3 rounded-xl mb-2"
            style={{
              background: 'rgba(255,45,107,0.06)',
              border: '1px solid rgba(255,45,107,0.15)',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center gap-2">
              <span>💰</span>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                Jinxy Credits
              </p>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
              {formatCurrency(profile?.jinxy_credits ?? 0)}
            </p>
          </button>
        )}
      </div>

      {/* Menu */}
      <div className="relative px-5 pb-8 space-y-6">
        {menuSections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-medium uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {section.title}
            </p>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150"
                  style={{
                    borderBottom: idx < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                    background: 'transparent',
                  }}
                >
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span className="flex-1 text-sm font-medium" style={{
                    color: (item as any).danger ? 'var(--red)'
                      : (item as any).highlight ? '#9333EA'
                      : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {item.label}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Avatar Viewer */}
      {showAvatarViewer && profile?.id && (
        <AvatarViewer
          userId={profile.id}
          currentAvatarMoment={avatarMoment ?? null}
          supabase={supabase}
          onClose={() => setShowAvatarViewer(false)}
          onChanged={() => {
            fetchAvatarMoment()
            refresh()
            setShowAvatarViewer(false)
          }}
        />
      )}

      <style jsx>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

// ─── AvatarViewer ─────────────────────────────────────────────────────────────

interface AvatarViewerProps {
  userId: string
  currentAvatarMoment: AvatarMoment | null
  supabase: ReturnType<typeof import('@/lib/hooks/useSupabase').useSupabase>
  onClose: () => void
  onChanged: () => void
}

interface ImageMoment {
  id: string
  storage_path: string
  is_avatar: boolean
}

function AvatarViewer({ userId, currentAvatarMoment, supabase, onClose, onChanged }: AvatarViewerProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'view' | 'pick' | 'crop'>('view')
  const [imageMoments, setImageMoments] = useState<ImageMoment[]>([])
  const [loadingMoments, setLoadingMoments] = useState(false)
  const [settingDp, setSettingDp] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchImageMoments = async () => {
    setLoadingMoments(true)
    const { data } = await supabase
      .from('media')
      .select('id, storage_path, is_avatar')
      .eq('user_id', userId)
      .eq('category', 'moment')
      .eq('media_type', 'image')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    if (data) setImageMoments(data as ImageMoment[])
    setLoadingMoments(false)
  }

  useEffect(() => {
    if (mode === 'pick') fetchImageMoments()
  }, [mode])

  const handleSetAvatar = async (moment: ImageMoment) => {
    setSettingDp(moment.id)
    setError(null)

    // Clear existing avatar flag
    const { error: clearErr } = await supabase
      .from('media')
      .update({ is_avatar: false })
      .eq('user_id', userId)
      .eq('is_avatar', true)

    if (clearErr) { setError(clearErr.message); setSettingDp(null); return }

    // Set new avatar
    const { error: setErr } = await supabase
      .from('media')
      .update({ is_avatar: true })
      .eq('id', moment.id)

    if (setErr) { setError(setErr.message); setSettingDp(null); return }

    // Sync avatar_url
    await supabase
      .from('users')
      .update({ avatar_url: moment.storage_path })
      .eq('id', userId)

    setSettingDp(null)
    onChanged()
  }

  // User picks a new image from device to upload as a moment + set as avatar
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''
    setError(null)

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setCropSrc(dataUrl)
    setMode('crop')
  }

  // After crop confirm, upload to 'moments' bucket and set as avatar
  const handleCropConfirm = async (blob: Blob) => {
    setMode('pick')
    setCropSrc(null)
    setUploading(true)
    setUploadProgress(10)
    setError(null)

    const path = `${userId}/${Date.now()}.jpg`

    const ticker = setInterval(() => {
      setUploadProgress(p => Math.min(p + 8, 88))
    }, 300)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('moments')               // ← correct bucket
      .upload(path, blob, { upsert: false, contentType: 'image/jpeg' })

    clearInterval(ticker)

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(95)

    const { data: urlData } = supabase.storage.from('moments').getPublicUrl(uploadData.path)

    // Count existing moments to check limit
    const { count } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', 'moment')
      .eq('is_active', true)

    if ((count ?? 0) >= 5) {
      setError('You have reached the maximum of 5 moments. Delete one first.')
      setUploading(false)
      setUploadProgress(0)
      return
    }

    const { data: inserted, error: insertError } = await supabase
      .from('media')
      .insert({
        user_id: userId,
        storage_path: urlData.publicUrl,
        media_type: 'image',
        category: 'moment',
        watermarked: true,
        is_active: true,
        is_avatar: false,
        display_order: count ?? 0,
      })
      .select('id, storage_path, is_avatar')
      .single()

    if (insertError || !inserted) {
      setError(insertError?.message ?? 'Failed to save moment')
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(100)
    await handleSetAvatar(inserted as ImageMoment)

    setTimeout(() => {
      setUploading(false)
      setUploadProgress(0)
    }, 400)
  }

  const handleCropCancel = () => {
    setCropSrc(null)
    setMode('pick')
  }

  // ── Crop mode — fullscreen, replaces viewer ────────────────────────────────
  if (mode === 'crop' && cropSrc) {
    return (
      <div className="fixed inset-0 z-50">
        <ImageCropper
          imageSrc={cropSrc}
          mode="avatar"
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>

      {/* ── View mode ──────────────────────────────────────────────────────── */}
      {mode === 'view' && (
        <>
          <div className="flex items-center justify-between px-5"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 52px)', paddingBottom: 12 }}>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p style={{ color: 'white', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500 }}>
              Display Photo
            </p>
            <div style={{ width: 28 }} />
          </div>

          <div className="flex-1 flex items-center justify-center px-6">
            {currentAvatarMoment ? (
              <img
                src={currentAvatarMoment.storage_path}
                alt="Display photo"
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'cover', borderRadius: 16 }}
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                    <circle cx="28" cy="20" r="10" fill="rgba(255,255,255,0.2)" />
                    <path d="M8 48C8 36 48 36 48 48" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                  No display photo set
                </p>
              </div>
            )}
          </div>

          <div className="px-5 pb-12 space-y-3">
            <button
              onClick={() => setMode('pick')}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: 'var(--pink)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 4px 20px rgba(255,45,107,0.4)',
              }}
            >
              Change display photo
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-full text-base font-medium"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* ── Pick mode ──────────────────────────────────────────────────────── */}
      {mode === 'pick' && (
        <>
          <div className="flex items-center justify-between px-5"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 52px)', paddingBottom: 12 }}>
            <button onClick={() => setMode('view')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p style={{ color: 'white', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500 }}>
              Choose Photo
            </p>
            <div style={{ width: 28 }} />
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="mx-5 mb-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)' }}>
                  Uploading...
                </p>
                <p className="text-xs" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                  {uploadProgress}%
                </p>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${uploadProgress}%`,
                  background: 'var(--pink)', transition: 'width 300ms ease', borderRadius: 999,
                }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-5 mb-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,77,106,0.15)', border: '1px solid rgba(255,77,106,0.3)' }}>
              <p className="text-xs text-center" style={{ color: '#FF4D6A', fontFamily: 'var(--font-body)' }}>
                {error}
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5">
            {loadingMoments ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 12,
                    background: 'rgba(255,255,255,0.08)',
                    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : imageMoments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                  No photo moments yet
                </p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
                  Upload a photo to use as your display photo
                </p>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-6 py-3 rounded-full text-sm font-semibold text-white"
                  style={{
                    background: 'var(--pink)', border: 'none',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)', opacity: uploading ? 0.7 : 1,
                    boxShadow: '0 4px 20px rgba(255,45,107,0.4)',
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload photo'}
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3"
                  style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)' }}>
                  Tap a photo to set as your display photo
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {imageMoments.map(moment => {
                    const isActive = moment.is_avatar
                    const isSetting = settingDp === moment.id
                    return (
                      <button
                        key={moment.id}
                        onClick={() => handleSetAvatar(moment)}
                        disabled={isSetting || !!settingDp || uploading}
                        style={{
                          aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
                          position: 'relative',
                          border: isActive ? '2.5px solid var(--pink)' : '2.5px solid transparent',
                          cursor: (settingDp || uploading) ? 'not-allowed' : 'pointer',
                          padding: 0,
                          opacity: (settingDp && !isSetting) || uploading ? 0.4 : 1,
                          transition: 'all 150ms ease',
                        }}
                      >
                        <img
                          src={moment.storage_path}
                          alt="Moment"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {isActive && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(255,45,107,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: 'var(--pink)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                                <path d="M1 5.5L5 9.5L13 1.5" stroke="white" strokeWidth="1.5"
                                  strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        )}
                        {isSetting && (
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                              style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Upload another */}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-3 rounded-full text-sm font-medium mt-4 mb-6"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  {uploading ? 'Uploading...' : '+ Upload new photo'}
                </button>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFilePick}
          />
        </>
      )}

      <style jsx>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
