import { useMemo, type ComponentType } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, LineChart, Line, Legend
} from 'recharts'

// ============ Chart Tooltip Style ============
const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(0, 255, 136, 0.3)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
}

// ============ Demand / Load Forecast Chart ============
export function DemandChart() {
  const data = useMemo(() => {
    const arr: any[] = []
    for (let i = 0; i < 24; i++) {
      const hour = i
      const base = 800 + Math.sin(((i + 6) / 24) * Math.PI * 2) * 300
      const peak = (hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 20) ? 180 : 0
      const forecast = base + peak + Math.sin(i * 2.7) * 40
      const actual = base + peak + Math.sin(i * 2.7) * 65 + Math.sin(i * 5.1) * 25
      arr.push({
        hour: `${String(hour).padStart(2, '0')}:00`,
        actual: Math.round(actual),
        forecast: Math.round(forecast),
      })
    }
    return arr
  }, [])

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#00ff88" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="demandForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
          <XAxis dataKey="hour" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} unit=" kW" />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
          <Area type="monotone" dataKey="actual" name="Actual Demand" stroke="#00ff88" strokeWidth={2} fill="url(#demandGrad)" />
          <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#00d4ff" strokeWidth={2} strokeDasharray="5 5" fill="url(#demandForecast)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ============ Price Chart ============
export function PriceChart() {
  const data = useMemo(() => {
    const prices: any[] = []
    for (let i = 0; i < 28; i++) {
      const hour = i % 24
      const base = 45 + Math.sin((i / 28) * Math.PI * 4) * 12
      const spike = hour >= 17 && hour <= 19 ? 18 : 0
      prices.push({
        hour: `${String(hour).padStart(2, '0')}:00`,
        price: Math.round((base + spike + Math.sin(i * 3.1) * 6) * 10) / 10,
        forecast: Math.round((base + spike + 2) * 10) / 10,
      })
    }
    return prices
  }, [])

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
          <XAxis dataKey="hour" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} unit=" $" />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
          <Line type="monotone" dataKey="price" name="Market Price" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#00d4ff" strokeWidth={2} dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
// ============ Renewable Generation ============
export function RenewableChart() {
  const data = useMemo(() => {
    const arr: any[] = []
    for (let i = 0; i < 24; i++) {
      const sunlight = Math.max(0, Math.sin(((i - 6) / 14) * Math.PI))
      arr.push({
        hour: `${String(i).padStart(2, '0')}:00`,
        solar: Math.round(sunlight * 280 * 10) / 10,
        wind: Math.round((18 + Math.sin(i * 1.4) * 14) * 10) / 10,
      })
    }
    return arr
  }, [])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
        <XAxis dataKey="hour" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} unit=" kW" />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ color: '#94a3b8' }} />
        <Area type="monotone" dataKey="solar" name="Solar (kW)" stroke="#fbbf24" strokeWidth={2} fill="url(#solarGrad)" />
        <Area type="monotone" dataKey="wind" name="Wind (kW)" stroke="#22d3ee" strokeWidth={2} fill="url(#windGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}


// ============ Battery Health ============
export function BatteryChart() {
  const data = useMemo(() => {
    const arr: any[] = []
    for (let i = 0; i < 12; i++) {
      arr.push({
        month: `M${i + 1}`,
        soh: Math.max(78, Math.round((100 - i * 0.9) * 10) / 10),
        energy: Math.max(76, Math.round((100 - i * 1.1) * 10) / 10),
      })
    }
    return arr
  }, [])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,63,95,0.4)" />
        <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis domain={[70, 105]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,255,136,0.05)' }} />
        <Legend wrapperStyle={{ color: '#94a3b8' }} />
        <Bar dataKey="soh" name="State of Health (%)" fill="#00ff88" radius={[4, 4, 0, 0]} />
        <Bar dataKey="energy" name="Capacity (%)" fill="#00d4ff" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ============ Default Export: Type-based Chart Selector ============
const chartMap: Record<string, ComponentType> = {
  demand: DemandChart,
  price: PriceChart,
  renewable: RenewableChart,
  battery: BatteryChart,
}

export default function GraphVisualizations({ type }: { type: 'demand' | 'price' | 'renewable' | 'battery' }) {
  const Chart = chartMap[type] ?? DemandChart
  return (
    <div className="w-full h-72">
      <Chart />
    </div>
  )
}