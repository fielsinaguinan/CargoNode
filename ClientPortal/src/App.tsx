import React, { useState } from 'react'
import { Search, MapPin, Truck, Check, Loader2 } from 'lucide-react'

// Mock Data
const milestones = [
  { id: 1, title: 'Manifest Generated', time: 'Aug 14, 08:30 AM', status: 'completed', location: 'Manila Port Area' },
  { id: 2, title: 'Departed Pier', time: 'Aug 14, 10:15 AM', status: 'completed', location: 'Pier 4 Gate' },
  { id: 3, title: 'In Transit (NLEX)', time: 'Aug 14, 11:45 AM', status: 'current', location: 'NLEX Southbound' },
  { id: 4, title: 'Arrived at Drop-off', time: 'Est. 02:00 PM', status: 'pending', location: 'Laguna Warehouse' },
]

function App() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<typeof milestones | null>(null)

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingNumber) return
    setIsSearching(true)
    setResult(null)
    setTimeout(() => {
      setIsSearching(false)
      setResult(milestones)
    }, 1200)
  }

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
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={!trackingNumber || isSearching}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 text-sm font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Track Container'}
            </button>
          </form>
        </div>

        {/* Tracking Timeline */}
        {result && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
               <div>
                 <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Waybill</p>
                 <p className="text-sm font-bold text-slate-800 font-mono tracking-tight">{trackingNumber.toUpperCase()}</p>
               </div>
               <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 In Transit
               </div>
            </div>

            <div className="relative pl-[18px]">
              {/* Vertical Line */}
              <div className="absolute left-[19px] top-4 bottom-6 w-0.5 bg-slate-100"></div>

              <div className="space-y-7">
                {result.map((item, index) => {
                  const isCompleted = item.status === 'completed'
                  const isCurrent = item.status === 'current'
                  const isPending = item.status === 'pending'

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
                          {item.time}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <MapPin size={12} className={isPending ? 'text-slate-300' : 'text-slate-400'} />
                          <span className={`text-[11px] font-medium ${isPending ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App
