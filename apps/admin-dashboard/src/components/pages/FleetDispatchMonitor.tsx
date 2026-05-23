import React, { useEffect, useState } from 'react'
import {
  Truck,
  Package,
  Wrench,
  Wifi,
  MapPin,
  Navigation,
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
import { supabase } from '../../lib/supabase'
import SystemDiagnosticsPanel from '../SystemDiagnosticsPanel'
import { useAuth } from '../../contexts/AuthContext'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Generate consistent coordinates for movers around Manila Port
const manilaCoords: [number, number] = [14.5995, 120.9842]
const getCoordForMover = (id: string): [number, number] => {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  const latOffset = ((hash % 100) / 100 - 0.5) * 0.1
  const lngOffset = (((hash >> 2) % 100) / 100 - 0.5) * 0.1
  return [manilaCoords[0] + latOffset, manilaCoords[1] + lngOffset]
}

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
  'Signal Lost': 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  'Approaching Pier': 'bg-blue-100 text-blue-800 border-blue-200',
  'Arriving': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Delivered': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  'Maintenance': 'bg-amber-100 text-amber-800 border-amber-200',
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
            <div key={k.label} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 card-hover relative overflow-hidden border-t-2 ${theme.borderTop}`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.bg} ${theme.text} flex-shrink-0`}>
                  {k.icon}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight font-[Plus_Jakarta_Sans,sans-serif]">
                  {k.value}
                </p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{k.label}</p>
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
          <MapContainer 
            center={manilaCoords} 
            zoom={11} 
            className="w-full h-full z-0"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {movers.map(mover => (
              <Marker key={mover.id} position={getCoordForMover(mover.id)}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 mb-1">{mover.id}</p>
                    <p className="text-slate-500 mb-1">Status: <span className="font-semibold">{mover.status}</span></p>
                    <p className="text-slate-500">Location: {mover.current_location || 'Terminal'}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Glassmorphism Overlay Top Left */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
             <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-xl flex items-center gap-3">
               <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
               </div>
               <div>
                 <p className="text-slate-900 dark:text-white text-xs font-semibold tracking-wide">Live GPS Tracking</p>
                 <p className="text-slate-500 dark:text-slate-400 text-[10px]">Active Monitors: {activeMoversCount}</p>
               </div>
             </div>
          </div>
        </div>

        {/* Live Availability Roster & Pairing Interface */}
        {userRole !== 'Maintenance' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-80">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Availability Roster</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Select to pair</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Live
              </div>
            </div>
            {/* Roster Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setRosterTab('drivers')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${rosterTab === 'drivers' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
              >
                <User size={11} className="inline mr-1" />
                Drivers ({clockedInDrivers.length})
              </button>
              <button
                onClick={() => setRosterTab('trucks')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${rosterTab === 'trucks' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
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
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      selectedDriver === d.id
                        ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-400/30'
                        : d.status === 'Available'
                          ? 'border-slate-100 dark:border-slate-800 hover:border-blue-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                          : 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      d.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {d.full_name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{d.full_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{d.email}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      d.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
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
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      selectedTruck === t.id
                        ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-400/30'
                        : 'border-slate-100 dark:border-slate-800 hover:border-amber-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer',
                    ].join(' ')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                      <Truck size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.id}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <MapPin size={9} /> {t.current_location || 'Terminal'}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-b from-white to-slate-50">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Live Dispatch Roster</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time status of deployed assets synchronized via Supabase</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Connection
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Prime Mover ID</th>
                {userRole !== 'Maintenance' && <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Waybill / Container</th>}
                {userRole !== 'Maintenance' && <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Route Assignment</th>}
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Live Status</th>
                {userRole !== 'Maintenance' && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {waybills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No active dispatches found in the database.
                  </td>
                </tr>
              ) : waybills.map((row) => (
                <tr key={row.tracking_number} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150 group">
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 flex-shrink-0 shadow-sm">
                        <Truck size={14} />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{row.prime_mover_id || 'Unassigned'}</span>
                    </div>
                  </td>
                  {userRole !== 'Maintenance' && (
                    <td className="px-6 py-3.5 whitespace-nowrap">
                       <div className="flex flex-col">
                         <span className="font-mono text-[11px] font-bold text-blue-600">{row.tracking_number}</span>
                         <div className="flex items-center gap-1.5 mt-0.5">
                           <Package size={11} className="text-slate-400 dark:text-slate-500" />
                           <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{row.container_type}</span>
                         </div>
                       </div>
                    </td>
                  )}
                  {userRole !== 'Maintenance' && (
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <MapPin size={12} className="text-blue-500 opacity-70" />
                        {row.origin} 
                        <ArrowRight size={10} className="mx-1 text-slate-300" />
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
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      <button 
                        onClick={() => setActiveNav?.('waybills')}
                        className="ml-1 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
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
