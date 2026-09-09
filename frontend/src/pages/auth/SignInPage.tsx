import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store'
import WindTurbineScene from '@/components/3d/WindTurbineScene'

export default function SignInPage() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember_me: false,
  })
  const [showPassword, setShowPassword] = useState(false)

  // Staggered entrance animation variants
  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 20, stiffness: 180 } },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(formData.email, formData.password)
      navigate('/dashboard')
    } catch {
      // Error handled by store
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* 3D Wind Turbine Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <WindTurbineScene background={false} concise />
      </div>
      {/* Light overlay — keeps turbine clearly visible */}
      <div className="fixed inset-0 z-0 bg-dark-bg/20 pointer-events-none" />

      {/* Floating aurora orbs for depth */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="aurora-orb absolute top-10 left-10 w-96 h-96 bg-neon-emerald/10 rounded-full" />
        <div className="aurora-orb absolute bottom-10 right-10 w-96 h-96 bg-neon-cyan/10 rounded-full" style={{ animationDelay: '3s' }} />
        <div className="aurora-orb absolute top-1/3 right-1/4 w-72 h-72 bg-solar-amber/5 rounded-full" style={{ animationDelay: '6s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 160 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-neon flex items-center justify-center neon-glow group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-dark-bg" />
            </div>
            <span className="text-2xl font-bold text-gradient font-display">GridSense</span>
          </Link>
        </motion.div>

        {/* Sign In Form */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="glass-auth glow-border p-8 rounded-2xl"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-white text-center mb-2 font-display">
            Welcome Back
          </motion.h2>
          <motion.p variants={itemVariants} className="text-gray-400 text-center text-sm mb-6">
            Sign in to access your energy intelligence platform
          </motion.p>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-shake"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-emerald transition-colors" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="input-neon pl-10"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-emerald transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-neon pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Remember Me */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={formData.remember_me}
                  onChange={(e) => setFormData({ ...formData, remember_me: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-border bg-dark-input checked:bg-neon-emerald"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-neon-emerald hover:underline">
                Forgot Password?
              </Link>
            </motion.div>

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full btn-primary-neon py-3 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </form>

          <motion.p variants={itemVariants} className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-neon-emerald hover:underline">
              Sign Up
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  )
}