import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, Database, CloudOff, DollarSign, TrendingUp, Clock } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import DashboardLayout from '@/components/DashboardLayout'
import { forecastApi } from '@/services/api'
import { useActiveDataset, unwrapAnalysis } from '@/hooks/useActiveDataset'

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(0, 255, 136, 0.3)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
}

export default function PricesPage() {
  const { dataset, datasetId, isLoading: dsLoading } = useActiveDataset()

  const { data: resp, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['price-analysis', datasetId],
    queryFn: () => forecastApi.predictPrice(datasetId!),
    enabled: !!datasetId,
    staleTime: 0,
    retry: 1,
  })

  const { data: result, error: apiError, message } = unwrapAnalysis<any>(resp?.data)
  const backendDown = isError && !result

  const stats = result?.statistics ?? {}
  const fc = result?.forecast
  const statCards = [
    { label: 'Latest Price', key: 'latest_price' },
    { label: 'Average Price', key: 'average_price' },
    { label: 'Min Price', key: 'min_price' },
    { label: 'Max Price', key: 'max_price' },
    { label: 'Std Deviation', key: 'std_deviation' },
    { label: 'Volatility', key: 'volatility', suffix: '%' },
    { label: 'Records', key: 'total_records' },
  ].filter((c) => stats[c.key] != null)

  const hourlyData = Object.entries(stats.hourly_profile ?? {}).map(([h, v]) => ({
    hour: `${Number(h)}:00`,
    avg: Math.round(Number(v) * 100) / 100,
  }))
  const fcData = fc?.timestamps?.map((t: string, i: number) => ({
    time: String(t).slice(5, 16).replace('T', ' '),
    price: Math.round((fc.values[i] ?? 0) * 100) / 100,
    lower: fc.confidence_lower?.[i] != null ? Math.round(fc.confidence_lower[i] * 100) / 100 : undefined,
    upper: fc.confidence_upper?.[i] != null ? Math.round(fc.confidence_upper[i] * 100) / 100 : undefined,
  })) ?? []
  const hasResults = statCards.length > 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">Electricity Price Analysis</h1>
            <p className="text-gray-400 mt-1">Market price trends, peak detection and forecasting from your dataset</p>
          </div>
          <button onClick={() => refetch()} disabled={isLoading || isRefetching || !datasetId} className="btn-primary-neon">
            <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
            Run Analysis
          </button>
        </div>

        {dataset && (
          <div className="card-ultra glass rounded-2xl px-5 py-3 flex items-center gap-3 text-sm">
            <Database className="w-4 h-4 text-neon-emerald shrink-0" />
            <span className="text-gray-300">
              Analyzing <span className="text-white font-medium">{dataset.filename}</span>
              {dataset.rows_count ? <span className="text-gray-500"> · {dataset.rows_count.toLocaleString()} rows</span> : null}
            </span>
          </div>
        )}

        {!dsLoading && !dataset && (
          <div className="card-ultra glass rounded-2xl p-8 text-center">
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg text-white font-semibold mb-2">No dataset uploaded yet</h3>
            <p className="text-sm text-gray-400 mb-6">Upload a dataset with an electricity price column to enable analysis.</p>
            <Link to="/dataset-analysis" className="btn-primary-neon">Upload Dataset</Link>
          </div>
        )}

        {(isLoading || (dsLoading && dataset)) && (
          <div className="card-ultra glass rounded-2xl p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-neon-emerald animate-spin" />
          </div>
        )}

        {backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <CloudOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Cannot reach the backend</h3>
                <p className="text-sm text-gray-400">Start the FastAPI server (port 8000) and run the analysis again.</p>
              </div>
            </div>
          </div>
        )}

        {apiError && !hasResults && !backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Price analysis not available</h3>
                <p className="text-sm text-gray-400">{apiError || message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Required: a price column (price, electricity_price, market_price, tariff, rate).
                </p>
              </div>
            </div>
          </div>
        )}

        {hasResults && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((c, i) => (
                <motion.div key={c.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="card-ultra glass-premium glow-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-neon-emerald" />
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{c.label}</span>
                  </div>
                  <div className="text-xl font-bold text-white truncate">
                    {typeof stats[c.key] === 'number' ? Number(stats[c.key]).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(stats[c.key])}
                    {c.suffix ?? ''}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trend + peak hours */}
            <div className="card-ultra glass rounded-2xl p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-neon-emerald" />
                  <span className="text-sm text-gray-400">Trend:</span>
                  <span className={`text-sm font-semibold capitalize ${
                    stats.trend === 'up' ? 'text-red-400' : stats.trend === 'down' ? 'text-neon-cyan' : 'text-gray-300'
                  }`}>{stats.trend ?? '—'}</span>
                </div>
                {(stats.peak_hours?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-400">Peak hours:</span>
                    {stats.peak_hours.map((h: number) => (
                      <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">{h}:00</span>
                    ))}
                  </div>
                )}
                {(stats.off_peak_hours?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-400">Off-peak:</span>
                    {stats.off_peak_hours.map((h: number) => (
                      <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-neon-emerald/10 text-neon-emerald border border-neon-emerald/30">{h}:00</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hourly profile */}
            {hourlyData.length > 0 && (
              <div className="card-ultra glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-neon-emerald" />
                  <h3 className="text-lg font-semibold text-white">Average Price by Hour of Day</h3>
                </div>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                      <XAxis dataKey="hour" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,255,136,0.05)' }} />
                      <Bar dataKey="avg" name="Avg Price" fill="#00ff88" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Price forecast */}
            {fcData.length > 0 && (
              <div className="card-ultra glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-neon-emerald" />
                  <h3 className="text-lg font-semibold text-white">24-Step Price Forecast</h3>
                  {fc.metrics?.r2_score != null && (
                    <span className="ml-auto text-xs text-gray-500">R² {Number(fc.metrics.r2_score).toFixed(3)} · MAE {Number(fc.metrics.mae).toFixed(2)}</span>
                  )}
                </div>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fcData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                      <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="upper" name="Confidence Upper" stroke="rgba(251,191,36,0.4)" strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="lower" name="Confidence Lower" stroke="rgba(251,191,36,0.4)" strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="price" name="Forecast Price" stroke="#fbbf24" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}