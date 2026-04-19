import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) return

    const s = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { 
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))

    // Global notifications
    s.on('new_announcement', (data) => {
      toast(data.title, {
        icon: data.priority === 'High' ? '🚨' : data.priority === 'Medium' ? '📢' : '📌',
        duration: 6000,
        style: data.priority === 'High' ? { border: '2px solid #ef4444' } : {},
      })
    })

    s.on('order_status_update', (data) => {
      toast.success(`Order ${data.orderNumber} is now ${data.status}`)
    })

    s.on('expense_approved', () => toast.success('Your expense has been approved!'))
    s.on('expense_rejected', (d) => toast.error(`Expense rejected: ${d.reason}`))
    s.on('payment_verified', () => toast.success('Your payment has been verified!'))
    s.on('payment_rejected', (d) => toast.error(`Payment rejected: ${d.reason}`))

    s.on('low_stock_alert', (data) => {
      if (user.role !== 'Salesperson') {
        toast(`⚠️ Low stock: ${data.name} (${data.stock} left)`, { duration: 8000 })
      }
    })

    s.on('new_order', (data) => {
      if (user.role !== 'Salesperson') {
        toast(`📦 New order from ${data.salesperson}`, { duration: 5000 })
      }
    })

    setSocket(s)
    return () => s.disconnect()
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)