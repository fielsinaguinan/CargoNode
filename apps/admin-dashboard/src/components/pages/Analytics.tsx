import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Map,
  Download,
  Trophy,
  User,
  Star,
  ChevronDown,
  FileText,
} from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'


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
  prime_mover_id?: string
}

interface PrimeMover {
  id: string
  status: string
  fuel_allowance: number
}

interface Driver {
  id: string
  full_name: string
  status: string
  prime_mover_id?: string
}


const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('quarter')
  const [isExportOpen, setIsExportOpen] = useState(false)
  
  const [waybills, setWaybills] = useState<Waybill[]>([])
  const [primeMovers, setPrimeMovers] = useState<PrimeMover[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

  const fetchAnalyticsData = async () => {
    const { data: wData } = await supabase.from('waybills').select('tracking_number, origin, destination, status, freight_rate, created_at, prime_mover_id')
    const { data: pData } = await supabase.from('prime_movers').select('id, status, fuel_allowance')
    const { data: dData } = await supabase.from('drivers').select('id, full_name, status, prime_mover_id')
    
    if (wData) setWaybills(wData as Waybill[])
    if (pData) setPrimeMovers(pData as PrimeMover[])
    if (dData) setDrivers(dData as Driver[])
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

  // KPI Calculations based on period
  const now = new Date()
  let periodStart = new Date(now)
  if (period === 'week') periodStart.setDate(now.getDate() - 7)
  if (period === 'month') periodStart.setMonth(now.getMonth() - 1)
  if (period === 'quarter') periodStart.setMonth(now.getMonth() - 3)

  const activeWaybills = waybills.filter(w => new Date(w.created_at) >= periodStart)

  const grossRevenue = activeWaybills.reduce((sum, w) => sum + (w.freight_rate || 0), 0)
  const activeFleet = primeMovers.filter(pm => pm.status === 'Active' || pm.status === 'Pier Standby')
  const totalFuelCost = activeFleet.reduce((sum, pm) => sum + (pm.fuel_allowance || 0), 0)
  const netProfit = grossRevenue - totalFuelCost
  const deliveriesCompleted = activeWaybills.filter(w => w.status === 'Delivered').length

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
      iconBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
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
      iconBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
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
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
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
      iconBg: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
  ]

  // ── Dynamic Chart Aggregation ────────────────────────────────────────
  const chartData = (() => {
    const buckets: { label: string; deliveries: number; revenue: number }[] = []
    
    if (period === 'week') {
      // 7 daily buckets
      for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
        const d = new Date(now)
        d.setDate(now.getDate() - daysAgo)
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' })
        d.setHours(0,0,0,0)
        const end = new Date(d)
        end.setHours(23,59,59,999)
        const slice = waybills.filter(w => {
           const time = new Date(w.created_at).getTime()
           return time >= d.getTime() && time <= end.getTime()
        })
        buckets.push({
          label: dateStr,
          deliveries: slice.filter(w => w.status === 'Delivered').length,
          revenue: slice.reduce((s, w) => s + (w.freight_rate || 0), 0) / 1_000_000,
        })
      }
    } else {
      // Weekly buckets (4 for month, 12 for quarter)
      const numWeeks = period === 'month' ? 4 : 12
      for (let weeksAgo = numWeeks - 1; weeksAgo >= 0; weeksAgo--) {
        const end = new Date(now)
        end.setDate(now.getDate() - weeksAgo * 7)
        end.setHours(23, 59, 59, 999)
        const start = new Date(end)
        start.setDate(end.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        const slice = waybills.filter(w => {
          const time = new Date(w.created_at).getTime()
          return time >= start.getTime() && time <= end.getTime()
        })
        buckets.push({
          label: `W${numWeeks - weeksAgo}`,
          deliveries: slice.filter(w => w.status === 'Delivered').length,
          revenue: slice.reduce((s, w) => s + (w.freight_rate || 0), 0) / 1_000_000,
        })
      }
    }
    return buckets
  })()

  const chartLabels  = chartData.map(b => b.label)
  const deliveries   = chartData.map(b => b.deliveries)
  const revenue      = chartData.map(b => b.revenue)

  // ── Live On-Time Rate ──────────────────────────────────────────────────────
  const deliveredCount  = activeWaybills.filter(w => w.status === 'Delivered').length
  const delayedCount    = activeWaybills.filter(w => w.status === 'Delayed').length
  const closedTotal     = deliveredCount + delayedCount
  const onTimeRate      = closedTotal > 0 ? (deliveredCount / closedTotal) * 100 : 0
  const lateRate        = closedTotal > 0 ? (delayedCount / closedTotal) * 70 : 0
  const veryLateRate    = closedTotal > 0 ? (delayedCount / closedTotal) * 30 : 0

  // ── Fleet Utilization ──────────────────────────────────────────────────────
  const totalFleetCount = primeMovers.length
  const activeFleetCount = activeFleet.length
  const idleFleetCount = primeMovers.filter(pm => pm.status === 'Idle' || pm.status === 'Garage').length
  const maintenanceFleetCount = primeMovers.filter(pm => pm.status === 'Maintenance').length
  
  const utilizationRate = totalFleetCount > 0 ? (activeFleetCount / totalFleetCount) * 100 : 0
  const idleRate = totalFleetCount > 0 ? (idleFleetCount / totalFleetCount) * 100 : 0
  const maintenanceRate = totalFleetCount > 0 ? (maintenanceFleetCount / totalFleetCount) * 100 : 0

  // ── Live Top Routes ────────────────────────────────────────────────────────
  const routeMap = activeWaybills.reduce((acc, w) => {
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
      share: Math.min(100, (data.volume / (activeWaybills.length || 1)) * 100),
      revenue: formatCurrency(data.revenue),
    }))

  const displayRoutes = dynamicTopRoutes

  // ── Live Driver Leaderboard ───────────────────────────────────────────────
  const driverLeaderboard = drivers.map((d) => {
    // Find all active waybills assigned to this driver's truck
    const driverWaybills = activeWaybills.filter(w => w.prime_mover_id === d.prime_mover_id)
    
    const completedTrips = driverWaybills.filter(w => w.status === 'Delivered').length
    const delayedTrips = driverWaybills.filter(w => w.status === 'Delayed').length
    const totalClosed = completedTrips + delayedTrips
    
    // Calculate rating based on on-time delivery rate (0 if no closed trips, otherwise scales from 3.5 to 5.0)
    const onTimeRate = totalClosed > 0 ? (completedTrips / totalClosed) : 0
    const rating = totalClosed === 0 ? 0 : (3.5 + (onTimeRate * 1.5))
    
    return {
      id: d.id,
      name: d.full_name,
      trips: completedTrips,
      rating: parseFloat(rating.toFixed(1)),
      status: d.status
    }
  }).sort((a, b) => b.trips - a.trips).slice(0, 5)

  const handleExportCSV = () => {
    setIsExportOpen(false)
    const summaryLines = [
      '--- CARGONODE EXECUTIVE SUMMARY ---',
      `Report Period:,${period.toUpperCase()}`,
      `Total Revenue:,${formatCurrency(grossRevenue)}`,
      `Deliveries Completed:,${deliveriesCompleted}`,
      `Fleet Utilization:,${utilizationRate.toFixed(1)}% Active`,
      '',
      '--- DETAILED SHIPMENT LOG ---'
    ]

    const headers = ['Tracking Number', 'Origin', 'Destination', 'Status', 'Freight Rate', 'Date', 'Prime Mover ID', 'Driver Name']
    const rows = activeWaybills.map(w => {
      const driver = drivers.find(d => d.prime_mover_id === w.prime_mover_id)
      const driverName = driver ? driver.full_name : 'Unassigned'
      return [
        w.tracking_number,
        `"${w.origin}"`,
        `"${w.destination}"`,
        w.status,
        w.freight_rate || 0,
        new Date(w.created_at).toLocaleDateString(),
        w.prime_mover_id || 'N/A',
        `"${driverName}"`
      ]
    })
    
    const csvContent = [...summaryLines, headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `analytics_report_${period}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = async () => {
    setIsExportOpen(false)
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()
    
    // Dark Header Background
    doc.setFillColor(15, 23, 42) // slate-900
    doc.rect(0, 0, 210, 45, 'F')
    
    // Load Logo
    const img = new Image()
    img.src = '/SecondaryLogoForDarkMode.png'
    await new Promise((resolve) => {
      img.onload = resolve
      img.onerror = resolve
    })
    
    try {
      const w = (img.width / img.height) * 12
      doc.addImage(img, 'PNG', 14, 12, w, 12)
    } catch(e) {
      console.error('Failed to load logo for PDF', e)
    }
    
    // Title
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255) // white
    doc.text('Analytics Report', 14, 35)
    
    // Summary
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(`Period: ${period.toUpperCase()}`, 14, 55)
    doc.text(`Total Revenue: ${formatCurrency(grossRevenue)}`, 14, 61)
    doc.text(`Deliveries Completed: ${deliveriesCompleted}`, 14, 67)
    doc.text(`Fleet Utilization: ${utilizationRate.toFixed(1)}% Active`, 14, 73)
    
    // Table
    const headers = [['Tracking Number', 'Route', 'Status', 'Rate', 'Asset', 'Driver']]
    const data = activeWaybills.map(w => {
      const driver = drivers.find(d => d.prime_mover_id === w.prime_mover_id)
      const driverName = driver ? driver.full_name : 'Unassigned'
      return [
        w.tracking_number,
        `${w.origin} to ${w.destination}`,
        w.status,
        `PHP ${w.freight_rate || 0}`,
        w.prime_mover_id || 'N/A',
        driverName
      ]
    })
    
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 82,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    doc.save(`analytics_report_${period}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Analytics"
        subtitle="Performance metrics, revenue trends and operational KPIs"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download size={16} />
                Export Report
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isExportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden animate-fade-in-down">
                    <button 
                      onClick={handleExportCSV}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <Download size={16} className="text-emerald-500" />
                      Download CSV Data
                    </button>
                    <button 
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <FileText size={16} className="text-blue-500" />
                      Download PDF Report
                    </button>
                  </div>
                </>
              )}
            </div>
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
                k.up ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Delivery volume bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 card-hover">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Delivery Volume</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Total completed deliveries over time</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 opacity-35" />
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">This {period}</span>
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
                      {chartLabels[i]}
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

        {/* Fleet Utilization Rate donut */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 card-hover flex flex-col">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fleet Utilization</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time active fleet</p>
          </div>

          <div className="flex items-center justify-center flex-1 my-4">
            <div className="relative">
              <svg viewBox="0 0 120 120" className="w-36 h-36" style={{ transform: 'rotate(-90deg)' }}>
                {/* BG ring */}
                <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {/* Progress ring - Active */}
                <circle
                  cx="60" cy="60" r="46"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(utilizationRate / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
                />
                {/* Secondary arc - Idle */}
                <circle
                  cx="60" cy="60" r="34"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(idleRate / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
                />
                {/* Tertiary arc - Maintenance */}
                <circle
                  cx="60" cy="60" r="22"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(maintenanceRate / 100) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 font-[Plus_Jakarta_Sans,sans-serif]">
                  {totalFleetCount > 0 ? `${utilizationRate.toFixed(1)}%` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Active</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 mt-auto">
            {[
              { label: 'Active',      pct: utilizationRate, color: 'bg-blue-500' },
              { label: 'Idle',        pct: idleRate,        color: 'bg-slate-400' },
              { label: 'Maintenance', pct: maintenanceRate, color: 'bg-red-500' },
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

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

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
              <div key={r.route} className="px-6 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
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
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
              View all routes <ArrowUpRight size={11} />
            </button>
          </div>
        </div>

        {/* Driver Leaderboard */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden card-hover flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Top Drivers</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">By completed trips</p>
            </div>
            <Trophy size={15} className="text-amber-500" />
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50 flex-1">
            {driverLeaderboard.map((d, i) => (
              <div key={d.id} className="px-6 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <User size={14} />
                      </div>
                      {i < 3 && (
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                          {i + 1}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{d.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{d.trips}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">trips</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 mt-auto">
            <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
              View roster <ArrowUpRight size={11} />
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
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
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
              {chartLabels.map((w, i) => {
                const x = (i / (chartLabels.length - 1)) * 460 + 10
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
                {chartData.length > 0
                  ? `${chartData.reduce((best, w) => w.revenue > best.revenue ? w : best, chartData[0]).label} · ${formatCurrency(chartData.reduce((best, w) => w.revenue > best.revenue ? w : best, chartData[0]).revenue * 1_000_000)}`
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
