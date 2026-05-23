import React, { useState, useEffect } from 'react'
import {
  LayoutGrid,
  FileText,
  Wrench,
  BarChart3,
  X,
  ChevronRight,
  ChevronLeft,
  Truck,
  Package2,
  Settings,
  HelpCircle,
  LogOut,
  MonitorDot,
  PenTool,
  ClipboardList,
  Users,
} from 'lucide-react'
import type { NavItem } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

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

const getNavGroups = (activeWaybills: number, delayedWaybills: number, pendingBookingsCount: number, role: string): NavGroup[] => {
  const allGroups: NavGroup[] = [
    {
      groupLabel: 'Operations',
      links: [
        {
          id: 'dispatch',
          label: 'Dispatch Board',
          icon: <LayoutGrid size={17} strokeWidth={1.8} />,
          badge: activeWaybills > 0 ? String(activeWaybills) : undefined,
          badgeColor: 'bg-blue-500',
        },
        {
          id: 'waybills',
          label: 'Cargo Waybills',
          icon: <FileText size={17} strokeWidth={1.8} />,
          badge: delayedWaybills > 0 ? String(delayedWaybills) : undefined,
          badgeColor: 'bg-amber-500',
        },
        {
          id: 'allocator',
          label: 'Waybill Allocator',
          icon: <PenTool size={17} strokeWidth={1.8} />,
        },
        {
          id: 'bookings',
          label: 'Pending Bookings',
          icon: <ClipboardList size={17} strokeWidth={1.8} />,
          badge: pendingBookingsCount > 0 ? String(pendingBookingsCount) : undefined,
          badgeColor: 'bg-amber-500',
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
    {
      groupLabel: 'Administration',
      links: [
        {
          id: 'driver-roster',
          label: 'Personnel Management',
          icon: <Users size={17} strokeWidth={1.8} />,
        },
        {
          id: 'fleet-registry',
          label: 'Asset Registry',
          icon: <Truck size={17} strokeWidth={1.8} />,
        },
      ],
    },
  ]

  if (role === 'Maintenance') {
    // Only show Fleet group, filter out analytics
    return allGroups
      .filter(g => g.groupLabel === 'Fleet')
      .map(g => ({ ...g, links: g.links.filter(l => l.id !== 'analytics') }))
  }

  if (role === 'Dispatcher') {
    // Filter out Administration group
    const filteredGroups = allGroups.filter(g => g.groupLabel !== 'Administration')
    // Filter out Analytics from Fleet group
    return filteredGroups.map(g => {
      if (g.groupLabel === 'Fleet') {
        return { ...g, links: g.links.filter(l => l.id !== 'analytics') }
      }
      return g
    })
  }

  return allGroups
}

const Sidebar: React.FC<SidebarProps> = ({ activeNav, setActiveNav, open, onClose }) => {
  const { user, userRole, signOut } = useAuth()
  const initial = user?.email?.[0].toUpperCase() || 'U'

  const [activeWaybills, setActiveWaybills] = useState(0)
  const [delayedWaybills, setDelayedWaybills] = useState(0)
  const [fleetStats, setFleetStats] = useState({ active: 0, inTransit: 0, pierStandby: 0, maintenance: 0, total: 0 })
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    // Set `--sidebar-width` based on collapse state to align main content with 16px margins
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '112px' : '272px'
    )
  }, [isCollapsed])

  useEffect(() => {
    const fetchStats = async () => {
      const [waybillRes, fleetRes, bookingsRes] = await Promise.all([
        supabase.from('waybills').select('status'),
        supabase.from('prime_movers').select('status'),
        supabase.from('customer_bookings').select('status').eq('status', 'Pending'),
      ])

      if (waybillRes.data) {
        setActiveWaybills(waybillRes.data.filter(w => w.status === 'In Transit' || w.status === 'Loading').length)
        setDelayedWaybills(waybillRes.data.filter(w => w.status === 'Delayed').length)
      }

      if (fleetRes.data) {
        const trucks = fleetRes.data
        setFleetStats({
          active: trucks.filter(t => t.status === 'Active').length,
          pierStandby: trucks.filter(t => t.status === 'Pier Standby').length,
          inTransit: trucks.filter(t => t.status === 'In Transit').length,
          maintenance: trucks.filter(t => t.status === 'Maintenance').length,
          total: trucks.length,
        })
      }

      if (bookingsRes.data) {
        setPendingBookingsCount(bookingsRes.data.length)
      }
    }
    fetchStats()

    const channel = supabase.channel('sidebar-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waybills' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prime_movers' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_bookings' }, fetchStats)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const groups = getNavGroups(activeWaybills, delayedWaybills, pendingBookingsCount, userRole)

  return (
    <aside
      className={[
        'fixed z-30 flex flex-col',
        // Mobile layout: anchored to the left, full height, rounded right edge
        'top-0 bottom-0 left-0 h-screen rounded-r-3xl border-r border-white/5',
        // Desktop layout: floating, spaced from edges, fully rounded with border and premium shadow
        'lg:top-4 lg:bottom-4 lg:left-4 lg:h-[calc(100vh-32px)] lg:rounded-3xl lg:border lg:border-white/10 lg:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        isCollapsed ? 'w-[88px] lg:w-[80px]' : 'w-[260px] lg:w-[240px]',
        'bg-[#0B1120]/95 backdrop-blur-xl',
        'shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)]',
        'transition-all duration-300 ease-in-out',
        open ? 'translate-x-0 animate-slide-in-left' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      <div className={`relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'} py-6 border-b border-white/5 transition-all duration-300`}>
        <div className="flex items-center gap-3.5 min-w-0 overflow-hidden">
          <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-all duration-300">
            <Truck size={20} className="text-white" strokeWidth={2} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B1120]" />
          </div>
          <div className={`min-w-0 transition-all duration-300 overflow-hidden ${isCollapsed ? 'opacity-0 max-w-0 flex-none' : 'opacity-100 max-w-[150px] w-auto'}`}>
            <p className="text-white font-bold text-[15px] tracking-tight leading-none font-display whitespace-nowrap truncate">
              CargoNode
            </p>
            <p className="text-slate-400 text-[10px] font-medium tracking-widest uppercase mt-1 whitespace-nowrap truncate">
              CEBLE Trucking
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 bg-slate-800 border border-white/10 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-300 z-40 shadow-lg cursor-pointer ${isCollapsed ? 'rotate-180 -right-3.5' : ''}`}
        >
          <ChevronLeft size={14} />
        </button>

        <button
          onClick={onClose}
          className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors duration-200 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto sidebar-scroll py-6 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {groups.map((group, gi) => (
          <div key={gi} className={`transition-all duration-300 ${gi > 0 ? (isCollapsed ? 'mt-4' : 'mt-8') : ''}`}>
            <div className={`transition-all duration-300 ${isCollapsed ? 'mb-0 opacity-0 max-h-0 overflow-hidden' : 'mb-2 opacity-100 max-h-10'}`}>
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 whitespace-nowrap truncate">
                 {group.groupLabel}
               </p>
            </div>
            <ul className="space-y-1">
              {group.links.map((link) => {
                const isActive = activeNav === link.id
                return (
                  <li key={link.id}>
                    <button
                      onClick={() => { setActiveNav(link.id); onClose() }}
                      className={[
                        'w-full flex items-center py-2.5 rounded-full text-[13px] font-medium relative',
                        'transition-all duration-300 group cursor-pointer',
                        isCollapsed ? 'justify-center px-0' : 'gap-3.5 px-3',
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                      ].join(' ')}
                      title={isCollapsed ? link.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full shadow-[-4px_0_12px_var(--color-primary)] transition-all duration-300" />
                      )}

                      <span
                        className={[
                          'transition-colors duration-300 flex-shrink-0 relative',
                          isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300',
                        ].join(' ')}
                      >
                        {link.icon}
                        {isCollapsed && link.badge && (
                          <span className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full ${link.badgeColor === 'bg-amber-500' ? 'bg-accent' : 'bg-primary'} text-[8px] font-bold text-white flex items-center justify-center border-2 border-[#0B1120]`}>
                            {link.badge !== 'Live' ? link.badge : ''}
                          </span>
                        )}
                      </span>

                      <div className={`flex items-center overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 flex-none' : 'flex-1 opacity-100 gap-3.5 min-w-0'}`}>
                        <span className="flex-1 text-left whitespace-nowrap truncate">{link.label}</span>

                        {link.badge ? (
                          <span
                            className={`${
                              link.badgeColor === 'bg-amber-500' ? 'bg-accent' : 
                              link.badgeColor === 'bg-blue-500' ? 'bg-primary' : 
                              link.badgeColor ?? 'bg-slate-600'
                            } text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none flex-shrink-0`}
                          >
                            {link.badge}
                          </span>
                        ) : (
                          <ChevronRight
                            size={14}
                            className={[
                              'transition-all duration-300 flex-shrink-0',
                              isActive
                                ? 'text-primary opacity-100'
                                : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1',
                            ].join(' ')}
                          />
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <div className={`transition-all duration-300 overflow-hidden mx-2 rounded-xl border border-white/5 bg-white/[0.02] ${isCollapsed ? 'max-h-0 p-0 opacity-0 border-transparent mt-0' : 'max-h-64 p-4 opacity-100 mt-8'}`}>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-3 whitespace-nowrap truncate">
            Fleet Status
          </p>
          <div className="space-y-3 font-mono text-[11px]">
            {[
              { label: 'Active Trucks', value: String(fleetStats.active), color: 'bg-primary' },
              { label: 'In Transit', value: String(fleetStats.inTransit), color: 'bg-emerald-400' },
              { label: 'Pier Standby', value: String(fleetStats.pierStandby), color: 'bg-accent' },
              { label: 'Maintenance', value: String(fleetStats.maintenance), color: 'bg-slate-500' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${stat.color}`} />
                  <span className="text-slate-400">{stat.label}</span>
                </div>
                <span className="text-slate-200 font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: fleetStats.total > 0 ? `${Math.round(((fleetStats.active + fleetStats.inTransit + fleetStats.pierStandby) / fleetStats.total) * 100)}%` : '0%' }}
            />
          </div>
          <p className="text-slate-500 text-[10px] mt-2 font-medium">
            {fleetStats.total > 0 ? `${Math.round(((fleetStats.active + fleetStats.inTransit + fleetStats.pierStandby) / fleetStats.total) * 100)}% utilisation` : 'No fleet data'}
          </p>
        </div>
      </nav>

      <div className={`py-5 border-t border-white/5 space-y-1 bg-[#0B1120]/50 backdrop-blur-md lg:rounded-b-3xl transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {[
          ...(userRole !== 'Maintenance' ? [{ id: 'inventory' as NavItem, icon: <Package2 size={16} strokeWidth={1.8} />, label: 'Cargo Inventory' }] : []),
          ...(userRole === 'Superadmin' ? [{ id: 'settings' as NavItem, icon: <Settings size={16} strokeWidth={1.8} />, label: 'Settings' }] : []),
          { id: 'help' as NavItem, icon: <HelpCircle size={16} strokeWidth={1.8} />, label: 'Help & Support' },
        ].map((item) => {
          const isActive = activeNav === item.id
          return (
            <button
              key={item.label}
              onClick={() => { setActiveNav(item.id); onClose() }}
              className={[
                'w-full flex items-center py-2.5 rounded-full text-[13px] transition-all duration-300 cursor-pointer relative',
                isCollapsed ? 'justify-center px-0' : 'gap-3.5 px-3',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
              ].join(' ')}
              title={isCollapsed ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full shadow-[-4px_0_12px_var(--color-primary)] transition-all duration-300" />
              )}
              <span className={isActive ? 'text-primary flex-shrink-0' : 'text-slate-500 flex-shrink-0'}>{item.icon}</span>
              <span className={`whitespace-nowrap overflow-hidden truncate transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 flex-none' : 'flex-1 opacity-100 text-left'}`}>{item.label}</span>
            </button>
          )
        })}

        <div 
          onClick={() => { setActiveNav('profile'); onClose() }}
          className={`mt-4 flex items-center rounded-full hover:bg-white/5 cursor-pointer group transition-all duration-300 border border-transparent hover:border-white/5 ${isCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-3'}`}
          title={isCollapsed ? "Profile" : undefined}
        >
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold shadow-md shadow-primary/20">
            {initial}
          </div>
          <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'w-0 opacity-0 flex-none' : 'flex-1 min-w-0 opacity-100'}`}>
            <p className="text-slate-200 text-xs font-semibold truncate group-hover:text-white transition-colors">{user?.email || 'Unknown User'}</p>
            <p className="text-slate-500 text-[10px] truncate group-hover:text-slate-400 transition-colors">{userRole}</p>
          </div>
          {!isCollapsed && (
             <button 
               onClick={(e) => { e.stopPropagation(); signOut(); }}
               className="p-2 rounded-lg hover:bg-destructive/10 text-slate-500 hover:text-destructive transition-colors duration-200 cursor-pointer"
             >
               <LogOut size={16} className="flex-shrink-0" />
             </button>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
