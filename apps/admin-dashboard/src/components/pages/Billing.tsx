import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { CheckCircle, XCircle, Plus, Eye, Loader2 } from 'lucide-react'

const Billing = () => {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<any[]>([])
  
  // Create Invoice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInvoice, setNewInvoice] = useState({ client_id: '', amount: '', due_date: '' })
  const [creating, setCreating] = useState(false)
  
  // Proof Viewer Modal State
  const [showProofModal, setShowProofModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchInvoices = async () => {
    setLoading(true)
    const { data: invData } = await supabase
      .from('invoices')
      .select('*, client_profiles(company_name, email)')
      .order('created_at', { ascending: false })
    
    if (invData) setInvoices(invData)
    
    const { data: clientData } = await supabase.from('client_profiles').select('*')
    if (clientData) setClients(clientData)
      
    setLoading(false)
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const invoice_number = `INV-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`

      const { error } = await supabase.from('invoices').insert([{
        client_id: newInvoice.client_id,
        amount: parseFloat(newInvoice.amount),
        due_date: newInvoice.due_date || null,
        invoice_number,
        status: 'Pending'
      }])

      if (error) throw error

      setShowCreateModal(false)
      setNewInvoice({ client_id: '', amount: '', due_date: '' })
      fetchInvoices()
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice')
    } finally {
      setCreating(false)
    }
  }

  const handleViewProof = async (invoice: any) => {
    setSelectedInvoice(invoice)
    setShowProofModal(true)
    
    if (invoice.proof_url) {
      try {
        const { data, error } = await supabase.storage.from('payment_proofs').createSignedUrl(invoice.proof_url, 60 * 60)
        if (error) throw error
        setProofUrl(data.signedUrl)
      } catch (err: any) {
        console.error(err)
        setProofUrl(null)
      }
    } else {
      setProofUrl(null)
    }
  }

  const updateInvoiceStatus = async (id: string, status: string) => {
    setUpdating(true)
    try {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
      if (error) throw error
      fetchInvoices()
      if (showProofModal) setShowProofModal(false)
    } catch (err: any) {
      alert(err.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-display tracking-tight">Billing & Invoices</h1>
          <p className="text-sm text-slate-500">Manage client payments and verify bank transfers.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice / Client</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date / Due Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">No invoices found.</td>
                </tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-500">{inv.client_profiles?.company_name || inv.client_profiles?.email || 'Unknown Client'}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {inv.currency} {Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-slate-700 dark:text-slate-300">{new Date(inv.created_at).toLocaleDateString()}</p>
                    {inv.due_date && <p className="text-[10px] text-slate-400">Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      inv.status === 'Under Review' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                      inv.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {inv.status === 'Under Review' && inv.proof_url && (
                      <button 
                        onClick={() => handleViewProof(inv)}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer inline-flex"
                        title="Review Proof"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    {inv.status === 'Pending' && (
                      <button 
                        onClick={() => updateInvoiceStatus(inv.id, 'Paid')}
                        disabled={updating}
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer inline-flex"
                        title="Mark as Paid"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 animate-fade-in-up">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Create Manual Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Select Client</label>
                <select 
                  required
                  value={newInvoice.client_id}
                  onChange={e => setNewInvoice({...newInvoice, client_id: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary transition-all dark:text-white"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name || c.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Amount (PHP)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={newInvoice.amount}
                  onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary transition-all dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Due Date (Optional)</label>
                <input 
                  type="date" 
                  value={newInvoice.due_date}
                  onChange={e => setNewInvoice({...newInvoice, due_date: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary transition-all dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-70">
                  {creating ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Viewer Modal */}
      {showProofModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowProofModal(false)}></div>
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Proof of Payment Review</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setShowProofModal(false)} className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-400">
                <XCircle size={18} />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center min-h-[300px]">
              {proofUrl ? (
                proofUrl.includes('.pdf') ? (
                  <div className="w-full h-[400px]">
                     <iframe src={proofUrl} className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white" title="PDF Proof" />
                  </div>
                ) : (
                  <img src={proofUrl} alt="Payment Proof" className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800 bg-white" />
                )
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p className="text-sm">Loading secure document...</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
              <div className="text-sm">
                <p className="text-slate-500">Amount to verify:</p>
                <p className="font-bold text-slate-800 dark:text-white text-lg">{selectedInvoice.currency} {Number(selectedInvoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => updateInvoiceStatus(selectedInvoice.id, 'Rejected')}
                  disabled={updating}
                  className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button 
                  onClick={() => updateInvoiceStatus(selectedInvoice.id, 'Paid')}
                  disabled={updating}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle size={16} /> Approve & Mark Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Billing
