import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, RefreshCw, Loader2, Database, CloudOff, BrainCircuit, MessageSquareText, TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import DashboardLayout from '@/components/DashboardLayout'
import { xaiApi } from '@/services/api'
import { useActiveDataset, unwrapAnalysis } from '@/hooks/useActiveDataset'

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(0, 255, 136, 0.3)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
}

export default function XAIPage() {
  const { dataset, datasetId, isLoading: dsLoading } = useActiveDataset()

  const generate = useMutation({
    mutationFn: () => xaiApi.generate(datasetId!),
  })

  const { data: resp, isError } = generate
  const { data: result, error: apiError, message } = unwrapAnalysis<any>(resp?.data)
  const backendDown = isError && !result
  const models = result?.models ?? []
  const hasResults = models.length > 0
  const busy = generate.isPending

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-neon-emerald" />
              Explainable AI (XAI)
            </h1>
            <p className="text-gray-400 mt-1">
              SHAP-based explanations showing exactly why every GridSense forecast is made
            </p>
          </div>
          <button onClick={() => generate.mutate()} disabled={busy || !datasetId} className="btn-primary-neon">
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            Generate Explanations
          </button>
        </div>

        {dataset && (
          <div className="card-ultra glass rounded-2xl px-5 py-3 flex items-center gap-3 text-sm">
            <Database className="w-4 h-4 text-neon-emerald shrink-0" />
            <span className="text-gray-300">
              Explaining models trained on <span className="text-white font-medium">{dataset.filename}</span>
            </span>
          </div>
        )}

        {!dsLoading && !dataset && (
          <div className="card-ultra glass rounded-2xl p-8 text-center">
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg text-white font-semibold mb-2">No dataset uploaded yet</h3>
            <p className="text-sm text-gray-400 mb-6">Upload a dataset and run a forecast - XAI explains the models trained on it.</p>
            <Link to="/dataset-analysis" className="btn-primary-neon">Upload Dataset</Link>
          </div>
        )}

        {busy && (
          <div className="card-ultra glass rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-neon-emerald animate-spin" />
            <p className="text-gray-400 text-sm">Computing SHAP values on your trained models (this can take a moment)...</p>
          </div>
        )}

        {backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <CloudOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Cannot reach the backend</h3>
                <p className="text-sm text-gray-400">Start the FastAPI server (port 8000) and try again.</p>
              </div>
            </div>
          </div>
        )}
        {apiError && !hasResults && !backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Explanations not available</h3>
                <p className="text-sm text-gray-400">{apiError || message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Tip: run the Demand / Renewable / Price forecasts first - GridSense trains a model on your dataset, then XAI explains it.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasResults && (
          <>
            <div className="card-ultra glass rounded-2xl px-5 py-3 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neon-emerald/10 text-neon-emerald border border-neon-emerald/30">
                <BrainCircuit className="w-3.5 h-3.5" />
                {result.shap_available ? 'SHAP values' : 'Model-native importance'} · {models.length} model{models.length > 1 ? 's' : ''} explained
              </span>
            </div>

            {models.map((m: any, i: number) => {
              const chartData = (m.feature_importance ?? []).slice(0, 10).map((f: any) => ({
                feature: String(f.feature).length > 16 ? String(f.feature).slice(0, 16) + '...' : f.feature,
                score: Math.round(f.importance_score * 10000) / 10000,
              }))
              const metrics = m.evaluation ?? {}
              return (
                <motion.div key={m.target} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="card-ultra glass rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <BrainCircuit className="w-5 h-5 text-neon-emerald" />
                    <h3 className="text-lg font-semibold text-white capitalize">What drives the {m.target} model?</h3>
                    <span className="ml-auto text-xs text-gray-500">
                      {m.model_type} · trained on {m.training_records?.toLocaleString()} records
                      {metrics.r2_score != null && ` · R² ${Number(metrics.r2_score).toFixed(3)}`}
                      {metrics.mae != null && ` · MAE ${Number(metrics.mae).toFixed(2)}`}
                    </span>
                  </div>

                  {chartData.length > 0 && (
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                          <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis type="category" dataKey="feature" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,255,136,0.05)' }} />
                          <Bar dataKey="score" name="Importance (mean |SHAP|)" fill="#00ff88" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-input/60 border border-dark-border/60">
                    <TrendingUp className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300">{m.global_explanation}</p>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-dark-input/60 border border-dark-border/60">
                    <MessageSquareText className="w-4 h-4 text-neon-emerald shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300">{m.local_explanation}</p>
                  </div>
                </motion.div>
              )
            })}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}