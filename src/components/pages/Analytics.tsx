import React, { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Map,
  Calendar,
} from 'lucide-react'
import PageHeader from '../PageHeader'

// Simple bar chart via SVG
const MiniBarChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data)
  return (
    <svg viewBox={`0 0 ${data.length * 14} 40`} className="w-full h-10">
      {data.map((v, i) => {
        const h = (v / max) * 36
        return (
          <rect
            key={i}
            x={i * 14 + 2}
            y={40 - h}
            width={10}
            height={h}
            rx={3}
            fill={color}
            opacity={i === data.length - 1 ? 1 : 0.35}
          />
        )
      })}
    </svg>
  )
}

// Sparkline
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 30
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  })
  const d = `M ${pts.join(' L ')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-8">
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']
const deliveries = [82, 91, 78, 108, 95, 114, 103, 128]
const revenue    = [1.2, 1.5, 1.1, 1.8, 1.6, 2.1, 1.9, 2.4]
const fuelCost   = [0.38, 0.41, 0.36, 0.45, 0.42, 0.48, 0.44, 0.52]
const onTime     = [88, 91, 85, 93, 90, 94, 92, 96]

const topRoutes = [
  { route: 'Manila → Cebu',     volume: '340 trips', share: 28, revenue: '₱4.8M' },
  { route: 'Davao → CDO',       volume: '210 trips', share: 18, revenue: '₱2.6M' },
  { route: 'Manila → Davao',    volume: '188 trips', share: 15, revenue: '₱3.1M' },
  { route: 'Cebu → Leyte',      volume: '144 trips', share: 12, revenue: '₱1.4M' },
  { route: 'Batangas → Manila', volume: '98 trips',  share: 8,  revenue: '₱1.8M' },
]

const kpiCards = [
  {
    label: 'Total Revenue',
    value: '₱12.4M',
    change: '+18.2%',
    up: true,
    sub: 'vs. last month',
    data: revenue,
    color: '#3b82f6',
    icon: <DollarSign size={16} />,
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Deliveries Completed',
    value: '799',
    change: '+24.1%',
    up: true,
    sub: 'This quarter',
    data: deliveries,
    color: '#10b981',
    icon: <Package size={16} />,
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Fuel Cost',
    value: '₱3.46M',
    change: '+8.4%',
    up: false,
    sub: 'vs. last quarter',
    data: fuelCost,
    color: '#f59e0b',
    icon: <Activity size={16} />,
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'On-Time Rate',
    value: '92.8%',
    change: '+4.2%',
    up: true,
    sub: 'Avg. last 8 weeks',
    data: onTime,
    color: '#8b5cf6',
    icon: <Clock size={16} />,
    iconBg: 'bg-violet-50 text-violet-600',
  },
]

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('quarter')

  return (
    <div className="space-y-7">
      <PageHeader
        title="Analytics"
        subtitle="Performance metrics, revenue trends and operational KPIs"
        actions={
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['week', 'month', 'quarter'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  'px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-150',
                  period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.iconBg}`}>
                {k.icon}
              </div>
              <div className={[
                'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                k.up ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50',
              ].join(' ')}>
                {k.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {k.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight font-[Plus_Jakarta_Sans,sans-serif]">
              {k.value}
            </p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{k.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{k.sub}</p>
            <div className="mt-3">
              <Sparkline data={k.data} color={k.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Delivery volume bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 card-hover">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Weekly Delivery Volume</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total completed deliveries per week</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 opacity-35" />
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-xs text-slate-400">Last 8 weeks</span>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="relative">
            <svg viewBox="0 0 700 160" className="w-full h-40" preserveAspectRatio="none">
              {deliveries.map((v, i) => {
                const max = Math.max(...deliveries)
                const h = (v / max) * 130
                const x = i * (700 / deliveries.length) + 10
                const barW = 700 / deliveries.length - 20
                const y = 150 - h
                return (
                  <g key={i}>
                    {/* Background bar */}
                    <rect x={x} y={20} width={barW} height={130} rx={4} fill="#f1f5f9" />
                    {/* Value bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      rx={4}
                      fill={i === deliveries.length - 1 ? '#3b82f6' : '#bfdbfe'}
                    />
                    {/* Label */}
                    <text x={x + barW / 2} y={160} textAnchor="middle" fill="#94a3b8" fontSize="11">
                      {weeks[i]}
                    </text>
                    {/* Value on top */}
                    {i === deliveries.length - 1 && (
                      <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="700">
                        {v}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* On-time rate donut */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 card-hover flex flex-col">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-800">On-Time Delivery Rate</h3>
            <p className="text-xs text-slate-400 mt-0.5">Current quarter average</p>
          </div>

          {/* Donut chart SVG */}
          <div className="flex items-center justify-center flex-1 my-4">
            <div className="relative">
              <svg viewBox="0 0 120 120" className="w-36 h-36" style={{ transform: 'rotate(-90deg)' }}>
                {/* BG ring */}
                <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {/* Progress ring */}
                <circle
                  cx="60" cy="60" r="46"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(92.8 / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
                />
                {/* Secondary arc */}
                <circle
                  cx="60" cy="60" r="34"
                  fill="none"
                  stroke="#ddd6fe"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(78 / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 font-[Plus_Jakarta_Sans,sans-serif]">92.8%</span>
                <span className="text-[10px] text-slate-400">On-Time</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 mt-auto">
            {[
              { label: 'On-Time', pct: 92.8, color: 'bg-violet-500' },
              { label: 'Late (< 2h)', pct: 5.8, color: 'bg-amber-400' },
              { label: 'Very Late', pct: 1.4, color: 'bg-red-400' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-sm ${s.color}`} />
                  <span className="text-slate-500">{s.label}</span>
                </div>
                <span className="font-semibold text-slate-700">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top routes & performance table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top routes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden card-hover">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Top Routes by Volume</h3>
              <p className="text-xs text-slate-400 mt-0.5">This quarter</p>
            </div>
            <Map size={15} className="text-slate-300" />
          </div>
          <div className="divide-y divide-slate-50">
            {topRoutes.map((r, i) => (
              <div key={r.route} className="px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-slate-700 truncate">{r.route}</p>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-xs text-slate-400">{r.volume}</span>
                        <span className="text-xs font-semibold text-slate-800">{r.revenue}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all duration-700"
                        style={{ width: `${r.share}%`, maxWidth: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
              View all routes <ArrowUpRight size={11} />
            </button>
          </div>
        </div>

        {/* Weekly revenue line chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 card-hover">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Revenue Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Weekly revenue in ₱M</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <TrendingUp size={12} />
              +18.2%
            </div>
          </div>

          {/* Revenue line chart */}
          <div className="relative h-40 mt-4">
            <svg viewBox="0 0 480 140" className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1="0" y1={i * 35 + 10}
                  x2="480" y2={i * 35 + 10}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}
              {/* Area fill */}
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const max = Math.max(...revenue)
                const pts = revenue.map((v, i) => {
                  const x = (i / (revenue.length - 1)) * 460 + 10
                  const y = 130 - ((v - 1) / (max - 1)) * 110
                  return [x, y] as [number, number]
                })
                const linePath = `M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')}`
                const areaPath = `M ${pts[0][0]},130 L ${pts.map(([x, y]) => `${x},${y}`).join(' L ')} L ${pts[pts.length - 1][0]},130 Z`
                return (
                  <>
                    <path d={areaPath} fill="url(#revenueGrad)" />
                    <path d={linePath} stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map(([x, y], i) => (
                      <circle
                        key={i}
                        cx={x} cy={y}
                        r={i === pts.length - 1 ? 5 : 3}
                        fill={i === pts.length - 1 ? '#3b82f6' : '#fff'}
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    ))}
                  </>
                )
              })()}
              {/* X axis labels */}
              {weeks.map((w, i) => {
                const x = (i / (weeks.length - 1)) * 460 + 10
                return (
                  <text key={w} x={x} y={138} textAnchor="middle" fill="#94a3b8" fontSize="10">
                    {w}
                  </text>
                )
              })}
            </svg>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs text-slate-400">Peak Week</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">W8 · ₱2.4M</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Avg Weekly</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">₱1.71M</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Total QTD</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">₱13.7M</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
