import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  width?: number | string
  height?: number | string
  rounded?: boolean
  circle?: boolean
}

export function Skeleton({ className, width, height, rounded = false, circle = false }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : rounded ? 9999 : undefined,
      }}
    />
  )
}

// Pre-built skeleton layouts
export function VendorCardSkeleton() {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <Skeleton circle width={52} height={52} />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="60%" rounded />
          <Skeleton height={12} width="40%" rounded />
        </div>
        <Skeleton height={24} width={60} rounded />
      </div>
      <Skeleton height={80} className="mb-3 rounded-xl" />
      <div className="flex gap-2">
        <Skeleton height={28} width={70} rounded />
        <Skeleton height={28} width={80} rounded />
        <Skeleton height={28} width={60} rounded />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton circle width={72} height={72} />
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="50%" rounded />
          <Skeleton height={14} width="35%" rounded />
        </div>
      </div>
      <Skeleton height={14} width="100%" rounded />
      <Skeleton height={14} width="80%" rounded />
      <Skeleton height={14} width="60%" rounded />
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton circle width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton height={14} width="40%" rounded />
        <Skeleton height={12} width="70%" rounded />
      </div>
      <Skeleton height={10} width={30} rounded />
    </div>
  )
}

export function BookingListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <Skeleton circle width={44} height={44} />
          <div className="flex-1 space-y-2">
            <Skeleton height={14} width="45%" rounded />
            <Skeleton height={11} width="60%" rounded />
          </div>
          <Skeleton height={22} width={65} rounded />
        </div>
      ))}
    </div>
  )
}
