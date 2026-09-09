import axios, { AxiosInstance, AxiosError } from 'axios'
import { auth } from './supabase'

// Use relative URL in production (Vercel proxy), absolute URL in development
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api')

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (error) {
    console.error('Error getting auth token:', error)
  }
  return config
})

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ==================== DATASET ENDPOINTS ====================
export const datasetApi = {
  upload: (file: File, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) formData.append('description', description)
    return apiClient.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () => apiClient.get('/datasets'),

  get: (id: string) => apiClient.get(`/datasets/${id}`),

  analyze: (id: string) => apiClient.post(`/datasets/${id}/analyze`, {}),

  getSchema: (id: string) => apiClient.get(`/datasets/${id}/schema`),

  getQuality: (id: string) => apiClient.get(`/datasets/${id}/quality`),

  delete: (id: string) => apiClient.delete(`/datasets/${id}`),
}

// ==================== DASHBOARD ENDPOINTS ====================
export const dashboardApi = {
  get: (datasetId: string) => apiClient.get(`/dashboard/${datasetId}`),
  getKpis: (datasetId: string) => apiClient.get(`/dashboard/${datasetId}/kpis`),
}

// ==================== FORECAST ENDPOINTS ====================
export const forecastApi = {
  // Demand
  getDemand: (datasetId: string) => apiClient.get(`/demand/forecast/${datasetId}`),
  predictDemand: (datasetId: string) => apiClient.post(`/demand/forecast/${datasetId}`, {}),

  // Renewable
  getRenewable: (datasetId: string) => apiClient.get(`/renewables/forecast/${datasetId}`),
  predictRenewable: (datasetId: string) => apiClient.post(`/renewables/forecast/${datasetId}`, {}),

  // Price
  getPrice: (datasetId: string) => apiClient.get(`/prices/forecast/${datasetId}`),
  predictPrice: (datasetId: string) => apiClient.post(`/prices/analyze/${datasetId}`, {}),
}

// ==================== ANALYSIS ENDPOINTS ====================
export const analysisApi = {
  // Weather
  analyzeWeather: (datasetId: string) => apiClient.post(`/weather/analyze/${datasetId}`, {}),
  getWeather: (datasetId: string) => apiClient.get(`/weather/${datasetId}`),

  // Battery
  analyzeBattery: (datasetId: string) => apiClient.post(`/battery/analyze/${datasetId}`, {}),
  getBattery: (datasetId: string) => apiClient.get(`/battery/${datasetId}`),

  // Maintenance
  analyzeMaintenance: (datasetId: string) => apiClient.post(`/maintenance/analyze/${datasetId}`, {}),
  getMaintenance: (datasetId: string) => apiClient.get(`/maintenance/${datasetId}`),
}

// ==================== OPTIMIZATION ENDPOINTS ====================
export const optimizationApi = {
  run: (datasetId: string) => apiClient.post(`/optimization/run/${datasetId}`, {}),
  getPlan: (datasetId: string) => apiClient.get(`/optimization/plan/${datasetId}`),
  getResults: (datasetId: string) => apiClient.get(`/optimization/results/${datasetId}`),
}

// ==================== DIGITAL TWIN ENDPOINTS ====================
export const digitalTwinApi = {
  createScenario: (datasetId: string, scenario: Record<string, unknown>) =>
    apiClient.post(`/digital-twin/scenarios/${datasetId}`, scenario),
  getScenario: (id: string) => apiClient.get(`/digital-twin/scenarios/${id}`),
  listScenarios: (datasetId: string) => apiClient.get(`/digital-twin/scenarios/${datasetId}`),
  simulate: (datasetId: string, parameters: Record<string, number>, scenarioName?: string) =>
    apiClient.post('/digital-twin/simulate', {
      dataset_id: datasetId,
      parameters,
      scenario_name: scenarioName ?? 'What-If Scenario',
    }),
}

// ==================== EXPLAINABLE AI ENDPOINTS ====================
export const xaiApi = {
  generate: (datasetId: string) => apiClient.post(`/xai/generate/${datasetId}`, {}),
  explain: (predictionId: string) => apiClient.get(`/xai/explain/${predictionId}`),
  getFeatureImportance: (modelId: string) => apiClient.get(`/xai/importance/${modelId}`),
}

// ==================== AGENT ENDPOINTS ====================
export const agentApi = {
  run: (agentType: string, input: Record<string, unknown>) =>
    apiClient.post(`/agents/run`, { agent_type: agentType, input }),
  getStatus: (executionId: string) => apiClient.get(`/agents/status/${executionId}`),
  getHistory: (datasetId: string) => apiClient.get(`/agents/history/${datasetId}`),
}

// ==================== REPORTS ENDPOINTS ====================
export const reportsApi = {
  generate: (datasetId: string, reportType: string) =>
    apiClient.post(`/reports/generate`, { dataset_id: datasetId, report_type: reportType }),
  get: (id: string) => apiClient.get(`/reports/${id}`),
  list: (datasetId: string) => apiClient.get(`/reports/${datasetId}`),
}

// ==================== ALERTS ENDPOINTS ====================
export const alertsApi = {
  list: () => apiClient.get('/alerts'),
  markRead: (id: string) => apiClient.patch(`/alerts/${id}/read`, {}),
  delete: (id: string) => apiClient.delete(`/alerts/${id}`),
}

// ==================== WEATHER ENDPOINTS ====================
export const weatherApi = {
  getCurrent: (city: string) => apiClient.get(`/weather/current?city=${encodeURIComponent(city)}`),
  getForecast: (city: string) => apiClient.get(`/weather/forecast?city=${encodeURIComponent(city)}`),
  getAirQuality: (lat: number, lon: number) => apiClient.get(`/weather/air-quality?lat=${lat}&lon=${lon}`),
}

// ==================== AI COPILOT ENDPOINTS ====================
export const copilotApi = {
  ask: (question: string, datasetId?: string) =>
    apiClient.post('/copilot/ask', { question, dataset_id: datasetId }),
}

// ==================== HEALTH ENDPOINTS ====================
export const healthApi = {
  check: () => apiClient.get('/health'),
}

export default apiClient
