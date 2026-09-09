import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  LineChart, TrendingUp, Calendar, RefreshCw, Activity, Loader2, Database, BrainCircuit, CloudOff,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart,
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

export default function DemandPredictionPage() {
  const { dataset, datasetId, isLoading: dsLoading } = useActiveDataset()

  const { data: resp, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['demand-forecast', datasetId],
    queryFn: () => forecastApi.predictDemand(datasetId!),
    enabled: !!datasetId,
    staleTime: 0,
    retry: 1,
  })

  const { data: result, error: apiError, message } = unwrapAnalysis<any>(resp?.data)
  const backendDown = isError && !result

  const validationData = (result?.validation ?? []).map((v: any, i: number) => ({
    idx: i + 1,
    actual: Math.round(v.actual * 100) / 100,
    predicted: Math.round(v.predicted * 100) / 100,
  }))
  const forecastData = (result?.forecast ?? []).map((f: any) => ({
    time: String(f.timestamp).slice(11, 16),
    forecast: f.forecasted_demand,
    lower: f.confidence_lower,
    upper: f.confidence_upper,
  }))
  const metrics = result?.metrics ?? {}
  const hasResults = !!result?.forecast?.length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
              Electricity Demand Prediction
            </h1>
            <p className="text-gray-400 mt-1">
              ML-powered forecasting trained on your uploaded dataset's historical demand
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isLoading || isRefetching || !datasetId} className="btn-primary-neon">
            <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
            Run Forecast
          </button>
        </div>

        {/* Active dataset */}
        {dataset && (
          <div className="card-ultra glass rounded-2xl px-5 py-3 flex items-center gap-3 text-sm">
            <Database className="w-4 h-4 text-neon-emerald shrink-0" />
            <span className="text-gray-300">
              Analyzing <span className="text-white font-medium">{dataset.filename}</span>
              {dataset.rows_count ? <span className="text-gray-500"> · {dataset.rows_count.toLocaleString()} rows</span> : null}
            </span>
          </div>
        )}

        {/* No dataset uploaded yet */}
        {!dsLoading && !dataset && (
          <div className="card-ultra glass rounded-2xl p-8 text-center">
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg text-white font-semibold mb-2">No dataset uploaded yet</h3>
            <p className="text-sm text-gray-400 mb-6">Upload a dataset with a demand column to train the forecasting model.</p>
            <Link to="/dataset-analysis" className="btn-primary-neon">Upload Dataset</Link>
          </div>
        )}

        {/* Loading */}
        {(isLoading || (dsLoading && dataset)) && (
          <div className="card-ultra glass rounded-2xl p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-neon-emerald animate-spin" />
          </div>
        )}

        {/* Backend unreachable */}
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

        {/* Data / column availability issues (dynamic, from backend) */}
        {apiError && !hasResults && !backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Demand forecast not available</h3>
                <p className="text-sm text-gray-400">{apiError || message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Required: a demand column (demand, load, consumption, power_demand) and a timestamp column.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real results */}
        {hasResults && (
          <>
            {/* Model metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: BrainCircuit, label: 'Model', value: result.model_type ?? '—' },
                { icon: TrendingUp, label: 'MAE', value: metrics.mae != null ? Number(metrics.mae).toFixed(2) : '—' },
                { icon: TrendingUp, label: 'RMSE', value: metrics.rmse != null ? Number(metrics.rmse).toFixed(2) : '—' },
                { icon: Activity, label: 'R² Score', value: metrics.r2_score != null ? Number(metrics.r2_score).toFixed(3) : '—' },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="card-ultra glass-premium glow-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className="w-4 h-4 text-neon-emerald" />
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</span>
                  </div>
                  <div className="text-xl font-bold text-white truncate">{m.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Actual vs Predicted (validation) */}
            {validationData.length > 0 && (
              <div className="card-ultra glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <LineChart className="w-5 h-5 text-neon-emerald" />
                  <h3 className="text-lg font-semibold text-white">Actual vs Predicted (Validation)</h3>
                </div>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={validationData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                      <XAxis dataKey="idx" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="actual" name="Actual" stroke="#00ff88" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#00d4ff" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Trained on {result.training_records?.toLocaleString()} records · validated on {validationData.length} held-out samples
                </p>
              </div>
            )}

            {/* 24h forecast with confidence band */}
            <div className="card-ultra glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-neon-emerald" />
                <h3 className="text-lg font-semibold text-white">Next 24-Hour Demand Forecast</h3>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="demandFcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ff88" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#00ff88" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="upper" name="Confidence Upper" stroke="none" fill="rgba(0,212,255,0.12)" />
                    <Area type="monotone" dataKey="lower" name="Confidence Lower" stroke="none" fill="rgba(10,14,39,0.9)" />
                    <Area type="monotone" dataKey="forecast" name="Forecasted Demand" stroke="#00ff88" strokeWidth={2} fill="url(#demandFcGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}