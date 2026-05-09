import React from 'react'
import { Package2, Search, Filter, Plus, FileText, ArrowUpRight } from 'lucide-react'
import PageHeader from '../PageHeader'

const Inventory: React.FC = () => {
  return (
    <div className="space-y-7 animate-fade-in-down">
      <PageHeader
        title="Cargo Inventory"
        subtitle="Manage and track all warehoused and staged cargo"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-500/30 transition-all">
            <Plus size={16} />
            Receive Cargo
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search SKU, waybill, or consignee..." 
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Filter size={16} />
            Filters
          </button>
        </div>

        {/* Empty State / Placeholder Table */}
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <Package2 size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No cargo found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Your inventory is currently empty or no items match your search filters. Receive new cargo to begin tracking inventory.
          </p>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <FileText size={16} />
              Import CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors">
              <ArrowUpRight size={16} />
              Manual Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Inventory
