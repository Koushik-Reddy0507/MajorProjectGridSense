import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, Database, CloudOff, Battery, BatteryCharging, Gauge, Thermometer, Zap, HeartPulse } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { analysisApi } from '@/services/api'
import { useActiveDataset, unwrapAnalysis } from '@/hooks/useActiveDataset'

export default function BatteryHealthPage() {
  const { dataset, datasetId, isLoading: dsLoading } = useActiveDataset()

  const { data: resp, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['battery-analysis', datasetId],
    queryFn: () => analysisApi.analyzeBattery(datasetId!),
    enabled: !!datasetId,
    staleTime: 0,
    retry: 1,
  })

  const { data: result, error: apiError, message } = unwrapAnalysis<any>(resp?.data)
  const backendDown = isError && !result

  // Dynamic stat cards from whatever telemetry the backend computed
  const LABELS: Record<string, string> = {
    soc_latest: 'SOC Latest (%)', soc_mean: 'SOC Mean (%)', soc_min: 'SOC Min (%)', soc_max: 'SOC Max (%)',
    soc_std: 'SOC Std Dev', detected_cycles: 'Charge Cycles', soh_latest: 'SOH Latest (%)', soh_mean: 'SOH Mean (%)',
    soh_min: 'SOH Min (%)', soh_max: 'SOH Max (%)', soh_degradation: 'SOH Degradation (%)',
    health_score: 'Health Score', voltage_mean: 'Mean Voltage (V)', voltage_min: 'Min Voltage (V)',
    voltage_max: 'Max Voltage (V)', current_mean: 'Mean Current (A)', temperature_mean: 'Mean Temp (°C)',
    temperature_max: 'Max Temp (°C)', temperature_min: 'Min Temp (°C)', anomaly_count: 'Anomalies',
    cycle_count: 'Cycles', charge_rate_mean: 'Mean Charge Rate', discharge_rate_mean: 'Mean Discharge Rate',
  }
  const statEntries = result
    ? Object.entries(result as Record<string, any>).filter(
        ([k, v]) => k !== 'columns_used' && k !== 'timestamp' && typeof v === 'number' && Number.isFinite(v),
      )
    : []
  const healthScore = result?.health_score
  const columnsUsed = Object.entries(result?.columns_used ?? {})

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">Battery Health Monitoring</h1>
            <p className="text-gray-400 mt-1">SOC/SOH tracking, degradation analysis and anomaly detection from your dataset</p>
          </div>
          <button onClick={() => refetch()} disabled={isLoading || isRefetching || !datasetId} className="btn-primary-neon">
            <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
            Analyze Battery
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
            <p className="text-sm text-gray-400 mb-6">Upload battery telemetry (SOC, SOH, voltage, current, temperature) to enable analysis.</p>
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

        {apiError && statEntries.length === 0 && !backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Battery analysis not available</h3>
                <p className="text-sm text-gray-400">{apiError || message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Required: SOC (soc, state_of_charge) and/or SOH (soh, state_of_health) columns. Voltage, current and temperature enrich the analysis.
                </p>
              </div>
            </div>
          </div>
        )}

        {statEntries.length > 0 && (
          <>
            {/* Health score hero */}
            {healthScore != null && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="card-ultra glass-premium glow-border rounded-3xl p-8 flex flex-col items-center">
                <HeartPulse className="w-8 h-8 text-neon-emerald mb-3" />
                <div className="text-5xl font-bold text-white">{Number(healthScore).toFixed(1)}</div>
                <div className="text-sm text-gray-400 mt-1">Overall Battery Health Score / 100</div>
              </motion.div>
            )}

            {/* Telemetry stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statEntries.map(([key, value], i) => (
                <motion.div key={key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="card-ultra glass-premium glow-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {key.startsWith('soc') ? <BatteryCharging className="w-4 h-4 text-neon-emerald" />
                      : key.startsWith('soh') || key.startsWith('health') ? <Gauge className="w-4 h-4 text-neon-cyan" />
                      : key.startsWith('temp') ? <Thermometer className="w-4 h-4 text-red-400" />
                      : key.startsWith('volt') || key.startsWith('current') ? <Zap className="w-4 h-4 text-yellow-400" />
                      : <Battery className="w-4 h-4 text-neon-emerald" />}
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{LABELS[key] ?? key.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-xl font-bold text-white truncate">{Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </motion.div>
              ))}
            </div>

            {/* Detected columns */}
            {columnsUsed.length > 0 && (
              <div className="card-ultra glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Dataset columns used in this analysis</h3>
                <div className="flex flex-wrap gap-2">
                  {columnsUsed.map(([role, col]) => (
                    <span key={role} className="text-xs px-3 py-1 rounded-full bg-neon-emerald/10 text-neon-emerald border border-neon-emerald/30">
                      {role}: <span className="font-mono">{String(col)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}