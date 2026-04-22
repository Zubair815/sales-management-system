import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Shield, ChevronDown } from 'lucide-react'

const ROLES = [
  { value: 'SuperAdmin', label: '⭐ Super Admin / Developer', color: 'text-purple-600' },
  { value: 'Admin', label: '👔 Admin', color: 'text-blue-600' },
  { value: 'Salesperson', label: '🧑‍💼 Salesperson', color: 'text-green-600' },
]

export default function LoginPage() {
  const [role, setRole] = useState('Admin')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await login(role, data)
      toast.success(`Welcome, ${user.name}!`)
      if (user.role === 'SuperAdmin') navigate('/super-admin')
      else if (user.role === 'Admin') navigate('/admin')
      else navigate('/salesperson')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const isSalesperson = role === 'Salesperson'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Role selector */}
          <div className="mb-6">
            <label className="label">Login As</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r.value} type="button"
                  onClick={() => setRole(r.value)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    role === r.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email or Employee ID */}
            {isSalesperson ? (
              <div>
                <label className="label">Employee ID</label>
                <input {...register('employeeId', {
                  required: 'Employee ID is required',
                  minLength: { value: 8, message: 'Min 8 characters' },
                  maxLength: { value: 12, message: 'Max 12 characters' },
                  pattern: { value: /^[a-zA-Z0-9]+$/, message: 'Alphanumeric only' }
                })} className="input" placeholder="e.g. EMP00001" />
                {errors.employeeId && <p className="text-red-500 text-xs mt-1">{errors.employeeId.message}</p>}
              </div>
            ) : (
              <div>
                <label className="label">Email Address</label>
                <input {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/, message: 'Invalid email' }
                })} type="email" className="input" placeholder="admin@company.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Min 8 characters' },
                })} type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Demo: superadmin@sms.com / Admin1234</p>
        </div>
      </div>
    </div>
  )
}
