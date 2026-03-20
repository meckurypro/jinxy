export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="screen screen-content-no-nav">
      {children}
    </div>
  )
}
