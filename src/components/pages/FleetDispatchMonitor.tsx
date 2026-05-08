import React, { useEffect, useState } from 'react'
import {
  Truck,
  Package,
  Wrench,
  Wifi,
  MapPin,
  Clock,
  Navigation,
  Activity,
  MoreHorizontal,
  ChevronRight,
  ArrowRight,
  Loader2
} from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'

// Mapping themes for KPIs
const themeMap: Record<string, { bg: string, text: string, borderTop: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', borderTop: 'border-t-emerald-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', borderTop: 'border-t-blue-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', borderTop: 'border-t-amber-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', borderTop: 'border-t-violet-500' },
}

// Styling for different status badges
const statusStyles: Record<string, string> = {
  'In Transit': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Pier Standby': 'bg-amber-100 text-amber-800 border-amber-200',
  'Delayed': 'bg-red-100 text-red-800 border-red-200',
  'Loading': 'bg-blue-100 text-blue-800 border-blue-200',
  'Signal Lost': 'bg-slate-200 text-slate-800 border-slate-300',
  'Approaching Pier': 'bg-blue-100 text-blue-800 border-blue-200',
  'Arriving': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Delivered': 'bg-slate-100 text-slate-600 border-slate-200',
  'Maintenance': 'bg-amber-100 text-amber-800 border-amber-200',
}

