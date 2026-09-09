import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, FileText, LineChart, Wind, TrendingUp, Battery,
  Wrench, Brain, Zap, Box, Sparkles, FileBarChart, Settings,
  Bell, User, Upload, Cloud, ChevronDown, Search, Menu, X
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { cn } from '@/utils/cn'
import WindTurbineScene from '@/components/3d/WindTurbineScene'
import CommandPalette from '@/components/CommandPalette'

interface DashboardLayoutProps {
  children: React.ReactNode
}

// ============ Major Sections (top navigation) ============
const navSections = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: FileText, label: 'Dataset Analysis', path: '/dataset-analysis' },
      { icon: FileBarChart, label: 'Reports', path: '/reports' },
    ],
  },
  {
    label: 'Forecasting',
    items: [
      { icon: LineChart, label: 'Demand Prediction', path: '/demand-prediction' },
      { icon: Wind, label: 'Renewable Forecast', path: '/renewable-forecast' },
      { icon: Cloud, label: 'Weather Forecast', path: '/weather' },
    ],
  },
  {
    label: 'Market',
    items: [
      { icon: TrendingUp, label: 'Electricity Prices', path: '/prices' },
      { icon: Battery, label: 'Battery Health', path: '/battery-health' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: Brain, label: 'Multi-Agent AI', path: '/optimization' },
      { icon: Sparkles, label: 'Explainable AI', path: '/explainable-ai' },
      { icon: Box, label: 'Digital Twin', path: '/digital-twin' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: Wrench, label: 'Predictive Maintenance', path: '/predictive-maintenance' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
]

const flatNav = navSections.flatMap((s) => s.items)

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const currentLabel = flatNav.find((i) => i.path === location.pathname)?.label || 'Dashboard'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-dark-bg relative">
      {/* 3D Renewable Energy Background behind the entire site */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <WindTurbineScene background={false} />
      </div>
      {/* Light overlay to keep content legible while turbine stays visible */}
      <div className="fixed inset-0 z-0 bg-dark-bg/25 pointer-events-none" />

      {/* ============ Top Navigation ============ */}
      <header className="sticky top-0 z-40 glass-strong border-b border-neon-emerald/10">
        <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-neon flex items-center justify-center neon-glow">
              <Zap className="w-5 h-5 text-dark-bg" />
            </div>
            <span className="text-lg font-bold text-gradient font-display hidden sm:block">GridSense</span>
          </Link>

          {/* Section Nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-1" onMouseLeave={() => setOpenSection(null)}>
            {navSections.map((section) => {
              const hasActive = section.items.some((i) => i.path === location.pathname)
              return (
                <div key={section.label} className="relative">
                  <button
                    onClick={() => setOpenSection(openSection === section.label ? null : section.label)}
                    onMouseEnter={() => setOpenSection(section.label)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm transition-all',
                      hasActive
                        ? 'text-neon-emerald bg-neon-emerald/10 border border-neon-emerald/25'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    )}
                  >
                    {section.label}
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', openSection === section.label && 'rotate-180')} />
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {openSection === section.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-60 glass-premium glow-border rounded-xl p-2 z-50"
                      >
                        {section.items.map((item) => {
                          const active = item.path === location.pathname
                          return (
                            <Link
                              key={item.path + item.label}
                              to={item.path}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                                active
                                  ? 'bg-gradient-to-r from-neon-emerald/20 to-neon-cyan/10 text-neon-emerald'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                              )}
                            >
                              <item.icon className="w-4 h-4" />
                              {item.label}
                              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse-neon" />}
                            </Link>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </nav>

          {/* Right Cluster */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Command Palette Trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-3 py-2 rounded-xl glass-input border border-dark-border text-sm text-gray-400 hover:text-neon-emerald hover:border-neon-emerald/40 transition-all"
            >
              <Search className="w-4 h-4" />
              <span className="hidden xl:block">Quick access...</span>
              <span className="hidden xl:flex items-center gap-1">
                <kbd className="palette-kbd">Ctrl</kbd>
                <kbd className="palette-kbd">K</kbd>
              </span>
            </button>

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-gray-400 hover:text-white">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Upload */}
            <button
              onClick={() => navigate('/dataset-analysis')}
              className="btn-primary-neon text-xs md:text-sm px-3 md:px-4 py-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Notifications */}
            <button className="relative w-9 h-9 rounded-xl glass-input border border-dark-border flex items-center justify-center text-gray-400 hover:text-white transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </button>

            {/* User */}
            <button onClick={handleLogout} title="Logout" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-neon flex items-center justify-center group-hover:shadow-neon transition-all">
                <User className="w-4 h-4 text-dark-bg" />
              </div>
              <span className="text-sm text-gray-400 hidden xl:block group-hover:text-white transition-colors">
                {user?.email?.split('@')[0] || 'User'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t border-dark-border/60 bg-dark-bg/80 backdrop-blur-xl"
            >
              <div className="p-3 space-y-1">
                {flatNav.map((item) => (
                  <Link
                    key={item.path + item.label}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm',
                      item.path === location.pathname
                        ? 'bg-neon-emerald/10 text-neon-emerald border border-neon-emerald/25'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Page Content */}
      <main className="relative z-10">
        <div className="px-4 md:px-6 py-5 md:py-6">{children}</div>
      </main>

      {/* Current page indicator - subtle bottom left */}
      <div className="fixed bottom-4 left-4 z-30 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-dark-border text-[11px] text-gray-500">
        <Zap className="w-3 h-3 text-neon-emerald" />
        {currentLabel}
      </div>

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
