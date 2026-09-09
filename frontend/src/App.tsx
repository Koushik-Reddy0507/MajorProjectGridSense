import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store'

// Pages
import LandingPage from '@/pages/LandingPage'
import SignUpPage from '@/pages/auth/SignUpPage'
import SignInPage from '@/pages/auth/SignInPage'
import DashboardPage from '@/pages/DashboardPage'
import DatasetAnalysisPage from '@/pages/DatasetAnalysisPage'
import DemandPredictionPage from '@/pages/forecasts/DemandPredictionPage'
import RenewableForecastPage from '@/pages/forecasts/RenewableForecastPage'
import PricesPage from '@/pages/analytics/PricesPage'
import BatteryHealthPage from '@/pages/analytics/BatteryHealthPage'
import PredictiveMaintenancePage from '@/pages/analytics/PredictiveMaintenancePage'
import OptimizationPage from '@/pages/optimization/OptimizationPage'
import DigitalTwinPage from '@/pages/DigitalTwinPage'
import XAIPage from '@/pages/XAIPage'
import ReportsPage from '@/pages/ReportsPage'
import WeatherForecastPage from '@/pages/forecasts/WeatherForecastPage'

// Components
import ProtectedRoute from '@/components/ProtectedRoute'
import NotFoundPage from '@/pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
})

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<SignInPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dataset-analysis"
            element={
              <ProtectedRoute>
                <DatasetAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demand-prediction"
            element={
              <ProtectedRoute>
                <DemandPredictionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/renewable-forecast"
            element={
              <ProtectedRoute>
                <RenewableForecastPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prices"
            element={
              <ProtectedRoute>
                <PricesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battery-health"
            element={
              <ProtectedRoute>
                <BatteryHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictive-maintenance"
            element={
              <ProtectedRoute>
                <PredictiveMaintenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/optimization"
            element={
              <ProtectedRoute>
                <OptimizationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/digital-twin"
            element={
              <ProtectedRoute>
                <DigitalTwinPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explainable-ai"
            element={
              <ProtectedRoute>
                <XAIPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <ProtectedRoute>
                <WeatherForecastPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
