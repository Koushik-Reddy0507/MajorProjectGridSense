import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Database, Table, AlertTriangle, CheckCircle2, XCircle,
  Activity, Eye,
  Braces, Rows, Columns
} from 'lucide-react'
import { motion } from 'framer-motion'
import { datasetApi } from '@/services/api'
import DashboardLayout from '@/components/DashboardLayout'
import { cn } from '@/utils/cn'
import type { DataQualityReport } from '@/types'

interface SchemaColumn {
  name: string
  type: string
  detected_role: string
  missing_pct: number
  unique_values: number
  sample_values: unknown[]
}

export default function DatasetAnalysisPage() {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)

  // Fetch datasets
  const { data: datasetsData, isLoading: datasetsLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetApi.list(),
  })

  const datasets = datasetsData?.data?.items || []

  // Auto-select first dataset
  useEffect(() => {
    if (datasets.length > 0 && !selectedDataset) {
      setSelectedDataset(datasets[0].id)
    }
  }, [datasets, selectedDataset])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
              Dataset Analysis
            </h1>
            <p className="text-gray-400 mt-1">
              Explore schema, data quality, and analysis readiness of your uploaded datasets
            </p>
          </div>

          {datasets.length > 0 && (
            <select
              value={selectedDataset || ''}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="input-neon max-w-xs"
            >
              {datasets.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          )}
        </div>

        {datasetsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-ultra glass rounded-2xl p-6">
                <div className="skeleton h-4 w-1/2 mb-4" />
                <div className="skeleton h-3 w-full mb-2" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : datasets.length === 0 ? (
          // Empty state
          <div className="card-ultra glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-input flex items-center justify-center">
              <Database className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg text-white font-semibold mb-2">No Datasets Uploaded</h3>
            <p className="text-gray-400 mb-4">
              Upload a dataset to begin automatic schema detection and quality analysis.
            </p>
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  await datasetApi.upload(file)
                  window.location.reload()
                }
              }}
            />
            <button
              onClick={() => document.getElementById('file-upload')?.click()}
              className="btn-primary-neon"
            >
              <FileText className="w-4 h-4" />
              Upload Dataset
            </button>
          </div>
        ) : (
          <AnalysisContent datasetId={selectedDataset} />
        )}
      </div>
    </DashboardLayout>
  )
}

