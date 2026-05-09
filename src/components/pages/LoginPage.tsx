import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, PackageSearch } from 'lucide-react'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  
  // Navigate to the dashboard or where they originally wanted to go
  const from = location.state?.from?.pathname || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Successful login
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        {/* Abstract glowing orb for aesthetics */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <PackageSearch size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Cargo<span className="text-blue-400">Node</span></span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Intelligent Fleet & Dispatch Management
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Gain complete visibility over your logistics operations. Monitor waybills, dispatch fleets, and optimize routes in real-time.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} CargoNode Logistics Platform. All rights reserved.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md">
          
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <PackageSearch size={22} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Cargo<span className="text-blue-500">Node</span></span>
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400">Sign in to your workspace to continue.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3 animate-fade-in-down">
              <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Authentication Failed</h4>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1 relative">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cargonode.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1 relative">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  )
}

export default LoginPage
