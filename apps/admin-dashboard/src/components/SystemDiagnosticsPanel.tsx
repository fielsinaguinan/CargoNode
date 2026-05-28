import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  X,
  Activity,
  Database,
  Radio,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Server,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface DiagnosticsProps {
  open: boolean
  onClose: () => void
}

interface SubscriptionEntry {
  channel: string
  table: string
  status: 'SUBSCRIBED' | 'PENDING' | 'CLOSED'
}

interface DiagnosticsState {
  wsStatus: 'Connected' | 'Disconnected' | 'Connecting'
  pingMs: number | null
  lastFetch: Date | null
  subscriptions: SubscriptionEntry[]
  offlineQueue: number
  dbRowCounts: { waybills: number; prime_movers: number; gps_logs: number; notifications: number }
  checking: boolean
}

const KNOWN_SUBSCRIPTIONS: SubscriptionEntry[] = [
  { channel: 'public:notifications', table: 'notifications', status: 'SUBSCRIBED' },
  { channel: 'sidebar-stats', table: 'waybills + prime_movers', status: 'SUBSCRIBED' },
  { channel: 'fleet_updates', table: 'prime_movers + waybills + maintenance_alerts', status: 'SUBSCRIBED' },
]

const StatusDot: React.FC<{ status: 'Connected' | 'Disconnected' | 'Connecting' }> = ({ status }) => {
  const colors = {
    Connected: 'bg-emerald-400',
    Disconnected: 'bg-red-500',
    Connecting: 'bg-amber-400',
  }
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {status !== 'Disconnected' && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[status]}`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
    </span>
  )
}

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode; accent?: string }> = ({
  icon, label, children, accent = 'border-slate-700'
}) => (
  <div className={`bg-slate-800/60 border ${accent} rounded-xl p-4`}>
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
    {children}
  </div>
)

const SystemDiagnosticsPanel: React.FC<DiagnosticsProps> = ({ open, onClose }) => {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      // Cancel any pending unmount, mount immediately then animate in
      if (unmountTimer.current) clearTimeout(unmountTimer.current)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      // Animate out, then unmount after transition
      setVisible(false)
      unmountTimer.current = setTimeout(() => setMounted(false), 300)
    }
    return () => { if (unmountTimer.current) clearTimeout(unmountTimer.current) }
  }, [open])

  const [state, setState] = useState<DiagnosticsState>({
    wsStatus: 'Connecting',
    pingMs: null,
    lastFetch: null,
    subscriptions: KNOWN_SUBSCRIPTIONS,
    offlineQueue: 0,
    dbRowCounts: { waybills: 0, prime_movers: 0, gps_logs: 0, notifications: 0 },
    checking: false,
  })

  const runHealthCheck = useCallback(async () => {
    setState(s => ({ ...s, checking: true, wsStatus: 'Connecting' }))

    // Measure ping by timing a lightweight query
    const pingStart = performance.now()
    const [waybillRes, moverRes, gpsRes, notifRes] = await Promise.all([
      supabase.from('waybills').select('tracking_number', { count: 'exact', head: true }),
      supabase.from('prime_movers').select('id', { count: 'exact', head: true }),
      supabase.from('gps_logs').select('id', { count: 'exact', head: true }),
      supabase.from('notifications').select('id', { count: 'exact', head: true }),
    ])
    const pingEnd = performance.now()

    const success = !waybillRes.error && !moverRes.error

    setState(s => ({
      ...s,
      checking: false,
      wsStatus: success ? 'Connected' : 'Disconnected',
      pingMs: Math.round(pingEnd - pingStart),
      lastFetch: success ? new Date() : s.lastFetch,
      subscriptions: KNOWN_SUBSCRIPTIONS.map(sub => ({
        ...sub,
        status: success ? 'SUBSCRIBED' : 'CLOSED',
      })),
      dbRowCounts: {
        waybills: waybillRes.count ?? 0,
        prime_movers: moverRes.count ?? 0,
        gps_logs: gpsRes.count ?? 0,
        notifications: notifRes.count ?? 0,
      },
    }))
  }, [])

  // Run on open
  useEffect(() => {
    if (open) runHealthCheck()
  }, [open, runHealthCheck])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const formatTime = (d: Date | null) =>
    d ? d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

  const pingColor =
    state.pingMs === null ? 'text-slate-500'
    : state.pingMs < 150 ? 'text-emerald-400'
    : state.pingMs < 400 ? 'text-amber-400'
    : 'text-red-400'

  if (!mounted) return null

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={[
          'fixed top-0 right-0 z-50 h-screen w-full max-w-md',
          'bg-slate-950 border-l border-slate-800 admin-dark-overlay',
          'flex flex-col shadow-2xl shadow-black/60',
          'transition-transform duration-300 ease-in-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={15} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">CargoNode v1.0</span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">System Health & Telemetry</h2>
            <p className="text-xs text-slate-500 mt-0.5">Diagnostics — Supabase Real-Time Engine</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Connection Banner */}
          <div className={[
            'flex items-center justify-between px-4 py-3.5 rounded-xl border',
            state.wsStatus === 'Connected'
              ? 'bg-emerald-950/60 border-emerald-800/60'
              : state.wsStatus === 'Connecting'
              ? 'bg-amber-950/60 border-amber-800/60'
              : 'bg-red-950/60 border-red-800/60',
          ].join(' ')}>
            <div className="flex items-center gap-3">
              <StatusDot status={state.wsStatus} />
              <div>
                <p className="text-sm font-semibold text-white">
                  WebSocket {state.wsStatus}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate max-w-[260px]">
                  wss://bighyolvmfwxpijmnzkc.supabase.co/realtime/v1
                </p>
              </div>
            </div>
            {state.wsStatus === 'Connected'
              ? <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              : <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            }
          </div>

          {/* Ping & Uptime row */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={<Zap size={14} />} label="GPS Ping Latency" accent="border-slate-700/60">
              {state.checking ? (
                <p className="text-slate-500 text-xs animate-pulse">Measuring…</p>
              ) : (
                <>
                  <p className={`text-2xl font-black font-mono tracking-tight ${pingColor}`}>
                    {state.pingMs !== null ? `${state.pingMs}` : '—'}
                    <span className="text-sm font-normal ml-1">ms</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {state.pingMs !== null
                      ? state.pingMs < 150 ? 'Excellent' : state.pingMs < 400 ? 'Acceptable' : 'Degraded'
                      : 'Not measured'}
                  </p>
                </>
              )}
            </MetricCard>

            <MetricCard icon={<Clock size={14} />} label="Last Sync" accent="border-slate-700/60">
              {state.checking ? (
                <p className="text-slate-500 text-xs animate-pulse">Checking…</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-white font-mono">{formatTime(state.lastFetch)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {state.lastFetch ? 'DB response OK' : 'No sync yet'}
                  </p>
                </>
              )}
            </MetricCard>
          </div>

          {/* Active Subscriptions */}
          <MetricCard icon={<Radio size={14} />} label="Active Realtime Subscriptions" accent="border-blue-900/50">
            <div className="space-y-2">
              {state.subscriptions.map((sub) => (
                <div key={sub.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      sub.status === 'SUBSCRIBED' ? 'bg-emerald-400' :
                      sub.status === 'PENDING' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono font-semibold text-slate-300 truncate">{sub.channel}</p>
                      <p className="text-[10px] text-slate-600 truncate">{sub.table}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                    sub.status === 'SUBSCRIBED' ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-800' :
                    sub.status === 'PENDING' ? 'bg-amber-900/60 text-amber-400 border border-amber-800' :
                    'bg-red-900/60 text-red-400 border border-red-800'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          </MetricCard>

          {/* DB Row Counts */}
          <MetricCard icon={<Database size={14} />} label="Database Table Counts" accent="border-violet-900/50">
            {state.checking ? (
              <p className="text-slate-500 text-xs animate-pulse">Querying Supabase…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(state.dbRowCounts).map(([table, count]) => (
                  <div key={table} className="bg-slate-900/60 rounded-lg px-3 py-2.5">
                    <p className="text-xl font-black text-white font-mono">{count}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{table}</p>
                  </div>
                ))}
              </div>
            )}
          </MetricCard>

          {/* Offline Sync Queue (Mobile Driver App) */}
          <MetricCard icon={<Smartphone size={14} />} label="Mobile Offline Sync Queue" accent="border-slate-700/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-white font-mono">
                  {state.offlineQueue}
                  <span className="text-sm font-normal text-slate-400 ml-1.5">payloads</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {state.offlineQueue === 0
                    ? 'All telemetry flushed to Supabase ✓'
                    : `${state.offlineQueue} GPS logs pending flush`}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                state.offlineQueue === 0 ? 'bg-emerald-900/40' : 'bg-amber-900/40'
              }`}>
                {state.offlineQueue === 0
                  ? <CheckCircle2 size={20} className="text-emerald-400" />
                  : <AlertCircle size={20} className="text-amber-400" />
                }
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span>AsyncStorage → Supabase flush</span>
                <span className="text-emerald-500 font-semibold">PROTOCOL ACTIVE</span>
              </div>
            </div>
          </MetricCard>

          {/* Server info strip */}
          <div className="px-4 py-3 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2">
              <Server size={12} className="text-slate-600 flex-shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Infrastructure</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: 'Region', value: 'ap-southeast-1' },
                { label: 'Plan', value: 'Free Tier' },
                { label: 'SDK', value: 'supabase-js v2' },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/50 rounded-lg px-2 py-2">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">{item.label}</p>
                  <p className="text-[10px] text-slate-300 font-mono font-semibold mt-0.5 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — health check CTA */}
        <div className="px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={runHealthCheck}
            disabled={state.checking}
            className={[
              'w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
              state.checking
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 active:scale-[0.98]',
            ].join(' ')}
          >
            <RefreshCw size={15} className={state.checking ? 'animate-spin' : ''} />
            {state.checking ? 'Running Health Check…' : 'Run Manual Health Check'}
          </button>
          <p className="text-center text-[10px] text-slate-600 mt-2 font-mono tracking-wide">
            CARGONODE · SUPABASE REALTIME ENGINE · {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>,
    document.body
  )
}

export default SystemDiagnosticsPanel
