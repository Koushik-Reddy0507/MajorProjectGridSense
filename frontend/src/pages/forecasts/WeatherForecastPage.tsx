import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Cloud, Sun,
  Search, RefreshCw, Loader2, AlertTriangle
} from 'lucide-react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { weatherApi } from '@/services/api'

export default function WeatherForecastPage() {
  const [city, setCity] = useState('London')
  const [searchInput, setSearchInput] = useState('')

  const {
    data: currentWeather,
    isLoading: isLoadingCurrent,
    error: currentError,
    refetch: refetchCurrent,
  } = useQuery({
    queryKey: ['weather', 'current', city],
    queryFn: () => weatherApi.getCurrent(city),
    enabled: !!city,
    staleTime: 1000 * 60 * 5,
  })

  const {
    refetch: refetchForecast,
  } = useQuery({
    queryKey: ['weather', 'forecast', city],
    queryFn: () => weatherApi.getForecast(city),
    enabled: !!city,
    staleTime: 1000 * 60 * 10,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setCity(searchInput.trim())
    }
  }

  const handleRefresh = () => {
    refetchCurrent()
    refetchForecast()
  }

  const weather = currentWeather?.data
  const isLoading = isLoadingCurrent

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">Weather Forecast</h1>
            <p className="text-gray-400 mt-1">Live weather data powered by OpenWeather API</p>
          </div>
          <button onClick={handleRefresh} disabled={isLoading} className="btn-primary-neon">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search city (e.g., London, Tokyo, New York)"
              className="w-full pl-10 pr-4 py-2.5 bg-dark-input border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-emerald transition-colors"
            />
          </div>
          <button type="submit" className="btn-primary-neon px-6">Search</button>
        </form>

        {currentError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-ultra glass rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Failed to fetch weather data</h3>
                <p className="text-sm text-gray-400">Could not retrieve weather for &quot;{city}&quot;. Please check the city name or try again later.</p>
                {(() => {
                  const detail = (currentError as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                  if (!detail) return null
                  return (
                    <p className="text-xs text-red-300/90 mt-2 font-mono">Backend says: {detail}</p>
                  )
                })()}
                <p className="text-xs text-gray-500 mt-2">
                  Tip: make sure the FastAPI backend is running on port 8000 and
                  OPENWEATHER_API_KEY is set in <code className="text-neon-emerald/80">backend/.env</code>.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isLoading && !weather && (
          <div className="card-ultra glass rounded-2xl p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-neon-emerald animate-spin" />
          </div>
        )}

        {weather && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-ultra glass rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-neon/20 flex items-center justify-center">
                  {weather.weather?.icon?.includes('01') ? <Sun className="w-10 h-10 text-yellow-400" /> : <Cloud className="w-10 h-10 text-gray-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg text-white font-semibold">{weather.location?.city}, {weather.location?.country}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">{Math.round(weather.temperature?.current)}</span>
                    <span className="text-lg text-gray-400">°C</span>
                  </div>
                  <p className="text-gray-400 capitalize mt-1">{weather.weather?.description}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
