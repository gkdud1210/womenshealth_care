export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(145deg, #fdf6f9 0%, #fce9f0 35%, #f8eeff 70%, #fdf0f8 100%)',
    }}>
      {children}
    </div>
  )
}
