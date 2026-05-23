import React, { useState, useEffect } from 'react'
import { Search, MapPin, Truck, Check, Loader2, AlertCircle, Clock, Copy, CheckCheck, Ship, Calendar, ChevronDown, Package } from 'lucide-react'
import { supabase } from './lib/supabase'

function App() {
  const [activeTab, setActiveTab] = useState<'track' | 'book'>('track')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<{ waybill: any, milestones: any[] } | null>(null)
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('cargonode_recent_searches')
    return saved ? JSON.parse(saved) : []
  })
  // Copy toast state
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
    if (!bookingForm.client_name || !bookingForm.origin || !bookingForm.destination || !bookingForm.target_date) return
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('customer_bookings').insert([{
        client_name: bookingForm.client_name,
        origin: bookingForm.origin,
        destination: bookingForm.destination,
        container_type: bookingForm.container_type,
        target_date: new Date(bookingForm.target_date).toISOString(),
        status: 'Pending',
      }])
      if (error) throw error
      setBookingSuccess(true)
      setBookingForm({ client_name: '', origin: '', destination: '', container_type: '20-footer', target_date: '' })
      setTimeout(() => setBookingSuccess(false), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
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
         // Re-fetch milestones if they change
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


  return (
    <div className="max-w-[420px] mx-auto min-h-screen bg-slate-50 shadow-2xl relative flex flex-col overflow-hidden border-x border-slate-200">
      
      {/* Header */}
      <header className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
            <Truck size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
             <h1 className="text-base font-bold text-slate-900 leading-none font-[Plus_Jakarta_Sans,sans-serif] tracking-tight">CargoNode</h1>
             <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Client Portal</p>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="sticky top-[65px] z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-2">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button
            onClick={() => { setActiveTab('track'); setResult(null); setError(''); }}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200',
              activeTab === 'track'
                ? 'bg-white text-blue-600 shadow-sm shadow-blue-100'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <Search size={14} />
            Track Cargo
          </button>
          <button
            onClick={() => { setActiveTab('book'); setResult(null); setError(''); }}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200',
              activeTab === 'book'
                ? 'bg-white text-blue-600 shadow-sm shadow-blue-100'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <Ship size={14} />
            Book Freight
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-5 py-8">
        
        {/* ═══════════════ TRACK TAB ═══════════════ */}
        {activeTab === 'track' && (
          <>
            {/* Search Section */}
            {!result && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2 font-[Plus_Jakarta_Sans,sans-serif] tracking-tight">Track Cargo</h2>
                <p className="text-sm text-slate-500 mb-6">Enter your waybill or container number for live updates.</p>
                
                <form onSubmit={handleTrack} className="space-y-4">
                  <div className="relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                    <input 
                      type="text" 
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Waybill Tracking Number" 
                      className={`w-full bg-white border ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'} rounded-2xl py-4 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-4 transition-all shadow-sm`}
                    />
                  </div>
                  {error && (
                     <p className="text-xs text-red-500 font-medium flex items-start gap-1.5 animate-fade-in-down">
                       <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                     </p>
                  )}
                  <button 
                    type="submit"
                    disabled={!trackingNumber || isSearching}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                  >
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Track Container'}
                  </button>
                </form>

                {recentSearches.length > 0 && (
                  <div className="mt-8 animate-fade-in-up">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Clock size={14} /> Recent Searches
                    </p>
                    <div className="space-y-2">
                      {recentSearches.map(id => (
                        <button
                          key={id}
                          onClick={() => executeTrack(id)}
                          className="w-full bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 p-3 rounded-xl flex items-center justify-between transition-colors group text-left"
                        >
                          <span className="font-mono text-sm font-bold text-slate-700 group-hover:text-blue-700">{id}</span>
                          <span className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Track &rarr;</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tracking Timeline */}
            {result && (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm animate-[slide-up_0.3s_ease-out]">
                <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                   <div>
                     <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Waybill</p>
                     <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-slate-800 font-mono tracking-tight">{result.waybill.tracking_number.toUpperCase()}</p>
                       {/* Quick-Copy Icon */}
                       <button 
                         onClick={() => handleCopyWaybill(result.waybill.tracking_number)}
                         className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-all relative group"
                         title="Copy tracking number"
                       >
                         {copiedId ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                         {/* Micro-feedback toast */}
                         {copiedId && (
                           <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg text-white text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap shadow-xl animate-fade-in-down">
                             Copied!
                           </span>
                         )}
                       </button>
                     </div>
                     <p className="text-xs font-semibold text-slate-700 mt-1">{result.waybill.origin} &rarr; {result.waybill.destination}</p>
                     <p className="text-[10px] text-slate-500 font-medium mt-0.5">Client: {result.waybill.client_name} | {result.waybill.container_type}</p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <div className={`border px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
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
                       className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors"
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
                    <div className="space-y-7">
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
                            style={{ opacity: 0, animationDelay: `${index * 150}ms` }}
                          >
                            {/* Node */}
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

                            {/* Content */}
                            <div className="flex-1 pb-1">
                              <p className={`text-sm font-bold ${isPending ? 'text-slate-400' : 'text-slate-800'}`}>
                                {item.title}
                              </p>
                              <p className={`text-[11px] font-semibold mt-1 ${isPending ? 'text-slate-400' : 'text-blue-600'}`}>
                                {timeString}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <MapPin size={12} className={isPending ? 'text-slate-300' : 'text-slate-400'} />
                                <span className={`text-[11px] font-medium ${isPending ? 'text-slate-400' : 'text-slate-500'}`}>
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
            <h2 className="text-2xl font-bold text-slate-800 mb-2 font-[Plus_Jakarta_Sans,sans-serif] tracking-tight">Book Freight</h2>
            <p className="text-sm text-slate-500 mb-6">Submit a cargo booking request and our dispatch team will process it.</p>

            {/* Success Toast */}
            {bookingSuccess && (
              <div className="mb-6 animate-fade-in-down">
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-lg shadow-emerald-100/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Booking Submitted!</p>
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Your request is pending review by our dispatch team.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Glassmorphic Booking Form */}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-violet-50/20 pointer-events-none"></div>
                
                <div className="relative space-y-4">
                  {/* Client Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Company / Client Name</label>
                    <input
                      type="text"
                      value={bookingForm.client_name}
                      onChange={e => setBookingForm(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="e.g. NexaCorp Logistics Inc."
                      required
                      className="w-full bg-white/80 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {/* Origin */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      <span className="flex items-center gap-1.5"><MapPin size={12} /> Origin</span>
                    </label>
                    <input
                      type="text"
                      value={bookingForm.origin}
                      onChange={e => setBookingForm(prev => ({ ...prev, origin: e.target.value }))}
                      placeholder="e.g. Manila Port Area"
                      required
                      className="w-full bg-white/80 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      <span className="flex items-center gap-1.5"><MapPin size={12} /> Destination</span>
                    </label>
                    <input
                      type="text"
                      value={bookingForm.destination}
                      onChange={e => setBookingForm(prev => ({ ...prev, destination: e.target.value }))}
                      placeholder="e.g. Laguna Warehouse"
                      required
                      className="w-full bg-white/80 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {/* Cargo Type + Target Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><Package size={12} /> Cargo Type</span>
                      </label>
                      <div className="relative">
                        <select
                          value={bookingForm.container_type}
                          onChange={e => setBookingForm(prev => ({ ...prev, container_type: e.target.value as any }))}
                          className="w-full appearance-none bg-white/80 border border-slate-200 rounded-xl py-3 px-4 pr-9 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                        >
                          <option value="20-footer">20-footer</option>
                          <option value="40-footer">40-footer</option>
                          <option value="LCL">LCL</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><Calendar size={12} /> Target Date</span>
                      </label>
                      <input
                        type="date"
                        value={bookingForm.target_date}
                        onChange={e => setBookingForm(prev => ({ ...prev, target_date: e.target.value }))}
                        required
                        className="w-full bg-white/80 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !bookingForm.client_name || !bookingForm.origin || !bookingForm.destination || !bookingForm.target_date}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Ship size={16} />
                    Submit Booking Request
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  )
}

export default App
