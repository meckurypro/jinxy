// app/(client)/account/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency } from '@/lib/utils'

type Tab = 'profile' | 'moments'

interface Moment {
  id: string
  storage_path: string
  media_type: 'image' | 'video'
  display_order: number
  created_at: string
}

interface Stats {
  favourites: number
  likes: number
  jinxes: number
}

const MAX_MOMENTS = 5

export default function AccountPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()

  const [tab, setTab] = useState<Tab>('profile')
  const [stats, setStats] = useState<Stats>({ favourites: 0, likes: 0, jinxes: 0 })
  const [moments, setMoments] = useState<Moment[]>([])
  const [loadingMoments, setLoadingMoments] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile?.id) {
      fetchStats()
      fetchMoments()
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

  const fetchMoments = async () => {
    if (!profile?.id) return
    setLoadingMoments(true)
    const { data } = await supabase
      .from('media')
      .select('id, storage_path, media_type, display_order, created_at')
      .eq('user_id', profile.id)
      .eq('category', 'moment')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    if (data) setMoments(data as Moment[])
    setLoadingMoments(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id || moments.length >= MAX_MOMENTS) return
    setUploading(true); setUploadProgress(0)
    const ext = file.name.split('.').pop()
    const mediaType = file.type.startsWith('video') ? 'video' : 'image'
    const path = `moments/${profile.id}/${Date.now()}.${ext}`
    const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 85)), 200)
    const { error: uploadError } = await supabase.storage.from('media').upload(path, file, { upsert: false })
    clearInterval(progressInterval)
    if (!uploadError) {
      setUploadProgress(100)
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      await supabase.from('media').insert({
        user_id: profile.id, storage_path: urlData.publicUrl,
        media_type: mediaType, category: 'moment', watermarked: true,
        is_active: true, display_order: moments.length,
      })
      await fetchMoments()
    }
    setUploading(false); setUploadProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !profile?.id) return
    setDeleting(true)
    const moment = moments.find(m => m.id === deleteConfirm)
    if (moment) {
      const pathParts = moment.storage_path.split('/media/')
      const storagePath = pathParts[1]
      if (storagePath) await supabase.storage.from('media').remove([storagePath])
      await supabase.from('media').update({ is_active: false }).eq('id', deleteConfirm)
    }
    setDeleteConfirm(null); setDeleting(false)
    await fetchMoments()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'jinxy-profile-complete=; path=/; max-age=0'
    router.replace('/auth/login')
  }

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

      {/* Profile header */}
      <div className="relative px-5 pt-14 pb-4">
        <div className="flex items-center gap-4 mb-5">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || profile?.username || 'U'}
            size={72}
            onClick={() => router.push('/account/edit')}
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl truncate" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name || profile?.username || '...'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              @{profile?.username}
            </p>
          </div>
          <button
            onClick={() => router.push('/account/edit')}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Edit
          </button>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden mb-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => router.push('/account/favourites')}
            className="flex flex-col items-center py-4"
            style={{ borderRight: '1px solid var(--border)', background: 'transparent' }}
          >
            <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>{stats.favourites}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Favourites</p>
          </button>
          <div className="flex flex-col items-center py-4" style={{ borderRight: '1px solid var(--border)' }}>
            <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>{stats.likes}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Likes</p>
          </div>
          <button
            onClick={() => router.push('/jinxes')}
            className="flex flex-col items-center py-4"
            style={{ background: 'transparent' }}
          >
            <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>{stats.jinxes}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Jinxes</p>
          </button>
        </div>

        {/* Credits */}
        {(profile?.jinxy_credits ?? 0) > 0 && (
          <button
            onClick={() => router.push('/account/referrals')}
            className="w-full flex items-center justify-between p-3 rounded-xl mb-4"
            style={{ background: 'rgba(255,45,107,0.06)', border: '1px solid rgba(255,45,107,0.15)', cursor: 'pointer' }}
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

        {/* Tabs */}
        <div className="flex rounded-full p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {(['profile', 'moments'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200"
              style={{
                background: tab === t ? 'var(--pink)' : 'transparent',
                color: tab === t ? 'white' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'profile' ? (
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
                    <span
                      className="flex-1 text-sm font-medium"
                      style={{
                        color: (item as { danger?: boolean }).danger ? 'var(--red)'
                          : (item as { highlight?: boolean }).highlight ? '#9333EA'
                          : 'var(--text-primary)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {item.label}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative px-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>Display Media</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {moments.length}/{MAX_MOMENTS} · Vendors see these before accepting
              </p>
            </div>
            {moments.length < MAX_MOMENTS && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium"
                style={{
                  background: 'var(--pink)', color: 'white', border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)', opacity: uploading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(255,45,107,0.35)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add
              </button>
            )}
          </div>

          {uploading && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Uploading...</p>
                <p className="text-xs" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>{uploadProgress}%</p>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'var(--bg-elevated)' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--pink)', transition: 'width 200ms ease', borderRadius: 999 }} />
              </div>
            </div>
          )}

          {loadingMoments ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl" style={{ aspectRatio: '3/4', background: 'var(--bg-elevated)' }} />
              ))}
            </div>
          ) : moments.length === 0 ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl py-12"
              style={{ background: 'var(--bg-surface)', border: '1.5px dashed var(--border)', cursor: 'pointer' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 4v14M4 11h14" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Add your first moment</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Photos or videos · Max {MAX_MOMENTS}</p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {moments.map(moment => (
                <div key={moment.id} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', background: 'var(--bg-elevated)' }}>
                  {moment.media_type === 'video' ? (
                    <video src={moment.storage_path} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={moment.storage_path} alt="Moment" className="w-full h-full object-cover" />
                  )}
                  {moment.media_type === 'video' && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 3-6 3V2z" fill="white" /></svg>
                    </div>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(moment.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2L2 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              {moments.length < MAX_MOMENTS && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ aspectRatio: '3/4', background: 'var(--bg-surface)', border: '1.5px dashed var(--border)', cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 3v12M3 9h12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Add</span>
                </button>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleUpload} />
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-app px-5 pb-8 pt-5 rounded-t-3xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--border)' }} />
            <p className="font-display text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Remove this moment?</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              This will permanently delete the media. This action cannot be undone.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="w-full py-3.5 rounded-full text-sm font-semibold text-white"
                style={{ background: 'var(--red, #FF4D6A)', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Removing...' : 'Yes, remove'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-full py-3.5 rounded-full text-sm font-medium"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
