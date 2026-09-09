import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, FileText, LineChart, Wind, TrendingUp, Battery,
  Wrench, Brain, Zap, Box, Sparkles, FileBarChart, Settings, Cloud,
  Search, CornerDownLeft, Upload, Sun
} from 'lucide-react'
import { cn } from '@/utils/cn'

export interface CommandItem {
  icon: React.ElementType
  label: string
  description?: string
  path: string
  section: string
  keywords?: string
  accent?: string
}

export const allCommands: CommandItem[] = [
  // Overview
  { icon: LayoutDashboard, label: 'Dashboard', description: 'Mission control home', path: '/dashboard', section: 'Overview', accent: 'text-neon-emerald' },
  { icon: Upload, label: 'Upload Dataset', description: 'Add new energy data', path: '/dataset-analysis', section: 'Overview', keywords: 'csv xlsx data import', accent: 'text-neon-lime' },
  { icon: FileText, label: 'Dataset Analysis', description: 'Explore & validate data', path: '/dataset-analysis', section: 'Overview', accent: 'text-neon-cyan' },
  // Forecasting
  { icon: LineChart, label: 'Demand Prediction', description: 'ML-powered load forecasting', path: '/demand-prediction', section: 'Forecasting', keywords: 'load ml', accent: 'text-neon-cyan' },
  { icon: Wind, label: 'Renewable Forecast', description: 'Solar & wind generation', path: '/renewable-forecast', section: 'Forecasting', keywords: 'solar wind generation', accent: 'text-neon-emerald' },
  { icon: Cloud, label: 'Weather Forecast', description: 'Live weather & impact analysis', path: '/weather', section: 'Forecasting', keywords: 'temperature rain openweather', accent: 'text-solar-amber' },
  // Market
  { icon: TrendingUp, label: 'Electricity Prices', description: 'Market trends & forecasts', path: '/prices', section: 'Market', keywords: 'market trading cost', accent: 'text-solar-amber' },
  { icon: Battery, label: 'Battery Health', description: 'SOC, SOH & degradation', path: '/battery-health', section: 'Market', keywords: 'storage soc soh', accent: 'text-neon-emerald' },
  // Intelligence
  { icon: Brain, label: 'Multi-Agent AI', description: 'AI-powered optimization', path: '/optimization', section: 'Intelligence', keywords: 'agents llm optimization', accent: 'text-neon-purple' },
  { icon: Sparkles, label: 'Explainable AI', description: 'SHAP model explanations', path: '/explainable-ai', section: 'Intelligence', keywords: 'shap interpretability', accent: 'text-neon-cyan' },
  { icon: Box, label: 'Digital Twin', description: 'Virtual scenario simulation', path: '/digital-twin', section: 'Intelligence', keywords: 'simulation scenario what-if', accent: 'text-neon-cyan' },
  { icon: Zap, label: 'Optimization', description: 'Grid optimization engine', path: '/optimization', section: 'Intelligence', keywords: 'efficiency dispatch', accent: 'text-neon-emerald' },
  // Operations
  { icon: Wrench, label: 'Predictive Maintenance', description: 'Anomaly detection', path: '/predictive-maintenance', section: 'Operations', keywords: 'failure anomaly repair', accent: 'text-red-400' },
  { icon: Sun, label: 'Renewable Analytics', description: 'Solar & wind insights', path: '/renewable-forecast', section: 'Operations', keywords: 'renewables', accent: 'text-solar-amber' },
  { icon: FileBarChart, label: 'Reports', description: 'Generate & export reports', path: '/reports', section: 'Operations', keywords: 'export pdf', accent: 'text-neon-cyan' },
  { icon: Settings, label: 'Settings', description: 'Preferences & account', path: '/settings', section: 'Operations', keywords: 'config account profile', accent: 'text-gray-400' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCommands
    return allCommands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.section.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.keywords?.toLowerCase().includes(q)
    )
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setSelectedIndex(0) }, [query])

  const execute = (item: CommandItem) => {
    navigate(item.path)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      execute(results[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] palette-backdrop flex items-start justify-center pt-[12vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full max-w-xl glass-premium glow-border rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-border/60">
              <Search className="w-5 h-5 text-neon-emerald shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search modules, pages, actions..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
              />
              <kbd className="palette-kbd">ESC</kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-500">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}
              {results.map((item, i) => {
                const active = i === selectedIndex
                return (
                  <button
                    key={item.path + item.label}
                    onClick={() => execute(item)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                      active
                        ? 'bg-gradient-to-r from-neon-emerald/15 to-neon-cyan/10 border border-neon-emerald/30'
                        : 'border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-lg bg-dark-input flex items-center justify-center shrink-0 transition-all',
                      active && 'shadow-neon'
                    )}>
                      <item.icon className={cn('w-[18px] h-[18px]', item.accent || 'text-neon-emerald')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-sm font-medium', active ? 'text-white' : 'text-gray-300')}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate">{item.description}</div>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-600 hidden sm:block">
                      {item.section}
                    </span>
                    {active && <CornerDownLeft className="w-4 h-4 text-neon-emerald shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-t border-dark-border/60 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><kbd className="palette-kbd">&uarr;</kbd><kbd className="palette-kbd">&darr;</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="palette-kbd">&crarr;</kbd> open</span>
              <span className="ml-auto hidden sm:flex items-center gap-1">
                <Zap className="w-3 h-3 text-neon-emerald" /> GridSense Command
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
