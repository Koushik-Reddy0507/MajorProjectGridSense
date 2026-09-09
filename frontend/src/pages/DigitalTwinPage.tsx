import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Box, Play, AlertTriangle, RefreshCw, Battery, Sun, Wind, Activity, DollarSign, Sliders, CloudOff, Loader2, Leaf, Database,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import DashboardLayout from '@/components/DashboardLayout'
import { digitalTwinApi } from '@/services/api'
import { useActiveDataset, unwrapAnalysis } from '@/hooks/useActiveDataset'

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(0, 255, 136, 0.3)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
}

// ============ Scenario Parameter Slider ============
function ParamSlider({
  label, value, onChange, min, max, step, unit, icon: Icon
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  unit: string
  icon: React.ElementType
}) {
  return (
    <div className="bg-dark-input rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-neon-emerald" />
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className="text-sm font-mono text-neon-emerald">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full accent-neon-emerald"
      />
    </div>
  )
}

// ============ Main Digital Twin Page ============
export default function DigitalTwinPage() {
  const { dataset, datasetId, isLoading: dsLoading } = useActiveDataset()

  const [params, setParams] = useState({
    solar_generation_factor: 1.0,
    wind_generation_factor: 1.0,
    demand_factor: 1.0,
    electricity_price_factor: 1.0,
    battery_capacity_kwh: 100,
    battery_current_soc: 50,
  })

  const simulate = useMutation({
    mutationFn: () => digitalTwinApi.simulate(datasetId!, params),
  })

  const { data: resp, isError } = simulate
  const { data: result, error: apiError, message } = unwrapAnalysis<any>(resp?.data)
  const backendDown = isError && !result
  const intervals = result?.intervals ?? []
  const hasResults = intervals.length > 0
  const busy = simulate.isPending

  const set = (key: keyof typeof params) => (v: number) => setParams((p) => ({ ...p, [key]: v }))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
              <Box className="w-7 h-7 text-neon-emerald" />
              Digital Twin Simulation
            </h1>
            <p className="text-gray-400 mt-1">
              What-if scenarios computed from your uploaded dataset, scaled by your parameters
            </p>
          </div>
          <button
            onClick={() => simulate.mutate()}
            disabled={busy || !datasetId}
            className="btn-primary-neon disabled:opacity-50"
          >
            {busy ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </button>
        </div>

        {dataset && (
          <div className="card-ultra glass rounded-2xl px-5 py-3 flex items-center gap-3 text-sm">
            <Database className="w-4 h-4 text-neon-emerald shrink-0" />
            <span className="text-gray-300">
              Twin initialized from <span className="text-white font-medium">{dataset.filename}</span>
              {dataset.rows_count ? <span className="text-gray-500"> · {dataset.rows_count.toLocaleString()} rows</span> : null}
            </span>
          </div>
        )}

        {!dsLoading && !dataset && (
          <div className="card-ultra glass rounded-2xl p-8 text-center">
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg text-white font-semibold mb-2">No dataset uploaded yet</h3>
            <p className="text-sm text-gray-400 mb-6">Upload a dataset with demand/generation columns to initialize the twin.</p>
            <Link to="/dataset-analysis" className="btn-primary-neon">Upload Dataset</Link>
          </div>
        )}

        {busy && (
          <div className="card-ultra glass rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-neon-emerald animate-spin" />
            <p className="text-gray-400 text-sm">Running 24-hour what-if simulation...</p>
          </div>
        )}

        {backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <CloudOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Cannot reach the backend</h3>
                <p className="text-sm text-gray-400">Start the FastAPI server (port 8000) and run the simulation again.</p>
              </div>
            </div>
          </div>
        )}
        {apiError && !hasResults && !backendDown && (
          <div className="card-ultra glass rounded-2xl p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Simulation not available</h3>
                <p className="text-sm text-gray-400">{apiError || message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parameter Controls */}
          <div className="card-ultra glass rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-neon-emerald" />
              Scenario Parameters
            </h3>
            <ParamSlider label="Solar Generation Factor" value={params.solar_generation_factor} onChange={set('solar_generation_factor')} min={0} max={2} step={0.05} unit="x" icon={Sun} />
            <ParamSlider label="Wind Generation Factor" value={params.wind_generation_factor} onChange={set('wind_generation_factor')} min={0} max={2} step={0.05} unit="x" icon={Wind} />
            <ParamSlider label="Demand Factor" value={params.demand_factor} onChange={set('demand_factor')} min={0.5} max={1.5} step={0.05} unit="x" icon={Activity} />
            <ParamSlider label="Electricity Price Factor" value={params.electricity_price_factor} onChange={set('electricity_price_factor')} min={0.5} max={2} step={0.05} unit="x" icon={DollarSign} />
            <ParamSlider label="Battery Capacity" value={params.battery_capacity_kwh} onChange={set('battery_capacity_kwh')} min={10} max={500} step={10} unit=" kWh" icon={Battery} />
            <ParamSlider label="Battery Current SOC" value={params.battery_current_soc} onChange={set('battery_current_soc')} min={0} max={100} step={5} unit="%" icon={Battery} />
          </div>

          {/* Results */}
          <div className="lg:col-span-2 card-ultra glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-white">Scenario Results</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  REAL DATA
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                  SIMULATED
                </span>
              </div>
            </div>

            {!hasResults ? (
              <div className="aspect-[4/3] bg-dark-input/50 rounded-xl flex items-center justify-center flex-col gap-3">
                <Box className="w-12 h-12 text-gray-600" />
                <p className="text-gray-500 text-sm">
                  Adjust parameters and run a simulation to see the energy-flow results
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: DollarSign, label: 'Estimated 24h Cost', value: result?.total_cost != null ? Number(result.total_cost).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-' },
                    { icon: Leaf, label: 'Renewable Utilization', value: result?.renewable_utilization_percent != null ? `${result.renewable_utilization_percent}%` : '-' },
                    { icon: Activity, label: 'Grid Dependency', value: result?.grid_dependency_percent != null ? `${result.grid_dependency_percent}%` : '-' },
                    { icon: Battery, label: 'Battery Cycles', value: result?.battery_cycles != null ? `${result.battery_cycles}` : '-' },
                    { icon: Leaf, label: 'CO2 Emissions', value: result?.co2_emissions_kg != null ? `${result.co2_emissions_kg} kg` : '-' },
                    { icon: Sun, label: 'Simulated Hours', value: `${intervals.length}` },
                  ].map((s) => (
                    <div key={s.label} className="bg-dark-input rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <s.icon className="w-3.5 h-3.5 text-neon-emerald" />
                        <span className="text-xs text-gray-400">{s.label}</span>
                      </div>
                      <div className="text-xl font-bold text-white">{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Energy flow chart */}
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={intervals} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
                      <XAxis dataKey="hour_of_day" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }}
                        tickFormatter={(h: number) => `${String(h).padStart(2, '0')}:00`} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="expected_demand_kw" name="Demand (kW)" stroke="#f472b6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="solar_generation_kw" name="Solar (kW)" stroke="#fbbf24" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="wind_generation_kw" name="Wind (kW)" stroke="#22d3ee" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="grid_supply_kw" name="Grid Supply (kW)" stroke="#00ff88" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Hourly decisions */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {intervals.map((iv: any) => (
                    <div key={iv.hour_of_day} className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-dark-input/60 border border-dark-border/50">
                      <span className="font-mono text-neon-emerald w-12 shrink-0">{String(iv.hour_of_day).padStart(2, '0')}:00</span>
                      <span className="text-gray-400">{iv.decision_explanation}</span>
                      <span className="ml-auto text-gray-500 shrink-0">cost {iv.estimated_cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data note */}
        <div className="card-ultra glass rounded-2xl p-4 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-400">
              Scenario outputs are computed from the actual dataset values (REAL DATA) scaled by your chosen
              parameters (SIMULATED) - never fabricated.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}