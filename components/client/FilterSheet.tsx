'use client'

import { useState } from 'react'
import { Sheet } from '@/components/shared/Sheet'

export interface FilterValues {
  interestedIn: 'girls' | 'boys' | 'both'
  preferredEthnicity: string[]
  bodyType: string[]
  ageMin: number
  ageMax: number
  includeAdult: boolean
}

const ETHNICITIES = ['Yoruba', 'Igbo', 'Hausa', 'Ijaw', 'Efik', 'Edo', 'Tiv', 'Other']
const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Plus size', 'Muscular']

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  values: FilterValues
  onChange: (values: FilterValues) => void
  onApply: () => void
}

export function FilterSheet({ open, onClose, values, onChange, onApply }: FilterSheetProps) {
  const update = (partial: Partial<FilterValues>) => {
    onChange({ ...values, ...partial })
  }

  const toggleArray = (arr: string[], item: string): string[] => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
  }

  return (
    <Sheet open={open} onClose={onClose} title="Filters" height="full">
      <div className="px-6 pb-6 space-y-8">

        {/* Interested in */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Interested in
          </p>
          <div className="flex gap-2">
            {(['girls', 'boys', 'both'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => update({ interestedIn: opt })}
                className="flex-1 py-2.5 rounded-full text-sm font-medium capitalize transition-all duration-200"
                style={{
                  background: values.interestedIn === opt ? 'var(--pink)' : 'var(--bg-elevated)',
                  color: values.interestedIn === opt ? 'white' : 'var(--text-secondary)',
                  border: `1.5px solid ${values.interestedIn === opt ? 'var(--pink)' : 'var(--border)'}`,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Ethnicity */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Preferred Ethnicity
          </p>
          <div className="flex flex-wrap gap-2">
            {ETHNICITIES.map(e => {
              const selected = values.preferredEthnicity.includes(e)
              return (
                <button
                  key={e}
                  onClick={() => update({ preferredEthnicity: toggleArray(values.preferredEthnicity, e) })}
                  className="px-3 py-1.5 rounded-full text-sm transition-all duration-200"
                  style={{
                    background: selected ? 'var(--pink-glow)' : 'var(--bg-elevated)',
                    color: selected ? 'var(--pink)' : 'var(--text-secondary)',
                    border: `1.5px solid ${selected ? 'var(--border-pink)' : 'var(--border)'}`,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {e}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body type */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Body Type
          </p>
          <div className="flex flex-wrap gap-2">
            {BODY_TYPES.map(bt => {
              const selected = values.bodyType.includes(bt)
              return (
                <button
                  key={bt}
                  onClick={() => update({ bodyType: toggleArray(values.bodyType, bt) })}
                  className="px-3 py-1.5 rounded-full text-sm transition-all duration-200"
                  style={{
                    background: selected ? 'var(--pink-glow)' : 'var(--bg-elevated)',
                    color: selected ? 'var(--pink)' : 'var(--text-secondary)',
                    border: `1.5px solid ${selected ? 'var(--border-pink)' : 'var(--border)'}`,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {bt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Age range */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Age Range
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
              {values.ageMin} – {values.ageMax}
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Min: {values.ageMin}
              </p>
              <input
                type="range"
                className="range-slider"
                min={18}
                max={values.ageMax - 1}
                value={values.ageMin}
                onChange={e => update({ ageMin: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Max: {values.ageMax}
              </p>
              <input
                type="range"
                className="range-slider"
                min={values.ageMin + 1}
                max={60}
                value={values.ageMax}
                onChange={e => update({ ageMax: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* 18+ toggle */}
        <div className="flex items-center justify-between py-3 px-4 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              Include 18+ companions
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Show companions open to adult services
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={values.includeAdult}
              onChange={e => update({ includeAdult: e.target.checked })}
            />
            <span className="switch-track" />
          </label>
        </div>

        {/* Apply button */}
        <button
          onClick={() => { onApply(); onClose() }}
          className="w-full py-4 rounded-full text-base font-semibold text-white"
          style={{
            background: 'var(--pink)',
            boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Save changes
        </button>
      </div>
    </Sheet>
  )
}
