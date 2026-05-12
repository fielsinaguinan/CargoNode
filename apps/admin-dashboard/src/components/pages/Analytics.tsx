import React, { useState, useEffect } from 'react'
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
import { supabase } from '../../lib/supabase'

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

interface Waybill {
  tracking_number: string
  origin: string
  destination: string
  status: string
  freight_rate: number
  created_at: string
}

interface PrimeMover {
  id: string
  status: string
  fuel_allowance: number
}


const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('quarter')
  
  const [waybills, setWaybills] = useState<Waybill[]>([])
  const [primeMovers, setPrimeMovers] = useState<PrimeMover[]>([])

  const fetchAnalyticsData = async () => {
    const { data: wData } = await supabase.from('waybills').select('tracking_number, origin, destination, status, freight_rate, created_at')
    const { data: pData } = await supabase.from('prime_movers').select('id, status, fuel_allowance')
    
    if (wData) setWaybills(wData as Waybill[])
    if (pData) setPrimeMovers(pData as PrimeMover[])
  }

  useEffect(() => {
    fetchAnalyticsData()

    const channel = supabase.channel('analytics_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waybills' }, () => fetchAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prime_movers' }, () => fetchAnalyticsData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // KPI Calculations
  const grossRevenue = waybills.reduce((sum, w) => sum + (w.freight_rate || 0), 0)
  const activeFleet = primeMovers.filter(pm => pm.status === 'Active' || pm.status === 'Pier Standby')
  const totalFuelCost = activeFleet.reduce((sum, pm) => sum + (pm.fuel_allowance || 0), 0)
  const netProfit = grossRevenue - totalFuelCost
  const deliveriesCompleted = waybills.filter(w => w.status === 'Delivered').length

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `₱${(val / 1000000).toFixed(2)}M`
    if (val >= 1000) return `₱${(val / 1000).toFixed(1)}k`
    return `₱${val}`
  }

  const kpiCards = [
    {
      label: 'Gross Revenue',
      value: formatCurrency(grossRevenue),
      change: '+Realtime',
      up: true,
      sub: 'All shipments',
      data: [1.2, 1.5, 1.1, 1.8, 1.6, 2.1, 1.9, 2.4],
      color: '#3b82f6',
      icon: <DollarSign size={16} />,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Fuel Costs',
      value: formatCurrency(totalFuelCost),
      change: 'Active Fleet',
      up: false,
      sub: 'Estimated allowance',
      data: [0.38, 0.41, 0.36, 0.45, 0.42, 0.48, 0.44, 0.52],
      color: '#f59e0b',
      icon: <Activity size={16} />,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Net Profit Estimate',
      value: formatCurrency(netProfit),
      change: '+Dynamic',
      up: netProfit >= 0,
      sub: 'Revenue minus Fuel',
      data: [82, 91, 78, 108, 95, 114, 103, 128],
      color: '#10b981',
      icon: <TrendingUp size={16} />,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Deliveries Completed',
      value: deliveriesCompleted.toString(),
      change: 'Live',
      up: true,
      sub: 'Total staging',
      data: [88, 91, 85, 93, 90, 94, 92, 96],
      color: '#8b5cf6',
      icon: <Package size={16} />,
      iconBg: 'bg-violet-50 text-violet-600',
    },
  ]

  // ── Live Weekly Chart Aggregation ────────────────────────────────────────
  // Build 8 weekly buckets ending today, each 7 days wide.
  const weeklyData = (() => {
    const now = new Date()
    const buckets: { label: string; deliveries: number; revenue: number }[] = []
    for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo--) {
      const end = new Date(now)
      end.setDate(now.getDate() - weeksAgo * 7)
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      const slice = waybills.filter(w => {
        const d = new Date(w.created_at)
        return d >= start && d <= end
      })
      buckets.push({
        label: `W${8 - weeksAgo}`,
        deliveries: slice.filter(w => w.status === 'Delivered').length,
        revenue: slice.reduce((s, w) => s + (w.freight_rate || 0), 0) / 1_000_000,
      })
    }
    return buckets
  })()

  const weekLabels   = weeklyData.map(b => b.label)
  const deliveries   = weeklyData.map(b => b.deliveries)
  const revenue      = weeklyData.map(b => b.revenue)

  // ── Live On-Time Rate ──────────────────────────────────────────────────────
  const deliveredCount  = waybills.filter(w => w.status === 'Delivered').length
  const delayedCount    = waybills.filter(w => w.status === 'Delayed').length
  const closedTotal     = deliveredCount + delayedCount
  const onTimeRate      = closedTotal > 0 ? (deliveredCount / closedTotal) * 100 : 0
  // Approximate split: 70% of delays are 'late (<2h)', 30% 'very late'
  const lateRate        = closedTotal > 0 ? (delayedCount / closedTotal) * 70 : 0
  const veryLateRate    = closedTotal > 0 ? (delayedCount / closedTotal) * 30 : 0

  // ── Live Top Routes (already computed above, no fallback to mock) ──────────
  const routeMap = waybills.reduce((acc, w) => {
    const route = `${w.origin} → ${w.destination}`
    if (!acc[route]) acc[route] = { volume: 0, revenue: 0 }
    acc[route].volume += 1
    acc[route].revenue += w.freight_rate || 0
    return acc
  }, {} as Record<string, { volume: number; revenue: number }>)

  const dynamicTopRoutes = Object.entries(routeMap)
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 5)
    .map(([route, data]) => ({
      route,
      volume: `${data.volume} trips`,
      share: Math.min(100, (data.volume / (waybills.length || 1)) * 100),
      revenue: formatCurrency(data.revenue),
    }))

  const displayRoutes = dynamicTopRoutes

  return (
    <div className="space-y-7">
      <PageHeader
        title="Analytics"
        subtitle="Performance metrics, revenue trends and operational KPIs"
        actions={
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['week', 'month', 'quarter'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  'px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-150',
                  period === p ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700',
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
          <div key={k.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 card-hover">
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
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight font-[Plus_Jakarta_Sans,sans-serif]">
              {k.value}
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{k.label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{k.sub}</p>
            <div className="mt-3">
              <Sparkline data={k.data} color={k.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Delivery volume bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 card-hover">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Weekly Delivery Volume</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Total completed deliveries per week</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 opacity-35" />
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-xs text-slate-400 dark:text-slate-500">Last 8 weeks</span>
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
                      {weekLabels[i]}
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 card-hover flex flex-col">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">On-Time Delivery Rate</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Current quarter average</p>
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
                  strokeDasharray={`${(onTimeRate / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
                />
                {/* Secondary arc — late rate */}
                <circle
                  cx="60" cy="60" r="34"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(lateRate / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-[Plus_Jakarta_Sans,sans-serif]">
                  {closedTotal > 0 ? `${onTimeRate.toFixed(1)}%` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">On-Time</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 mt-auto">
            {[
              { label: 'On-Time',    pct: onTimeRate,  color: 'bg-violet-500' },
              { label: 'Late (< 2h)', pct: lateRate,    color: 'bg-amber-400' },
              { label: 'Very Late',  pct: veryLateRate, color: 'bg-red-400' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-sm ${s.color}`} />
                  <span className="text-slate-500 dark:text-slate-400">{s.label}</span>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{s.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top routes & performance table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top routes */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden card-hover">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Top Routes by Volume</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">This quarter</p>
            </div>
            <Map size={15} className="text-slate-300" />
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {displayRoutes.map((r, i) => (
              <div key={r.route} className="px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{r.route}</p>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{r.volume}</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{r.revenue}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50">
            <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
              View all routes <ArrowUpRight size={11} />
            </button>
          </div>
        </div>

        {/* Weekly revenue line chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 card-hover">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Revenue Trend</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Weekly revenue in ₱M</p>
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
              {weekLabels.map((w, i) => {
                const x = (i / (weekLabels.length - 1)) * 460 + 10
                return (
                  <text key={w} x={x} y={138} textAnchor="middle" fill="#94a3b8" fontSize="10">
                    {w}
                  </text>
                )
              })}
            </svg>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">Peak Week</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {weeklyData.length > 0
                  ? `${weeklyData.reduce((best, w) => w.revenue > best.revenue ? w : best, weeklyData[0]).label} · ${formatCurrency(weeklyData.reduce((best, w) => w.revenue > best.revenue ? w : best, weeklyData[0]).revenue * 1_000_000)}`
                  : 'No data'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">Avg Weekly</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {revenue.length > 0
                  ? formatCurrency((revenue.reduce((s, v) => s + v, 0) / revenue.length) * 1_000_000)
                  : '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">Total Revenue</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{formatCurrency(grossRevenue)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
