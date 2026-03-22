'use client'

// components/shared/ImageCropper.tsx
// WhatsApp-style image cropper using react-easy-crop.
// Handles pinch-zoom, drag, rotation, and aspect ratio switching.
// Outputs a Blob ready to upload — no temp cloud round-trip needed.

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'

// ─── Canvas helper ────────────────────────────────────────────────────────────

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

function getRadianAngle(deg: number) {
  return (deg * Math.PI) / 180
}

function rotateSize(width: number, height: number, rotation: number) {
  const rad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  }
}

export async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  outputSize?: { width: number; height: number }
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const rad = getRadianAngle(rotation)
  const { width: bBoxW, height: bBoxH } = rotateSize(image.width, image.height, rotation)

  canvas.width = bBoxW
  canvas.height = bBoxH

  ctx.translate(bBoxW / 2, bBoxH / 2)
  ctx.rotate(rad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height)

  // Use outputSize if provided, otherwise use natural crop size
  canvas.width = outputSize?.width ?? pixelCrop.width
  canvas.height = outputSize?.height ?? pixelCrop.height
  ctx.putImageData(data, 0, 0)

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92)
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AspectOption = {
  label: string
  value: number | undefined // undefined = free
  icon: string
}

const ASPECT_OPTIONS_MOMENTS: AspectOption[] = [
  { label: '3:4', value: 3 / 4, icon: '▯' },
  { label: '1:1', value: 1, icon: '□' },
  { label: 'Free', value: undefined, icon: '⛶' },
]

const ASPECT_OPTIONS_AVATAR: AspectOption[] = [
  { label: '1:1', value: 1, icon: '□' },
]

interface ImageCropperProps {
  /** base64 or blob URL of the image to crop */
  imageSrc: string
  /** 'avatar' forces 1:1, 'moment' allows switching */
  mode: 'avatar' | 'moment'
  /** Called with the cropped Blob when user confirms */
  onConfirm: (blob: Blob) => void
  /** Called when user cancels */
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImageCropper({
  imageSrc,
  mode,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const aspectOptions = mode === 'avatar' ? ASPECT_OPTIONS_AVATAR : ASPECT_OPTIONS_MOMENTS
  const [selectedAspect, setSelectedAspect] = useState<AspectOption>(aspectOptions[0])
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      // Avatar: output at 600×600px max. Moments: output at 1080px wide max.
      const outputSize = mode === 'avatar'
        ? { width: 600, height: 600 }
        : { width: 1080, height: Math.round(1080 * (croppedAreaPixels.height / croppedAreaPixels.width)) }

      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation, outputSize)
      if (blob) onConfirm(blob)
    } finally {
      setProcessing(false)
    }
  }

  const handleRotate = () => {
    setRotation(r => (r + 90) % 360)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#000', touchAction: 'none' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 48px)',
          paddingBottom: 12,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'white', padding: 4,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p style={{
          color: 'white', fontFamily: 'var(--font-body)',
          fontSize: 15, fontWeight: 500,
        }}>
          {mode === 'avatar' ? 'Set display photo' : 'Crop moment'}
        </p>

        <button
          onClick={handleConfirm}
          disabled={processing}
          style={{
            background: 'none', border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
            color: processing ? 'rgba(255,255,255,0.4)' : 'var(--pink)',
            fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
            padding: 4,
          }}
        >
          {processing ? '...' : 'Use'}
        </button>
      </div>

      {/* Crop area */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={selectedAspect.value}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: {
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            },
          }}
          showGrid
          zoomWithScroll
        />
      </div>

      {/* Bottom controls */}
      <div
        className="flex-shrink-0 px-5 pb-safe"
        style={{
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
        }}
      >
        {/* Zoom slider */}
        <div className="py-4 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
            <path d="M11 11L14 14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M5 7h4M7 5v4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: 'var(--pink)',
              height: 2,
              cursor: 'pointer',
            }}
          />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
            <path d="M11 11L14 14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M4 7h6M7 4v6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Aspect + Rotate row */}
        <div className="flex items-center justify-between pb-2">
          {/* Aspect options */}
          <div className="flex gap-2">
            {aspectOptions.map(opt => (
              <button
                key={opt.label}
                onClick={() => {
                  setSelectedAspect(opt)
                  setCrop({ x: 0, y: 0 })
                  setZoom(1)
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${selectedAspect.label === opt.label ? 'var(--pink)' : 'rgba(255,255,255,0.2)'}`,
                  background: selectedAspect.label === opt.label ? 'rgba(255,45,107,0.15)' : 'transparent',
                  color: selectedAspect.label === opt.label ? 'var(--pink)' : 'rgba(255,255,255,0.5)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Rotate button */}
          <button
            onClick={handleRotate}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 999,
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7C2 4.24 4.24 2 7 2C9.76 2 12 4.24 12 7"
                stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M10 5L12 7L14 5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
              Rotate
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
