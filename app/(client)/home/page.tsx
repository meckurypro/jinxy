// app/(client)/home/page.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface StorySlide {
  id: string
  storage_path: string
  media_type: 'image' | 'video'
  created_at: string
  story_expires_at: string
  is_liked: boolean
}

interface StoryUser {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  stories: StorySlide[]
  has_unseen: boolean
}

const GREETING_LINES: Record<'morning' | 'afternoon' | 'evening' | 'night', string[]> = {
  morning: [
    '{name}, your next Jinx is up early too.',
    'Good things happen to those who rise, {name}.',
    '{name}, someone nearby is already thinking about you.',
  ],
  afternoon: [
    "{name}, someone's around you.",
    'Your next connection is closer than you think, {name}.',
    '{name}, the vibe is right.',
  ],
  evening: [
    'Good evening, {name}. The night is young.',
    '{name}, love is just around the corner.',
    'The best part of the day starts now, {name}.',
  ],
  night: [
    "{name}, someone's still out there.",
    "Night owl? So is your Jinx, {name}.",
    'Late night energy, {name}. Find your Jinx.',
  ],
}

function getTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

const GREETING_LABEL = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night' }

export default function HomePage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)
  const [lineVisible, setLineVisible] = useState(true)
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([])
  const [storiesLoading, setStoriesLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUserIndex, setViewerUserIndex] = useState(0)
  const mapRef = useRef<HTMLDivElement>(null)
  const seenLocally = useRef(new Set<string>()).current
  const timeSlot = getTimeSlot()
  const lines = GREETING_LINES[timeSlot]

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth/login'); return }
      setCurrentUserId(user.id)
      const { data: profile } = await supabase
        .from('users').select('full_name, username').eq('id', user.id).single()
      if (profile) {
        setDisplayName(profile.full_name ? profile.full_name.trim().split(' ')[0] : profile.username)
      } else {
        setDisplayName('')
      }
      await fetchStories(supabase, user.id)
    })
    const t = setTimeout(() => setMapLoaded(true), 800)
    return () => clearTimeout(t)
  }, [])

  const fetchStories = async (supabase: ReturnType<typeof createClient>, userId: string) => {
    setStoriesLoading(true)
    const { data: favourites } = await supabase
      .from('profile_likes').select('jinx_id').eq('client_id', userId)
    if (!favourites || favourites.length === 0) { setStoryUsers([]); setStoriesLoading(false); return }
    const jinxIds = favourites.map((f: Record<string, unknown>) => f.jinx_id as string)
    const now = new Date().toISOString()
    const { data: stories } = await supabase
      .from('media')
      .select(`id, user_id, storage_path, media_type, created_at, story_expires_at,
        users!media_user_id_fkey ( id, username, full_name, avatar_url )`)
      .eq('category', 'story').eq('is_active', true).gt('story_expires_at', now)
      .in('user_id', jinxIds).order('created_at', { ascending: false })
    if (!stories || stories.length === 0) { setStoryUsers([]); setStoriesLoading(false); return }
    const storyIds = stories.map((s: Record<string, unknown>) => s.id as string)
    const [seenRes, likedRes] = await Promise.all([
      supabase.from('story_views').select('story_id').eq('viewer_id', userId).in('story_id', storyIds),
      supabase.from('media_likes').select('media_id').eq('user_id', userId).in('media_id', storyIds),
    ])
    const seenSet = new Set((seenRes.data ?? []).map((v: Record<string, unknown>) => v.story_id as string))
    const likedSet = new Set((likedRes.data ?? []).map((l: Record<string, unknown>) => l.media_id as string))
    const userMap = new Map<string, StoryUser>()
    for (const story of stories as Record<string, unknown>[]) {
      const user = story.users as Record<string, unknown>
      const uid = story.user_id as string
      if (!userMap.has(uid)) {
        userMap.set(uid, { id: uid, username: user.username as string,
          full_name: user.full_name as string | null,
          avatar_url: user.avatar_url as string | null,
          stories: [], has_unseen: false })
      }
      const entry = userMap.get(uid)!
      entry.stories.push({ id: story.id as string, storage_path: story.storage_path as string,
        media_type: story.media_type as 'image' | 'video', created_at: story.created_at as string,
        story_expires_at: story.story_expires_at as string, is_liked: likedSet.has(story.id as string) })
      if (!seenSet.has(story.id as string)) entry.has_unseen = true
    }
    const sorted = Array.from(userMap.values()).sort((a, b) => {
      if (a.has_unseen && !b.has_unseen) return -1
      if (!a.has_unseen && b.has_unseen) return 1
      return new Date(b.stories[0]?.created_at ?? 0).getTime() - new Date(a.stories[0]?.created_at ?? 0).getTime()
    })
    setStoryUsers(sorted)
    setStoriesLoading(false)
  }

  const handleStoryViewed = (storyId: string) => {
    seenLocally.add(storyId)
    setStoryUsers(prev => prev.map(u => ({
      ...u,
      has_unseen: u.stories.some(s => !seenLocally.has(s.id)),
    })))
    if (currentUserId) {
      const supabase = createClient()
      supabase.from('story_views').upsert({ story_id: storyId, viewer_id: currentUserId },
        { onConflict: 'story_id,viewer_id' }).then(() => {})
    }
  }

  const handleStoryLiked = (storyId: string, liked: boolean) => {
    setStoryUsers(prev => prev.map(u => ({
      ...u, stories: u.stories.map(s => s.id === storyId ? { ...s, is_liked: liked } : s),
    })))
    if (currentUserId) {
      const supabase = createClient()
      if (liked) {
        supabase.from('media_likes').upsert({ media_id: storyId, user_id: currentUserId },
          { onConflict: 'media_id,user_id' }).then(() => {})
      } else {
        supabase.from('media_likes').delete().eq('media_id', storyId).eq('user_id', currentUserId).then(() => {})
      }
    }
  }

  useEffect(() => {
    if (displayName === null || lines.length <= 1) return
    const interval = setInterval(() => {
      setLineVisible(false)
      setTimeout(() => { setLineIndex(i => (i + 1) % lines.length); setLineVisible(true) }, 400)
    }, 20 * 60 * 1000)
    return () => clearInterval(interval)
  }, [displayName, lines.length])

  const currentLine = displayName
    ? lines[lineIndex].replace('{name}', displayName || 'you') : null

  return (
    <div className="relative w-full" style={{ minHeight: '100dvh' }}>

      {/* MAP */}
      <div ref={mapRef} className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: mapLoaded ? 1 : 0 }}>
        <div className="w-full h-full" style={{
          background: 'linear-gradient(160deg, #0f1923 0%, #0a1520 50%, #0d1a2e 100%)' }}>
          <svg className="absolute inset-0 w-full h-full opacity-20" style={{ pointerEvents: 'none' }}>
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', opacity: 0.15 }}>
            <path d="M 0 300 Q 200 280 400 310 T 800 290" stroke="#4A90B8" strokeWidth="3" fill="none" />
            <path d="M 50 0 Q 80 200 60 400 T 80 800" stroke="#4A90B8" strokeWidth="2" fill="none" />
            <path d="M 0 450 Q 150 430 300 460 T 600 440" stroke="#4A90B8" strokeWidth="2" fill="none" />
          </svg>
          {[{ x: '30%', y: '35%', a: true }, { x: '60%', y: '45%', a: true }, { x: '45%', y: '60%', a: true }, { x: '70%', y: '30%', a: false }].map((pin, i) => (
            <div key={i} className="absolute" style={{ left: pin.x, top: pin.y, transform: 'translate(-50%,-50%)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                background: pin.a ? 'rgba(255,45,107,0.9)' : 'rgba(26,26,36,0.8)',
                border: `2px solid ${pin.a ? '#FF2D6B' : 'rgba(255,255,255,0.1)'}`,
                boxShadow: pin.a ? '0 0 16px rgba(255,45,107,0.5)' : 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1C7 1 2 4.5 2 8C2 10.76 4.24 13 7 13C9.76 13 12 10.76 12 8C12 4.5 7 1 7 1Z" fill="white" fillOpacity="0.9" />
                </svg>
              </div>
              {pin.a && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(255,45,107,0.3)', animationDuration: '2s' }} />}
            </div>
          ))}
          <div className="absolute" style={{ left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }}>
            <div className="w-4 h-4 rounded-full border-2 border-white" style={{ background: '#4A90E2', boxShadow: '0 0 12px rgba(74,144,226,0.8)' }} />
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(74,144,226,0.3)', animationDuration: '2s' }} />
          </div>
        </div>
      </div>
      {!mapLoaded && <div className="absolute inset-0 skeleton" />}

      {/* TOP OVERLAY — no hamburger */}
      <div className="absolute top-0 left-0 right-0 z-10" style={{
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.6) 60%, transparent 100%)',
        paddingTop: 'var(--safe-top)',
      }}>
        <div className="px-5 pt-4 pb-2">
          {/* Top bar — logo centered, bell right */}
          <div className="flex items-center justify-between mb-4">
            <div style={{ width: 40 }} />
            <h1 className="font-display text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              jinxy
            </h1>
            <button
              className="relative w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={() => router.push('/notifications')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C7.24 2 5 4.24 5 7V11L3 13V14H17V13L15 11V7C15 4.24 12.76 2 10 2Z"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 14C8 15.1 8.9 16 10 16C11.1 16 12 15.1 12 14" stroke="white" strokeWidth="1.5" />
              </svg>
              {/* Bell dot — driven by BottomNav's same logic; here just always show pink dot as placeholder, BottomNav manages real state */}
            </button>
          </div>

          {/* Stories strip */}
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {storiesLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: 32, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
                </div>
              ))
            ) : storyUsers.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-body)', fontSize: 12, paddingTop: 4 }}>
                Stories from your favourites appear here
              </p>
            ) : (
              storyUsers.map((storyUser, idx) => (
                <button key={storyUser.id}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                  onClick={() => { setViewerUserIndex(idx); setViewerOpen(true) }}>
                  <div className="w-14 h-14 rounded-full p-0.5" style={{
                    background: storyUser.has_unseen
                      ? 'linear-gradient(135deg, #FF2D6B, #FF6B9D)' : 'rgba(255,255,255,0.2)',
                  }}>
                    <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                      style={{ border: '2px solid rgba(10,10,15,0.9)' }}>
                      {storyUser.avatar_url ? (
                        <img src={storyUser.avatar_url} alt={storyUser.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: `hsl(${storyUser.id.charCodeAt(0) * 40}, 50%, 30%)` }}>
                          <span className="text-sm font-medium text-white">
                            {(storyUser.full_name || storyUser.username)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'var(--font-body)' }}>
                    {storyUser.full_name?.split(' ')[0] || storyUser.username}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM OVERLAY */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-5" style={{
        background: 'linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.7) 60%, transparent 100%)',
        paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 20px)',
      }}>
        <div className="mb-4">
          <p className="text-xs font-medium mb-1" style={{
            color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {GREETING_LABEL[timeSlot]}
          </p>
          {currentLine === null ? (
            <div style={{ height: 20, width: '75%', borderRadius: 6, background: 'rgba(255,255,255,0.08)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <p className="font-display text-lg" style={{
              color: 'var(--text-primary)', opacity: lineVisible ? 1 : 0, transition: 'opacity 400ms ease' }}>
              {currentLine}
            </p>
          )}
        </div>
        <button onClick={() => router.push('/find')}
          className="btn btn-primary btn-full btn-lg animate-glow"
          style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.01em' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C10 2 4 6 4 11C4 14.31 6.69 17 10 17C13.31 17 16 14.31 16 11C16 6 10 2 10 2Z" fill="white" fillOpacity="0.9" />
            <path d="M10 7V13M7.5 10H12.5" stroke="#FF2D6B" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Find a Jinx
        </button>
        <p className="text-xs text-center mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Showing available Jinxes near you
        </p>
      </div>

      {viewerOpen && storyUsers.length > 0 && (
        <StoryViewer
          users={storyUsers}
          initialUserIndex={viewerUserIndex}
          onClose={() => setViewerOpen(false)}
          onStoryViewed={handleStoryViewed}
          onStoryLiked={handleStoryLiked}
          router={router}
        />
      )}

      <style jsx>{`
        @keyframes skeleton-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}

// ─── Story Viewer (unchanged logic) ──────────────────────────────────────────

interface StoryViewerProps {
  users: StoryUser[]; initialUserIndex: number; onClose: () => void
  onStoryViewed: (id: string) => void; onStoryLiked: (id: string, liked: boolean) => void
  router: ReturnType<typeof useRouter>
}
const STORY_IMAGE_DURATION = 5000

function StoryViewer({ users, initialUserIndex, onClose, onStoryViewed, onStoryLiked, router }: StoryViewerProps) {
  const [userIndex, setUserIndex] = useState(initialUserIndex)
  const [slideIndex, setSlideIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const progressRef = useRef<NodeJS.Timeout | null>(null)
  const progressStartRef = useRef<number>(0)
  const progressAccRef = useRef<number>(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartX = useRef(0); const touchStartY = useRef(0)
  const currentUser = users[userIndex]
  const currentSlide = currentUser?.stories[slideIndex]
  const isVideo = currentSlide?.media_type === 'video'

  useEffect(() => { setTimeout(() => setVisible(true), 30) }, [])
  useEffect(() => { if (currentSlide?.id) onStoryViewed(currentSlide.id) }, [currentSlide?.id])

  const advanceSlide = useCallback(() => {
    setProgress(0); progressAccRef.current = 0
    if (slideIndex < currentUser.stories.length - 1) { setSlideIndex(s => s + 1) }
    else if (userIndex < users.length - 1) { setUserIndex(u => u + 1); setSlideIndex(0) }
    else { onClose() }
  }, [slideIndex, userIndex, currentUser, users, onClose])

  const goBack = useCallback(() => {
    setProgress(0); progressAccRef.current = 0
    if (slideIndex > 0) { setSlideIndex(s => s - 1) }
    else if (userIndex > 0) { setUserIndex(u => u - 1); setSlideIndex(0) }
  }, [slideIndex, userIndex])

  useEffect(() => {
    if (isVideo || paused) return
    progressStartRef.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - progressStartRef.current + progressAccRef.current * STORY_IMAGE_DURATION / 100
      const pct = Math.min((elapsed / STORY_IMAGE_DURATION) * 100, 100)
      setProgress(pct)
      if (pct >= 100) { progressAccRef.current = 0; advanceSlide() }
      else { progressRef.current = setTimeout(tick, 50) }
    }
    progressRef.current = setTimeout(tick, 50)
    return () => { if (progressRef.current) clearTimeout(progressRef.current) }
  }, [slideIndex, userIndex, paused, isVideo, advanceSlide])

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const h = Math.floor(diff / 3_600_000); const m = Math.floor(diff / 60_000)
    if (h >= 1) return `${h}h ago`; if (m >= 1) return `${m}m ago`; return 'Just now'
  }

  if (!currentUser || !currentSlide) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{
      background: '#000', opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 200ms ease, transform 200ms ease',
    }}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }}
      onTouchEnd={e => {
        const dy = e.changedTouches[0].clientY - touchStartY.current
        const dx = Math.abs(e.changedTouches[0].clientX - touchStartX.current)
        if (dy > 80 && dx < 50) onClose()
      }}
      onMouseDown={() => { setPaused(true); videoRef.current?.pause() }}
      onMouseUp={() => { setPaused(false); videoRef.current?.play().catch(() => {}) }}
      onMouseLeave={() => { setPaused(false); videoRef.current?.play().catch(() => {}) }}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2"
        style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
        {currentUser.stories.map((s, i) => (
          <div key={s.id} className="flex-1 rounded-full overflow-hidden"
            style={{ height: 2, background: 'rgba(255,255,255,0.3)' }}>
            <div style={{
              height: '100%', borderRadius: 9999, background: 'white',
              width: i < slideIndex ? '100%' : i === slideIndex ? `${progress}%` : '0%',
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute left-0 right-0 z-20 flex items-center gap-3 px-4"
        style={{ top: 'calc(var(--safe-top) + 20px)' }} onClick={e => e.stopPropagation()}>
        <button onClick={() => { onClose(); router.push(`/jinx/${currentUser.id}`) }}
          className="flex items-center gap-2 flex-1">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '1.5px solid rgba(255,255,255,0.5)' }}>
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: `hsl(${currentUser.id.charCodeAt(0) * 40}, 50%, 30%)` }}>
                <span className="text-xs font-medium text-white">
                  {(currentUser.full_name || currentUser.username)[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white" style={{ fontFamily: 'var(--font-body)' }}>
              {currentUser.full_name || currentUser.username}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', fontSize: 11 }}>
              {timeAgo(currentSlide.created_at)}
            </p>
          </div>
        </button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Media */}
      <div className="absolute inset-0 z-10"
        onClick={e => { const x = e.clientX; if (x < window.innerWidth * 0.3) goBack(); else advanceSlide() }}>
        {isVideo ? (
          <video ref={videoRef} src={currentSlide.storage_path} className="w-full h-full object-cover"
            autoPlay playsInline
            onEnded={() => { setProgress(100); progressAccRef.current = 0; advanceSlide() }}
            onTimeUpdate={() => {
              const v = videoRef.current
              if (v?.duration) setProgress((v.currentTime / v.duration) * 100)
            }} />
        ) : (
          <img src={currentSlide.storage_path} alt="Story" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Bottom actions */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 32px)', background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <button onClick={() => { onClose(); router.push(`/find?jinx=${currentUser.id}`) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: 'var(--pink)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 4px 16px rgba(255,45,107,0.4)' }}>
            Book a Jinx
          </button>
          <button onClick={() => onStoryLiked(currentSlide.id, !currentSlide.is_liked)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 24s-11-6.5-11-13a7 7 0 0114 0 7 7 0 0114 0c0 6.5-17 13-17 13z"
                fill={currentSlide.is_liked ? 'var(--pink)' : 'none'}
                stroke={currentSlide.is_liked ? 'var(--pink)' : 'white'} strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
