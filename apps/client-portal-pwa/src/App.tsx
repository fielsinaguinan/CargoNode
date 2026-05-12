import React, { useState, useEffect } from 'react'
import { Search, MapPin, Truck, Check, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from './lib/supabase'

function App() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<{ waybill: any, milestones: any[] } | null>(null)
  const [error, setError] = useState('')

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingNumber) return
    setIsSearching(true)
    setResult(null)
    setError('')
    
    try {
      // 1. Fetch Waybill (Public Read enabled via RLS)
      const { data: waybill, error: waybillError } = await supabase
        .from('waybills')
        .select('*')
        .eq('tracking_number', trackingNumber.toUpperCase())
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
    } catch (err) {
      console.error(err)
      setError('We could not find a dispatch manifest with that tracking number. Please check and try again.')
    } finally {
      setIsSearching(false)
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-5 py-8">
        
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
          </div>
        )}

        {/* Tracking Timeline */}
        {result && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm animate-[slide-up_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
               <div>
                 <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Waybill</p>
                 <p className="text-sm font-bold text-slate-800 font-mono tracking-tight">{result.waybill.tracking_number.toUpperCase()}</p>
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

      </main>
    </div>
  )
}

export default App
