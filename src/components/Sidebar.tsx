import React from 'react'
import {
  LayoutGrid,
  FileText,
  Wrench,
  BarChart3,
  X,
  ChevronRight,
  Truck,
  Package2,
  Settings,
  HelpCircle,
  LogOut,
  MonitorDot,
  PenTool,
} from 'lucide-react'
import type { NavItem } from '../App'

interface SidebarProps {
  activeNav: NavItem
  setActiveNav: (nav: NavItem) => void
  open: boolean
  onClose: () => void
}

interface NavLink {
  id: NavItem
  label: string
  icon: React.ReactNode
  badge?: string
  badgeColor?: string
}

interface NavGroup {
  groupLabel: string
  links: NavLink[]
}

const navGroups: NavGroup[] = [
  {
    groupLabel: 'Operations',
    links: [
      {
        id: 'dispatch',
        label: 'Dispatch Board',
        icon: <LayoutGrid size={17} strokeWidth={1.8} />,
        badge: '12',
        badgeColor: 'bg-blue-500',
      },
      {
        id: 'waybills',
        label: 'Cargo Waybills',
        icon: <FileText size={17} strokeWidth={1.8} />,
        badge: '3',
        badgeColor: 'bg-amber-500',
      },
      {
        id: 'allocator',
        label: 'Waybill Allocator',
        icon: <PenTool size={17} strokeWidth={1.8} />,
      },
    ],
  },
  {
    groupLabel: 'Fleet',
    links: [
      {
        id: 'fleet-monitor',
        label: 'Fleet Dispatch Monitor',
        icon: <MonitorDot size={17} strokeWidth={1.8} />,
        badge: 'Live',
        badgeColor: 'bg-emerald-600',
      },
      {
        id: 'maintenance',
        label: 'Maintenance',
        icon: <Wrench size={17} strokeWidth={1.8} />,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: <BarChart3 size={17} strokeWidth={1.8} />,
      },
    ],
  },
]

const Sidebar: React.FC<SidebarProps> = ({ activeNav, setActiveNav, open, onClose }) => {
  return (
    <aside
      className={[
        'fixed top-0 left-0 z-30 h-screen w-[260px]',
        'bg-slate-900 flex flex-col',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0 animate-slide-in-left' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      {/* ── Logo / Brand ── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo mark */}
          <div className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Truck size={18} className="text-white" strokeWidth={2} />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm tracking-tight leading-none font-[Plus_Jakarta_Sans,sans-serif]">
              CargoNode
            </p>
            <p className="text-slate-500 text-[10px] font-medium tracking-widest uppercase mt-0.5">
              CEBLE Trucking
            </p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-4 px-3">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5">
              {group.groupLabel}
            </p>
            <ul className="space-y-0.5">
              {group.links.map((link) => {
                const isActive = activeNav === link.id
                return (
                  <li key={link.id}>
                    <button
                      onClick={() => { setActiveNav(link.id); onClose() }}
                      className={[
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                        'transition-all duration-150 group relative',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                      ].join(' ')}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
                      )}

                      {/* Icon */}
                      <span
                        className={[
                          'transition-colors duration-150',
                          isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300',
                        ].join(' ')}
                      >
                        {link.icon}
                      </span>

                      {/* Label */}
                      <span className="flex-1 text-left">{link.label}</span>

                      {/* Badge or arrow */}
                      {link.badge ? (
                        <span
                          className={`${link.badgeColor ?? 'bg-slate-600'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none`}
                        >
                          {link.badge}
                        </span>
                      ) : (
                        <ChevronRight
                          size={13}
                          className={[
                            'transition-all duration-150',
                            isActive
                              ? 'text-slate-400 opacity-100'
                              : 'text-slate-600 opacity-0 group-hover:opacity-100',
                          ].join(' ')}
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {/* ── Quick stats strip ── */}
        <div className="mt-6 mx-1 rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-3">
            Fleet Status
          </p>
          <div className="space-y-2.5">
            {[
              { label: 'Active Trucks', value: '48', color: 'bg-emerald-400' },
              { label: 'In Transit', value: '31', color: 'bg-blue-400' },
              { label: 'Maintenance', value: '5', color: 'bg-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${stat.color}`} />
                  <span className="text-slate-400 text-xs">{stat.label}</span>
                </div>
                <span className="text-slate-200 text-xs font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
          {/* progress bar total */}
          <div className="mt-3 h-1.5 rounded-full bg-white/6 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"
              style={{ width: '79%' }}
            />
          </div>
          <p className="text-slate-500 text-[10px] mt-1.5">79% utilisation</p>
        </div>
      </nav>

      {/* ── Bottom utility links ── */}
      <div className="px-3 py-4 border-t border-white/8 space-y-0.5">
        {[
          { icon: <Package2 size={16} strokeWidth={1.8} />, label: 'Cargo Inventory' },
          { icon: <Settings size={16} strokeWidth={1.8} />, label: 'Settings' },
          { icon: <HelpCircle size={16} strokeWidth={1.8} />, label: 'Help & Support' },
        ].map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all duration-150"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {/* User session row */}
        <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer group transition-all duration-150">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-semibold truncate">James Dela Cruz</p>
            <p className="text-slate-500 text-[10px] truncate">Fleet Administrator</p>
          </div>
          <LogOut
            size={14}
            className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0"
          />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
