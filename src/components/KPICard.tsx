import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  sub: string
  trend: 'up' | 'down'
  icon: React.ReactNode
  accent: string
  iconBg: string
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, trend, icon, iconBg }) => {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 card-hover overflow-hidden">
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} flex-shrink-0`}>
          {icon}
        </div>
        {/* Trend */}
        <div
          className={[
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend === 'up'
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-red-600 bg-red-50',
          ].join(' ')}
        >
          {trend === 'up'
            ? <TrendingUp size={11} />
            : <TrendingDown size={11} />
          }
          {trend === 'up' ? '+' : '−'}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 tracking-tight font-[Plus_Jakarta_Sans,sans-serif]">
          {value}
        </p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
        <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
      </div>
    </div>
  )
}

export default KPICard
