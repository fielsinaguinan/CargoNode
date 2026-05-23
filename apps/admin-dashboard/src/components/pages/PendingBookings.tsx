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
  client_id?: string
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

      // 1. Create official waybill (carrying over client_id UUID)
      const { error: waybillErr } = await supabase.from('waybills').insert([{
        tracking_number: waybillNumber,
        client_name: booking.client_name,
        origin: booking.origin,
        destination: booking.destination,
        container_type: booking.container_type,
        status: 'Loading',
        client_id: booking.client_id || null,
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
      case 'Approved': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'Rejected': return 'bg-destructive/10 text-destructive border-destructive/20'
      default: return 'bg-accent/10 text-accent border-accent/20'
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
          { label: 'Total Requests', value: bookings.length.toString(), sub: 'All time', color: 'text-slate-800 dark:text-slate-200', borderTop: 'border-t-primary' },
          { label: 'Pending Review', value: pendingBookings.length.toString(), sub: 'Awaiting action', color: 'text-accent', borderTop: 'border-t-accent' },
          { label: 'Approved', value: bookings.filter(b => b.status === 'Approved').length.toString(), sub: 'Waybills created', color: 'text-emerald-500', borderTop: 'border-t-emerald-500' },
          { label: 'Rejected', value: bookings.filter(b => b.status === 'Rejected').length.toString(), sub: 'Declined', color: 'text-destructive', borderTop: 'border-t-destructive' },
        ].map((s) => (
          <div key={s.label} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm px-5 py-5 card-hover border-t-2 ${s.borderTop} transition-all duration-200`}>
            <p className={`text-2xl font-bold tracking-tight ${s.color} font-display`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">{s.label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pending Bookings Table */}
      {pendingBookings.length > 0 && (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <ClipboardList size={18} className="text-accent" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-display">Pending Review</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{pendingBookings.length} request{pendingBookings.length !== 1 ? 's' : ''} awaiting dispatch action</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-accent bg-accent/10 px-3 py-1.5 rounded-full font-bold border border-accent/20">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-dot"></div>
              LIVE
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/20">
                  {['Client', 'Route', 'Container', 'Target Date', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                {pendingBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 font-bold text-xs shadow-sm">
                          {b.client_name.charAt(0)}
                        </div>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 font-display">{b.client_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                        <MapPin size={14} className="text-primary opacity-80" />
                        {b.origin}
                        <ArrowRight size={12} className="mx-1 text-slate-300 dark:text-slate-600" />
                        {b.destination}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-slate-400 dark:text-slate-500" />
                        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{b.container_type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 font-mono">
                        <Calendar size={14} />
                        {new Date(b.target_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[13px] text-slate-400 dark:text-slate-500 font-mono">
                        <Clock size={14} />
                        {new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleApprove(b)}
                          disabled={actionLoading === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoading === b.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(b)}
                          disabled={actionLoading === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle size={14} />
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
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-slate-100/50 dark:border-slate-800/50">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-display">Processed History</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{processedBookings.length} processed booking{processedBookings.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/20">
                  {['Client', 'Route', 'Container', 'Target Date', 'Status'].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-6 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                {processedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0 text-xs font-bold">
                          {b.client_name.charAt(0)}
                        </div>
                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 font-display">{b.client_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">{b.origin} → {b.destination}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">{b.container_type}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-[13px] text-slate-500 dark:text-slate-400 font-mono">{new Date(b.target_date).toLocaleDateString()}</span>
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
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-12 text-center">
          <ClipboardList size={40} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 font-display">No Booking Requests Yet</h3>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-2">Customer booking requests from the Client Portal will appear here.</p>
        </div>
      )}
    </div>
  )
}

export default PendingBookings
