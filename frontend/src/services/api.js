import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,  // Send HttpOnly cookies cross-origin
  headers: { 'Content-Type': 'application/json' },
})

// No request interceptor needed — cookies are sent automatically via withCredentials

// ==========================================
// REFRESH TOKEN INTERCEPTOR
// Handles 401 responses by silently refreshing the access token
// and retrying the original request. Queues concurrent requests
// while a refresh is in progress.
// ==========================================

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry these endpoints — they are expected to fail without a session
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/me') ||
        originalRequest.url?.includes('/login')
      ) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await api.post('/auth/refresh')
        processQueue(null)
        return api(originalRequest) // Retry original request with new cookie
      } catch (refreshError) {
        processQueue(refreshError)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ==========================================
// SPECIFIC API CALLS
// ==========================================

// Submit a Prepared Order to the Admin
export const submitOrder = async (orderId) => {
  const response = await api.patch(`/orders/${orderId}/submit`)
  return response.data
}

export default api