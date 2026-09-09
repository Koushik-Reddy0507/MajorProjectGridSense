import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Battery, BarChart3, Brain, Zap, CloudRain,
  LineChart, Activity, AlertTriangle, TrendingUp, Cpu, Layers,
  ArrowRight, ChevronDown, Play, Sparkles, Upload
} from 'lucide-react'
import WindTurbineScene from '@/components/3d/WindTurbineScene'
import { useAuthStore } from '@/store'

// ==================== Features Data ====================
const features = [
  {
    icon: CloudRain,
    title: 'Weather & Renewable Analysis',
    description: 'Analyze weather conditions and optimize renewable energy generation from solar and wind sources using your actual dataset.',
    gradient: 'from-emerald-500 to-cyan-500',
    link: '/renewable-forecast',
  },
  {
    icon: LineChart,
    title: 'Electricity Demand Prediction',
    description: 'ML-powered demand forecasting using XGBoost, Random Forest, and LSTM models trained on your historical data.',
    gradient: 'from-cyan-500 to-blue-500',
    link: '/demand-prediction',
  },
  {
    icon: Battery,
    title: 'Battery Health Monitoring',
    description: 'Track SOC, SOH, voltage, current, temperature and cycle count with real-time health scoring and anomaly detection.',
    gradient: 'from-green-500 to-emerald-500',
    link: '/battery-health',
  },
  {
    icon: TrendingUp,
    title: 'Electricity Price Analysis',
    description: 'Analyze price trends, detect peak periods, forecast electricity prices and optimize cost with intelligent scheduling.',
    gradient: 'from-yellow-500 to-orange-500',
    link: '/prices',
  },
  {
    icon: Brain,
    title: 'Multi-Agent AI Optimization',
    description: 'LangGraph-powered agent system with specialized Weather, Renewable, Demand, Battery, and Market agents working together.',
    gradient: 'from-purple-500 to-pink-500',
    link: '/optimization',
  },
  {
    icon: Layers,
    title: 'Digital Twin Simulation',
    description: 'Interactive virtual representation for scenario testing and what-if analysis with real-time energy flow visualization.',
    gradient: 'from-blue-500 to-indigo-500',
    link: '/digital-twin',
  },
  {
    icon: Sparkles,
    title: 'Explainable AI (XAI)',
    description: 'SHAP-powered model explanations showing why every recommendation is made with feature importance and waterfall plots.',
    gradient: 'from-pink-500 to-rose-500',
    link: '/explainable-ai',
  },
  {
    icon: AlertTriangle,
    title: 'Predictive Maintenance',
    description: 'Anomaly detection and health prediction for energy assets with evidence-based maintenance recommendations.',
    gradient: 'from-red-500 to-orange-500',
    link: '/predictive-maintenance',
  },
  {
    icon: Zap,
    title: '24-Hour Energy Plan',
    description: 'Optimized energy management schedule maximizing renewable utilization and minimizing costs and grid dependency.',
    gradient: 'from-emerald-500 to-teal-500',
    link: '/optimization',
  },
  {
    icon: BarChart3,
    title: 'Dataset Intelligence',
    description: 'Automatic schema detection, data quality analysis, missing value handling, outlier detection and feature engineering.',
    gradient: 'from-cyan-500 to-blue-500',
    link: '/dataset-analysis',
  },
  {
    icon: Activity,
    title: 'Energy Flow Visualization',
    description: 'Dynamic Sankey diagrams showing Solar, Wind, Battery and Grid flows with interactive Plotly visualizations.',
    gradient: 'from-violet-500 to-purple-500',
    link: '/dashboard',
  },
  {
    icon: Cpu,
    title: 'AI Copilot',
    description: 'Natural language assistant that answers questions about your data, explains findings and suggests next steps.',
    gradient: 'from-emerald-500 to-cyan-500',
    link: '/dashboard',
  },
]

// ==================== Animated Stat Component ====================
function AnimatedStat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 2000
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.floor(progress * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])

  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-gradient">{count}{suffix}</div>
      <div className="text-sm text-gray-400 mt-2">{label}</div>
    </div>
  )
}

