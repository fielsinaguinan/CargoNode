import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  badge?: {
    label: string
    color: string
  }
  actions?: React.ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions }) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight font-[Plus_Jakarta_Sans,sans-serif]">
            {title}
          </h1>
          {badge && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider ${badge.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
              {badge.label}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

export default PageHeader
