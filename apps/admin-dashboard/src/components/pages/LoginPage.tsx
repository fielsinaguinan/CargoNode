import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Activity, Truck, MapPin, Signal } from 'lucide-react'

type ViewState = 'login' | 'forgot_password' | 'reset_sent'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>('login')
  
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email address')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      setView('reset_sent')
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2 font-sans transition-colors duration-500">
      
      {/* --- LEFT COLUMN: AUTHENTICATION --- */}
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 bg-[#EFF6FF] dark:bg-[#060b13] relative overflow-y-auto transition-colors duration-500">
        
        <div className="w-full max-w-[400px] relative z-10 my-auto">
          
          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-8 gap-3">
            <img src="/PrimaryLogoForLightMode.png" alt="CargoNode Logo" className="h-20 sm:h-24 object-contain block dark:hidden" />
            <img src="/PrimaryLogoForDarkMode.png" alt="CargoNode Logo" className="h-20 sm:h-24 object-contain hidden dark:block" />
          </div>

          <div className="relative overflow-hidden min-h-[340px]">
            {/* --- VIEW: LOGIN --- */}
            <div className={`transition-all duration-500 absolute w-full ${view === 'login' ? 'opacity-100 translate-x-0 relative' : 'opacity-0 -translate-x-full absolute pointer-events-none'}`}>

              {error && view === 'login' && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3 animate-fade-in-down">
                  <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Authentication Failed</h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2 group">
                  <label className="text-sm font-semibold text-[#1E40AF] dark:text-slate-300 ml-1 group-focus-within:text-[#2563EB] dark:group-focus-within:text-white transition-colors cursor-pointer">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cargonode.com"
                    className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-[#0B1221] border border-[#BFDBFE] dark:border-white/10 text-[#1E40AF] dark:text-white placeholder-[#1E40AF]/40 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-white/20 focus:border-[#2563EB] dark:focus:border-white/30 transition-all duration-300 shadow-sm dark:shadow-none"
                  />
                </div>

                <div className="space-y-2 group">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-semibold text-[#1E40AF] dark:text-slate-300 group-focus-within:text-[#2563EB] dark:group-focus-within:text-white transition-colors cursor-pointer">Password</label>
                    <button 
                      type="button" 
                      onClick={() => { setView('forgot_password'); setError(null); }}
                      className="text-sm font-medium text-[#2563EB] hover:text-[#1E40AF] dark:text-slate-400 dark:hover:text-white transition-all duration-300 hover:underline underline-offset-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] rounded"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-[#0B1221] border border-[#BFDBFE] dark:border-white/10 text-[#1E40AF] dark:text-white placeholder-[#1E40AF]/40 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-white/20 focus:border-[#2563EB] dark:focus:border-white/30 transition-all duration-300 pr-12 shadow-sm dark:shadow-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#1E40AF]/50 hover:text-[#2563EB] dark:text-slate-400 dark:hover:text-white transition-colors duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-4 bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold rounded-xl shadow-lg shadow-[#EA580C]/20 dark:shadow-[#EA580C]/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#EA580C] text-base tracking-wide"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      'Authenticate Session'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* --- VIEW: FORGOT PASSWORD --- */}
            <div className={`transition-all duration-500 absolute w-full ${view === 'forgot_password' ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-full absolute pointer-events-none'}`}>
              <div className="mb-8 text-center flex flex-col items-center">
                <button 
                  onClick={() => { setView('login'); setError(null); }}
                  className="mb-4 text-sm font-medium text-[#1E40AF]/70 hover:text-[#1E40AF] dark:text-slate-400 dark:hover:text-white transition-all duration-300 flex items-center justify-center gap-1 group w-fit cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] rounded"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  Back to login
                </button>
                <h2 className="text-3xl font-semibold text-[#1E40AF] dark:text-white mb-2 tracking-tight font-mono">Reset password</h2>
                <p className="text-[#1E40AF]/70 dark:text-slate-400 font-sans">Enter your email and we'll send you instructions.</p>
              </div>

              {error && view === 'forgot_password' && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3 animate-fade-in-down">
                  <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Request Failed</h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-[#1E40AF] dark:text-slate-300 ml-1 group-focus-within:text-[#2563EB] dark:group-focus-within:text-blue-400 transition-colors cursor-pointer">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cargonode.com"
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950/50 border border-[#BFDBFE] dark:border-slate-800 text-[#1E40AF] dark:text-white placeholder-[#1E40AF]/40 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] dark:focus:ring-blue-500/50 focus:border-[#2563EB] dark:focus:border-blue-500 transition-all duration-300 shadow-sm dark:shadow-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 dark:from-slate-100 dark:to-white dark:hover:from-slate-200 dark:hover:to-slate-100 dark:text-slate-900 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/20 dark:shadow-white/10 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* --- VIEW: RESET SENT --- */}
            <div className={`transition-all duration-500 absolute w-full ${view === 'reset_sent' ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-full absolute pointer-events-none'}`}>
              <div className="flex flex-col items-center justify-center text-center py-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400 shadow-lg shadow-green-500/10">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-3xl font-semibold text-[#1E40AF] dark:text-white mb-3 tracking-tight font-mono">Check your email</h2>
                <p className="text-[#1E40AF]/70 dark:text-slate-400 mb-8 max-w-[280px]">
                  We've sent a password reset link to <span className="font-medium text-[#1E40AF] dark:text-slate-300">{email}</span>.
                </p>
                
                <button
                  onClick={() => { setView('login'); setPassword(''); }}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#1E40AF] dark:text-white font-semibold rounded-xl transition-all duration-300 border border-[#BFDBFE] dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
                >
                  <ArrowLeft size={18} />
                  Return to login
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- RIGHT COLUMN: GRAPHIC --- */}
      <div className="hidden lg:flex flex-col relative bg-[#EFF6FF] dark:bg-[#060b13] border-l border-[#BFDBFE] dark:border-white/5 overflow-hidden items-center justify-center transition-colors duration-500">
        
        {/* Graphic Background */}
        <div className="relative w-full h-full flex items-center justify-center z-10">
          <img 
            src="/BackgroundForLightMode.png" 
            alt="CargoNode Operations" 
            className="block dark:hidden w-full h-full object-cover" 
          />
          <img 
            src="/BackgroundForDarkMode.png" 
            alt="CargoNode Operations" 
            className="hidden dark:block w-full h-full object-cover" 
          />
        </div>

      </div>
    </main>
  )
}

export default LoginPage
