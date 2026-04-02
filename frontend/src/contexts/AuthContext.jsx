import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then(r => setUser(r.data.data))
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (role, credentials) => {
    const endpoint = role === 'SuperAdmin' ? '/auth/super-admin/login'
      : role === 'Admin' ? '/auth/admin/login'
      : '/auth/salesperson/login'
    const res = await api.post(endpoint, credentials)
    const { token, user } = res.data.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const hasPermission = useCallback((module, requiredLevel = 'ViewOnly') => {
    if (!user) return false
    if (user.role === 'SuperAdmin') return true
    if (user.role === 'Salesperson') return false
    const levels = { NoAccess: 0, ViewOnly: 1, ViewEdit: 2, FullAccess: 3 }
    const userLevel = levels[user.permissions?.[module]] ?? 0
    const required = levels[requiredLevel] ?? 1
    return userLevel >= required
  }, [user])

  const canAccess = useCallback((module) => {
    if (!user) return false
    if (user.role === 'SuperAdmin') return true
    if (user.role === 'Salesperson') return ['Orders', 'Expenses', 'Payments', 'Announcements'].includes(module)
    return user.permissions?.[module] && user.permissions[module] !== 'NoAccess'
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
