'use client'

import { Avatar } from '@/components/shared/Avatar'
import { formatCurrency, formatDistance } from '@/lib/utils'

export interface VendorCardData {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  age?: number
  operating_area?: string
  distance_meters?: number
  average_rating: number
  total_jinxes: number
  is_premium: boolean
  non_negotiables?: string[]
  min_hourly_rate: number
  agreed_rate?: number
  transport_fare?: number
  total_cost?: number
}

interface VendorCardProps {
  vendor: VendorCardData
  onSelect?: () => void
  selected?: boolean
  showPrice?: boolean
}

export function VendorCard({ vendor, onSelect, selected = false, showPrice = true }: VendorCardProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: selected ? 'rgba(255,45,107,0.06)' : 'var(--bg-surface)',
        border: `1.5px solid ${selected ? 'var(--pink)' : 'var(--border)'}`,
        boxShadow: selected ? '0 0 0 3px rgba(255,45,107,0.1)' : 'var(--shadow-card)',
      }}
    >
      {/* Top section */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar
            src={vendor.avatar_url}
            name={vendor.full_name || vendor.username}
            size={52}
            showRing={vendor.is_premium}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p
                className="font-medium text-base truncate"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
              >
                {vendor.full_name || vendor.username}
                {vendor.age ? `, ${vendor.age}` : ''}
              </p>
              {vendor.is_premium && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: 'rgba(255,183,0,0.15)',
                    color: '#FFB700',
                    fontFamily: 'var(--font-body)',
                    fontSize: 10,
                  }}
                >
                  ✦ Pro
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Rating */}
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1l1.5 3h3L8 6l1 3-3-2-3 2 1-3-2.5-2H4.5L6 1z"
                    fill="#FFB700" />
                </svg>
                <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {vendor.average_rating > 0 ? vendor.average_rating.toFixed(1) : 'New'}
                </span>
              </div>

              {/* Jinxes */}
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                {vendor.total_jinxes} Jinx{vendor.total_jinxes !== 1 ? 'es' : ''}
              </span>

              {/* Distance */}
              {vendor.distance_meters !== undefined && (
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                  {formatDistance(vendor.distance_meters)}
                </span>
              )}
            </div>

            {/* Area */}
            {vendor.operating_area && (
              <p className="text-xs mt-0.5 truncate"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                📍 {vendor.operating_area}
              </p>
            )}
          </div>

          {/* Selected check */}
          {selected && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--pink)' }}
            >
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Non-negotiables */}
        {vendor.non_negotiables && vendor.non_negotiables.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {vendor.non_negotiables.slice(0, 3).map(nn => (
              <span
                key={nn}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{
                  background: 'rgba(255,77,106,0.08)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  border: '1px solid rgba(255,77,106,0.15)',
                }}
              >
                <span style={{ color: '#FF4D6A', fontSize: 8 }}>✕</span>
                {nn}
              </span>
            ))}
            {vendor.non_negotiables.length > 3 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                +{vendor.non_negotiables.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Price section */}
      {showPrice && vendor.total_cost !== undefined && (
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
        >
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Service + transport
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
              {formatCurrency(vendor.total_cost)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Fare: {formatCurrency(vendor.transport_fare ?? 0)}
            </p>
          </div>
        </div>
      )}
    </button>
  )
}
