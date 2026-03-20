// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      {children}
    </div>
  )
}
