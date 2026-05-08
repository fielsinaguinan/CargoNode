import React, { useState } from 'react'
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
  XCircle,
} from 'lucide-react'
import PageHeader from '../PageHeader'

interface Waybill {
  id: string
  origin: string
  destination: string
  shipper: string
  consignee: string
  commodity: string
  weight: string
  pieces: number
  date: string
  status: 'delivered' | 'in-transit' | 'pending' | 'cancelled'
  value: string
}

const waybills: Waybill[] = [
  { id: 'WB-04813', origin: 'Manila',   destination: 'Batangas', shipper: 'NexaCorp Inc.',   consignee: 'BatPharma Ltd.',  commodity: 'Pharmaceutical Supplies', weight: '1.2t',  pieces: 48,  date: '2026-05-08', status: 'pending',    value: '₱92,400' },
  { id: 'WB-04812', origin: 'Davao',    destination: 'CDO',      shipper: 'SunFarm Co.',     consignee: 'NortherMart',     commodity: 'Fresh Produce',           weight: '8.1t',  pieces: 320, date: '2026-05-07', status: 'in-transit', value: '₱38,600' },
  { id: 'WB-04811', origin: 'Cebu',     destination: 'Leyte',    shipper: 'AutoBridge PH',   consignee: 'EasternAuto',     commodity: 'Auto Parts',              weight: '5.7t',  pieces: 90,  date: '2026-05-07', status: 'in-transit', value: '₱210,800' },
  { id: 'WB-04810', origin: 'Manila',   destination: 'Cebu',     shipper: 'TechDist PH',     consignee: 'IslandTech',      commodity: 'Consumer Electronics',    weight: '12.4t', pieces: 640, date: '2026-05-06', status: 'in-transit', value: '₱1,480,000' },
  { id: 'WB-04809', origin: 'Iloilo',   destination: 'Bacolod',  shipper: 'WeaveCraft',      consignee: 'BacFashion',      commodity: 'Textiles & Garments',     weight: '3.2t',  pieces: 180, date: '2026-05-06', status: 'delivered',  value: '₱64,200' },
  { id: 'WB-04808', origin: 'Batangas', destination: 'Manila',   shipper: 'ChemSol PH',      consignee: 'ManilaPlant',     commodity: 'Industrial Chemicals',    weight: '18.3t', pieces: 24,  date: '2026-05-05', status: 'delivered',  value: '₱306,000' },
  { id: 'WB-04807', origin: 'Pampanga', destination: 'Pangasinan', shipper: 'GrainMill PH', consignee: 'PangaStore',      commodity: 'Rice & Grains',           weight: '22.0t', pieces: 880, date: '2026-05-05', status: 'delivered',  value: '₱198,000' },
  { id: 'WB-04806', origin: 'Manila',   destination: 'Zamboanga', shipper: 'MarineCo.',     consignee: 'ZamboFish',       commodity: 'Fishing Equipment',       weight: '4.5t',  pieces: 60,  date: '2026-05-04', status: 'cancelled',  value: '₱128,500' },
]

const statusCfg = {
  delivered:   { label: 'Delivered',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  'in-transit': { label: 'In Transit', color: 'text-blue-700 bg-blue-50 border-blue-200',           icon: <Clock size={12} /> },
  pending:     { label: 'Pending',     color: 'text-amber-700 bg-amber-50 border-amber-200',         icon: <AlertTriangle size={12} /> },
  cancelled:   { label: 'Cancelled',   color: 'text-red-700 bg-red-50 border-red-200',               icon: <XCircle size={12} /> },
}

const CargoWaybills: React.FC = () => {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const filtered = waybills.filter(
    (w) =>
      w.id.toLowerCase().includes(search.toLowerCase()) ||
      w.commodity.toLowerCase().includes(search.toLowerCase()) ||
      w.shipper.toLowerCase().includes(search.toLowerCase()) ||
      w.origin.toLowerCase().includes(search.toLowerCase()) ||
      w.destination.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const totalValue = waybills
    .filter((w) => w.status !== 'cancelled')
    .reduce((acc, w) => {
      const num = parseFloat(w.value.replace(/[₱,]/g, ''))
      return acc + num
    }, 0)

  return (
    <div className="space-y-7">
      <PageHeader
        title="Cargo Waybills"
        subtitle="Manage and track all freight waybills and shipping documents"
        actions={
          <>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all duration-150">
              <Download size={15} />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all duration-150">
              <Plus size={15} />
              New Waybill
            </button>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Waybills', value: waybills.length.toString(), sub: 'This month', color: 'text-slate-800' },
          { label: 'In Transit', value: waybills.filter(w => w.status === 'in-transit').length.toString(), sub: 'Active shipments', color: 'text-blue-700' },
          { label: 'Delivered', value: waybills.filter(w => w.status === 'delivered').length.toString(), sub: 'Completed today', color: 'text-emerald-700' },
          { label: 'Cargo Value', value: `₱${(totalValue / 1000000).toFixed(2)}M`, sub: 'Excl. cancelled', color: 'text-violet-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 card-hover">
            <p className={`text-xl font-bold tracking-tight ${s.color} font-[Plus_Jakarta_Sans,sans-serif]`}>{s.value}</p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{s.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search waybills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-100 border border-transparent text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-300 focus:ring-3 focus:ring-blue-500/10 transition-all"
            />
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500">{selected.length} selected</span>
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
              <tr className="text-left border-b border-slate-100">
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) =>
                      setSelected(e.target.checked ? waybills.map((w) => w.id) : [])
                    }
                    checked={selected.length === waybills.length}
                  />
                </th>
                {['Waybill ID', 'Route', 'Shipper / Consignee', 'Commodity', 'Weight', 'Date', 'Value', 'Status', ''].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((w) => {
                const cfg = statusCfg[w.status]
                const isSelected = selected.includes(w.id)
                return (
                  <tr
                    key={w.id}
                    className={[
                      'transition-colors duration-100 group',
                      isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/60',
                    ].join(' ')}
                  >
                    <td className="px-6 py-3.5">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={isSelected}
                        onChange={() => toggleSelect(w.id)}
                      />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs text-blue-600 font-semibold">{w.id}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="font-medium">{w.origin}</span>
                        <span className="text-slate-300">→</span>
                        <span>{w.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-700">{w.shipper}</p>
                      <p className="text-[11px] text-slate-400">{w.consignee}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Package size={11} className="text-slate-400" />
                        <p className="text-xs text-slate-700">{w.commodity}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{w.pieces} pcs</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">{w.weight}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={11} />
                        {w.date}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800">{w.value}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <ArrowUpRight size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
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

        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">Showing {filtered.length} of {waybills.length} waybills</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={[
                  'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                  p === 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100',
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
