import React from 'react'
import { LifeBuoy, Book, MessageCircle, FileQuestion, ExternalLink } from 'lucide-react'
import PageHeader from '../PageHeader'

const Help: React.FC = () => {
  return (
    <div className="space-y-7 animate-fade-in-down">
      <PageHeader
        title="Help & Support"
        subtitle="Get assistance and learn how to use the CargoNode platform"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Contact Support */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center shadow-sm card-hover">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <LifeBuoy size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Live Support</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
            Need immediate assistance? Our dispatch support team is available 24/7 to help resolve critical issues.
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all">
            <MessageCircle size={16} />
            Start Chat
          </button>
        </div>

        {/* Documentation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center shadow-sm card-hover">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <Book size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Documentation</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
            Browse our comprehensive guides and API references to integrate and use CargoNode effectively.
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all">
            <ExternalLink size={16} />
            Read Docs
          </button>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center shadow-sm card-hover">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
            <FileQuestion size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Knowledge Base</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
            Find answers to common questions about waybill processing, fleet tracking, and settings.
          </p>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all">
            <ExternalLink size={16} />
            Browse FAQs
          </button>
        </div>

      </div>
    </div>
  )
}

export default Help
