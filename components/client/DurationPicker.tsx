'use client'

import { formatCurrency, getTierColor } from '@/lib/utils'

export type DurationTier = 'ruby' | 'emerald' | 'gold' | 'platinum' | 'topaz' | 'diamond'

const TIERS: {
  id: DurationTier
  name: string
  hours: number
  discount: number
}[] = [
  { id: 'ruby',     name: 'Ruby',     hours: 1,  discount: 0 },
  { id: 'emerald',  name: 'Emerald',  hours: 3,  discount: 0 },
  { id: 'gold',     name: 'Gold',     hours: 6,  discount: 5 },
  { id: 'platinum', name: 'Platinum', hours: 12, discount: 7 },
  { id: 'topaz',    name: 'Topaz',    hours: 24, discount: 10 },
  { id: 'diamond',  name: 'Diamond',  hours: 48, discount: 10 },
]

function formatHours(hours: number): string {
  if (hours < 24) return `${hours}hr`
  if (hours === 24) return '1 day'
  return `${hours / 24} days`
}

interface DurationPickerProps {
  selected: DurationTier
  onChange: (tier: DurationTier) => void
  hourlyRate?: number
}

export function DurationPicker({ selected, onChange, hourlyRate = 0 }: DurationPickerProps) {
  return (
    <div className="space-y-2">
      {TIERS.map(tier => {
        const isSelected = selected === tier.id
        const color = getTierColor(tier.id)
        const basePrice = hourlyRate * tier.hours
        const finalPrice = basePrice * (1 - tier.discount / 100)

        return (
          <button
            key={tier.id}
            onClick={() => onChange(tier.id)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200"
            style={{
              background: isSelected ? `${color}18` : 'var(--bg-elevated)',
              border: `1.5px solid ${isSelected ? color : 'var(--border)'}`,
              boxShadow: isSelected ? `0 0 0 3px ${color}15` : 'none',
            }}
          >
            {/* Left — tier name + hours */}
            <div className="flex items-center gap-3">
              {/* Color dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: color,
                  boxShadow: isSelected ? `0 0 8px ${color}80` : 'none',
                }}
              />
              <div className="text-left">
                <p
                  className="text-sm font-medium"
                  style={{
                    color: isSelected ? color : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {tier.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {formatHours(tier.hours)}
                  {tier.discount > 0 && (
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                      style={{
                        background: `${color}20`,
                        color,
                        fontSize: 10,
                      }}
                    >
                      -{tier.discount}%
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right — price or checkmark */}
            <div className="flex items-center gap-2">
              {hourlyRate > 0 && (
                <p
                  className="text-sm font-medium"
                  style={{
                    color: isSelected ? color : 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {formatCurrency(finalPrice)}
                </p>
              )}
              {isSelected && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: color }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
