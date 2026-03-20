'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

type StatusType = 'available' | 'busy' | 'unavailable' | 'offline' | null

interface AvatarProps {
  src?: string | null
  name?: string
  size?: number
  showRing?: boolean
  showStatus?: boolean
  status?: StatusType
  className?: string
  onClick?: () => void
}

const STATUS_COLORS: Record<NonNullable<StatusType>, string> = {
  available: '#00D97E',
  busy: '#FFB800',
  unavailable: '#FF4D6A',
  offline: '#5C5875',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'linear-gradient(135deg, #FF2D6B, #C41751)',
    'linear-gradient(135deg, #9333EA, #6B21A8)',
    'linear-gradient(135deg, #FF6B35, #C44B1A)',
    'linear-gradient(135deg, #0EA5E9, #0369A1)',
    'linear-gradient(135deg, #10B981, #059669)',
    'linear-gradient(135deg, #F59E0B, #D97706)',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function Avatar({
  src,
  name = '',
  size = 40,
  showRing = false,
  showStatus = false,
  status = null,
  className,
  onClick,
}: AvatarProps) {
  const fontSize = Math.floor(size * 0.35)
  const statusSize = Math.floor(size * 0.28)
  const borderWidth = Math.max(2, Math.floor(size * 0.05))

  return (
    <div
      className={cn('relative inline-flex flex-shrink-0', className)}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Ring */}
      {showRing && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            padding: 2,
            background: 'conic-gradient(#FF2D6B 0deg, #9333EA 120deg, #FF2D6B 240deg, #9333EA 360deg)',
            borderRadius: '50%',
            animation: 'spin-ring 4s linear infinite',
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{ background: 'var(--bg-base)' }}
          />
        </div>
      )}

      {/* Avatar image or initials */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          inset: showRing ? borderWidth + 2 : 0,
          background: src ? 'var(--bg-elevated)' : getAvatarColor(name || 'U'),
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={name || 'Avatar'}
            fill
            className="object-cover"
            sizes={`${size}px`}
          />
        ) : (
          <span
            className="font-medium text-white select-none"
            style={{ fontSize, lineHeight: 1 }}
          >
            {getInitials(name || 'U')}
          </span>
        )}
      </div>

      {/* Status dot */}
      {showStatus && status && (
        <div
          className="absolute rounded-full"
          style={{
            width: statusSize,
            height: statusSize,
            background: STATUS_COLORS[status],
            border: `${borderWidth}px solid var(--bg-base)`,
            bottom: showRing ? borderWidth + 1 : 0,
            right: showRing ? borderWidth + 1 : 0,
            boxShadow: status === 'available' ? `0 0 6px ${STATUS_COLORS.available}` : 'none',
          }}
        />
      )}
    </div>
  )
}
