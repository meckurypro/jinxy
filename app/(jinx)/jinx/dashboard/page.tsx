// app/(jinx)/jinx/dashboard/page.tsx
// Jinx command centre. Answers one question: "What do I need to do right now?"
// Sections: online toggle · story upload · pending requests · active session · KYC banner
// Earnings data lives in /jinx/earnings — not here.
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useSwitchMode } from '@/lib/hooks/useSwitchMode'
import { Avatar } from '@/components/shared/Avatar'

interface JinxProfile {
  is_active: boolean
  status: 'online' | 'offline' | 'busy' | 'unavailable'
  kyc_status: string
  operating_area: string | null
}

interface DashboardCounts {
  pending_requests: number
  active_booking_id: string | null
}

// ─── Story upload sheet ───────────────────────────────────────────────────────

interface StoryUploadSheetProps {
  userId: string
  supabase: ReturnType<typeof import('@/lib/hooks/useSupabase').useSupabase>
  onClose: () => void
  onUploaded: () => void
}

function StoryUploadSheet({ userId, supabase, onClose, onUploaded }: StoryUploadSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview({ url, type: f.type.startsWith('video/') ? 'video' : 'image' })
  }

  const handleUpload = async () => {
    if (!file || !preview) return
    setUploading(true)
    setError('')

    try {
      const ext = file.name.split('.').pop()
      const path = `stories/${userId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: false })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { error: insertErr } = await supabase.from('media').insert({
        user_id: userId,
        storage_path: urlData.publicUrl,
        media_type: preview.type,
        category: 'story',
        watermarked: false,
        is_active: true,
        story_expires_at: expiresAt,
        display_order: 0,
      })
      if (insertErr) throw insertErr

      onUploaded()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.')
      setUploading(false)
    }
  }

  const handleDiscard = () => {
    setPreview(null)
    setFile(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={preview ? handleDiscard : onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
          {preview ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        <p className="text-sm font-medium text-white" style={{ fontFamily: 'var(--font-body)' }}>
          {preview ? 'Preview story' : 'Add to your story'}
        </p>
        <div style={{ width: 20 }} />
      </div>

      {/* Preview or picker */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {!preview ? (
          <div className="flex flex-col items-center gap-6 w-full">
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-4 rounded-3xl"
              style={{
                height: 280, border: '2px dashed rgba(147,51,234,0.4)',
                background: 'rgba(147,51,234,0.06)', cursor: 'pointer',
              }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(147,51,234,0.15)' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 6v16M6 14h16" stroke="#9333EA" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-base font-medium" style={{ color: 'white', fontFamily: 'var(--font-body)' }}>
                  Choose photo or video
                </p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>
                  Disappears after 24 hours
                </p>
              </div>
            </button>

            {/* Camera option note */}
            <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body)', fontSize: 12, textAlign: 'center' }}>
              On mobile, you can also choose your camera from the file picker
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4">
            {preview.type === 'image' ? (
              <img src={preview.url} alt="Story preview"
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'cover', borderRadius: 16 }} />
            ) : (
              <video ref={videoRef} src={preview.url} controls
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'cover', borderRadius: 16 }} />
            )}
            {error && (
              <p style={{ color: '#FF4D6A', fontFamily: 'var(--font-body)', fontSize: 13, textAlign: 'center' }}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-12 space-y-3">
        {preview ? (
          <>
            <button onClick={handleUpload} disabled={uploading}
              className="w-full py-4 rounded-full text-base font-semibold text-white"
              style={{
                background: uploading ? 'rgba(147,51,234,0.5)' : '#9333EA',
                border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: uploading ? 'none' : '0 4px 20px rgba(147,51,234,0.4)',
              }}>
              {uploading ? 'Sharing...' : 'Share to story'}
            </button>
            <button onClick={handleDiscard}
              className="w-full py-4 rounded-full text-base font-medium"
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>
              Choose different
            </button>
          </>
        ) : (
          <button onClick={onClose}
            className="w-full py-4 rounded-full text-base font-medium"
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
            Cancel
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({ width, height, rounded = 8 }: { width: string | number; height: number; rounded?: number }) {
  return (
    <div style={{
      width, height, borderRadius: rounded,
      background: 'rgba(147,51,234,0.08)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function JinxDashboardPage() {
  const router = useRouter()
  const { profile } = useUser()
  const supabase = useSupabase()
  const { switchTo, switching } = useSwitchMode()

  const [jinxProfile, setJinxProfile] = useState<JinxProfile | null>(null)
  const [counts, setCounts] = useState<DashboardCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [showStorySheet, setShowStorySheet] = useState(false)

  useEffect(() => {
    if (profile?.id) fetchData()
  }, [profile?.id])

  const fetchData = async () => {
    if (!profile?.id) return
    setLoading(true)

    const [jpRes, pendingRes, activeRes] = await Promise.all([
      supabase
        .from('jinx_profiles')
        .select('is_active, status, kyc_status, operating_area')
        .eq('user_id', profile.id)
        .maybeSingle(),

      supabase
        .from('booking_responses')
        .select('*', { count: 'exact', head: true })
        .eq('jinx_id', profile.id)
        .eq('status', 'notified'),

      supabase
        .from('bookings')
        .select('id')
        .eq('jinx_id', profile.id)
        .eq('status', 'in_progress')
        .maybeSingle(),
    ])

    if (jpRes.data) setJinxProfile(jpRes.data as JinxProfile)
    setCounts({
      pending_requests: pendingRes.count ?? 0,
      active_booking_id: activeRes.data?.id ?? null,
    })
    setLoading(false)
  }

  const handleToggleStatus = async () => {
    if (!profile?.id || togglingStatus || !jinxProfile) return
    if (jinxProfile.kyc_status !== 'verified') {
      alert('Complete KYC verification before going online.')
      return
    }
    setTogglingStatus(true)
    const newStatus = jinxProfile.status === 'online' ? 'offline' : 'online'
    const { error } = await supabase
      .from('jinx_profiles')
      .update({ status: newStatus, is_active: newStatus === 'online' })
      .eq('user_id', profile.id)
    if (!error) {
      setJinxProfile(prev => prev ? { ...prev, status: newStatus as JinxProfile['status'], is_active: newStatus === 'online' } : prev)
    }
    setTogglingStatus(false)
  }

  const isOnline = jinxProfile?.status === 'online'
  const kycPending = !loading && jinxProfile?.kyc_status !== 'verified'
  const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'there'

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>

      {/* Subtle purple glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 30% at 50% 0%, rgba(147,51,234,0.07) 0%, transparent 50%)',
      }} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-0.5"
              style={{ color: 'rgba(147,51,234,0.6)', fontFamily: 'var(--font-body)' }}>
              Jinx mode
            </p>
            <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
              {loading ? <span style={{ opacity: 0.3 }}>Loading...</span> : `Hey, ${firstName}`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Story upload button */}
            <button
              onClick={() => setShowStorySheet(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(147,51,234,0.12)',
                border: '1.5px solid rgba(147,51,234,0.3)',
                cursor: 'pointer',
              }}
              aria-label="Add story"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7.5" stroke="#9333EA" strokeWidth="1.5" strokeDasharray="3 2"/>
                <path d="M9 5.5v7M5.5 9h7" stroke="#9333EA" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name || profile?.username || 'J'}
              size={40}
            />
          </div>
        </div>

        {/* ── Online toggle ───────────────────────────────────────────────── */}
        <div
          className="p-4 rounded-2xl mb-4"
          style={{
            background: isOnline
              ? 'linear-gradient(135deg, rgba(0,217,126,0.07), rgba(0,180,100,0.03))'
              : 'var(--bg-surface)',
            border: `1.5px solid ${isOnline ? 'rgba(0,217,126,0.22)' : 'var(--border)'}`,
            transition: 'all 300ms ease',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{
                color: isOnline ? '#00D97E' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                transition: 'color 300ms ease',
              }}>
                {loading ? '...' : isOnline ? 'You\'re online' : 'You\'re offline'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {isOnline
                  ? 'Clients can find and book you'
                  : 'Go online to receive bookings'}
              </p>
            </div>
            {loading ? (
              <Shimmer width={52} height={28} rounded={14} />
            ) : (
              <button
                onClick={handleToggleStatus}
                disabled={togglingStatus}
                style={{
                  width: 52, height: 28, borderRadius: 14,
                  background: isOnline ? '#00D97E' : 'var(--bg-elevated)',
                  border: `1px solid ${isOnline ? '#00D97E' : 'var(--border)'}`,
                  cursor: togglingStatus ? 'not-allowed' : 'pointer',
                  position: 'relative', transition: 'all 300ms ease',
                  opacity: togglingStatus ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3,
                  left: isOnline ? 27 : 3,
                  transition: 'left 300ms ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </button>
            )}
          </div>
        </div>

        {/* ── KYC banner ─────────────────────────────────────────────────── */}
        {kycPending && (
          <button
            onClick={() => router.push('/jinx/account')}
            className="w-full p-3 rounded-xl mb-4 flex items-center gap-3 text-left"
            style={{ background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.18)', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: '#FFB800', fontFamily: 'var(--font-body)' }}>
                KYC verification pending
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Complete to go online · Tap to verify
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="#FFB800" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Action cards ──────────────────────────────────────────────────── */}
      <div className="px-5 pb-28 space-y-3">

        {/* Pending requests — highlighted if non-zero */}
        <button
          onClick={() => router.push('/jinx/requests')}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
          style={{
            background: (counts?.pending_requests ?? 0) > 0
              ? 'rgba(147,51,234,0.08)'
              : 'var(--bg-surface)',
            border: `1.5px solid ${(counts?.pending_requests ?? 0) > 0
              ? 'rgba(147,51,234,0.25)'
              : 'var(--border)'}`,
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(147,51,234,0.12)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="14" height="14" rx="3.5" stroke="#9333EA" strokeWidth="1.5"/>
              <path d="M5 9h8M5 6h5M5 12h3" stroke="#9333EA" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{
              color: (counts?.pending_requests ?? 0) > 0 ? '#9333EA' : 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}>
              {loading ? 'Pending requests' : `${counts?.pending_requests ?? 0} pending request${(counts?.pending_requests ?? 0) === 1 ? '' : 's'}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {(counts?.pending_requests ?? 0) > 0 ? 'Tap to review and respond' : 'No new requests right now'}
            </p>
          </div>
          {(counts?.pending_requests ?? 0) > 0 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#9333EA' }}>
              <span style={{ fontSize: 12, color: 'white', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                {(counts?.pending_requests ?? 0) > 9 ? '9+' : counts?.pending_requests}
              </span>
            </div>
          )}
        </button>

        {/* Active session — only shown if one exists */}
        {counts?.active_booking_id && (
          <button
            onClick={() => router.push(`/jinx/messages/${counts.active_booking_id}`)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
            style={{
              background: 'rgba(0,217,126,0.07)',
              border: '1.5px solid rgba(0,217,126,0.22)',
              cursor: 'pointer',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,217,126,0.12)' }}>
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#00D97E' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#00D97E', fontFamily: 'var(--font-body)' }}>
                Session in progress
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Tap to open session chat
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="#00D97E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Quick nav links */}
        {[
          { label: 'My schedule',       icon: '📅', href: '/jinx/schedule' },
          { label: 'Earnings',          icon: '💰', href: '/jinx/earnings' },
          { label: 'My profile',        icon: '✨', href: '/jinx/profile' },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{item.icon}</span>
            <span className="flex-1 text-sm font-medium"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              {item.label}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}

        {/* Switch to client */}
        <button
          onClick={() => switchTo('client')}
          disabled={switching}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            cursor: switching ? 'not-allowed' : 'pointer',
            opacity: switching ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>🔄</span>
          <span className="flex-1 text-sm font-medium"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            {switching ? 'Switching...' : 'Switch to client mode'}
          </span>
        </button>
      </div>

      {/* Story upload sheet */}
      {showStorySheet && profile?.id && (
        <StoryUploadSheet
          userId={profile.id}
          supabase={supabase}
          onClose={() => setShowStorySheet(false)}
          onUploaded={() => {
            // Optionally refresh story counts or show a toast
          }}
        />
      )}

      <style jsx>{`
        @keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}