const FleetDispatchMonitor: React.FC = () => {
  const [movers, setMovers] = useState<any[]>([])
  const [waybills, setWaybills] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // We skip error handling for brevity in this demo, but normally would handle it.
      const { data: moversData } = await supabase.from('prime_movers').select('*')
      const { data: waybillsData } = await supabase.from('waybills').select('*')
      const { data: alertsData } = await supabase.from('maintenance_alerts').select('*').eq('status', 'Pending')

      if (moversData) setMovers(moversData)
      if (waybillsData) setWaybills(waybillsData)
      if (alertsData) setAlerts(alertsData)
      setLoading(false)
    }

    fetchData()

    // Realtime Subscriptions
    const channel = supabase.channel('fleet_updates')
      .on('postgres', { event: '*', schema: 'public', table: 'prime_movers' }, () => fetchData())
      .on('postgres', { event: '*', schema: 'public', table: 'waybills' }, () => fetchData())
      .on('postgres', { event: '*', schema: 'public', table: 'maintenance_alerts' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Derived KPI Data
  const activeMoversCount = movers.filter(m => m.status === 'In Transit' || m.status === 'Pier Standby').length
  const transitWaybillsCount = waybills.filter(w => w.status === 'In Transit').length
  
  const kpis = [
    { label: 'Active Prime Movers', value: activeMoversCount.toString(), sub: `Out of ${movers.length} total`, icon: <Truck size={18} />, colorTheme: 'emerald' },
    { label: 'Containers in Transit', value: transitWaybillsCount.toString(), sub: 'Live tracking active', icon: <Package size={18} />, colorTheme: 'blue' },
    { label: 'Maintenance Alerts', value: alerts.length.toString(), sub: 'Requires attention', icon: <Wrench size={18} />, colorTheme: 'amber' },
    { label: 'Sync Status', value: 'Optimal', sub: 'Realtime active', icon: <Wifi size={18} />, colorTheme: 'violet' },
  ]

  // Derived List Data
  const incomingFleet = movers
    .filter(m => m.status === 'In Transit' || m.status === 'Pier Standby')
    .slice(0, 4) // Show top 4
    .map((m, i) => ({
      id: m.id,
      driver: `Driver ${String.fromCharCode(65 + i)}`, // Mock initials A, B, C...
      location: m.current_location || 'Unknown Route',
      eta: m.status === 'Pier Standby' ? 'Standby' : 'Live Tracking',
      status: m.status
    }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-500">Connecting to Supabase Realtime...</p>
      </div>
    )
  }

  return (
    <div className="space-y-7 animate-fade-in-down">
      <PageHeader
        title="Fleet Dispatch Monitor"
        subtitle="Command center for live prime mover tracking and container logistics"
        badge={{ label: 'Live Data', color: 'bg-emerald-500' }}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
              <Activity size={14} className="text-blue-500" />
              System Diagnostics
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900 shadow-sm hover:bg-slate-800 transition-colors">
              <MapPin size={14} />
              Full Map View
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const theme = themeMap[k.colorTheme]
          return (
            <div key={k.label} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 card-hover relative overflow-hidden border-t-2 ${theme.borderTop}`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.bg} ${theme.text} flex-shrink-0`}>
                  {k.icon}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 tracking-tight font-[Plus_Jakarta_Sans,sans-serif]">
                  {k.value}
                </p>
                <p className="text-xs font-medium text-slate-600 mt-0.5">{k.label}</p>
                <p className="text-[11px] text-slate-400 mt-1">{k.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Map & Incoming Fleet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Section */}
        <div className="lg:col-span-2 relative bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden h-80 flex flex-col">
          {/* Simulated Map Background */}
          <div className="absolute inset-0 bg-[#0a192f] opacity-90"
            style={{
              backgroundImage: 'radial-gradient(#1e3a8a 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}
          />
          {/* Decorative Map Elements */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
            <path d="M100,300 C250,250 350,100 500,150 C650,200 700,50 800,100" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="4 4" opacity="0.4" />
            <path d="M50,150 C200,200 400,50 600,250 C700,350 750,200 800,250" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="4 4" opacity="0.4" />
            {/* Markers */}
            <circle cx="500" cy="150" r="6" fill="#3b82f6" className="animate-pulse" />
            <circle cx="600" cy="250" r="6" fill="#10b981" className="animate-pulse" />
            <circle cx="350" cy="100" r="6" fill="#f59e0b" className="animate-pulse" />
          </svg>

          {/* Glassmorphism Overlay Top Left */}
          <div className="absolute top-4 left-4">
             <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl flex items-center gap-3">
               <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
               </div>
               <div>
                 <p className="text-white text-xs font-semibold tracking-wide">Live GPS Tracking</p>
                 <p className="text-slate-400 text-[10px]">GPS Interval: 30s</p>
               </div>
             </div>
          </div>
          
          {/* Radar Sweep Effect (decorative) */}
          <div className="absolute top-1/2 left-1/2 w-96 h-96 -ml-48 -mt-48 rounded-full border border-blue-500/20 shadow-[inset_0_0_50px_rgba(59,130,246,0.1)] pointer-events-none"></div>

          {/* Center Title overlay */}
          <div className="relative z-10 m-auto text-center pointer-events-none">
            <Navigation size={32} className="text-blue-400 mx-auto mb-3 opacity-80" />
            <h3 className="text-white font-bold tracking-widest uppercase text-sm">Central Dispatch Sector</h3>
            <p className="text-slate-400 text-xs mt-1">Monitoring {activeMoversCount} active coordinates</p>
          </div>
        </div>

        {/* Incoming Fleet Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-80">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Incoming Fleet</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Next 60 minutes</p>
            </div>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto p-5 relative">
             {/* Timeline line */}
             <div className="absolute left-[33px] top-6 bottom-6 w-px bg-slate-100" />
             
             {incomingFleet.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                   <Truck size={24} className="mb-2 opacity-50" />
                   <p className="text-xs font-medium">No incoming fleet detected.</p>
                </div>
             ) : (
                <div className="space-y-6">
                  {incomingFleet.map((fleet, i) => (
                    <div key={fleet.id} className="relative flex gap-4 group animate-fade-in-down" style={{animationDelay: `${i * 100}ms`}}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 bg-white border-2 ${i === 0 ? 'border-emerald-500 text-emerald-500' : 'border-blue-500 text-blue-500'}`}>
                          <Truck size={12} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between">
                            <p className="text-xs font-bold text-slate-800">{fleet.id}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {fleet.eta}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <MapPin size={10} className="text-slate-400" />
                            {fleet.location}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center">
                              {fleet.driver.charAt(0)}
                            </span>
                            <span className="text-[10px] text-slate-500">{fleet.driver}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{fleet.status}</span>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
          <button className="w-full py-2.5 text-xs font-semibold text-blue-600 hover:bg-slate-50 border-t border-slate-100 transition-colors">
            View Full Schedule
          </button>
        </div>
      </div>

      {/* Dispatch Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-white to-slate-50">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Live Dispatch Roster</h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time status of deployed assets synchronized via Supabase</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Connection
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Prime Mover ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Waybill / Container</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Route Assignment</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Live Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {waybills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No active dispatches found in the database.
                  </td>
                </tr>
              ) : waybills.map((row) => (
                <tr key={row.tracking_number} className="hover:bg-slate-50 transition-colors duration-150 group">
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 shadow-sm">
                        <Truck size={14} />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700">{row.prime_mover_id || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                     <div className="flex flex-col">
                       <span className="font-mono text-[11px] font-bold text-blue-600">{row.tracking_number}</span>
                       <div className="flex items-center gap-1.5 mt-0.5">
                         <Package size={11} className="text-slate-400" />
                         <span className="text-[11px] font-medium text-slate-500">{row.container_type}</span>
                       </div>
                     </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <MapPin size={12} className="text-blue-500 opacity-70" />
                      {row.origin} 
                      <ArrowRight size={10} className="mx-1 text-slate-300" />
                      {row.destination}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyles[row.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal size={15} />
                    </button>
                    <button className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100">
                      <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default FleetDispatchMonitor
