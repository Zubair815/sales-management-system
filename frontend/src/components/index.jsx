import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import Skeleton from './Skeleton.jsx'

// Modal
export function Modal({ open, onClose, title, children, size = '' }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''}`}>
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate pr-2">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  )
}

// Confirm Dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  if (!open) return null
  return (
    <div className="modal-backdrop">
      <div className="modal max-w-sm">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle size={24} className={danger ? 'text-red-600' : 'text-yellow-600'} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
          <p className="text-sm text-gray-500 text-center mt-1">{message}</p>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 justify-center btn ${danger ? 'btn-danger' : 'btn-primary'}`}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pagination
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
      <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
      <div className="flex gap-1 flex-wrap justify-center">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="btn-secondary btn-sm px-2 py-1.5 disabled:opacity-40">
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
          if (p > totalPages) return null
          return (
            <button key={p} onClick={() => onPageChange(p)}
              className={`btn-sm px-3 py-1.5 rounded-lg text-sm ${p === page ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
              {p}
            </button>
          )
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="btn-secondary btn-sm px-2 py-1.5 disabled:opacity-40">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// Status Badge
export function StatusBadge({ status }) {
  const map = {
    Active: 'badge-green', Inactive: 'badge-gray',
    Pending: 'badge-yellow', Approved: 'badge-green', Rejected: 'badge-red',
    Dispatched: 'badge-blue', Delivered: 'badge-green', Cancelled: 'badge-gray',
    Verified: 'badge-green', Draft: 'badge-gray', Sent: 'badge-blue', Deleted: 'badge-red',
    High: 'badge-red', Medium: 'badge-yellow', Low: 'badge-blue',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12 md:py-16">
      {Icon && <Icon size={48} className="mx-auto text-gray-300 mb-4" />}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Loading Spinner
export function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  return (
    <div className="flex items-center justify-center p-8">
      <svg className={`animate-spin ${s} text-blue-600`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  )
}

// Search input
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative w-full sm:w-64">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="input pl-9" />
    </div>
  )
}

// Stat Card
export function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm text-gray-500 truncate">{label}</p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
        </div>
        <div className={`p-2 md:p-3 rounded-xl ${colors[color]} flex-shrink-0`}>
          <Icon size={18} className="md:w-5 md:h-5" />
        </div>
      </div>
    </div>
  )
}

// Form field wrapper
export function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

// Select component
export function Select({ value, onChange, options, placeholder = 'Select...', className = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`input ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// Page header
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 md:mb-6 gap-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>}
    </div>
  )
}

export { Skeleton }
