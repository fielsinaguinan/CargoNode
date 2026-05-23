import React, { useState, useEffect } from 'react'
import {
  Truck,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  Calendar,
  Copy,
  CheckCheck,
} from 'lucide-react'
import KPICard from '../KPICard'
import PageHeader from '../PageHeader'
import LiveMap from '../LiveMap'
import { supabase } from '../../lib/supabase'

interface Dispatch {
  tracking_number: string
  origin: string
  destination: string
  container_type: string
  status: 'Loading' | 'In Transit' | 'Delayed' | 'Delivered'
  created_at: string
  prime_movers: {
    id: string
  } | null
}

const statusConfig = {
  'In Transit': { label: 'In Transit', color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', dot: 'bg-blue-500' },
  Loading:      { label: 'Loading',    color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' },
  Delayed:      { label: 'Delayed',    color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20', dot: 'bg-red-500' },
  Delivered:    { label: 'Delivered',  color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
}

import type { NavItem } from '../../App'

interface DispatchBoardProps {
  setActiveNav?: (nav: NavItem) => void
}

const DispatchBoard: React.FC<DispatchBoardProps> = ({ setActiveNav }) => {
  const [filter, setFilter] = useState<string>('all')
  const [waybills, setWaybills] = useState<Dispatch[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyWaybill = async (trackNum: string) => {
    try {
      await navigator.clipboard.writeText(trackNum)
      setCopiedId(trackNum)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* silent */ }
  }

  const fetchWaybills = async () => {
    const { data } = await supabase
      .from('waybills')
      .select(`
        tracking_number, origin, destination, container_type, status, created_at,
        prime_movers ( id )
      `)
      .order('created_at', { ascending: false })
    if (data) setWaybills(data as unknown as Dispatch[])
  }

  useEffect(() => {
    fetchWaybills()

    const channel = supabase
      .channel('dispatch_board_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waybills' }, () => {
        fetchWaybills()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = filter === 'all'
    ? waybills
    : waybills.filter((d) => d.status.toLowerCase().replace(' ', '-') === filter)

  // Computed KPIs
  const activeDispatches = waybills.filter(w => w.status === 'Loading' || w.status === 'In Transit').length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deliveriesToday = waybills.filter(w => w.status === 'Delivered' && new Date(w.created_at) >= today).length
  const activeAlerts = waybills.filter(w => w.status === 'Delayed').length
  const totalContainers = waybills.length

  const kpis = [
    { label: 'Active Dispatches', value: activeDispatches.toString(), sub: 'Currently assigned', trend: 'up' as const, icon: <Truck size={18} />, accent: 'from-blue-500 to-indigo-500', iconBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'Deliveries Today', value: deliveriesToday.toString(), sub: 'Since 12:00 AM', trend: 'up' as const, icon: <CheckCircle2 size={18} />, accent: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Active Alerts', value: activeAlerts.toString(), sub: 'Requires action', trend: 'down' as const, icon: <AlertTriangle size={18} />, accent: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { label: 'Total Containers', value: totalContainers.toString(), sub: 'All recorded containers', trend: 'up' as const, icon: <Package size={18} />, accent: 'from-violet-500 to-purple-500', iconBg: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  ]

  return (
    <div className="space-y-7">
      <PageHeader
        title="Dispatch Board"
        subtitle="Real-time fleet dispatch management and route tracking"
        badge={{ label: 'Live', color: 'bg-emerald-500' }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KPICard key={k.label} {...k} />
        ))}
      </div>

      {/* Live Interactive Map */}
      <div className="relative rounded-2xl overflow-hidden h-[420px] shadow-xl border border-slate-200 dark:border-slate-800">
        <LiveMap
          waybills={waybills.map(w => ({
            tracking_number: w.tracking_number,
            prime_mover_id: w.prime_movers?.id ?? null,
            status: w.status,
          }))}
        />
      </div>

      {/* Dispatch table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Table header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Dispatches</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{filtered.length} records shown</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="hidden sm:flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {(['all', 'in-transit', 'loading', 'delayed', 'delivered'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-150',
                    filter === f
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700',
                  ].join(' ')}
                >
                  {f === 'in-transit' ? 'In Transit' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={fetchWaybills} className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                {['Tracking Number', 'Truck Details', 'Route', 'Container', 'Dispatch Date', 'Status', ''].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filtered.map((d) => {
                const cfg = statusConfig[d.status] || { label: d.status, color: 'text-slate-500 bg-slate-100', dot: 'bg-slate-400' }
                return (
                  <tr key={d.tracking_number} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors duration-100 group">
                    {/* ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-blue-600 font-semibold">{d.tracking_number}</span>
                        <button
                          onClick={() => handleCopyWaybill(d.tracking_number)}
                          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all relative"
                          title="Copy tracking number"
                        >
                          {copiedId === d.tracking_number ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          {copiedId === d.tracking_number && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg text-white text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-xl animate-fade-in-down">
                              Copied!
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                    {/* Truck Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                          <Truck size={14} />
                        </div>
                        <div>
                          <p className="text-slate-800 dark:text-slate-200 font-bold text-xs">{d.prime_movers?.id || 'Unassigned'}</p>
                        </div>
                      </div>
                    </td>
                    {/* Route */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <MapPin size={11} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="font-medium">{d.origin}</span>
                        <span className="text-slate-300 dark:text-slate-600">→</span>
                        <span>{d.destination}</span>
                      </div>
                    </td>
                    {/* Container */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Package size={11} className="text-slate-400 dark:text-slate-500" />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{d.container_type}</p>
                      </div>
                    </td>
                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar size={11} />
                        {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    {/* Status badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => setActiveNav?.('waybills')}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all duration-150"
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">Showing {filtered.length} of {waybills.length} records</p>
          <button 
            onClick={() => setActiveNav?.('waybills')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            View all dispatches
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DispatchBoard
