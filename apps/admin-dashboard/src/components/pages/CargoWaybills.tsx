import React, { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Plus,
  Search,
  MapPin,
  Calendar,
  Package,
  ArrowUpRight,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  Copy,
  CheckCheck,
} from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'
import type { NavItem } from '../../App'

interface Waybill {
  tracking_number: string
  client_name: string
  origin: string
  destination: string
  container_type: string
  status: 'Loading' | 'In Transit' | 'Delayed' | 'Delivered'
  prime_mover_id: string
  created_at: string
}

const statusCfg = {
  Delivered:   { label: 'Delivered',   color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: <CheckCircle2 size={12} /> },
  'In Transit': { label: 'In Transit', color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',           icon: <Clock size={12} /> },
  Loading:     { label: 'Loading',     color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',        icon: <Package size={12} /> },
  Delayed:     { label: 'Delayed',     color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',               icon: <AlertTriangle size={12} /> },
}

interface CargoWaybillsProps {
  setActiveNav?: (nav: NavItem) => void
}

const CargoWaybills: React.FC<CargoWaybillsProps> = ({ setActiveNav }) => {
  const [waybills, setWaybills] = useState<Waybill[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyWaybill = async (trackNum: string) => {
    try {
      await navigator.clipboard.writeText(trackNum)
      setCopiedId(trackNum)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* silent */ }
  }

  useEffect(() => {
    const fetchWaybills = async () => {
      const { data } = await supabase
        .from('waybills')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setWaybills(data as Waybill[])
    }

    fetchWaybills()

    const channel = supabase
      .channel('waybills_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waybills' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setWaybills(prev => [payload.new as Waybill, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setWaybills(prev => prev.map(w => w.tracking_number === payload.new.tracking_number ? payload.new as Waybill : w))
        } else if (payload.eventType === 'DELETE') {
          setWaybills(prev => prev.filter(w => w.tracking_number !== payload.old.tracking_number))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = waybills.filter(
    (w) =>
      w.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
      w.client_name.toLowerCase().includes(search.toLowerCase()) ||
      w.origin.toLowerCase().includes(search.toLowerCase()) ||
      w.destination.toLowerCase().includes(search.toLowerCase()) ||
      w.prime_mover_id?.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleExport = () => {
    if (waybills.length === 0) return
    const headers = ['Tracking Number', 'Origin', 'Destination', 'Client Name', 'Container Type', 'Prime Mover ID', 'Status', 'Date']
    const rows = waybills.map(w => [
      w.tracking_number, 
      `"${w.origin}"`, 
      `"${w.destination}"`, 
      `"${w.client_name}"`, 
      w.container_type, 
      w.prime_mover_id || 'Unassigned', 
      w.status, 
      new Date(w.created_at).toLocaleDateString()
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'cargo_waybills_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Cargo Waybills"
        subtitle="Manage and track all freight waybills and shipping documents"
        actions={
          <>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150"
            >
              <Download size={15} />
              Export
            </button>
            <button 
              onClick={() => setActiveNav?.('allocator')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/30 transition-all duration-150"
            >
              <Plus size={15} />
              New Waybill
            </button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Waybills', value: waybills.length.toString(), sub: 'All records', color: 'text-slate-800 dark:text-slate-200' },
          { label: 'In Transit', value: waybills.filter(w => w.status === 'In Transit').length.toString(), sub: 'Active shipments', color: 'text-blue-700 dark:text-blue-400' },
          { label: 'Delivered', value: waybills.filter(w => w.status === 'Delivered').length.toString(), sub: 'Completed', color: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Loading', value: waybills.filter(w => w.status === 'Loading').length.toString(), sub: 'Pending dispatch', color: 'text-violet-700 dark:text-violet-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4 card-hover">
            <p className={`text-xl font-bold tracking-tight ${s.color} font-[Plus_Jakarta_Sans,sans-serif]`}>{s.value}</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{s.label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search waybills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-300 focus:ring-3 focus:ring-blue-500/10 transition-all"
            />
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400">{selected.length} selected</span>
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                Bulk Action
              </button>
            </div>
          )}
          <div className="ml-auto">
            <FileText size={15} className="text-slate-300" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    onChange={(e) =>
                      setSelected(e.target.checked ? waybills.map((w) => w.tracking_number) : [])
                    }
                    checked={selected.length > 0 && selected.length === waybills.length}
                  />
                </th>
                {['Waybill ID', 'Route', 'Client', 'Container', 'Prime Mover', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filtered.map((w) => {
                const cfg = statusCfg[w.status] || { label: w.status, color: 'text-slate-500 bg-slate-100', icon: null }
                const isSelected = selected.includes(w.tracking_number)
                return (
                  <tr
                    key={w.tracking_number}
                    className={[
                      'transition-colors duration-100 group',
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50',
                    ].join(' ')}
                  >
                    <td className="px-6 py-3.5">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        checked={isSelected}
                        onChange={() => toggleSelect(w.tracking_number)}
                      />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-blue-600 font-semibold">{w.tracking_number}</span>
                        <button
                          onClick={() => handleCopyWaybill(w.tracking_number)}
                          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all relative"
                          title="Copy tracking number"
                        >
                          {copiedId === w.tracking_number ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          {copiedId === w.tracking_number && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg text-white text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-xl animate-fade-in-down">
                              Copied!
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <MapPin size={11} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="font-medium">{w.origin}</span>
                        <span className="text-slate-300 dark:text-slate-600">→</span>
                        <span>{w.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{w.client_name}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Package size={11} className="text-slate-400 dark:text-slate-500" />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{w.container_type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Truck size={11} className="text-slate-400 dark:text-slate-500" />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{w.prime_mover_id || 'Unassigned'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar size={11} />
                        {new Date(w.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 transition-colors">
                          <ArrowUpRight size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 transition-colors">
                          <MoreHorizontal size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">Showing {filtered.length} of {waybills.length} waybills</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={[
                  'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                  p === 1 ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CargoWaybills
