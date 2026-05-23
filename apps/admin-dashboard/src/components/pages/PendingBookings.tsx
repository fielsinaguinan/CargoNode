import React, { useState, useEffect } from 'react'
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Package,
  Loader2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'

interface Booking {
  id: string
  client_name: string
  origin: string
  destination: string
  container_type: string
  target_date: string
  status: string
  created_at: string
}

const PendingBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('customer_bookings')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setBookings(data as Booking[])
    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()

    const channel = supabase
      .channel('pending_bookings_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_bookings' }, () => {
        fetchBookings()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const generateWaybillNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'WB-'
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
  }

  const handleApprove = async (booking: Booking) => {
    setActionLoading(booking.id)
    try {
      const waybillNumber = generateWaybillNumber()

      // 1. Create official waybill
      const { error: waybillErr } = await supabase.from('waybills').insert([{
        tracking_number: waybillNumber,
        client_name: booking.client_name,
        origin: booking.origin,
        destination: booking.destination,
        container_type: booking.container_type,
        status: 'Loading',
      }])
      if (waybillErr) throw waybillErr

      // 2. Insert initial milestone
      await supabase.from('tracking_milestones').insert([{
        waybill_id: waybillNumber,
        title: 'Manifest Generated',
        location: booking.origin,
        status: 'completed',
        order_index: 1,
      }])

      // 3. Update booking status
      await supabase
        .from('customer_bookings')
        .update({ status: 'Approved' })
        .eq('id', booking.id)

      // 4. Create notification
      await supabase.from('notifications').insert([{
        type: 'success',
        title: 'Booking Approved',
        description: `Booking from ${booking.client_name} approved. Waybill ${waybillNumber} created.`,
      }])

      showToast(`✓ Approved — Waybill ${waybillNumber} created`)
    } catch (err) {
      console.error('Approve error:', err)
      showToast('Failed to approve booking')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (booking: Booking) => {
    setActionLoading(booking.id)
    try {
      await supabase
        .from('customer_bookings')
        .update({ status: 'Rejected' })
        .eq('id', booking.id)

      await supabase.from('notifications').insert([{
        type: 'alert',
        title: 'Booking Rejected',
        description: `Booking request from ${booking.client_name} (${booking.origin} → ${booking.destination}) was rejected.`,
      }])

      showToast('Booking rejected')
    } catch (err) {
      console.error('Reject error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const pendingBookings = bookings.filter(b => b.status === 'Pending')
  const processedBookings = bookings.filter(b => b.status !== 'Pending')

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Loading bookings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-7 animate-fade-in-down">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in-down">
          <div className="bg-slate-900/90 backdrop-blur-xl text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            {toastMessage}
          </div>
        </div>
      )}

      <PageHeader
        title="Pending Bookings"
        subtitle="Review and process customer freight booking requests"
        badge={{ label: pendingBookings.length > 0 ? `${pendingBookings.length} Pending` : 'All Clear', color: pendingBookings.length > 0 ? 'bg-amber-500' : 'bg-emerald-500' }}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: bookings.length.toString(), sub: 'All time', color: 'text-slate-800 dark:text-slate-200', borderTop: 'border-t-slate-400' },
          { label: 'Pending Review', value: pendingBookings.length.toString(), sub: 'Awaiting action', color: 'text-amber-700', borderTop: 'border-t-amber-500' },
          { label: 'Approved', value: bookings.filter(b => b.status === 'Approved').length.toString(), sub: 'Waybills created', color: 'text-emerald-700', borderTop: 'border-t-emerald-500' },
          { label: 'Rejected', value: bookings.filter(b => b.status === 'Rejected').length.toString(), sub: 'Declined', color: 'text-red-700', borderTop: 'border-t-red-500' },
        ].map((s) => (
          <div key={s.label} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4 card-hover border-t-2 ${s.borderTop}`}>
            <p className={`text-xl font-bold tracking-tight ${s.color} font-[Plus_Jakarta_Sans,sans-serif]`}>{s.value}</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{s.label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pending Bookings Table */}
      {pendingBookings.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-b from-white dark:from-slate-900 to-slate-50/50 dark:to-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <ClipboardList size={18} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pending Review</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{pendingBookings.length} request{pendingBookings.length !== 1 ? 's' : ''} awaiting dispatch action</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full font-bold border border-amber-200">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              Live
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                  {['Client', 'Route', 'Container', 'Target Date', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {pendingBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors duration-100 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 font-bold text-xs">
                          {b.client_name.charAt(0)}
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.client_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <MapPin size={12} className="text-blue-500 opacity-70" />
                        {b.origin}
                        <ArrowRight size={10} className="mx-0.5 text-slate-300" />
                        {b.destination}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Package size={11} className="text-slate-400 dark:text-slate-500" />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.container_type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar size={11} />
                        {new Date(b.target_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <Clock size={11} />
                        {new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(b)}
                          disabled={actionLoading === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
                        >
                          {actionLoading === b.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(b)}
                          disabled={actionLoading === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          <XCircle size={12} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Processed Bookings History */}
      {processedBookings.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Processed History</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{processedBookings.length} processed booking{processedBookings.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                  {['Client', 'Route', 'Container', 'Target Date', 'Status'].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {processedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0 text-xs font-bold">
                          {b.client_name.charAt(0)}
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{b.client_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{b.origin} → {b.destination}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{b.container_type}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(b.target_date).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {bookings.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
          <ClipboardList size={40} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">No Booking Requests Yet</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Customer booking requests from the Client Portal will appear here.</p>
        </div>
      )}
    </div>
  )
}

export default PendingBookings
