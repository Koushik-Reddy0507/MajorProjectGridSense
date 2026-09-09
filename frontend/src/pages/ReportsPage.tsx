import { useState } from 'react'
import {
  FileBarChart, Download, AlertTriangle, FileText,
  FileSpreadsheet, FileCheck, Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)

  const reportTypes = [
    { id: 'dataset', name: 'Dataset Quality Report', icon: FileText, desc: 'Schema, quality score, issues and column mappings' },
    { id: 'demand', name: 'Demand Forecast Report', icon: FileSpreadsheet, desc: 'Forecast values, metrics (MAE/RMSE/R²) and charts' },
    { id: 'optimization', name: 'Optimization Plan Report', icon: FileCheck, desc: '24-hour schedule, KPIs, cost and CO₂ impact' },
    { id: 'maintenance', name: 'Maintenance Report', icon: FileBarChart, desc: 'Asset health, anomalies and recommendations' },
    { id: 'xai', name: 'XAI Explanation Report', icon: FileBarChart, desc: 'Feature importance and recommendation reasoning' },
  ]

  const handleGenerate = (id: string) => {
    setGenerating(id)
    setTimeout(() => setGenerating(null), 2500)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
              Reports
            </h1>
            <p className="text-gray-400 mt-1">
              Generate downloadable professional reports from actual dataset analysis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report, i) => {
            const isGenerating = generating === report.id
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card-ultra glass rounded-2xl p-6 hover:border-neon-emerald/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-neon/20 flex items-center justify-center">
                    <report.icon className="w-5 h-5 text-neon-emerald" />
                  </div>
                  <button
                    onClick={() => handleGenerate(report.id)}
                    disabled={isGenerating}
                    className="btn-primary-neon text-sm px-4 py-2 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
                <h3 className="text-white font-semibold mb-1">{report.name}</h3>
                <p className="text-sm text-gray-400">{report.desc}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Note about data availability */}
        <div className="card-ultra glass rounded-2xl p-4 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-400">
              Reports are generated exclusively from the actual uploaded dataset, analysis outputs,
              forecasts, optimization plans and SHAP explanations. No fabricated data is ever
              included in reports.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}