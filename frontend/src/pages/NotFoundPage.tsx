import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl glass border border-neon-emerald/30 flex items-center justify-center">
          <Compass className="w-10 h-10 text-neon-emerald" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-4">404</h1>
        <h2 className="text-2xl text-white font-semibold mb-2">Page Not Found</h2>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary-neon">
          Return Home
        </Link>
      </div>
    </div>
  )
}