// components/client/FilterSheet.tsx
'use client'

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
const BODY_TYPES   = ['Slim', 'Athletic', 'Average', 'Curvy', 'Plus size', 'Muscular']
const AGE_MIN = 18
const AGE_MAX = 60

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  values: FilterValues
  onChange: (values: FilterValues) => void
  onApply: () => void
}

// ─── Dual-thumb age slider ────────────────────────────────────────────────────
// Root fix: both sliders always cover AGE_MIN–AGE_MAX. We clamp on change only.
// No reactive min/max props = no thumb-dragging-the-other-one bug.
function AgeRangeSlider({ ageMin, ageMax, onMinChange, onMaxChange }: {
  ageMin: number; ageMax: number
  onMinChange: (v: number) => void
  onMaxChange: (v: number) => void
}) {
  const range = AGE_MAX - AGE_MIN
  const minPct = ((ageMin - AGE_MIN) / range) * 100
  const maxPct = ((ageMax - AGE_MIN) / range) * 100
  // When min thumb is in upper half, z-raise it so it stays grabbable
  const minOnTop = ageMin > (AGE_MIN + AGE_MAX) / 2

  const trackStyle: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    height: 4, borderRadius: 9999, pointerEvents: 'none',
  }

  const inputStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', margin: 0, padding: 0,
    appearance: 'none', WebkitAppearance: 'none',
    background: 'transparent', cursor: 'pointer', pointerEvents: 'all',
  }

  return (
    <div>
      <div className="flex justify-between mb-3">
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>18</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--pink)', fontFamily: 'var(--font-body)' }}>
          {ageMin} – {ageMax}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>60</span>
      </div>

      <div style={{ position: 'relative', height: 28 }}>
        {/* Base track */}
        <div style={{ ...trackStyle, left: 0, right: 0, background: 'rgba(255,255,255,0.1)' }} />
        {/* Active fill */}
        <div style={{
          ...trackStyle,
          left: `${minPct}%`,
          width: `${maxPct - minPct}%`,
          background: 'var(--pink)',
        }} />

        {/* Min thumb */}
        <input
          type="range"
          min={AGE_MIN} max={AGE_MAX}
          value={ageMin}
          onChange={e => onMinChange(Math.min(parseInt(e.target.value), ageMax - 1))}
          style={{ ...inputStyle, zIndex: minOnTop ? 5 : 3 }}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={AGE_MIN} max={AGE_MAX}
          value={ageMax}
          onChange={e => onMaxChange(Math.max(parseInt(e.target.value), ageMin + 1))}
          style={{ ...inputStyle, zIndex: minOnTop ? 3 : 5 }}
        />
      </div>

      <style>{`
        .filter-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: white;
          border: 2.5px solid #FF2D6B;
          box-shadow: 0 2px 8px rgba(255,45,107,0.35);
          cursor: grab;
          transition: transform 100ms, box-shadow 100ms;
        }
        .filter-range:active::-webkit-slider-thumb {
          cursor: grabbing;
          transform: scale(1.18);
          box-shadow: 0 4px 16px rgba(255,45,107,0.5);
        }
        .filter-range::-webkit-slider-runnable-track { background: transparent; height: 4px; }
        .filter-range::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: white; border: 2.5px solid #FF2D6B;
          box-shadow: 0 2px 8px rgba(255,45,107,0.35); cursor: grab;
        }
        .filter-range::-moz-range-track { background: transparent; height: 4px; }
      `}</style>
    </div>
  )
}

export function FilterSheet({ open, onClose, values, onChange, onApply }: FilterSheetProps) {
  const update = (partial: Partial<FilterValues>) => onChange({ ...values, ...partial })
  const toggleArray = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    background: selected ? 'var(--pink-glow)' : 'var(--bg-elevated)',
    color: selected ? 'var(--pink)' : 'var(--text-secondary)',
    border: `1.5px solid ${selected ? 'var(--border-pink)' : 'var(--border)'}`,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  })

  return (
    // zIndex 60 — above bottom-nav (z-50) and all map overlays
    <Sheet open={open} onClose={onClose} title="Filters" height="full" zIndex={60}>
      <div style={{ overflowY: "auto", paddingBottom: "calc(var(--nav-height, 72px) + var(--safe-bottom, 0px) + 24px)" }}>
        <div className="px-6 space-y-8">

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
                  className="flex-1 py-2.5 rounded-full text-sm font-medium capitalize"
                  style={chipStyle(values.interestedIn === opt)}
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
              {ETHNICITIES.map(e => (
                <button
                  key={e}
                  onClick={() => update({ preferredEthnicity: toggleArray(values.preferredEthnicity, e) })}
                  className="px-3 py-1.5 rounded-full text-sm"
                  style={chipStyle(values.preferredEthnicity.includes(e))}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Body type */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Body Type
            </p>
            <div className="flex flex-wrap gap-2">
              {BODY_TYPES.map(bt => (
                <button
                  key={bt}
                  onClick={() => update({ bodyType: toggleArray(values.bodyType, bt) })}
                  className="px-3 py-1.5 rounded-full text-sm"
                  style={chipStyle(values.bodyType.includes(bt))}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>

          {/* Age range — fixed dual slider */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              Age Range
            </p>
            <AgeRangeSlider
              ageMin={values.ageMin}
              ageMax={values.ageMax}
              onMinChange={v => update({ ageMin: v })}
              onMaxChange={v => update({ ageMax: v })}
            />
          </div>

          {/* Adult toggle */}
          <div className="flex items-center justify-between py-3 px-4 rounded-2xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-medium"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                Include 18+ companions
              </p>
              <p className="text-xs mt-0.5"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Show companions open to adult services
              </p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={values.includeAdult}
                onChange={e => update({ includeAdult: e.target.checked })} />
              <span className="switch-track" />
            </label>
          </div>

          {/* Apply */}
          <button
            onClick={() => { onApply(); onClose() }}
            className="w-full py-4 rounded-full text-base font-semibold text-white"
            style={{
              background: 'var(--pink)',
              boxShadow: '0 4px 20px rgba(255,45,107,0.35)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Save & search
          </button>
        </div>
      </div>
    </Sheet>
  )
}
