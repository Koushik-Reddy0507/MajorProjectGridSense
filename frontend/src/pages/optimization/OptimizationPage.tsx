import { useState, useEffect } from 'react'
import {
  Brain, Zap, AlertTriangle, Clock, Battery, Wind,
  Sun, DollarSign, Activity, CheckCircle2, Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { cn } from '@/utils/cn'

// ============ Agent Definitions ============
const agents = [
  { id: 'weather', name: 'Weather Agent', icon: Sun, stage: 'Analyzing weather variables', description: 'Analyzes temperature, wind speed, irradiance and cloud cover from dataset' },
  { id: 'renewable', name: 'Renewable Agent', icon: Wind, stage: 'Forecasting renewable generation', description: 'Forecasts solar/wind generation using historical patterns' },
  { id: 'demand', name: 'Demand Agent', icon: Activity, stage: 'Predicting electricity demand', description: 'Predicts 24-hour demand profile from historical consumption' },
  { id: 'battery', name: 'Battery Agent', icon: Battery, stage: 'Assessing battery health', description: 'Evaluates battery SOC/SOH and usable capacity constraints' },
  { id: 'market', name: 'Market Agent', icon: DollarSign, stage: 'Analyzing price signals', description: 'Analyzes electricity prices to find optimal buy/sell windows' },
  { id: 'optimizer', name: 'Optimization Agent', icon: Brain, stage: 'Generating optimal schedule', description: 'Combines all agent outputs into a 24-hour energy management plan' },
]

type AgentStatus = 'pending' | 'running' | 'completed' | 'failed'

// ============ Agent Monitor ============
function AgentMonitor({ running }: { running: boolean }) {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(
    Object.fromEntries(agents.map((a) => [a.id, 'pending']))
  )

  useEffect(() => {
    if (!running) {
      setStatuses(Object.fromEntries(agents.map((a) => [a.id, 'pending'])))
      return
    }

    // Sequential execution effect
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < agents.length) {
        setStatuses((prev) => {
          const next = { ...prev }
          next[agents[currentIndex].id] = 'running'
          return next
        })
        // Mark previous as completed after delay
        setTimeout(() => {
          setStatuses((prev) => {
            const next = { ...prev }
            next[agents[currentIndex].id] = 'completed'
            return next
          })
          currentIndex++
        }, 1200)
      } else {
        clearInterval(interval)
      }
    }, 1400)

    return () => clearInterval(interval)
  }, [running])

  return (
    <div className="space-y-3">
      {agents.map((agent) => {
        const status = statuses[agent.id]
        return (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'card-ultra glass rounded-xl p-4 flex items-start gap-3 transition-all',
              status === 'running' && 'border-neon-emerald/50',
              status === 'completed' && 'border-neon-emerald/20',
              status === 'failed' && 'border-red-500/30'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              status === 'completed' ? 'bg-neon-emerald/20' : status === 'running' ? 'bg-neon-emerald/30' : 'bg-dark-input'
            )}>
              {status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-neon-emerald" />
              ) : status === 'running' ? (
                <Loader2 className="w-4 h-4 text-neon-emerald animate-spin" />
              ) : status === 'failed' ? (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              ) : (
                <agent.icon className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-white">{agent.name}</h4>
                <span className={cn(
                  'text-xs uppercase',
                  status === 'completed' ? 'text-neon-emerald' : status === 'running' ? 'text-cyan-400' : 'text-gray-500'
                )}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {status === 'completed' ? agent.description : status === 'running' ? agent.stage : 'Waiting...'}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============ Main Page ============
export default function OptimizationPage() {
  const [running, setRunning] = useState(false)
  const [planGenerated, setPlanGenerated] = useState(false)
  const [activeTab, setActiveTab] = useState<'agents' | 'plan' | 'results'>('agents')

  const handleRun = () => {
    setRunning(true)
    setPlanGenerated(false)
    // Simulate full run - in production this calls optimizationApi.run(datasetId)
    setTimeout(() => {
      setRunning(false)
      setPlanGenerated(true)
    }, agents.length * 1400 + 1500)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
              <Brain className="w-7 h-7 text-neon-emerald" />
              Multi-Agent AI Optimization
            </h1>
            <p className="text-gray-400 mt-1">
              LangGraph-coordinated specialized agents producing your optimal 24-hour energy plan
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="btn-primary-neon disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Agents Working...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Run Optimization
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'agents', label: 'Agent Monitor', icon: Brain },
            { key: 'plan', label: '24-Hour Plan', icon: Clock },
            { key: 'results', label: 'Results', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
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

        {/* Agent Monitor Tab */}
        {activeTab === 'agents' && (
          <div className="card-ultra glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              AI Agent Execution Monitor
            </h3>
            <AgentMonitor running={running} />
          </div>
        )}

        {/* Plan Tab */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            {!planGenerated && !running ? (
              <div className="card-ultra glass rounded-2xl p-12 text-center">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg text-white font-semibold mb-2">No Optimization Plan Yet</h3>
                <p className="text-gray-400 mb-4">
                  Run the multi-agent optimization to generate your 24-hour energy management schedule.
                </p>
                <button onClick={handleRun} className="btn-primary-neon">
                  <Zap className="w-4 h-4" />
                  Run Optimization
                </button>
              </div>
            ) : running ? (
              <div className="card-ultra glass rounded-2xl p-12 text-center">
                <Loader2 className="w-12 h-12 text-neon-emerald mx-auto mb-4 animate-spin" />
                <h3 className="text-lg text-white font-semibold">Generating 24-Hour Energy Plan...</h3>
                <p className="text-gray-400 text-sm mt-2">
                  Agents are coordinating to produce the optimal schedule
                </p>
              </div>
            ) : (
              <OptimizationPlanView />
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {!planGenerated ? (
              <div className="card-ultra glass rounded-2xl p-12 text-center">
                <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg text-white font-semibold mb-2">No Results Available</h3>
                <p className="text-gray-400">Run the optimization to see cost, renewable utilization and CO₂ results.</p>
              </div>
            ) : (
              <OptimizationResultsView />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// ============ Optimization Plan View ============
function OptimizationPlanView() {
  // 24-hour intervals for display (in production, comes from backend plan)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-6">
      {/* Plan summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Renewable Utilization', value: '82%', color: 'text-neon-emerald' },
          { label: 'Est. Cost Reduction', value: '34%', color: 'text-neon-emerald' },
          { label: 'Grid Dependency', value: '18%', color: 'text-neon-cyan' },
          { label: 'CO₂ Reduction', value: '41%', color: 'text-neon-emerald' },
        ].map((kpi) => (
          <div key={kpi.label} className="card-ultra glass rounded-2xl p-4">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-gray-400">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* 24-hour timeline */}
      <div className="card-ultra glass rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-4">24-Hour Energy Schedule</h3>
        <div className="min-w-[700px]">
          <div className="flex gap-1 mb-2">
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center">
                <div className="text-[10px] text-gray-400">{String(h).padStart(2, '0')}:00</div>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {hours.map((h) => (
              <div key={h} className="flex-1 h-8 rounded bg-neon-emerald/20 hover:bg-neon-emerald/40 transition-colors cursor-pointer" title={`Hour ${h}`} />
            ))}
          </div>
          <div className="flex gap-2 mt-4 justify-center">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <span className="w-3 h-3 rounded bg-neon-emerald/30 inline-block" /> Expected Demand
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <span className="w-3 h-3 rounded bg-neon-cyan/30 inline-block" /> Renewable
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <span className="w-3 h-3 rounded bg-purple-500/30 inline-block" /> Battery
            </span>
          </div>
        </div>
      </div>

      {/* Detailed interval table */}
      <div className="card-ultra glass rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Schedule</h3>
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="border-b border-dark-border">
              {['Hour', 'Demand (kW)', 'Solar (kW)', 'Wind (kW)', 'Renewable %', 'Battery', 'Grid (kW)', 'Cost ($)', 'Decision'].map((h) => (
                <th key={h} className="py-3 px-4 text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h} className="border-b border-dark-border/50 hover:bg-dark-input/50">
                <td className="py-3 px-4 text-sm text-gray-300 font-mono">{String(h).padStart(2, '0')}:00</td>
                <td className="py-3 px-4 text-sm text-white">1,240</td>
                <td className="py-3 px-4 text-sm text-neon-emerald">328</td>
                <td className="py-3 px-4 text-sm text-neon-cyan">145</td>
                <td className="py-3 px-4 text-sm text-white">38%</td>
                <td className="py-3 px-4 text-sm text-purple-400">Discharge</td>
                <td className="py-3 px-4 text-sm text-yellow-400">767</td>
                <td className="py-3 px-4 text-sm text-white">$124</td>
                <td className="py-3 px-4 text-xs text-gray-400">Peak demand - use battery</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============ Optimization Results View ============
function OptimizationResultsView() {
  return (
    <div className="space-y-4">
      <div className="card-ultra glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Before vs After Optimization</h3>
        <div className="grid grid-cols-2 gap-6">
          {['Scenario', 'Total Cost', 'Renewable Utilization', 'Grid Dependency', 'CO₂ Emissions'].map((label) => (
            <div key={label} className="bg-dark-input rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-dark-border rounded overflow-hidden">
                  <div className="h-full w-2/3 bg-red-500/50 rounded" />
                </div>
                <div className="flex-1 h-3 bg-dark-border rounded overflow-hidden">
                  <div className="h-full w-1/4 bg-neon-emerald/60 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}