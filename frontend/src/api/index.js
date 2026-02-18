import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    console.error('[API Error]', msg, err.config?.url)
    return Promise.reject(new Error(msg))
  }
)

// ── Assets ──────────────────────────────────────────────────────────────
export const assetsAPI = {
  list: (params) => api.get('/assets', { params }).then(r => r.data),
  get: (id) => api.get(`/assets/${id}`).then(r => r.data),
  create: (data) => api.post('/assets', data).then(r => r.data),
  update: (id, data) => api.put(`/assets/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/assets/${id}`).then(r => r.data),
  categories: () => api.get('/categories').then(r => r.data),
}

// ── Teams ────────────────────────────────────────────────────────────────
export const teamsAPI = {
  list: () => api.get('/teams').then(r => r.data),
  get: (id) => api.get(`/teams/${id}`).then(r => r.data),
  create: (data) => api.post('/teams', data).then(r => r.data),
  update: (id, data) => api.put(`/teams/${id}`, data).then(r => r.data),
}

// ── Allocations ──────────────────────────────────────────────────────────
export const allocationsAPI = {
  list: (status = 'active') => api.get('/allocations', { params: { status } }).then(r => r.data),
  allocate: (data) => api.post('/allocations', data).then(r => r.data),
  release: (id, data) => api.post(`/allocations/${id}/release`, data).then(r => r.data),
}

// ── Projects ─────────────────────────────────────────────────────────────
export const projectsAPI = {
  list: (params) => api.get('/projects', { params }).then(r => r.data),
  get: (id) => api.get(`/projects/${id}`).then(r => r.data),
  create: (data) => api.post('/projects', data).then(r => r.data),
  update: (id, data) => api.put(`/projects/${id}`, data).then(r => r.data),
}

// ── Matching ─────────────────────────────────────────────────────────────
export const matchingAPI = {
  urgentMatch: (data) => api.post('/match/urgent', data).then(r => r.data),
  optimizeForProject: (id) => api.get(`/match/optimize/${id}`).then(r => r.data),
  gapAnalysis: () => api.get('/match/gap-analysis').then(r => r.data),
  demandScores: () => api.get('/match/demand-scores').then(r => r.data),
  collaborationGraph: () => api.get('/match/collaboration-graph').then(r => r.data),
}

// ── Analytics ────────────────────────────────────────────────────────────
export const analyticsAPI = {
  overview: () => api.get('/analytics/overview').then(r => r.data),
  utilizationTrend: (params) => api.get('/analytics/utilization-trend', { params }).then(r => r.data),
  costAnalysis: () => api.get('/analytics/cost-analysis').then(r => r.data),
}

// ── Health ───────────────────────────────────────────────────────────────
export const healthAPI = {
  check: () => axios.get('/health').then(r => r.data),
}

export default api