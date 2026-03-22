// app/(client)/account/moments/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'

interface Moment {
  id: string
  storage_path: string
  media_type: 'image' | 'video'
  is_avatar: boolean
  display_order: number
  created_at: string
}

const MAX_MOMENTS = 5

export default function MomentsPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const fileRef = useRef<HTMLInputElement>(null)

  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (profile?.id) fetchMoments()
  }, [profile?.id])

  const fetchMoments = async () => {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('media')
      .select('id, storage_path, media_type, is_avatar, display_order, created_at')
      .eq('user_id', profile.id)
      .eq('category', 'moment')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    if (data) setMoments(data as Moment[])
    setLoading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id || moments.length >= MAX_MOMENTS) return

    setUploading(true)
    setUploadProgress(0)

    const ext = file.name.split('.').pop()
    const mediaType = file.type.startsWith('video') ? 'video' : 'image'
    const path = `moments/${profile.id}/${Date.now()}.${ext}`

    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 15, 85))
    }, 200)

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: false })

    clearInterval(progressInterval)

    if (!uploadError) {
      setUploadProgress(100)
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      await supabase.from('media').insert({
        user_id: profile.id,
        storage_path: urlData.publicUrl,
        media_type: mediaType,
        category: 'moment',
        watermarked: true,
        is_active: true,
        is_avatar: false,
        display_order: moments.length,
      })
      await fetchMoments()
    }

    setUploading(false)
    setUploadProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !profile?.id) return
    setDeleting(true)

    const moment = moments.find(m => m.id === deleteConfirm)
    if (moment) {
      // Remove from storage
      const pathParts = moment.storage_path.split('/media/')
      const storagePath = pathParts[1]
      if (storagePath) {
        await supabase.storage.from('media').remove([storagePath])
      }

      // Soft-delete from DB
      await supabase
        .from('media')
        .update({ is_active: false })
        .eq('id', deleteConfirm)

      // If this was the avatar, clear avatar_url on users
      if (moment.is_avatar) {
        await supabase
          .from('users')
          .update({ avatar_url: null })
          .eq('id', profile.id)
      }
    }

    setDeleteConfirm(null)
    setDeleting(false)
    await fetchMoments()
  }

  const momentToDelete = moments.find(m => m.id === deleteConfirm)

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(255,45,107,0.04) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <h1 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
            My Moments
          </h1>

          {/* Add button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || moments.length >= MAX_MOMENTS}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: moments.length >= MAX_MOMENTS ? 'var(--bg-elevated)' : 'var(--pink)',
              color: moments.length >= MAX_MOMENTS ? 'var(--text-muted)' : 'white',
              border: `1px solid ${moments.length >= MAX_MOMENTS ? 'var(--border)' : 'var(--pink)'}`,
              cursor: (uploading || moments.length >= MAX_MOMENTS) ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              opacity: uploading ? 0.7 : 1,
              boxShadow: moments.length < MAX_MOMENTS ? '0 4px 12px rgba(255,45,107,0.3)' : 'none',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          {moments.length}/{MAX_MOMENTS} · Jinxes see these before accepting your booking
        </p>
      </div>

      <div className="relative px-5 pb-8">

        {/* Upload progress */}
        {uploading && (
          <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                Uploading...
              </p>
              <p className="text-xs" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
                {uploadProgress}%
              </p>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'var(--bg-elevated)' }}>
              <div style={{
                height: '100%',
                width: `${uploadProgress}%`,
                background: 'var(--pink)',
                transition: 'width 200ms ease',
                borderRadius: 999,
              }} />
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                aspectRatio: '3/4',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                animation: 'skeleton-pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : moments.length === 0 ? (
          // Empty state
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl py-16"
            style={{
              background: 'var(--bg-surface)',
              border: '1.5px dashed var(--border)',
              cursor: 'pointer',
            }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                Add your first moment
              </p>
              <p className="text-xs"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Photos or short videos · Max {MAX_MOMENTS}
              </p>
            </div>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {moments.map(moment => (
              <div
                key={moment.id}
                className="relative rounded-xl overflow-hidden"
                style={{ aspectRatio: '3/4', background: 'var(--bg-elevated)' }}
              >
                {/* Media */}
                {moment.media_type === 'video' ? (
                  <video
                    src={moment.storage_path}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={moment.storage_path}
                    alt="Moment"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Video badge */}
                {moment.media_type === 'video' && (
                  <div
                    className="absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.65)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 3-6 3V2z" fill="white" />
                    </svg>
                  </div>
                )}

                {/* DP badge — image moments only */}
                {moment.media_type === 'image' && moment.is_avatar && (
                  <div
                    className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--pink)' }}
                  >
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'white',
                      fontFamily: 'var(--font-body)',
                      letterSpacing: '0.04em',
                    }}>
                      DP
                    </span>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={() => setDeleteConfirm(moment.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2L2 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add more slot */}
            {moments.length < MAX_MOMENTS && (
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-xl flex flex-col items-center justify-center gap-1.5"
                style={{
                  aspectRatio: '3/4',
                  background: 'var(--bg-surface)',
                  border: '1.5px dashed var(--border)',
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v12M3 9h12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  Add
                </span>
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-center mt-4"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
          To set your display photo, go back to your profile and tap your avatar.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Delete confirmation sheet */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-app px-5 pb-10 pt-5 rounded-t-3xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6"
              style={{ background: 'var(--border)' }} />

            {/* Preview of moment being deleted */}
            {momentToDelete && (
              <div className="flex justify-center mb-5">
                <div className="rounded-xl overflow-hidden" style={{ width: 80, height: 108 }}>
                  {momentToDelete.media_type === 'video' ? (
                    <video src={momentToDelete.storage_path} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={momentToDelete.storage_path} alt="Moment" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
            )}

            <p className="font-display text-lg mb-1 text-center"
              style={{ color: 'var(--text-primary)' }}>
              Remove this moment?
            </p>
            <p className="text-sm mb-6 text-center"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {momentToDelete?.is_avatar
                ? 'This is your current display photo. Removing it will also clear your profile picture.'
                : 'This action cannot be undone.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="w-full py-4 rounded-full text-sm font-semibold text-white"
                style={{
                  background: '#FF4D6A',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Removing...' : 'Yes, remove'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="w-full py-4 rounded-full text-sm font-medium"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
