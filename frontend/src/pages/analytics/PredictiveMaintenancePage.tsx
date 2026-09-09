import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, Database, CloudOff, Wrench, ShieldAlert, CheckCircle2 } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import DashboardLayout from '@/components/DashboardLayout'
import { analysisApi } from '@/services/api'
import { useActiveDataset, unwrapAnalysis } from '@/hooks/useActiveDataset'

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(0, 255, 136, 0.3)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
}
const RISK_COLORS: Record<string, string> = {
  low: '#00ff88',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#f87171',
}

export default function PredictiveMaintenancePage() {
  const { dataset, datasetId, isLoading: dsLoading } = useActiveDataset()

  const { data: resp, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['maintenance-analysis', datasetId],
    queryFn: () => analysisApi.analyzeMaintenance(datasetId!),
    enabled: !!datasetId,
    staleTime: 0,
    retry: 1,
  })

  const { data: result, error: apiError, message } = unwrapAnalysis<any>(resp?.data)
  const backendDown = isError && !result

  const assets = result?.asset_health ?? []
  const chartData = assets.map((a: any) => ({
    name: a.asset_name?.length > 14 ? a.asset_name.slice(0, 14) + '…' : a.asset_name,
    fullName: a.asset_name,
    health: a.current_health_score,
    risk: a.risk_level,
  }))
  const recommendations = result?.recommendations ?? []
  const hasResults = assets.length > 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">Predictive Maintenance</h1>
            <p className="text-gray-400 mt-1">Anomaly detection and asset health prediction from your dataset telemetry</p>
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
            <p className="text-sm text-gray-400 mb-6">Upload telemetry data (voltage, current, temperature, vibration…) to enable maintenance prediction.</p>
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
                <h3 className="text-white font-semibold mb-1">Maintenance analysis not available</h3>
                <p className="text-sm text-gray-400">{apiError || message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Required: numeric telemetry columns (voltage, current, temperature, vibration, etc.).
                </p>
              </div>
            </div>
          </div>
        )}

        {hasResults && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Assets Analyzed', value: result.total_assets },
                { label: 'Anomalies Detected', value: result.total_anomalies },
                { label: 'High-Risk Assets', value: assets.filter((a: any) => a.risk_level === 'high' || a.risk_level === 'critical').length },
                { label: 'Recommendations', value: recommendations.length },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="card-ultra glass-premium glow-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-neon-emerald" />
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{s.value ?? 0}</div>
                </motion.div>
              ))}
            </div>

            {/* Asset health chart */}
            <div className="card-ultra glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-5 h-5 text-neon-emerald" />
                <h3 className="text-lg font-semibold text-white">Asset Health Scores</h3>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,255,136,0.05)' }} />
                    <Bar dataKey="health" name="Health Score" radius={[4, 4, 0, 0]}>
                      {chartData.map((d: any, i: number) => (
                        <Cell key={i} fill={RISK_COLORS[d.risk] ?? '#00ff88'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-asset details & recommendations */}
            <div className="card-ultra glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Asset Details & Recommendations</h3>
              <div className="space-y-3">
                {assets.map((a: any) => (
                  <div key={a.asset_id ?? a.asset_name} className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-dark-border/60 bg-dark-bg/30">
                    <div className="flex-1">
                      <div className="text-white font-medium">{a.asset_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {a.anomaly_count} anomalies · CV {a.coefficient_of_variation} · drift {a.change_rate}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${
                        a.risk_level === 'critical' ? 'bg-red-500/10 text-red-300 border-red-500/30'
                        : a.risk_level === 'high' ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                        : a.risk_level === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                        : 'bg-neon-emerald/10 text-neon-emerald border-neon-emerald/30'
                      }`}>{a.risk_level} risk</span>
                      <span className="text-white font-bold w-16 text-right">{a.current_health_score}/100</span>
                    </div>
                  </div>
                ))}
              </div>
              {recommendations.length > 0 && (
                <div className="mt-6 space-y-2">
                  {recommendations.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                      {r.priority === 'medium'
                        ? <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        : <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />}
                      <div>
                        <span className="text-sm text-white">{r.asset}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{r.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}