// ============ Analysis Content ============
function AnalysisContent({ datasetId }: { datasetId: string | null }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'quality' | 'preview'>('overview')

  const { data: schemaData, isLoading: schemaLoading } = useQuery({
    queryKey: ['dataset-schema', datasetId],
    queryFn: () => datasetApi.getSchema(datasetId!),
    enabled: !!datasetId,
  })

  const { data: qualityData } = useQuery({
    queryKey: ['dataset-quality', datasetId],
    queryFn: () => datasetApi.getQuality(datasetId!),
    enabled: !!datasetId,
  })

  const { data: previewData } = useQuery({
    queryKey: ['dataset-preview', datasetId],
    queryFn: () => datasetApi.get(datasetId!),
    enabled: !!datasetId,
  })

  const schema = schemaData?.data as {
    dataset_id?: string
    columns?: SchemaColumn[]
    detected_variables?: Record<string, string[]>
    timestamp_column?: string
    total_columns?: number
    total_rows?: number
  } | null
  const quality = qualityData?.data as DataQualityReport | null
  const dataset = previewData?.data as { filename?: string } | null

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: Eye },
    { key: 'schema' as const, label: 'Schema', icon: Braces },
    { key: 'quality' as const, label: 'Quality', icon: Activity },
    { key: 'preview' as const, label: 'Preview', icon: Table },
  ]

  if (schemaLoading) {
    return (
      <div className="card-ultra glass rounded-2xl p-8">
        <div className="skeleton h-6 w-1/3 mb-4" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-neon-emerald/20 to-neon-cyan/20 text-neon-emerald border border-neon-emerald/30'
                : 'text-gray-400 hover:text-white border border-dark-border'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Dataset Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Rows', value: quality?.total_rows || 0, icon: Rows },
              { label: 'Columns', value: quality?.total_columns || 0, icon: Columns },
              { label: 'Quality Score', value: `${quality?.quality_score || 0}%`, icon: CheckCircle2 },
              { label: 'Missing Values', value: quality?.missing_values_count || 0, icon: AlertTriangle },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card-ultra glass rounded-2xl p-5"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-neon/20 flex items-center justify-center mb-3">
                  <stat.icon className="w-4 h-4 text-neon-emerald" />
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Detected Variables */}
          {schema?.detected_variables && (
            <div className="card-ultra glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-neon-emerald" />
                Detected Energy Variables
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(schema.detected_variables).map(([type, columns]) => (
                  <div key={type} className="bg-dark-input rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neon-emerald capitalize">
                        {type.replace(/_/g, ' ')}
                      </span>
                      {columns.length > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-neon-emerald" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    {columns.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {columns.map((col: string) => (
                          <span key={col} className="text-xs text-gray-300 bg-dark-bg px-2 py-1 rounded">
                            {col}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No matching columns found</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schema Tab */}
      {activeTab === 'schema' && (
        <div className="card-ultra glass rounded-2xl p-6 overflow-x-auto">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Braces className="w-5 h-5 text-neon-emerald" />
            Column Schema
          </h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="py-3 px-4 text-sm text-gray-400 font-medium">Column</th>
                <th className="py-3 px-4 text-sm text-gray-400 font-medium">Data Type</th>
                <th className="py-3 px-4 text-sm text-gray-400 font-medium">Detected Role</th>
                <th className="py-3 px-4 text-sm text-gray-400 font-medium">Missing %</th>
              </tr>
            </thead>
            <tbody>
              {(schema?.columns || []).map((col: SchemaColumn, i: number) => (
                <tr key={i} className="border-b border-dark-border/50 hover:bg-dark-input/50">
                  <td className="py-3 px-4 text-white font-mono text-sm">{col.name}</td>
                  <td className="py-3 px-4 text-gray-400 text-sm">{col.type}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-neon-emerald bg-neon-emerald/10 px-2 py-1 rounded">
                      {col.detected_role || 'other'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">{col.missing_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quality Tab */}
      {activeTab === 'quality' && quality && (
        <div className="space-y-6">
          {/* Quality Score Gauge */}
          <div className="card-ultra glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-neon-emerald" />
              Data Quality Report
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Score circle */}
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(42,63,95,0.5)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(quality.quality_score / 100) * 326.7} 326.7`}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00ff88" />
                      <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-gradient">{quality.quality_score}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>

              {/* Quality stats */}
              <div className="grid grid-cols-2 gap-4 flex-1">
                {[
                  { label: 'Total Rows', value: quality.total_rows.toLocaleString() },
                  { label: 'Missing Values', value: quality.missing_values_count.toLocaleString() },
                  { label: 'Missing %', value: `${quality.missing_values_percentage}%` },
                  { label: 'Duplicate Rows', value: quality.duplicate_rows.toLocaleString() },
                  { label: 'Duplicate %', value: `${quality.duplicate_percentage}%` },
                  { label: 'Numeric Columns', value: quality.numerical_columns },
                ].map((item) => (
                  <div key={item.label} className="bg-dark-input rounded-xl p-4">
                    <div className="text-xl font-semibold text-white">{item.value}</div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Issues */}
          {(quality.issues?.length > 0) && (
            <div className="card-ultra glass rounded-2xl p-6">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Detected Issues
              </h4>
              <div className="space-y-3">
                {quality.issues.map((issue: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-dark-input rounded-xl p-4">
                    {issue.severity === 'high' ? (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    ) : issue.severity === 'medium' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-neon-emerald shrink-0" />
                    )}
                    <div>
                      <div className="text-sm text-white font-medium capitalize">
                        {String(issue.type).replace(/_/g, ' ')}
                        {issue.column && <span className="text-gray-400"> — {issue.column}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {issue.count?.toLocaleString()} occurrences ({issue.percentage}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quality.issues?.length === 0 && (
            <div className="card-ultra glass rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-neon-emerald mx-auto mb-3" />
              <p className="text-white font-medium">Excellent data quality!</p>
              <p className="text-sm text-gray-400">No significant issues detected in your dataset.</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="card-ultra glass rounded-2xl p-6 overflow-x-auto">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Table className="w-5 h-5 text-neon-emerald" />
            Data Preview
          </h3>
          {dataset?.filename ? (
            <div className="text-sm text-gray-400 mb-4">
              Showing records from <span className="text-neon-emerald">{dataset.filename}</span>
            </div>
          ) : null}
          <div className="text-sm text-gray-400">
            Fetch detailed preview data from the dataset records endpoint.
          </div>
        </div>
      )}
    </div>
  )
}