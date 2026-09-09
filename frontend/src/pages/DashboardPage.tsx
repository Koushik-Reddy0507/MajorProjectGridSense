import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2,
  Database, LineChart, Wind, Battery,
  Activity, ArrowRight, Cloud, DollarSign, Wrench, Sparkles,
  TrendingUp, Gauge, Zap, Sun, Brain, BarChart3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { datasetApi } from '@/services/api'
import { useAuthStore } from '@/store'
import DashboardLayout from '@/components/DashboardLayout'

// ============ All Feature Modules ============
const allModules = [
  { key: 'weather', name: 'Weather Forecast', icon: Cloud, description: 'Live weather data & forecasting', path: '/weather', color: 'from-blue-500 to-cyan-500' },
  { key: 'demand', name: 'Demand Prediction', icon: LineChart, description: 'ML-powered demand forecasting', path: '/demand-prediction', color: 'from-cyan-500 to-blue-500' },
  { key: 'battery', name: 'Battery Health', icon: Battery, description: 'Monitor SOC, SOH & degradation', path: '/battery-health', color: 'from-green-500 to-emerald-500' },
  { key: 'prices', name: 'Electricity Prices', icon: DollarSign, description: 'Market price trends & forecast', path: '/prices', color: 'from-yellow-500 to-orange-500' },
  { key: 'maintenance', name: 'Predictive Maintenance', icon: Wrench, description: 'Anomaly detection & predictions', path: '/predictive-maintenance', color: 'from-red-500 to-orange-500' },
  { key: 'renewable', name: 'Renewable Forecast', icon: Wind, description: 'Solar & wind generation forecasting', path: '/renewable-forecast', color: 'from-emerald-500 to-teal-500' },
  { key: 'optimization', name: 'Multi-Agent AI', icon: Brain, description: 'AI-powered optimization', path: '/optimization', color: 'from-purple-500 to-pink-500' },
  { key: 'digital-twin', name: 'Digital Twin', icon: Zap, description: 'Virtual scenario simulation', path: '/digital-twin', color: 'from-blue-500 to-indigo-500' },
  { key: 'xai', name: 'Explainable AI', icon: Sparkles, description: 'SHAP model explanations', path: '/explainable-ai', color: 'from-pink-500 to-rose-500' },
]

