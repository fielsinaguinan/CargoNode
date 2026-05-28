import React, { useState, useEffect } from 'react'
import { 
  Search, 
  MapPin, 
  Truck, 
  Check, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Copy, 
  CheckCheck, 
  Ship, 
  Calendar, 
  ChevronDown, 
  Package, 
  HelpCircle, 
  Send, 
  LogOut 
} from 'lucide-react'
import { supabase } from './lib/supabase'

function App() {
  // Auth state
  const [user, setUser] = useState<any>(null)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Client Profile state
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Portal view state
  const [activeTab, setActiveTab] = useState<'track' | 'book' | 'support'>('track')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<{ waybill: any, milestones: any[] } | null>(null)
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('cargonode_recent_searches')
    return saved ? JSON.parse(saved) : []
  })
  
  // Copy feedback toast
  const [copiedId, setCopiedId] = useState(false)

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    origin: '',
    destination: '',
    container_type: '20-footer' as '20-footer' | '40-footer' | 'LCL',
    target_date: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState('')

  // Support & FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: ''
  })
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false)
  const [supportSuccess, setSupportSuccess] = useState(false)
  const [supportError, setSupportError] = useState('')

  const faqs = [
    {
      question: "How do I track my cargo manifest?",
      answer: "Navigate to the 'Track' tab and enter your active Waybill Number (e.g. WB-XXXXXXXX). You will receive instant live updates as our fleet dispatch monitor publishes milestones."
    },
    {
      question: "What container types are supported?",
      answer: "We support 20-footer and 40-footer standard dry vans, as well as Less than Container Load (LCL) shipments."
    },
    {
      question: "How can I check billing and invoices?",
      answer: "For billing queries, please contact our accounts dispatch using the form below. Standard net-30 terms apply to verified corporate client accounts."
    },
    {
      question: "What should I do if a shipment is delayed?",
      answer: "Manifest delays are visible in real-time. If a delayed status appears, our dispatcher is already rerouting the truck. You can send a direct query using the form below for detailed telemetry."
    }
  ]

  // Listen to Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch client profiles when authenticated user changes
  useEffect(() => {
    if (user) {
      setProfileLoading(true)
      supabase.from('client_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setClientProfile(data)
            setBookingForm(prev => ({ ...prev, client_name: data.company_name || '' }))
          } else {
            setBookingForm(prev => ({ ...prev, client_name: user.email?.split('@')[0] || '' }))
          }
          setProfileLoading(false)
        })
    } else {
      setClientProfile(null)
      setBookingForm(prev => ({ ...prev, client_name: '' }))
    }
  }, [user])

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail || !authPassword) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      })
      if (error) throw error
    } catch (err: any) {
      console.error(err)
      setAuthError(err.message || 'Failed to sign in. Please verify your credentials.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail || !authPassword || !companyName) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword
      })
      if (error) throw error

      if (data?.user) {
        // Insert client profiles data
        const { error: profileErr } = await supabase.from('client_profiles').insert([{
          id: data.user.id,
          email: authEmail,
          company_name: companyName
        }])
        if (profileErr) throw profileErr
      }
    } catch (err: any) {
      console.error(err)
      setAuthError(err.message || 'Registration failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleCopyWaybill = async (trackNum: string) => {
    try {
      await navigator.clipboard.writeText(trackNum)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch { /* fallback silent fail */ }
  }

  const executeTrack = async (trackId: string) => {
    if (!trackId) return
    setTrackingNumber(trackId)
    setIsSearching(true)
    setResult(null)
    setError('')
    
    try {
      // 1. Fetch Waybill (Public Read enabled via RLS)
      const { data: waybill, error: waybillError } = await supabase
        .from('waybills')
        .select('*')
        .eq('tracking_number', trackId.toUpperCase())
        .single()

      if (waybillError || !waybill) {
        throw new Error('Waybill not found')
      }

      // 2. Fetch tracking milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from('tracking_milestones')
        .select('*')
        .eq('waybill_id', waybill.tracking_number)
        .order('order_index', { ascending: true })

      if (milestonesError) throw milestonesError

      setResult({ waybill, milestones: milestones || [] })
      
      // Save to recent searches
      setRecentSearches(prev => {
        const newSearches = [waybill.tracking_number, ...prev.filter(id => id !== waybill.tracking_number)].slice(0, 3)
        localStorage.setItem('cargonode_recent_searches', JSON.stringify(newSearches))
        return newSearches
      })
    } catch (err) {
      console.error(err)
      setError('We could not find a dispatch manifest with that tracking number. Please check and try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    await executeTrack(trackingNumber)
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingError('')
    if (!bookingForm.client_name || !bookingForm.origin || !bookingForm.destination || !bookingForm.target_date || !user) return
    setIsSubmitting(true)

    try {
      const payload = {
        client_name: bookingForm.client_name,
        origin: bookingForm.origin,
        destination: bookingForm.destination,
        container_type: bookingForm.container_type,
        target_date: new Date(bookingForm.target_date).toISOString(),
        status: 'Pending',
        client_id: user.id, // Securely attach client UUID
      }
      
      const { error } = await supabase.from('customer_bookings').insert([payload])
      if (error) throw error
      
      setBookingSuccess(true)
      setBookingForm(prev => ({ ...prev, origin: '', destination: '', target_date: '' }))
      setTimeout(() => setBookingSuccess(false), 4000)
    } catch (err: any) {
      console.error("Booking error:", err)
      setBookingError(err.message || 'An unknown error occurred during booking.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Support Ticket Submissions
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSupportError('')
    if (!supportForm.subject || !supportForm.message || !user) return
    setIsSubmittingSupport(true)

    try {
      // Forward the support request as a real-time notification alert to the Admin dashboard
      const { error } = await supabase.from('notifications').insert([{
        type: 'info',
        title: `Support Ticket: ${supportForm.subject}`,
        description: `From ${clientProfile?.company_name || user.email}: ${supportForm.message}`,
      }])
      
      if (error) throw error
      
      setSupportSuccess(true)
      setSupportForm({ subject: '', message: '' })
      setTimeout(() => setSupportSuccess(false), 4000)
    } catch (err: any) {
      console.error(err)
      setSupportError(err.message || 'Failed to submit support request.')
    } finally {
      setIsSubmittingSupport(false)
    }
  }

  // Subscribe to live updates if we have a result
  useEffect(() => {
    if (!result?.waybill) return

    const channel = supabase.channel(`public:waybill:${result.waybill.tracking_number}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tracking_milestones', 
        filter: `waybill_id=eq.${result.waybill.tracking_number}` 
      }, async () => {
         const { data: newMilestones } = await supabase
           .from('tracking_milestones')
           .select('*')
           .eq('waybill_id', result.waybill.tracking_number)
           .order('order_index', { ascending: true })
         
         if (newMilestones) {
            setResult(prev => prev ? { ...prev, milestones: newMilestones } : null)
         }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [result?.waybill?.tracking_number])

  // RENDER SECURITY GATE: Sign-In / Registration Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex relative overflow-hidden w-full">
        
        {/* LEFT / MOBILE SIDE: The Form Container */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-8 z-10 relative">
          {/* Backdrop Glow Effects (Form side) */}
          <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-orange-500/10 blur-[120px] pointer-events-none"></div>

          <div className="w-full max-w-[420px] relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
                <Truck size={24} className="text-white" strokeWidth={2.2} />
              </div>
              <h1 className="text-2xl font-bold text-white font-mono tracking-tight">CargoNode</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Client Portal PWA</p>
            </div>

            {/* Toggle Tabs */}
            <div className="flex gap-2 bg-white/5 rounded-2xl p-1 mb-6">
              <button
                onClick={() => { setAuthView('login'); setAuthError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${authView === 'login' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthView('register'); setAuthError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${authView === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Register PWA
              </button>
            </div>

            {authError && (
              <div className="mb-4 bg-red-500/15 border border-red-500/25 rounded-xl p-3.5 text-xs font-medium text-red-400 flex items-start gap-2.5 animate-fade-in-down">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={authView === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {authView === 'register' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. NexaCorp Logistics Inc."
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Corporate Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="client@company.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              >
                {authLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : authView === 'login' ? (
                  'Sign In to Dashboard'
                ) : (
                  'Submit Registration'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT SIDE: Enterprise Branding (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#020617] items-center justify-center p-12 overflow-hidden border-l border-white/5 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          {/* Large dynamic glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/20 blur-[120px] pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

          {/* Value Prop Graphic */}
          <div className="relative z-10 max-w-xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 flex items-center justify-center mb-8 backdrop-blur-xl shadow-[0_0_30px_rgba(37,99,235,0.2)]">
              <Ship className="text-blue-400 w-8 h-8" strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 tracking-tight leading-[1.15]">
              Intelligent Telemetry for <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Global Supply Chains.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-lg">
              Gain unparalleled visibility into your cargo movements. Track shipments in real-time, streamline logistics, and reduce turnaround times with our next-generation enterprise dispatch platform.
            </p>
            
            <div className="grid grid-cols-2 gap-4 max-w-md">
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
                 <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                     <CheckCheck size={14} className="text-emerald-400" />
                   </div>
                   <h3 className="text-white font-bold text-xl">99.9%</h3>
                 </div>
                 <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider pl-11">Platform Uptime</p>
               </div>
               
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
                 <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                     <MapPin size={14} className="text-blue-400" />
                   </div>
                   <h3 className="text-white font-bold text-xl">Real-time</h3>
                 </div>
                 <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider pl-11">GPS Tracking</p>
               </div>
            </div>
          </div>
        </div>

      </div>
    )
  }

  // RENDER PWA CONTENT: Authenticated Client Portal Layout
  return (
    <div className="max-w-[420px] mx-auto min-h-screen bg-slate-50 shadow-2xl relative flex flex-col overflow-hidden border-x border-slate-200">
      
      {/* Dynamic Client Header */}
      <header className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100 z-10 sticky top-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Truck size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
             <h1 className="text-xs font-bold text-slate-900 leading-none font-display tracking-tight truncate">
               {profileLoading ? 'Loading Profile...' : clientProfile?.company_name || 'My CargoNode Portal'}
             </h1>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
               {user?.email}
             </p>
          </div>
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60 transition-all cursor-pointer shrink-0"
        >
          <LogOut size={11} />
          <span>Exit</span>
        </button>
      </header>

      {/* Tab Switcher (Including Help & Support for Authenticated Users) */}
      <div className="sticky top-[65px] z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-2">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button
            onClick={() => { setActiveTab('track'); setResult(null); setError(''); }}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 cursor-pointer',
              activeTab === 'track'
                ? 'bg-white text-blue-600 shadow-sm shadow-blue-100'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <Search size={12} />
            Track
          </button>
          <button
            onClick={() => { setActiveTab('book'); setResult(null); setError(''); }}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 cursor-pointer',
              activeTab === 'book'
                ? 'bg-white text-blue-600 shadow-sm shadow-blue-100'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <Ship size={12} />
            Book
          </button>
          <button
            onClick={() => { setActiveTab('support'); setResult(null); setError(''); }}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 cursor-pointer',
              activeTab === 'support'
                ? 'bg-white text-blue-600 shadow-sm shadow-blue-100'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <HelpCircle size={12} />
            Support
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 py-8">
        
        {/* ═══════════════ TRACK TAB ═══════════════ */}
        {activeTab === 'track' && (
          <>
            {/* Search Input Section */}
            {!result && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2 font-display tracking-tight">Track Cargo</h2>
                <p className="text-xs text-slate-500 mb-6">Enter your waybill or container tracking number for live telemetry.</p>
                
                <form onSubmit={handleTrack} className="space-y-4">
                  <div className="relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                    <input 
                      type="text" 
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Waybill Tracking Number" 
                      className={`w-full bg-white border ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'} rounded-2xl py-4 pl-11 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 transition-all shadow-sm`}
                    />
                  </div>
                  {error && (
                     <p className="text-[11px] text-red-500 font-semibold flex items-start gap-1.5 animate-fade-in-down">
                       <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                     </p>
                  )}
                  <button 
                    type="submit"
                    disabled={!trackingNumber || isSearching}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 cursor-pointer"
                  >
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Track Container'}
                  </button>
                </form>

                {recentSearches.length > 0 && (
                  <div className="mt-8 animate-fade-in-up">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Clock size={14} /> Recent Searches
                    </p>
                    <div className="space-y-2">
                      {recentSearches.map(id => (
                        <button
                          key={id}
                          onClick={() => executeTrack(id)}
                          className="w-full bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 p-3.5 rounded-xl flex items-center justify-between transition-colors group text-left cursor-pointer"
                        >
                          <span className="font-mono text-xs font-bold text-slate-700 group-hover:text-blue-700">{id}</span>
                          <span className="text-[9px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Track &rarr;</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tracking Milestones Timeline */}
            {result && (
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm animate-fade-in-down">
                <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                   <div>
                     <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Waybill</p>
                     <div className="flex items-center gap-2">
                       <p className="text-xs font-bold text-slate-800 font-mono tracking-tight">{result.waybill.tracking_number.toUpperCase()}</p>
                       <button 
                         onClick={() => handleCopyWaybill(result.waybill.tracking_number)}
                         className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-all relative group cursor-pointer"
                         title="Copy tracking number"
                       >
                         {copiedId ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                         {copiedId && (
                           <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl animate-fade-in-down">
                             Copied!
                           </span>
                         )}
                       </button>
                     </div>
                     <p className="text-xs font-bold text-slate-700 mt-1">{result.waybill.origin} &rarr; {result.waybill.destination}</p>
                     <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{result.waybill.container_type}</p>
                   </div>
                   <div className="flex flex-col items-end gap-2 shrink-0">
                     <div className={`border px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                       result.waybill.status === 'In Transit' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                       result.waybill.status === 'Delayed' ? 'bg-red-50 border-red-100 text-red-600' :
                       result.waybill.status === 'Delivered' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                       'bg-blue-50 border-blue-100 text-blue-600'
                     }`}>
                       {result.waybill.status === 'In Transit' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                       {result.waybill.status}
                     </div>
                     <button 
                       onClick={() => { setResult(null); setTrackingNumber(''); }}
                       className="text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors cursor-pointer"
                     >
                       Search Again
                     </button>
                   </div>
                 </div>

                <div className="relative pl-[18px]">
                  {/* Vertical Line */}
                  <div className="absolute left-[19px] top-4 bottom-6 w-0.5 bg-slate-100"></div>

                  {result.milestones.length === 0 ? (
                     <p className="text-xs text-slate-400 py-4 italic text-center">No timeline events recorded yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {result.milestones.map((item: any, index: number) => {
                        const isCompleted = item.status === 'completed'
                        const isCurrent = item.status === 'current'
                        const isPending = item.status === 'pending'
                        const dateObj = new Date(item.timestamp)
                        const timeString = isNaN(dateObj.getTime()) ? 'Pending' : dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

                        return (
                          <div 
                            key={item.id} 
                            className="relative flex items-start gap-4 animate-fade-in-up"
                            style={{ animationDelay: `${index * 120}ms` }}
                          >
                            <div className="relative z-10 flex-shrink-0 mt-0.5 -ml-[18px]">
                              {isCompleted && (
                                <div className="w-8 h-8 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-sm">
                                  <Check size={14} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                              {isCurrent && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 border-[3px] border-white flex items-center justify-center relative shadow-sm">
                                  <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40"></span>
                                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                </div>
                              )}
                              {isPending && (
                                <div className="w-8 h-8 rounded-full bg-slate-100 border-[3px] border-white flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 pb-1">
                              <p className={`text-xs font-bold ${isPending ? 'text-slate-400' : 'text-slate-800'}`}>
                                {item.title}
                              </p>
                              <p className={`text-[10px] font-bold mt-1 ${isPending ? 'text-slate-400' : 'text-blue-600'}`}>
                                {timeString}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <MapPin size={11} className={isPending ? 'text-slate-300' : 'text-slate-400'} />
                                <span className={`text-[10px] font-semibold ${isPending ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {item.location || 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ BOOK FREIGHT TAB ═══════════════ */}
        {activeTab === 'book' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 font-display tracking-tight">Book Freight</h2>
            <p className="text-xs text-slate-500 mb-6">Submit a dry cargo booking request. Our live dispatchers will review it shortly.</p>

            {/* Success Notification */}
            {bookingSuccess && (
              <div className="mb-6 animate-fade-in-down">
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-lg shadow-emerald-100/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Booking Submitted!</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Your request is queued for dispatcher manifest generation.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {bookingError && (
              <div className="mb-6 animate-fade-in-down">
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-red-200 rounded-2xl p-4 shadow-lg shadow-red-100/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50/80 to-rose-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={18} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-800">Booking Failed</p>
                      <p className="text-[10px] text-red-600 font-semibold mt-0.5">{bookingError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Locked Identity Booking Form */}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-violet-50/15 pointer-events-none"></div>
                
                <div className="relative space-y-4">
                  {/* Client Identity Block */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Company Name (Registered)</label>
                    <input
                      type="text"
                      value={bookingForm.client_name}
                      disabled
                      required
                      className="w-full bg-slate-100/80 border border-slate-200/60 rounded-xl py-3 px-4 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Origin */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      <span className="flex items-center gap-1.5"><MapPin size={11} /> Origin Terminal</span>
                    </label>
                    <input
                      type="text"
                      value={bookingForm.origin}
                      onChange={e => setBookingForm(prev => ({ ...prev, origin: e.target.value }))}
                      placeholder="e.g. Manila Port Terminal 3"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                    />
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      <span className="flex items-center gap-1.5"><MapPin size={11} /> Destination Hub</span>
                    </label>
                    <input
                      type="text"
                      value={bookingForm.destination}
                      onChange={e => setBookingForm(prev => ({ ...prev, destination: e.target.value }))}
                      placeholder="e.g. Cavite logistics complex"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                    />
                  </div>

                  {/* Container & Target Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><Package size={11} /> Container Type</span>
                      </label>
                      <div className="relative">
                        <select
                          value={bookingForm.container_type}
                          onChange={e => setBookingForm(prev => ({ ...prev, container_type: e.target.value as any }))}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-xl py-3 px-4 pr-9 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm"
                        >
                          <option value="20-footer">20-footer</option>
                          <option value="40-footer">40-footer</option>
                          <option value="LCL">LCL</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><Calendar size={11} /> Target Date</span>
                      </label>
                      <input
                        type="date"
                        value={bookingForm.target_date}
                        onChange={e => setBookingForm(prev => ({ ...prev, target_date: e.target.value }))}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !bookingForm.origin || !bookingForm.destination || !bookingForm.target_date}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:active:scale-100 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Ship size={14} />
                    Submit Booking Request
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ═══════════════ HELP & SUPPORT TAB ═══════════════ */}
        {activeTab === 'support' && (
          <div className="space-y-6 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2 font-display tracking-tight">Help & Support</h2>
              <p className="text-xs text-slate-500">Find quick guides or submit a support ticket directly to our live Dispatch Command Center.</p>
            </div>

            {/* Accordion FAQ Grid */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frequently Asked Questions</h3>
              
              <div className="space-y-2">
                {faqs.map((faq, idx) => {
                  const isOpen = activeFaq === idx
                  return (
                    <div 
                      key={idx} 
                      className="bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFaq(isOpen ? null : idx)}
                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50/40 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-700 leading-snug">{faq.question}</span>
                        <ChevronDown 
                          size={14} 
                          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} 
                        />
                      </button>
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-40 border-t border-slate-100/50 p-5' : 'max-h-0'}`}>
                        <p className="text-xs text-slate-500 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Helpdesk Form */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submit Live Support Ticket</h3>
              
              {/* Support success message */}
              {supportSuccess && (
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-lg shadow-emerald-100/30 animate-fade-in-down">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Support Ticket Forwarded!</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Dispatcher alerts have received your request for review.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Support error message */}
              {supportError && (
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-red-200 rounded-2xl p-4 shadow-lg shadow-red-100/30 animate-fade-in-down">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50/80 to-rose-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={18} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-800">Submission Failed</p>
                      <p className="text-[10px] text-red-600 font-semibold mt-0.5">{supportError}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="bg-white/60 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/15 to-violet-50/10 pointer-events-none"></div>
                  
                  <div className="relative space-y-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Ticket Subject</label>
                      <input
                        type="text"
                        value={supportForm.subject}
                        onChange={e => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="e.g. Waybill Delay Query or Invoicing issue"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Message / Inquiry Details</label>
                      <textarea
                        rows={4}
                        value={supportForm.message}
                        onChange={e => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Detail the issue or manifest codes here..."
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSupport || !supportForm.subject || !supportForm.message}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:active:scale-100 cursor-pointer animate-pulse-light"
                >
                  {isSubmittingSupport ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending Ticket...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      Submit Support Ticket
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App
