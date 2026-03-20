'use client'

import { useState } from 'react'
import { useSupabase } from '@/lib/hooks/useSupabase'

type VendorStatus = 'offline' | 'available' | 'busy' | 'unavailable'

const STATUS_CONFIG: Record<VendorStatus, { label: string; color: string; bg: string; description: string }> = {
  available: {
    label: 'Available',
    color: '#00D97E',
    bg: 'rgba(0,217,126,0.12)',
    description: 'You can receive requests',
  },
  busy: {
    label: 'Busy',
    color: '#FFB800',
    bg: 'rgba(255,184,0,0.12)',
    description: 'Request accepted, waiting for client',
  },
  unavailable: {
    label: 'In Session',
    color: '#FF4D6A',
    bg: 'rgba(255,77,106,0.12)',
    description: 'Currently in an active session',
  },
  offline: {
    label: 'Offline',
    color: '#5C5875',
    bg: 'rgba(92,88,117,0.12)',
    description: 'Not accepting requests',
  },
}

interface StatusToggleProps {
  userId: string
  initialStatus: VendorStatus
  onStatusChange?: (status: VendorStatus) => void
}

export function StatusToggle({ userId, initialStatus, onStatusChange }: StatusToggleProps) {
  const [status, setStatus] = useState<VendorStatus>(initialStatus)
  const [loading, setLoading] = useState(false)
  const supabase = useSupabase()

  const toggleOnlineStatus = async () => {
    // Only toggle between offline and available
    if (status === 'busy' || status === 'unavailable') return

    const newStatus: VendorStatus = status === 'offline' ? 'available' : 'offline'
    setLoading(true)

    try {
      const { error } = await supabase
        .from('jinx_profiles')
        .update({ status: newStatus })
        .eq('user_id', userId)

      if (!error) {
        setStatus(newStatus)
        onStatusChange?.(newStatus)
      }
    } finally {
      setLoading(false)
    }
  }

  const config = STATUS_CONFIG[status]
  const canToggle = status === 'offline' || status === 'available'

  return (
    <div className="space-y-3">
      {/* Main toggle card */}
      <div
        className="flex items-center justify-between p-4 rounded-2xl transition-all duration-300"
        style={{
          background: config.bg,
          border: `1.5px solid ${config.color}30`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Animated status dot */}
          <div className="relative w-3 h-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: config.color,
                boxShadow: status === 'available' ? `0 0 8px ${config.color}` : 'none',
              }}
            />
            {status === 'available' && (
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: config.color, opacity: 0.4 }}
              />
            )}
          </div>

          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: config.color, fontFamily: 'var(--font-body)' }}
            >
              {config.label}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
            >
              {config.description}
            </p>
          </div>
        </div>

        {/* Toggle switch — only when togglable */}
        {canToggle && (
          <button
            onClick={toggleOnlineStatus}
            disabled={loading}
            className="relative flex-shrink-0"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <div
              className="w-14 h-7 rounded-full transition-all duration-300"
              style={{
                background: status === 'available' ? config.color : 'var(--bg-overlay)',
                border: `1.5px solid ${status === 'available' ? config.color : 'var(--border)'}`,
              }}
            >
              <div
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300"
                style={{
                  left: status === 'available' ? 'calc(100% - 26px)' : '2px',
                }}
              />
            </div>
          </button>
        )}
      </div>

      {/* Status legend */}
      <div
        className="grid grid-cols-2 gap-2"
        style={{ display: 'none' }} // Hidden by default, show if needed
      >
        {(Object.entries(STATUS_CONFIG) as [VendorStatus, typeof STATUS_CONFIG[VendorStatus]][]).map(
          ([key, cfg]) => (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: cfg.color }}
              />
              <span
                className="text-xs"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
              >
                {cfg.label}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
