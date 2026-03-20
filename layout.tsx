import { BottomNav } from '@/components/shared/BottomNav'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-dvh" style={{ background: 'var(--bg-base)' }}>
      <div className="screen-content">
        {children}
      </div>
      <BottomNav mode="client" />
    </div>
  )
}
