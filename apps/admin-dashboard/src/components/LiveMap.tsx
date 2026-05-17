import React, { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Truck, Wifi } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────

interface TruckMarker {
  id: string
  status: string
  lat: number
  lng: number
  waybill: string | null
  lastSeen: string | null
}

interface LiveMapProps {
  /** Waybills already fetched by parent — avoids a duplicate query */
  waybills: { tracking_number: string; prime_mover_id: string | null; status: string }[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MANILA: [number, number] = [14.5995, 120.9842]
const DEFAULT_ZOOM = 12

// CARTO Dark Matter tiles — no API key required, looks stunning
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

const STATUS_COLOR: Record<string, string> = {
  'In Transit':   '#10b981', // emerald
  'Active':       '#3b82f6', // blue
  'Pier Standby': '#f59e0b', // amber
  'Maintenance':  '#6b7280', // slate
  'Signal Lost':  '#94a3b8', // muted
}

const STATUS_LABEL_COLOR: Record<string, string> = {
  'In Transit':   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'Active':       'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'Pier Standby': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'Maintenance':  'text-slate-400 bg-slate-400/10 border-slate-400/30',
  'Signal Lost':  'text-slate-500 bg-slate-500/10 border-slate-500/30',
}

// Manila area cluster points for trucks with no GPS data — spread so they don't overlap
const GPS_FALLBACK_OFFSETS: [number, number][] = [
  [14.5935, 120.9798],
  [14.6050, 120.9900],
  [14.5880, 120.9920],
  [14.6100, 120.9750],
  [14.5750, 120.9850],
]

// ─── Sub-component: auto-fit bounds when markers change ─────────────────────

function MapBoundsFitter({ markers }: { markers: TruckMarker[] }) {
  const map = useMap()
  useEffect(() => {
    const validMarkers = markers.filter(m => m.lat && m.lng)
    if (validMarkers.length === 0) {
      map.setView(MANILA, DEFAULT_ZOOM)
      return
    }
    if (validMarkers.length === 1) {
      map.setView([validMarkers[0].lat, validMarkers[0].lng], DEFAULT_ZOOM)
      return
    }
    const lats = validMarkers.map(m => m.lat)
    const lngs = validMarkers.map(m => m.lng)
    map.fitBounds(
      [[Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
       [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01]],
      { padding: [40, 40], maxZoom: 13 }
    )
  }, [markers.length]) // only re-fit when number of markers changes
  return null
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LiveMap({ waybills }: LiveMapProps) {
  const [markers, setMarkers] = useState<TruckMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [lastPing, setLastPing] = useState<Date | null>(null)

  // ── Build waybill lookup for prime_mover_id → tracking_number ────────────
  const activeWaybillFor = useCallback((pmId: string): string | null => {
    const match = waybills.find(
      w => w.prime_mover_id === pmId && (w.status === 'In Transit' || w.status === 'Loading')
    )
    return match?.tracking_number ?? null
  }, [waybills])

  // ── Fetch prime movers + latest GPS positions ─────────────────────────────
  const loadMarkers = useCallback(async () => {
    try {
      // 1. Fetch all prime movers
      const { data: pms, error: pmsError } = await supabase
        .from('prime_movers')
        .select('id, status, last_sync')
        .order('id')

      if (pmsError) {
        console.error('Error fetching prime movers:', pmsError)
        return
      }

      if (!pms || pms.length === 0) {
        setMarkers([])
        setLastPing(new Date())
        return
      }

      // 2. Fetch the single most recent GPS log per prime mover
      const { data: latestLogs } = await supabase
        .from('gps_logs')
        .select('prime_mover_id, latitude, longitude, timestamp')
        .order('timestamp', { ascending: false })
        .limit(Math.max(1, pms.length * 3)) // grab a few per truck

      // Build a map: prime_mover_id → most recent log
      const latestByPm: Record<string, { lat: number; lng: number; ts: string }> = {}
      if (latestLogs) {
        for (const log of latestLogs) {
          if (!latestByPm[log.prime_mover_id]) {
            latestByPm[log.prime_mover_id] = {
              lat: log.latitude,
              lng: log.longitude,
              ts: log.timestamp,
            }
          }
        }
      }

      // 3. Merge into marker data, use fallback coords for trucks with no GPS
      const built: TruckMarker[] = pms.map((pm, idx) => {
        const gpsLog = latestByPm[pm.id]
        const fallback = GPS_FALLBACK_OFFSETS[idx % GPS_FALLBACK_OFFSETS.length]
        return {
          id: pm.id,
          status: pm.status,
          lat: gpsLog?.lat ?? fallback[0],
          lng: gpsLog?.lng ?? fallback[1],
          waybill: activeWaybillFor(pm.id),
          lastSeen: gpsLog?.ts ?? pm.last_sync ?? null,
        }
      })

      setMarkers(built)
      setLastPing(new Date())
    } finally {
      setLoading(false)
    }
  }, [activeWaybillFor])

  useEffect(() => {
    loadMarkers()

    // Real-time: new GPS log → update that truck's marker position
    const gpsChannel = supabase
      .channel('live_map_gps')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gps_logs' }, (payload) => {
        const { prime_mover_id, latitude, longitude, timestamp } = payload.new as any
        setMarkers(prev =>
          prev.map(m =>
            m.id === prime_mover_id
              ? { ...m, lat: latitude, lng: longitude, lastSeen: timestamp }
              : m
          )
        )
        setLastPing(new Date())
      })
      .subscribe()

    // Real-time: prime_mover status change → update marker status
    const pmChannel = supabase
      .channel('live_map_pm')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'prime_movers' }, (payload) => {
        const pm = payload.new as any
        setMarkers(prev =>
          prev.map(m =>
            m.id === pm.id
              ? { ...m, status: pm.status }
              : m
          )
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gpsChannel)
      supabase.removeChannel(pmChannel)
    }
  }, [loadMarkers])

  const inTransitCount = markers.filter(m => m.status === 'In Transit').length
  const totalTracked = markers.filter(m => m.lat && m.lng).length

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {/* CSS for pulsing animation injected inline */}
      <style>{`
        @keyframes map-ping {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .truck-pulse { animation: map-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          border: 1px solid #1e293b !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
          color: #e2e8f0 !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip { background: #0f172a !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.5) !important; color: #475569 !important; font-size: 9px !important; }
        .leaflet-control-zoom a { background: #1e293b !important; color: #94a3b8 !important; border-color: #334155 !important; }
        .leaflet-control-zoom a:hover { background: #334155 !important; color: #e2e8f0 !important; }
      `}</style>

      {/* Loading Skeleton */}
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-slate-950 flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-slate-500 text-xs ml-1">Loading fleet positions...</span>
        </div>
      )}

      {/* The Map */}
      <MapContainer
        center={MANILA}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%', background: '#0a0f1a' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <ZoomControl position="bottomright" />
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <MapBoundsFitter markers={markers} />

        {markers.map(truck => {
          const color = STATUS_COLOR[truck.status] || '#94a3b8'
          const isMoving = truck.status === 'In Transit' || truck.status === 'Active'
          const pos: [number, number] = [truck.lat, truck.lng]

          return (
            <React.Fragment key={truck.id}>
              {/* Outer pulse ring for active trucks */}
              {isMoving && (
                <CircleMarker
                  center={pos}
                  radius={18}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 0 }}
                  interactive={false}
                />
              )}
              {/* Main truck dot */}
              <CircleMarker
                center={pos}
                radius={10}
                pathOptions={{
                  color: 'white',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.95,
                }}
              >
                <Popup minWidth={220} maxWidth={260}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 800, fontSize: '15px', color: '#f1f5f9' }}>{truck.id}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>STATUS</div>
                    <div style={{ fontSize: '13px', color: color, fontWeight: 700, marginBottom: '12px' }}>{truck.status}</div>

                    {truck.waybill && (
                      <>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>ACTIVE WAYBILL</div>
                        <div style={{
                          background: '#1e293b', borderRadius: '8px', padding: '8px 10px',
                          fontFamily: 'monospace', fontSize: '12px', color: '#60a5fa',
                          fontWeight: 700, marginBottom: '12px', letterSpacing: '0.05em'
                        }}>
                          {truck.waybill}
                        </div>
                      </>
                    )}

                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>COORDINATES</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                      {truck.lat.toFixed(5)}, {truck.lng.toFixed(5)}
                    </div>

                    {truck.lastSeen && (
                      <div style={{ marginTop: '8px', fontSize: '10px', color: '#475569' }}>
                        Last ping: {new Date(truck.lastSeen).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Top-left overlay: live status badges */}
      <div className="absolute top-3 left-3 z-[999] flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-white text-xs px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">{inTransitCount} In Transit</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-full">
          <Truck size={11} />
          <span>{totalTracked} vehicles tracked</span>
        </div>
      </div>

      {/* Top-right overlay: last ping timestamp */}
      <div className="absolute top-3 right-3 z-[999] pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-xs px-3 py-1.5 rounded-full">
          <Wifi size={11} className="text-emerald-400" />
          <span className="text-slate-400">
            {lastPing ? `Live · ${lastPing.toLocaleTimeString()}` : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Bottom legend */}
      <div className="absolute bottom-3 left-3 z-[999] pointer-events-none">
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-xl">
          {Object.entries(STATUS_COLOR).slice(0, 4).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
