export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-dark-border border-t-neon-emerald animate-spin"></div>
        </div>
        <p className="text-neon-emerald text-lg font-medium">Loading GridSense...</p>
      </div>
    </div>
  )
}
