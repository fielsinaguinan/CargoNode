import React, { useState, useEffect } from 'react'
import {
  Truck,
  Plus,
  Loader2,
  Sparkles,
  X,
  Hash,
  MoreHorizontal,
  CreditCard,
  Weight
} from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'

interface PrimeMover {
  id: string
  plate_number?: string
  capacity?: string
  status: string
  updated_at: string
}

const FleetRegistry: React.FC = () => {
  const [trucks, setTrucks] = useState<PrimeMover[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form state
  const [truckId, setTruckId] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [capacity, setCapacity] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTrucks = async () => {
    const { data } = await supabase
      .from('prime_movers')
      .select('id, plate_number, capacity, status, updated_at')
      .order('id', { ascending: true })
    if (data) setTrucks(data as PrimeMover[])
    setLoading(false)
  }

  useEffect(() => {
    fetchTrucks()

    const channel = supabase
      .channel('fleet_registry_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prime_movers' }, () => {
        fetchTrucks()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!truckId || !plateNumber || !capacity) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('prime_movers').insert([{
        id: truckId,
        plate_number: plateNumber,
        capacity: capacity,
        status: 'Maintenance'
      }])

      if (error) throw error

      showToast('✨ Asset Successfully Registered!')
      setIsModalOpen(false)
      setTruckId('')
      setPlateNumber('')
      setCapacity('')
    } catch (err) {
      console.error('Error registering asset:', err)
      showToast('Failed to register asset')
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
      case 'In Transit': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
      case 'Pier Standby': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
      case 'Maintenance': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      case 'Signal Lost': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800/50'
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    }
  }

  return (
    <>
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[60] animate-fade-in-down">
          <div className="bg-slate-900/90 backdrop-blur-xl text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-400" />
            {toastMessage}
          </div>
        </div>
      )}

      <div className="space-y-7 animate-fade-in-down">

      <PageHeader
        title="Asset Registry"
        subtitle="Manage and register prime movers into the active fleet"
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-500/30 transition-all card-hover"
          >
            <Plus size={16} />
            Add New Prime Mover
          </button>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Truck size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fleet Roster</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{trucks.length} registered prime movers</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Sync
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                  {['Asset ID', 'Plate Number', 'Capacity', 'Current Status', 'Last Updated', ''].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {trucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors duration-100 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                          <Truck size={14} />
                        </div>
                        <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{truck.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{truck.plate_number || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{truck.capacity || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge(truck.status)}`}>
                        {truck.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(truck.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {trucks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Truck size={32} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No prime movers registered yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>

      {/* Add Truck Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-slide-up overflow-hidden">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Truck size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Register Asset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add a new prime mover to the fleet</p>
              </div>
            </div>

            <form onSubmit={handleAddTruck} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">Asset ID</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. PM-105"
                    value={truckId}
                    onChange={(e) => setTruckId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">Plate Number</label>
                <div className="relative">
                  <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC-1234"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">Capacity / Class</label>
                <div className="relative">
                  <Weight size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 40-footer Chassis"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 transition-all shadow-lg shadow-blue-500/30"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default FleetRegistry