// ==================== Navigation ====================
function LandingNavbar() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-neon-emerald/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-neon flex items-center justify-center">
              <Zap className="w-5 h-5 text-dark-bg" />
            </div>
            <span className="text-xl font-bold text-gradient font-display">GridSense</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</a>
            <a href="#stats" className="text-gray-400 hover:text-white transition-colors">Platform Stats</a>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-primary-neon"
              >
                Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary-neon text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// ==================== Feature Card ====================
function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const Icon = feature.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.25 }}
      transition={{ delay: (index % 3) * 0.1, duration: 0.6, ease: 'easeOut' }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group"
    >
      <div className="block card-ultra glass-premium glow-border p-6 rounded-2xl hover:border-neon-emerald/50 transition-all duration-300 h-full">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-neon-emerald transition-colors">{feature.title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
        <div className="mt-4 flex items-center gap-2 text-neon-emerald text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Explore</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  )
}

// ==================== Main Landing Page ====================
export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen bg-dark-bg relative">
      {/* Fixed 3D Wind Turbine background behind the ENTIRE landing page */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <WindTurbineScene />
      </div>
      {/* Light overlay — keeps the turbine clearly visible while content stays legible */}
      <div className="fixed inset-0 z-0 bg-dark-bg/20 pointer-events-none" />

      <LandingNavbar />

      <div className="relative z-10">
      {/* Hero Section with 3D Wind Turbine */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Overlay Gradient — light, keeps 3D scene visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark-bg/20 via-dark-bg/10 to-dark-bg/70" />

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-neon-emerald/30 mb-8">
              <Sparkles className="w-4 h-4 text-neon-emerald" />
              <span className="text-sm text-neon-emerald">Powered by AI & Machine Learning</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6">
              <span className="text-white">GridSense</span>
              <br />
              <span className="text-gradient">Autonomous Renewable Energy Intelligence</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              The world's first AI-powered energy intelligence platform. Upload your data, 
              and GridSense automatically analyzes, predicts, optimizes, and explains 
              every aspect of your renewable energy management.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')}
                className="btn-primary-neon text-lg px-8 py-4"
              >
                <Play className="w-5 h-5" />
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
              </button>
              <a href="#features" className="btn-secondary-neon text-lg px-8 py-4">
                Explore Features
              </a>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <a href="#features" className="flex flex-col items-center text-gray-400 hover:text-neon-emerald transition-colors">
              <span className="text-sm mb-2">Scroll to explore</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 border-t border-dark-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedStat value={12} label="AI-Powered Modules" />
            <AnimatedStat value={99} suffix="%" label="Data-Driven Analysis" />
            <AnimatedStat value={7} label="Specialized AI Agents" />
            <AnimatedStat value={24} label="Hour Optimization Plans" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Complete Energy Intelligence Platform
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Every feature powered by your actual uploaded dataset. No mock data, 
              no fabricated values—just real analysis from your real data.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-t border-dark-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              How GridSense Works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Upload one dataset and let GridSense handle everything—from data analysis 
              to AI-powered optimization.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: '01', title: 'Upload Dataset', desc: 'Upload CSV or XLSX with your energy data' },
              { step: '02', title: 'Auto-Analysis', desc: 'Schema detection, quality analysis, feature engineering' },
              { step: '03', title: 'AI Processing', desc: '7 specialized agents analyze and optimize' },
              { step: '04', title: 'Get Insights', desc: 'Forecasts, recommendations, and optimization plans' },
              { step: '05', title: 'Simulate', desc: 'Digital Twin scenario testing and XAI explanations' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl glass border border-neon-emerald/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-neon-emerald font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-dark-border/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card-ultra glass-premium glow-border p-12 border-neon-emerald/30"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Ready to Transform Your Energy Management?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Start with just one dataset. GridSense will automatically detect columns, 
              analyze quality, and unlock every intelligent feature.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')}
                className="btn-primary-neon text-lg px-8 py-4"
              >
                <Upload className="w-5 h-5" />
                {isAuthenticated ? 'Upload Dataset Now' : 'Start Free Analysis'}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-neon flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-bg" />
              </div>
              <span className="text-xl font-bold text-gradient font-display">GridSense</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 GridSense. Autonomous Renewable Energy Intelligence Platform.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}

