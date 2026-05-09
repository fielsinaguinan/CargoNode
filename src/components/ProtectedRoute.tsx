import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirect to login and save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
