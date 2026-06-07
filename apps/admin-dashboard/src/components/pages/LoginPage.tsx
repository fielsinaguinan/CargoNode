import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'

type ViewState = 'login' | 'forgot_password' | 'reset_sent'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[#060b13] relative overflow-hidden p-4 font-sans">
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 z-0 opacity-5" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        {/* Radial Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[130px] rounded-full pointer-events-none"></div>

        {/* Card Container Restraint */}
        <div className="max-w-md w-full relative z-10">
          
          {/* Logo Outside the Box */}
          <div className="flex flex-col items-center justify-center mb-8 gap-4 mt-6">
            <div className="relative group flex justify-center items-center w-28 h-28">
              {/* Animated glowing backdrop */}
              <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 blur-2xl rounded-full group-hover:bg-blue-500/30 transition-colors duration-500"></div>
              
              {/* Static Inner Ring */}
              <div className="absolute inset-[-8px] rounded-full border border-blue-500/20 dark:border-blue-400/20 group-hover:border-blue-500/40 transition-colors duration-500"></div>
              
              {/* Outer Dashed Spinning Ring */}
              <div className="absolute inset-[-20px] rounded-full border border-dashed border-blue-400/40 dark:border-blue-500/40 animate-[spin_15s_linear_infinite]"></div>
              
              {/* Reverse Spinning Subtle Ring */}
              <div className="absolute inset-[-32px] rounded-full border border-purple-500/10 dark:border-purple-400/20 animate-[spin_20s_linear_infinite_reverse]"></div>
              
              {/* Fast Orbiting Dot on Inner Ring */}
              <div className="absolute inset-[-8px] animate-[spin_3s_linear_infinite]">
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full absolute -top-[1px] left-1/2 -translate-x-1/2 shadow-[0_0_10px_2px_rgba(59,130,246,0.8)]"></div>
              </div>

              {/* Slower Orbiting Dot on Outer Ring */}
              <div className="absolute inset-[-32px] animate-[spin_6s_linear_infinite_reverse]">
                <div className="w-1.5 h-1.5 bg-purple-500 dark:bg-purple-400 rounded-full absolute top-1/2 -left-[1px] -translate-y-1/2 shadow-[0_0_8px_2px_rgba(168,85,247,0.8)]"></div>
              </div>
              
              {/* Logo (No box) */}
              <div className="relative z-10 group-hover:scale-110 transition-transform duration-500">
                <img src="/SubmarkLogo.png" alt="CargoNode Logo" className="h-24 w-24 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
              </div>
            </div>
          </div>

          <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 relative">

          <div className="relative overflow-hidden min-h-[400px]">
            {/* --- VIEW: LOGIN --- */}
            <div className={`transition-all duration-500 absolute w-full ${view === 'login' ? 'opacity-100 translate-x-0 relative' : 'opacity-0 -translate-x-full absolute pointer-events-none'}`}>
              <div className="mb-8 text-center flex flex-col items-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Welcome back</h2>
                <p className="text-slate-500 dark:text-slate-400">Sign in to your workspace to continue.</p>
              </div>

              {error && view === 'login' && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3 animate-fade-in-down">
                  <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Authentication Failed</h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5 group">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cargonode.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  />
                </div>

                <div className="space-y-1.5 group">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">Password</label>
                    <button 
                      type="button" 
                      onClick={() => { setView('forgot_password'); setError(null); }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors hover:underline underline-offset-4"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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
                </div>
              </form>
            </div>

            {/* --- VIEW: FORGOT PASSWORD --- */}
            <div className={`transition-all duration-500 absolute w-full ${view === 'forgot_password' ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-full absolute pointer-events-none'}`}>
              <div className="mb-8 text-center flex flex-col items-center">
                <button 
                  onClick={() => { setView('login'); setError(null); }}
                  className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center gap-1 group w-fit"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  Back to login
                </button>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Reset password</h2>
                <p className="text-slate-500 dark:text-slate-400">Enter your email and we'll send you instructions to reset your password.</p>
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
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cargonode.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 dark:from-slate-100 dark:to-white dark:hover:from-slate-200 dark:hover:to-slate-100 dark:text-slate-900 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/20 dark:shadow-white/10 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Check your email</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-[280px]">
                  We've sent a password reset link to <span className="font-medium text-slate-900 dark:text-slate-300">{email}</span>.
                </p>
                
                <button
                  onClick={() => { setView('login'); setPassword(''); }}
                  className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} />
                  Return to login
                </button>
              </div>
            </div>

          </div>
        </div>
        </div>
      </main>
  )
}

export default LoginPage
