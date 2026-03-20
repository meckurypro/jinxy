'use client'

import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { cn } from '@/lib/utils'

type ToastType = 'default' | 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'default', duration = 3000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type, duration }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed z-50 flex flex-col gap-2 pointer-events-none"
        style={{
          bottom: 'calc(var(--nav-height, 72px) + 16px + var(--safe-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 400,
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const icons: Record<ToastType, React.ReactNode> = {
    default: null,
    success: (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(0,217,126,0.2)' }}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="#00D97E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    error: (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,77,106,0.2)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2L8 8M8 2L2 8" stroke="#FF4D6A" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    info: (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,45,107,0.2)' }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="#FF2D6B" strokeWidth="1.5" />
          <path d="M5 4.5V7M5 3h.01" stroke="#FF2D6B" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl pointer-events-auto"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-elevated)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
        transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {icons[toast.type]}
      <span
        className="text-sm font-medium flex-1"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
      >
        {toast.message}
      </span>
    </div>
  )
}
