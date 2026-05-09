import React, { useState, useEffect } from 'react'
import { Package2, Search, Filter, Plus, ArrowUpRight, CheckCircle2, Clock, AlertTriangle, MoreHorizontal, MapPin } from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'
import type { NavItem } from '../../App'

interface YardContainer {
  tracking_number: string
  client_name: string
  origin: string
  destination: string
  container_type: string
  status: 'Loading' | 'Delayed' | 'Delivered'
  created_at: string
}

const statusCfg = {
  Loading:   { label: 'Manifested / Loading', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  Delayed:   { label: 'Delayed in Yard',      color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  Delivered: { label: 'Delivered / Staged',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
}

interface Props {
  setActiveNav?: (nav: NavItem) => void
}

const Inventory: React.FC<Props> = ({ setActiveNav }) => {
  const [containers, setContainers] = useState<YardContainer[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const fetchYardContainers = async () => {
    const { data } = await supabase
      .from('waybills')
      .select('tracking_number, client_name, origin, destination, container_type, status, created_at')
      .in('status', ['Loading', 'Delayed', 'Delivered'])
      .order('created_at', { ascending: false })
      
    if (data) setContainers(data as YardContainer[])
  }

  useEffect(() => {
    fetchYardContainers()

    const channel = supabase
      .channel('yard_management_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waybills' }, () => {
        fetchYardContainers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = containers.filter(c => 
    c.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-7 animate-fade-in-down">
      <PageHeader
        title="Container Yard Management"
        subtitle="Track staged, loading, and delivered full containers across terminal zones"
        actions={
          <button 
            onClick={() => setActiveNav?.('allocator')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-500/30 transition-all"
          >
            <Plus size={16} />
            Log New Container
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracking number or client..." 
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button onClick={fetchYardContainers} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Filter size={16} />
            Filters
          </button>
        </div>

        {filtered.length === 0 ? (
          /* Empty State */
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <Package2 size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No containers found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Your yard is currently empty or no containers match your search filters.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setActiveNav?.('allocator')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors"
              >
                <ArrowUpRight size={16} />
                Log New Container
              </button>
            </div>
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Tracking No.</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Location / Route</th>
                  <th className="px-6 py-4 font-semibold">Container Type</th>
                  <th className="px-6 py-4 font-semibold">Yard Status</th>
                  <th className="px-4 py-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {filtered.map((c) => {
                  const cfg = statusCfg[c.status] || { label: c.status, color: 'text-slate-500 bg-slate-100 border-slate-200', dot: 'bg-slate-400' }
                  return (
                    <tr key={c.tracking_number} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{c.tracking_number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.client_name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(c.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="font-medium">{c.origin}</span>
                          <span className="text-slate-300 dark:text-slate-600">→</span>
                          <span>{c.destination}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package2 size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{c.container_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Inventory
