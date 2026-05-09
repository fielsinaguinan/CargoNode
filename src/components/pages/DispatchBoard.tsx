import React, { useState } from 'react'
import {
  Truck,
  MapPin,
  Clock,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Filter,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react'
import KPICard from '../KPICard'
import PageHeader from '../PageHeader'

interface Dispatch {
  id: string
  driver: string
  driverInitials: string
  truck: string
  route: string
  from: string
  to: string
  cargo: string
  weight: string
  status: 'in-transit' | 'loading' | 'delayed' | 'delivered'
  eta: string
  progress: number
}

const dispatches: Dispatch[] = [
  {
    id: 'DS-00491',
    driver: 'Rodrigo M.',
    driverInitials: 'RM',
    truck: 'PLT-0081',
    route: 'Manila → Cebu',
    from: 'Manila',
    to: 'Cebu',
    cargo: 'Electronics',
    weight: '12.4t',
    status: 'in-transit',
    eta: '4h 20m',
    progress: 62,
  },
  {
    id: 'DS-00492',
    driver: 'Antonio R.',
    driverInitials: 'AR',
    truck: 'PLT-0056',
    route: 'Davao → CDO',
    from: 'Davao',
    to: 'CDO',
    cargo: 'Fresh Produce',
    weight: '8.1t',
    status: 'delayed',
    eta: 'Overdue 2h',
    progress: 41,
  },
  {
    id: 'DS-00493',
    driver: 'Maria S.',
    driverInitials: 'MS',
    truck: 'PLT-0033',
    route: 'Cebu → Leyte',
    from: 'Cebu',
    to: 'Leyte',
    cargo: 'Auto Parts',
    weight: '5.7t',
    status: 'loading',
    eta: '—',
    progress: 0,
  },
  {
    id: 'DS-00490',
    driver: 'Joel T.',
    driverInitials: 'JT',
    truck: 'PLT-0072',
    route: 'Batangas → Manila',
    from: 'Batangas',
    to: 'Manila',
    cargo: 'Chemicals',
    weight: '18.3t',
    status: 'delivered',
    eta: 'Done',
    progress: 100,
  },
  {
    id: 'DS-00488',
    driver: 'Liza P.',
    driverInitials: 'LP',
    truck: 'PLT-0019',
    route: 'Iloilo → Bacolod',
    from: 'Iloilo',
    to: 'Bacolod',
    cargo: 'Textiles',
    weight: '3.2t',
    status: 'in-transit',
    eta: '55m',
    progress: 88,
  },
]

const statusConfig = {
  'in-transit': { label: 'In Transit', color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  loading:      { label: 'Loading',    color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  delayed:      { label: 'Delayed',    color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  delivered:    { label: 'Delivered',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
}

const kpis = [
  {
    label: 'Active Dispatches',
    value: '31',
    sub: '+4 from yesterday',
    trend: 'up' as const,
    icon: <Truck size={18} />,
    accent: 'from-blue-500 to-indigo-500',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Deliveries Today',
    value: '18',
    sub: '94% on-time rate',
    trend: 'up' as const,
    icon: <CheckCircle2 size={18} />,
    accent: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Active Alerts',
    value: '3',
    sub: '2 require action',
    trend: 'down' as const,
    icon: <AlertTriangle size={18} />,
    accent: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Total Tonnage',
    value: '284t',
    sub: 'Across all routes',
    trend: 'up' as const,
    icon: <Package size={18} />,
    accent: 'from-violet-500 to-purple-500',
    iconBg: 'bg-violet-50 text-violet-600',
  },
]

const DispatchBoard: React.FC = () => {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? dispatches
    : dispatches.filter((d) => d.status === filter)

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

      {/* Map placeholder */}
      <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-52 card-hover">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center">
          {/* Simulated map grid */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Fake route lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
            <path d="M50,100 Q200,30 350,120 Q500,200 650,80 Q720,50 780,100" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="6 4" opacity="0.6" />
            <path d="M80,150 Q250,60 400,140 Q550,220 700,100" stroke="#10b981" strokeWidth="1.5" fill="none" strokeDasharray="4 3" opacity="0.4" />
            <circle cx="50" cy="100" r="5" fill="#3b82f6" opacity="0.9" />
            <circle cx="350" cy="120" r="6" fill="#f59e0b" opacity="0.9" />
            <circle cx="650" cy="80" r="5" fill="#10b981" opacity="0.9" />
            <circle cx="780" cy="100" r="4" fill="#3b82f6" opacity="0.9" />
          </svg>

          <div className="text-center z-10 pointer-events-none">
            <MapPin size={28} className="text-blue-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm font-medium">Interactive Route Map</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">31 vehicles tracked live across all routes</p>
          </div>
        </div>

        {/* Map overlays */}
        <div className="absolute top-3 right-3 flex gap-2">
          <div className="bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            31 Active
          </div>
          <div className="bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
            <TrendingUp size={12} className="inline mr-1" />
            Live Tracking
          </div>
        </div>

        <div className="absolute bottom-3 left-3 flex gap-2">
          {['In Transit', 'Loading', 'Delayed'].map((label, i) => (
            <div key={label} className="bg-white/8 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${['bg-blue-400', 'bg-amber-400', 'bg-red-400'][i]}`} />
              <span className="text-slate-300">{label}</span>
            </div>
          ))}
        </div>
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
            <button className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <Filter size={15} />
            </button>
            <button className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                {['Dispatch ID', 'Driver / Truck', 'Route', 'Cargo', 'Progress', 'ETA', 'Status', ''].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filtered.map((d) => {
                const cfg = statusConfig[d.status]
                return (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors duration-100 group">
                    {/* ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-medium">{d.id}</span>
                    </td>
                    {/* Driver */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-bold flex-shrink-0">
                          {d.driverInitials}
                        </div>
                        <div>
                          <p className="text-slate-800 dark:text-slate-200 font-medium text-xs">{d.driver}</p>
                          <p className="text-slate-400 dark:text-slate-500 text-[11px]">{d.truck}</p>
                        </div>
                      </div>
                    </td>
                    {/* Route */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <MapPin size={11} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        {d.route}
                      </div>
                    </td>
                    {/* Cargo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs text-slate-700 dark:text-slate-300">{d.cargo}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{d.weight}</p>
                    </td>
                    {/* Progress */}
                    <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={[
                              'h-full rounded-full transition-all duration-500',
                              d.status === 'delayed'
                                ? 'bg-red-400'
                                : d.status === 'delivered'
                                ? 'bg-emerald-400'
                                : 'bg-blue-400',
                            ].join(' ')}
                            style={{ width: `${d.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 w-8 text-right">{d.progress}%</span>
                      </div>
                    </td>
                    {/* ETA */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <Clock size={11} className="text-slate-400 dark:text-slate-500" />
                        <span className={d.status === 'delayed' ? 'text-red-600 font-semibold' : ''}>
                          {d.eta}
                        </span>
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
                    <td className="px-4 py-4">
                      <button className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all duration-150">
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">Showing {filtered.length} of {dispatches.length} records</p>
          <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
            View all dispatches
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DispatchBoard
