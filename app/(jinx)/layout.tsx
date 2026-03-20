import { BottomNav } from '@/components/shared/BottomNav'

export default function JinxLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="relative min-h-dvh"
      style={{ background: 'var(--bg-base)' }}
      data-mode="jinx"
    >
      <div className="screen-content">
        {children}
      </div>
      <BottomNav mode="jinx" />
    </div>
  )
}