// ============ Upload Progress Component ============
function UploadProgress({ progress, stage }: { progress: number; stage: string }) {
  const stages = ['UPLOADING', 'VALIDATING', 'PROCESSING', 'ANALYZING', 'COMPLETED']
  const stageIndex = stages.indexOf(stage)

  return (
    <div className="card-ultra glass-premium glow-border p-8 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-neon-emerald" />
          Processing Dataset
        </h3>
        <span className="text-neon-emerald font-mono">{Math.round(progress)}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-dark-border rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-neon-emerald to-neon-cyan transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage timeline */}
      <div className="flex items-center justify-between">
        {stages.map((s, i) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs ${
                i < stageIndex
                  ? 'bg-neon-emerald border-neon-emerald text-dark-bg'
                  : i === stageIndex
                  ? 'border-neon-emerald text-neon-emerald animate-pulse'
                  : 'border-dark-border text-gray-500'
              }`}
            >
              {i < stageIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs ${i <= stageIndex ? 'text-neon-emerald' : 'text-gray-500'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ Premium Module Flashcard ============
function ModuleCard({ module, index }: { module: typeof allModules[0]; index: number }) {
  const navigate = useNavigate()
  const Icon = module.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', damping: 20, stiffness: 120 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="module-card card-ultra glass-premium glow-border rounded-2xl p-5 cursor-pointer group"
      onClick={() => navigate(module.path)}
    >
      {/* HUD corner accents */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-neon-emerald/40 rounded-tl-md" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-neon-cyan/40 rounded-tr-md" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-neon-cyan/40 rounded-bl-md" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-neon-emerald/40 rounded-br-md" />

      {/* Module ID tag */}
      <span className="absolute top-3 right-8 text-[9px] font-mono text-gray-600 tracking-widest uppercase">
        MOD-{String(index + 1).padStart(2, '0')}
      </span>

      <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-r ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white drop-shadow-lg" />
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${module.color} opacity-40 blur-lg -z-10 group-hover:opacity-70 transition-opacity`} />
      </div>

      <h3 className="text-white font-semibold mb-1.5 group-hover:text-neon-emerald transition-colors font-display">
        {module.name}
      </h3>
      <p className="text-sm text-gray-400 mb-4">{module.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-neon-emerald opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <span>Launch</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
          <span className="text-[10px] font-mono text-gray-500">ONLINE</span>
        </div>
      </div>
    </motion.div>
  )
}

// ============ KPI Card ============
function KpiCard({ icon: Icon, label, value, unit, trend }: { icon: React.ElementType; label: string; value: string; unit?: string; trend?: 'up' | 'down' }) {
  return (
    <div className="card-ultra glass-premium glow-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-neon/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-neon-emerald" />
        </div>
        <TrendingUp className={`w-4 h-4 ${trend === 'up' ? 'text-neon-emerald' : trend === 'down' ? 'text-red-400' : 'text-gray-500'}`} />
      </div>
      <div className="text-2xl font-bold text-white">
        {value}
        {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}

// ============ Main Dashboard Page ============
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('UPLOADING')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Fetch datasets
  const { data: datasetsData } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetApi.list(),
  })

  const datasets = datasetsData?.data?.items || []

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => datasetApi.upload(file),
    onSuccess: () => {
      setIsUploading(false)
      setUploadStage('COMPLETED')
      setTimeout(() => navigate('/dataset-analysis'), 1500)
    },
    onError: (err: Error) => {
      console.error('Upload failed:', err)
      setIsUploading(false)
    },
  })

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadStage('UPLOADING')

    // Simulate progress stages (actual processing happens on backend)
    const stages = [
      { stage: 'VALIDATING', progress: 30 },
      { stage: 'PROCESSING', progress: 60 },
      { stage: 'ANALYZING', progress: 85 },
    ]
    for (const s of stages) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setUploadStage(s.stage)
      setUploadProgress(s.progress)
    }

    uploadMutation.mutate(selectedFile)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Hero - global turbine background shows through */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-ultra glass-strong rounded-3xl overflow-hidden relative"
        >
          <div className="flex flex-col md:flex-row items-center gap-6 p-8 md:p-10">
            {/* Animated rotor indicator */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-neon/20 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-emerald/10 to-neon-cyan/10 animate-pulse" />
                <div className="relative animate-spin-slow" style={{ animationDuration: '4s' }}>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2v4M12 12v8M12 18l-4 4M12 22l4-4M5 4l3 3M19 4l-3 3" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </div>
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-neon/10 blur-xl -z-10 animate-pulse" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl md:text-4xl font-display font-bold text-white mb-3"
              >
                Welcome back, <span className="text-gradient">{user?.email?.split('@')[0] || 'Energy Manager'}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-gray-300 text-base md:text-lg mb-6"
              >
                {datasets.length === 0
                  ? 'Upload your dataset to begin AI-powered energy analysis'
                  : `${datasets.length} dataset${datasets.length > 1 ? 's' : ''} ready for analysis`}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center md:justify-start gap-4"
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary-neon"
                >
                  <Upload className="w-4 h-4" />
                  Upload Dataset
                </button>
                <button
                  onClick={() => navigate('/dataset-analysis')}
                  className="btn-secondary-neon"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Analytics
                </button>
              </motion.div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-ultra glass-premium glow-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{datasets.length}</div>
            <div className="text-sm text-gray-400">Datasets Uploaded</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-ultra glass-premium glow-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{allModules.length}</div>
            <div className="text-sm text-gray-400">AI Modules Available</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-ultra glass-premium glow-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                <Sun className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">24/7</div>
            <div className="text-sm text-gray-400">Real-time Monitoring</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card-ultra glass-premium glow-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">7</div>
            <div className="text-sm text-gray-400">AI Agents Ready</div>
          </motion.div>
        </div>

        {/* Upload Section - Central command center */}
        {!selectedFile && !isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-ultra glass-premium rounded-2xl p-8 md:p-12 border-2 border-dashed border-dark-border hover:border-neon-emerald/50 transition-all text-center cursor-pointer"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleFileSelect(file)
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`max-w-lg mx-auto ${dragOver ? 'scale-105' : ''} transition-transform`}>
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-neon opacity-20 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-neon flex items-center justify-center">
                  <Upload className="w-10 h-10 text-dark-bg" />
                </div>
              </div>

              <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">
                Upload Your Energy Dataset
              </h2>
              <p className="text-gray-400 mb-6">
                Drag & drop your CSV or XLSX file here, or{' '}
                <span className="text-neon-emerald">browse files</span>.
                GridSense will automatically detect the schema and unlock every available module.
              </p>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  CSV
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  XLSX
                </span>
                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" />
                  Up to 500MB
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Selected File Preview */}
        <AnimatePresence>
          {selectedFile && !isUploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card-ultra glass-premium glow-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-xl bg-gradient-neon/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-neon-emerald" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-white font-semibold">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                    {selectedFile.name.includes('.csv') ? 'CSV' : 'XLSX'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    className="btn-primary-neon"
                  >
                    <Upload className="w-4 h-4" />
                    Start Analysis
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        {isUploading && (
          <UploadProgress progress={uploadProgress} stage={uploadStage} />
        )}

        {/* Datasets List */}
        {datasets.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-neon-emerald" />
              Your Datasets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset: any) => (
                <div key={dataset.id} className="card-ultra glass-premium glow-border rounded-2xl p-5 cursor-pointer hover:border-neon-emerald/50 transition-all"
                  onClick={() => navigate('/dataset-analysis')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-neon/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-neon-emerald" />
                    </div>
                    {dataset.processing_status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-neon-emerald px-2 py-1 rounded-full bg-neon-emerald/10">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    ) : dataset.processing_status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400 px-2 py-1 rounded-full bg-red-500/10">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-cyan-400 px-2 py-1 rounded-full bg-cyan-500/10">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {dataset.processing_status}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-1 truncate">{dataset.filename}</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {dataset.rows_count?.toLocaleString() || '—'} rows ·{' '}
                    {dataset.columns_count || '—'} cols
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-dark-border rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neon-emerald to-neon-cyan"
                        style={{ width: `${dataset.quality_score || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-neon-emerald">{Math.round(dataset.quality_score || 0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ ENERGY CORE - Visual Centerpiece ============ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="card-ultra glass-premium glow-border rounded-3xl p-8 md:p-10 flex flex-col items-center"
        >
          <h2 className="text-lg font-display font-semibold text-white mb-1 flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-emerald" />
            Energy Core
          </h2>
          <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest font-mono">Every module, one intelligence hub</p>

          <div className="relative core-orbit-paused w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
            {/* Orbit rings */}
            <div className="absolute inset-0 rounded-full border border-neon-emerald/15" />
            <div className="absolute inset-6 rounded-full border border-neon-cyan/15 core-ring" />
            <div className="absolute inset-12 rounded-full border border-dashed border-solar-amber/20 core-ring-reverse" />

            {/* Core */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-neon-emerald/25 to-neon-cyan/20 border border-neon-emerald/40 core-breath flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer"
            >
              <Zap className="w-8 h-8 text-neon-emerald" />
              <span className="text-[9px] font-mono text-gray-400 mt-1">FEED DATA</span>
              <div className="absolute inset-0 rounded-full bg-neon-emerald/10 blur-xl -z-10" />
            </button>

            {/* Orbiting modules - outer ring */}
            <div className="absolute inset-0 core-orbit">
              {allModules.slice(0, 5).map((module, i) => {
                const angle = (i / 5) * 360
                const Icon = module.icon
                return (
                  <div
                    key={module.key}
                    className="absolute top-1/2 left-1/2"
                    style={{ transform: `rotate(${angle}deg) translate(0, -10rem) rotate(${-angle}deg)` }}
                  >
                    <div className="core-orbit-icon">
                      <button
                        onClick={() => navigate(module.path)}
                        className="block -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-dark-card/90 border border-neon-emerald/30 hover:scale-125 hover:border-neon-emerald hover:shadow-neon transition-all"
                      >
                        <Icon className="w-[18px] h-[18px] text-neon-emerald mx-auto" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Orbiting modules - inner ring */}
            <div className="absolute inset-12 core-orbit-fast">
              {allModules.slice(5).map((module, i) => {
                const angle = (i / (allModules.length - 5)) * 360
                const Icon = module.icon
                return (
                  <div
                    key={module.key}
                    className="absolute top-1/2 left-1/2"
                    style={{ transform: `rotate(${angle}deg) translate(0, -6rem) rotate(${-angle}deg)` }}
                  >
                    <div className="core-orbit-icon">
                      <button
                        onClick={() => navigate(module.path)}
                        className="block -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-dark-card/90 border border-neon-cyan/30 hover:scale-125 hover:border-neon-cyan hover:shadow-neon-cyan transition-all"
                      >
                        <Icon className="w-4 h-4 text-neon-cyan mx-auto" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-8 text-xs text-gray-500 font-mono">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" /> {datasets.length} DATASETS</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" /> {allModules.length} MODULES</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-solar-amber animate-pulse" /> 7 AI AGENTS</span>
          </div>
        </motion.div>

        {/* Feature Modules Grid - Premium Flashcards */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-emerald" />
            AI-Powered Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allModules.map((module, index) => (
              <ModuleCard key={module.key} module={module} index={index} />
            ))}
          </div>
        </div>


        {/* KPIs Section - only shows with data */}
        {datasets.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Energy KPIs</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Gauge} label="Current Demand" value="1,240" unit="kW" />
              <KpiCard icon={Wind} label="Renewable Gen" value="328" unit="kW" />
              <KpiCard icon={Battery} label="Battery SOC" value="78" unit="%" />
              <KpiCard icon={Activity} label="Grid Dependency" value="62" unit="%" />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

