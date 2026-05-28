import React, { useEffect, useState } from 'react'
import {
  Truck,
  Package,
  Wrench,
  Wifi,
  MapPin,
  Activity,
  MoreHorizontal,
  ChevronRight,
  ArrowRight,
  Loader2,
  User,
  Zap,
  Link2,
} from 'lucide-react'
import PageHeader from '../PageHeader'
import LiveMap from '../LiveMap'
import { supabase } from '../../lib/supabase'
import SystemDiagnosticsPanel from '../SystemDiagnosticsPanel'
import { useAuth } from '../../contexts/AuthContext'

// Mapping themes for KPIs
const themeMap: Record<string, { bg: string, text: string, borderTop: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', borderTop: 'border-t-emerald-500' },
  blue: { bg: 'bg-primary/10', text: 'text-primary', borderTop: 'border-t-primary' },
  amber: { bg: 'bg-accent/10', text: 'text-accent', borderTop: 'border-t-accent' },
  violet: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', borderTop: 'border-t-indigo-500' },
}

// Styling for different status badges
const statusStyles: Record<string, string> = {
  'In Transit': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Pier Standby': 'bg-accent/10 text-accent border-accent/20',
  'Delayed': 'bg-destructive/10 text-destructive border-destructive/20',
  'Loading': 'bg-primary/10 text-primary border-primary/20',
  'Signal Lost': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  'Approaching Pier': 'bg-primary/10 text-primary border-primary/20',
  'Arriving': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Delivered': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Maintenance': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

import type { NavItem } from '../../App'

interface FleetDispatchMonitorProps {
  setActiveNav?: (nav: NavItem) => void
}

const FleetDispatchMonitor: React.FC<FleetDispatchMonitorProps> = ({ setActiveNav }) => {
  const { userRole } = useAuth()
  const [movers, setMovers] = useState<any[]>([])
  const [waybills, setWaybills] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [diagOpen, setDiagOpen] = useState(false)

  // Pairing state
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [pairingToast, setPairingToast] = useState('')

  // Roster tab
  const [rosterTab, setRosterTab] = useState<'drivers' | 'trucks'>('drivers')

  useEffect(() => {
    const fetchData = async () => {
      // We skip error handling for brevity in this demo, but normally would handle it.
      const { data: moversData } = await supabase.from('prime_movers').select('*')
      const { data: waybillsData } = await supabase.from('waybills').select('*')
      const { data: alertsData } = await supabase.from('maintenance_alerts').select('*').eq('status', 'Pending')
      const { data: driversData } = await supabase.from('drivers').select('*')

      if (moversData) setMovers(moversData)
      if (waybillsData) setWaybills(waybillsData)
      if (alertsData) setAlerts(alertsData)
      if (driversData) setDrivers(driversData)
      setLoading(false)
    }

    fetchData()

    // Realtime Subscriptions
    const channel = supabase.channel('fleet_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prime_movers' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waybills' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_alerts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchData())
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
    ...(userRole !== 'Maintenance' ? [{ label: 'Containers in Transit', value: transitWaybillsCount.toString(), sub: 'Live tracking active', icon: <Package size={18} />, colorTheme: 'blue' }] : []),
    { label: 'Maintenance Alerts', value: alerts.length.toString(), sub: 'Requires attention', icon: <Wrench size={18} />, colorTheme: 'amber' },
    { label: 'Sync Status', value: 'Optimal', sub: 'Realtime active', icon: <Wifi size={18} />, colorTheme: 'violet' },
  ]

  // Derived roster data
  const clockedInDrivers = drivers.filter(d => d.status === 'Available' || d.status === 'On Shift')
  const standbyTrucks = movers.filter(m => m.status === 'Pier Standby')

  const handlePairDispatch = async () => {
    if (!selectedDriver || !selectedTruck) return
    setPairingLoading(true)
    try {
      // 1. Update driver: set status to 'On Shift' and bind prime_mover_id
      await supabase
        .from('drivers')
        .update({ status: 'On Shift', prime_mover_id: selectedTruck })
        .eq('id', selectedDriver)

      // 2. Update truck: set status to 'Active'
      await supabase
        .from('prime_movers')
        .update({ status: 'Active' })
        .eq('id', selectedTruck)

      // 3. Optionally assign any pending Loading waybill to this truck
      const loadingWaybill = waybills.find(w => w.status === 'Loading' && !w.prime_mover_id)
      if (loadingWaybill) {
        await supabase
          .from('waybills')
          .update({ prime_mover_id: selectedTruck })
          .eq('tracking_number', loadingWaybill.tracking_number)
      }

      // 4. Create notification
      const driverObj = drivers.find(d => d.id === selectedDriver)
      await supabase.from('notifications').insert([{
        type: 'success',
        title: 'Dispatch Pairing Confirmed',
        description: `${driverObj?.full_name || 'Driver'} paired with ${selectedTruck}${loadingWaybill ? ` — assigned ${loadingWaybill.tracking_number}` : ''}.`,
      }])

      setPairingToast(`✓ ${driverObj?.full_name} paired with ${selectedTruck}`)
      setSelectedDriver(null)
      setSelectedTruck(null)
      setTimeout(() => setPairingToast(''), 3000)
    } catch (e) {
      console.error('Pairing error:', e)
      setPairingToast('Failed to complete pairing')
      setTimeout(() => setPairingToast(''), 3000)
    } finally {
      setPairingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Connecting to Supabase Realtime...</p>
      </div>
    )
  }

  return (
    <div className="space-y-7 animate-fade-in-down">
      {/* Pairing Toast */}
      {pairingToast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in-down">
          <div className="bg-slate-900/90 backdrop-blur-xl text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2">
            <Zap size={14} className="text-emerald-400" />
            {pairingToast}
          </div>
        </div>
      )}

      <PageHeader
        title="Fleet Dispatch Monitor"
        subtitle="Command center for live prime mover tracking and container logistics"
        badge={{ label: 'Live Data', color: 'bg-emerald-500' }}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setDiagOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Activity size={14} className="text-blue-500" />
              System Diagnostics
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const theme = themeMap[k.colorTheme]
          return (
            <div key={k.label} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5 card-hover relative overflow-hidden border-t-2 ${theme.borderTop} transition-all duration-200`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.bg} ${theme.text} flex-shrink-0`}>
                  {k.icon}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight font-display">
                  {k.value}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">{k.label}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{k.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Map & Live Availability Roster Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Section */}
        <div className={`relative bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden h-80 flex flex-col ${userRole === 'Maintenance' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <LiveMap
            waybills={waybills.map(w => ({
              tracking_number: w.tracking_number,
              prime_mover_id: w.prime_mover_id,
              status: w.status,
            }))}
          />
        </div>

        {/* Live Availability Roster & Pairing Interface */}
        {userRole !== 'Maintenance' && (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden flex flex-col h-80 transition-all duration-200">
          <div className="px-5 py-4 border-b border-slate-100/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-display">Availability Roster</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Select to pair</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 px-2.5 py-1 rounded-full font-bold border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot"></div>
                LIVE
              </div>
            </div>
            {/* Roster Tabs */}
            <div className="flex gap-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-0.5 backdrop-blur-sm">
              <button
                onClick={() => setRosterTab('drivers')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${rosterTab === 'drivers' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-300'}`}
              >
                <User size={11} className="inline mr-1" />
                Drivers ({clockedInDrivers.length})
              </button>
              <button
                onClick={() => setRosterTab('trucks')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${rosterTab === 'trucks' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-300'}`}
              >
                <Truck size={11} className="inline mr-1" />
                Trucks ({standbyTrucks.length})
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {rosterTab === 'drivers' ? (
              clockedInDrivers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <User size={24} className="mb-2 opacity-50" />
                  <p className="text-xs font-medium">No drivers clocked in.</p>
                </div>
              ) : (
                clockedInDrivers.map(d => (
                  <button
                    key={d.id}
                    onClick={() => d.status === 'Available' && setSelectedDriver(selectedDriver === d.id ? null : d.id)}
                    disabled={d.status !== 'Available'}
                    className={[
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left cursor-pointer',
                      selectedDriver === d.id
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : d.status === 'Available'
                          ? 'border-slate-200/50 dark:border-slate-700/50 hover:border-primary/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                          : 'border-slate-200/50 dark:border-slate-700/50 opacity-50 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      d.status === 'Available' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
                    }`}>
                      {d.full_name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-display">{d.full_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{d.email}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      d.status === 'Available' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
                    }`}>
                      {d.status}
                    </span>
                  </button>
                ))
              )
            ) : (
              standbyTrucks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <Truck size={24} className="mb-2 opacity-50" />
                  <p className="text-xs font-medium">No standby trucks.</p>
                </div>
              ) : (
                standbyTrucks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTruck(selectedTruck === t.id ? null : t.id)}
                    className={[
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left cursor-pointer',
                      selectedTruck === t.id
                        ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                        : 'border-slate-200/50 dark:border-slate-700/50 hover:border-accent/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50',
                    ].join(' ')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                      <Truck size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{t.id}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <MapPin size={9} /> {t.current_location || 'Terminal'}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      Standby
                    </span>
                  </button>
                ))
              )
            )}
          </div>

          {/* Pairing Action Bar */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
            {selectedDriver && selectedTruck ? (
              <button
                onClick={handlePairDispatch}
                disabled={pairingLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {pairingLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                Confirm Pairing / Assign Shift
              </button>
            ) : (
              <div className="text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {!selectedDriver && !selectedTruck
                    ? 'Select a driver and a truck to pair'
                    : selectedDriver && !selectedTruck
                      ? '✓ Driver selected — now select a truck'
                      : '✓ Truck selected — now select a driver'}
                </p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Dispatch Data Table */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-200">
        <div className="px-6 py-4 border-b border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-display">Live Dispatch Roster</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time status of deployed assets synchronized via Supabase</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-2 text-[11px] text-primary bg-primary/10 px-3 py-1.5 rounded-full font-bold border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot"></div> LIVE CONNECTION
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/20">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Prime Mover ID</th>
                {userRole !== 'Maintenance' && <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Waybill / Container</th>}
                {userRole !== 'Maintenance' && <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Route Assignment</th>}
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Live Status</th>
                {userRole !== 'Maintenance' && <th className="px-4 py-3.5"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {waybills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No active dispatches found in the database.
                  </td>
                </tr>
              ) : waybills.map((row) => (
                <tr key={row.tracking_number} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200 group">
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                        <Truck size={14} />
                      </div>
                      <span className="font-mono text-[13px] font-bold text-slate-700 dark:text-slate-300">{row.prime_mover_id || 'Unassigned'}</span>
                    </div>
                  </td>
                  {userRole !== 'Maintenance' && (
                    <td className="px-6 py-3.5 whitespace-nowrap">
                       <div className="flex flex-col">
                         <span className="font-mono text-[11px] font-bold text-primary">{row.tracking_number}</span>
                         <div className="flex items-center gap-1.5 mt-0.5">
                           <Package size={11} className="text-slate-400 dark:text-slate-500" />
                           <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{row.container_type}</span>
                         </div>
                       </div>
                    </td>
                  )}
                  {userRole !== 'Maintenance' && (
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                        <MapPin size={12} className="text-primary opacity-80" />
                        {row.origin} 
                        <ArrowRight size={10} className="mx-1 text-slate-300 dark:text-slate-600" />
                        {row.destination}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyles[row.status] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                      {row.status}
                    </span>
                  </td>
                  {userRole !== 'Maintenance' && (
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button 
                        onClick={() => setActiveNav?.('waybills')}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      <button 
                        onClick={() => setActiveNav?.('waybills')}
                        className="ml-1 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SystemDiagnosticsPanel open={diagOpen} onClose={() => setDiagOpen(false)} />
    </div>
  )
}

export default FleetDispatchMonitor
