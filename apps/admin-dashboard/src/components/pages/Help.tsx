import React, { useState } from 'react'
import { Book, FileQuestion, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../PageHeader'

const Help: React.FC = () => {
  const [showFAQ, setShowFAQ] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const faqs = [
    {
      q: 'How do I add a new Prime Mover to the Fleet Registry?',
      a: 'Navigate to the "Asset Registry" under Administration. Click "Add Truck", fill in the Plate Number and Capacity, and click Save. The new truck will appear in the registry immediately.'
    },
    {
      q: 'What does "Pier Standby" mean on the Dispatch Board?',
      a: 'Pier Standby indicates that a truck has arrived at the port/pier and is waiting to be loaded with cargo. Once loaded, you can update its status to "In Transit".'
    },
    {
      q: 'How does Role-Based Access Control work?',
      a: 'Superadmins have full access to all modules including Analytics and Administration. Dispatchers and Maintenance roles have restricted access and cannot view personnel or financial data.'
    },
    {
      q: 'Why am I seeing "Access Denied"?',
      a: 'You are attempting to access a module that is restricted to Superadmins. If you believe this is an error, please contact your system administrator to elevate your role.'
    }
  ]

  return (
    <div className="space-y-7 animate-fade-in-down pb-20">
      <PageHeader
        title="Help & Support"
        subtitle="Get assistance and learn how to use the CargoNode platform"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Documentation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <Book size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Documentation</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
            Browse our comprehensive guides and API references to integrate and use CargoNode effectively.
          </p>
          <button 
            onClick={() => alert('Documentation module coming soon!')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
          >
            <ExternalLink size={16} />
            Read Docs
          </button>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
            <FileQuestion size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Knowledge Base</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
            Find answers to common questions about waybill processing, fleet tracking, and settings.
          </p>
          <button 
            onClick={() => setShowFAQ(!showFAQ)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all"
          >
            <ExternalLink size={16} />
            {showFAQ ? 'Hide FAQs' : 'Browse FAQs'}
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      {showFAQ && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm animate-fade-in-down mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileQuestion size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{faq.q}</span>
                  {expandedFaq === idx ? (
                    <ChevronUp size={20} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-500" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <div className="p-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-700 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Help

