import axios from 'axios'

const api = axios.create({
  // UPDATE: Point directly to your live Render backend
  baseURL: 'https://sales-management-system-rrsv.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ==========================================
// SPECIFIC API CALLS
// ==========================================

// Submit a Prepared Order to the Admin
export const submitOrder = async (orderId) => {
  const response = await api.patch(`/orders/${orderId}/submit`);
  return response.data;
};

export default api