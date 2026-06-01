import React, { useState, useEffect } from 'react'
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Truck,
  Plus,
  MoreHorizontal,
  ChevronRight,
  MapPin,
  X,
} from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'

interface MaintenanceAlert {
  id: string
  alert_type: string
  triggered_at_mileage: number
  status: string
}

interface PrimeMover {
  id: string
  status: string
  current_location: string
  last_sync: string
  maintenance_alerts: MaintenanceAlert[] | null
}

const statusCfg = {
  ok:          { label: 'Good',       color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: <CheckCircle2 size={13} /> },
  due:         { label: 'Service Due', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',     icon: <AlertTriangle size={13} /> },
  'in-service': { label: 'In Service', color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',  icon: <Wrench size={13} /> },
}

const Maintenance: React.FC = () => {
  const [primeMovers, setPrimeMovers] = useState<PrimeMover[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    prime_mover_id: '',
    alert_type: '',
    triggered_at_mileage: '',
  })

  const fetchMaintenanceData = async () => {
    const { data } = await supabase
      .from('prime_movers')
      .select(`
        id, status, current_location, last_sync,
        maintenance_alerts ( id, alert_type, triggered_at_mileage, status )
      `)
      .order('id', { ascending: true })
      
    if (data) {
      const mapped = data.map(pm => ({
        ...pm,
        maintenance_alerts: pm.maintenance_alerts ? (pm.maintenance_alerts as any[]).filter((a) => a.status === 'Pending') : []
      }))
      setPrimeMovers(mapped as PrimeMover[])
    }
  }

  useEffect(() => {
    fetchMaintenanceData()

    const channel = supabase
      .channel('maintenance_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_alerts' }, () => {
        fetchMaintenanceData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prime_movers' }, () => {
        fetchMaintenanceData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getMappedStatus = (pm: PrimeMover) => {
    if (pm.status === 'Maintenance') return 'in-service'
    if (pm.maintenance_alerts && pm.maintenance_alerts.length > 0) return 'due'
    return 'ok'
  }

  const handleScheduleService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.prime_mover_id || !formData.alert_type || !formData.triggered_at_mileage) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('maintenance_alerts')
      .insert({
        prime_mover_id: formData.prime_mover_id,
        alert_type: formData.alert_type,
        triggered_at_mileage: parseFloat(formData.triggered_at_mileage),
        status: 'Pending',
      })

    setIsSubmitting(false)
    if (!error) {
      setIsModalOpen(false)
      setFormData({ prime_mover_id: '', alert_type: '', triggered_at_mileage: '' })
      fetchMaintenanceData()
    } else {
      alert('Failed to schedule service: ' + error.message)
    }
  }

  return (
    <div className="space-y-7 relative">
      <PageHeader
        title="Fleet Maintenance"
        subtitle="Monitor vehicle health, service schedules and maintenance records"
        actions={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/30 transition-all duration-150"
          >
            <Plus size={15} />
            Schedule Service
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Fleet', value: primeMovers.length.toString(), icon: <Truck size={16} />, bg: 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400' },
          { label: 'Service Due', value: primeMovers.filter(v => getMappedStatus(v) === 'due').length.toString(), icon: <AlertTriangle size={16} />, bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
          { label: 'In Service', value: primeMovers.filter(v => getMappedStatus(v) === 'in-service').length.toString(), icon: <Wrench size={16} />, bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
          { label: 'Healthy', value: primeMovers.filter(v => getMappedStatus(v) === 'ok').length.toString(), icon: <CheckCircle2 size={16} />, bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
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
        {primeMovers.map((v) => {
          const statusState = getMappedStatus(v)
          const cfg = statusCfg[statusState]
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
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">{v.id}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-slate-400" />
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                           {v.current_location || 'Terminal'}
                        </p>
                      </div>
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

              {/* Details */}
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Gauge size={11} /> Total Mileage</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold tracking-tight text-sm">-- <span className="font-medium text-xs text-slate-400">km</span></span>
                </div>
                
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Clock size={11} /> Last Sync</span>
                  <span className="text-slate-500 font-medium">
                    {v.last_sync ? new Date(v.last_sync).toLocaleString() : 'Offline'}
                  </span>
                </div>

                {/* Issues */}
                {v.maintenance_alerts && v.maintenance_alerts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {v.maintenance_alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-2 text-xs">
                        <AlertTriangle size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{alert.alert_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">DB Status: {v.status}</span>
                {v.status === 'Maintenance' ? (
                  <button 
                    onClick={async () => {
                      await supabase.from('prime_movers').update({ status: 'Pier Standby' }).eq('id', v.id)
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Release to Standby
                    <ChevronRight size={12} />
                  </button>
                ) : (
                  <button className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    View History
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Schedule Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Schedule Service</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleScheduleService} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Select Vehicle</label>
                <select 
                  required
                  value={formData.prime_mover_id}
                  onChange={(e) => setFormData({ ...formData, prime_mover_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="" disabled>Choose a prime mover...</option>
                  {primeMovers.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Service Required</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Engine Oil Change"
                  value={formData.alert_type}
                  onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Trigger Mileage</label>
                <input 
                  required
                  type="number"
                  placeholder="e.g. 50000"
                  value={formData.triggered_at_mileage}
                  onChange={(e) => setFormData({ ...formData, triggered_at_mileage: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/30 transition-all disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Maintenance
