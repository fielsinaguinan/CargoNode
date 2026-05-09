import React from 'react'
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Gauge,
  Truck,
  Plus,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react'
import PageHeader from '../PageHeader'

interface VehicleCard {
  id: string
  plate: string
  model: string
  year: number
  mileage: string
  status: 'ok' | 'due' | 'overdue' | 'in-service'
  nextService: string
  lastService: string
  issues: string[]
  health: number
}

const vehicles: VehicleCard[] = [
  {
    id: 'V001',
    plate: 'PLT-0081',
    model: 'Isuzu Giga FVR',
    year: 2021,
    mileage: '84,320 km',
    status: 'ok',
    nextService: '2026-06-15',
    lastService: '2026-03-12',
    issues: [],
    health: 92,
  },
  {
    id: 'V002',
    plate: 'PLT-0094',
    model: 'Hino 700 Series',
    year: 2019,
    mileage: '142,800 km',
    status: 'overdue',
    nextService: '2026-04-30',
    lastService: '2025-10-20',
    issues: ['Oil change overdue', 'Brake pads worn'],
    health: 47,
  },
  {
    id: 'V003',
    plate: 'PLT-0056',
    model: 'Mitsubishi Fuso FV',
    year: 2022,
    mileage: '62,100 km',
    status: 'due',
    nextService: '2026-05-10',
    lastService: '2026-02-18',
    issues: ['Air filter replacement due'],
    health: 74,
  },
  {
    id: 'V004',
    plate: 'PLT-0033',
    model: 'MAN TGS 26.480',
    year: 2020,
    mileage: '108,500 km',
    status: 'in-service',
    nextService: '2026-05-20',
    lastService: '2026-04-05',
    issues: ['Turbo replacement in progress'],
    health: 61,
  },
  {
    id: 'V005',
    plate: 'PLT-0072',
    model: 'Isuzu Giga CYZ',
    year: 2023,
    mileage: '38,900 km',
    status: 'ok',
    nextService: '2026-08-01',
    lastService: '2026-04-22',
    issues: [],
    health: 97,
  },
  {
    id: 'V006',
    plate: 'PLT-0019',
    model: 'Hino 500 Series',
    year: 2018,
    mileage: '198,240 km',
    status: 'due',
    nextService: '2026-05-12',
    lastService: '2025-11-30',
    issues: ['Tire rotation due', 'Coolant flush due'],
    health: 58,
  },
]

const statusCfg = {
  ok:          { label: 'Good',       color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-400', icon: <CheckCircle2 size={13} /> },
  due:         { label: 'Service Due', color: 'text-amber-700 bg-amber-50 border-amber-200',     bar: 'bg-amber-400',   icon: <Clock size={13} /> },
  overdue:     { label: 'Overdue',    color: 'text-red-700 bg-red-50 border-red-200',             bar: 'bg-red-500',     icon: <AlertTriangle size={13} /> },
  'in-service': { label: 'In Service', color: 'text-violet-700 bg-violet-50 border-violet-200',  bar: 'bg-violet-400',  icon: <Wrench size={13} /> },
}

const Maintenance: React.FC = () => {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Fleet Maintenance"
        subtitle="Monitor vehicle health, service schedules and maintenance records"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all duration-150">
            <Plus size={15} />
            Schedule Service
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Fleet', value: '48', icon: <Truck size={16} />, bg: 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400' },
          { label: 'Service Due', value: vehicles.filter(v => v.status === 'due').length.toString(), icon: <Clock size={16} />, bg: 'bg-amber-50 text-amber-600' },
          { label: 'Overdue', value: vehicles.filter(v => v.status === 'overdue').length.toString(), icon: <AlertTriangle size={16} />, bg: 'bg-red-50 text-red-600' },
          { label: 'In Service', value: vehicles.filter(v => v.status === 'in-service').length.toString(), icon: <Wrench size={16} />, bg: 'bg-violet-50 text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4 card-hover flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight font-[Plus_Jakarta_Sans,sans-serif]">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Vehicle grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map((v) => {
          const cfg = statusCfg[v.status]
          return (
            <div key={v.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden card-hover group">
              {/* Card top */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Truck size={18} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">{v.plate}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{v.model} · {v.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <button className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Health bar */}
              <div className="px-5 pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Gauge size={12} />
                    Vehicle Health
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{v.health}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                    style={{ width: `${v.health}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Gauge size={11} /> Mileage</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{v.mileage}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Calendar size={11} /> Last Service</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{v.lastService}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Clock size={11} /> Next Service</span>
                  <span className={`font-medium ${v.status === 'overdue' ? 'text-red-600' : v.status === 'due' ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    {v.nextService}
                  </span>
                </div>

                {/* Issues */}
                {v.issues.length > 0 && (
                  <div className="mt-1 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {v.issues.map((issue) => (
                      <div key={issue} className="flex items-start gap-2 text-xs">
                        <AlertTriangle size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600 dark:text-slate-400">{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Fleet ID: {v.id}</span>
                <button className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  View History
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Maintenance
