'use client'

import { useEffect, useRef } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  height?: 'auto' | 'half' | 'full'
}

export function Sheet({ open, onClose, children, title, height = 'auto' }: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const heightMap = {
    auto: 'auto',
    half: '50dvh',
    full: '90dvh',
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fade-in 200ms ease',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-app mx-auto"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '24px 24px 0 0',
          borderTop: '1px solid var(--border)',
          maxHeight: heightMap[height],
          overflow: 'hidden',
          animation: 'sheet-up 350ms cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'calc(var(--safe-bottom, 0px) + 8px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="rounded-full"
            style={{
              width: 36,
              height: 4,
              background: 'var(--bg-overlay)',
            }}
          />
        </div>

        {/* Title */}
        {title && (
          <div
            className="px-6 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <h3
              className="font-display text-lg"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
          </div>
        )}

        {/* Content */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: height === 'full' ? '80dvh' : undefined }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
