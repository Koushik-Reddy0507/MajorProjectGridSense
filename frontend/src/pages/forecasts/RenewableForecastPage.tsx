import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, Database, CloudOff, Wind, Sun, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
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
const COLORS = ['#00ff88', '#00d4ff', '#fbbf24', '#f472b6', '#a78bfa']

export default function RenewableForecastPage() {
  const { dataset, datasetId, isLoading: dsLoading } = useActiveDataset()

  const { data: resp, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['renewable-forecast', datasetId],
    queryFn: () => forecastApi.predictRenewable(datasetId!),
    enabled: !!datasetId,
    staleTime: 0,
    retry: 1,
  })

  const { data: result, error: apiError, message } = unwrapAnalysis<any>(resp?.data)
  const backendDown = isError && !result

  // Render every generation series the backend detected (solar, wind, renewable...)
  const series = result
    ? Object.entries(result as Record<string, any>)
        .filter(([, v]) => v && Array.isArray(v.values) && v.values.length > 0)
        .map(([key, v]) => ({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          modelType: v.model_type,
          metrics: v.metrics ?? {},
          data: (v.timestamps as string[]).map((t: string, i: number) => ({
            time: String(t).slice(5, 16).replace('T', ' '),
            value: Math.round((v.values[i] ?? 0) * 100) / 100,
          })),
        }))
    : []
  const hasResults = series.length > 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">Renewable Forecast</h1>
            <p className="text-gray-400 mt-1">Solar & wind generation forecasting trained on your uploaded dataset</p>
          </div>
          <button onClick={() => refetch()} disabled={isLoading || isRefetching || !datasetId} className="btn-primary-neon">
            <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
            Run Forecast
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
            <p className="text-sm text-gray-400 mb-6">Upload a dataset with solar/wind generation columns to enable forecasting.</p>
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
                <p className="text-sm text-gray-400">Start the FastAPI server (port 8000) and run the forecast again.</p>
              </div>
            </div>
          </div>
        )}

        {apiError && !hasResults && !backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Renewable forecast not available</h3>
                <p className="text-sm text-gray-400">{apiError || message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Required: at least one generation column (solar, pv, wind, renewable) plus a timestamp column.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasResults && series.map((s, si) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}
            className="card-ultra glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              {s.key.includes('solar') ? <Sun className="w-5 h-5 text-yellow-400" /> : <Wind className="w-5 h-5 text-neon-cyan" />}
              <h3 className="text-lg font-semibold text-white capitalize">{s.label} Forecast</h3>
              <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> {s.modelType ?? 'ML model'}
                {s.metrics?.r2_score != null && ` · R² ${Number(s.metrics.r2_score).toFixed(3)}`}
                {s.metrics?.mae != null && ` · MAE ${Number(s.metrics.mae).toFixed(2)}`}
              </span>
            </div>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="value" name={s.label} stroke={COLORS[si % COLORS.length]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  )
}