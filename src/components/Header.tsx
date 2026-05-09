import React, { useState, useRef, useEffect } from 'react'
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Sun,
  Shield,
  User,
  CreditCard,
  LogOut,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

interface Notification {
  id: number
  type: 'alert' | 'info' | 'success'
  title: string
  desc: string
  time: string
  read: boolean
}

const notifications: Notification[] = [
  {
    id: 1,
    type: 'alert',
    title: 'Overdue Delivery',
    desc: 'Waybill #WB-04812 is 2h overdue — Route: Davao → CDO',
    time: '3m ago',
    read: false,
  },
  {
    id: 2,
    type: 'alert',
    title: 'Maintenance Required',
    desc: 'Truck PLT-0094 scheduled service is past due.',
    time: '18m ago',
    read: false,
  },
  {
    id: 3,
    type: 'success',
    title: 'Cargo Delivered',
    desc: 'Waybill #WB-04799 delivered successfully in Cebu.',
    time: '1h ago',
    read: true,
  },
  {
    id: 4,
    type: 'info',
    title: 'New Waybill Created',
    desc: 'Waybill #WB-04813 created — Manila to Batangas.',
    time: '2h ago',
    read: true,
  },
]

const notifIcon = (type: Notification['type']) => {
  if (type === 'alert') return <AlertTriangle size={14} className="text-amber-500" />
  if (type === 'success') return <CheckCircle2 size={14} className="text-emerald-500" />
  return <Info size={14} className="text-blue-500" />
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read).length

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 px-6 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
      {/* Hamburger — mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Global Search ── */}
      <div className={[
        'relative flex-1 max-w-md transition-all duration-200',
        searchFocused ? 'max-w-lg' : '',
      ].join(' ')}>
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search waybills, trucks, drivers…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={[
            'w-full pl-9 pr-4 py-2 text-sm rounded-xl',
            'bg-slate-100 dark:bg-slate-800 border border-transparent',
            'text-slate-700 dark:text-slate-300 placeholder-slate-400',
            'outline-none transition-all duration-200',
            'focus:bg-white focus:border-slate-300 focus:ring-3 focus:ring-blue-500/10',
          ].join(' ')}
        />
        {/* Kbd shortcut hint */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
          <kbd className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 font-mono leading-none">
            ⌘K
          </kbd>
        </span>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-1 ml-auto">

        {/* Theme toggle */}
        <button
          className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
          aria-label="Toggle theme"
        >
          <Sun size={18} />
        </button>

        {/* ── Notifications ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen((p) => !p); setProfileOpen(false) }}
            className="relative p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse-dot border border-white" />
            )}
          </button>

          {/* Notifications dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-900/8 animate-fade-in-down overflow-hidden z-50">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{unread} unread alerts</p>
                </div>
                <button className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Mark all read
                </button>
              </div>
              <ul className="divide-y divide-slate-50 dark:divide-slate-800/50 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={[
                      'flex gap-3 px-5 py-3.5 cursor-pointer transition-colors duration-100',
                      n.read ? 'hover:bg-slate-50 dark:hover:bg-slate-800' : 'bg-amber-50/40 hover:bg-amber-50/70',
                    ].join(' ')}
                  >
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {notifIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">{n.title}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.desc}</p>
                    </div>
                    {!n.read && (
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <button className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors">
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* ── Profile dropdown ── */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen((p) => !p); setNotifOpen(false) }}
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 group"
            aria-label="Profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              JD
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-none">James Dela Cruz</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Fleet Administrator</p>
            </div>
            <ChevronDown
              size={14}
              className={[
                'text-slate-400 dark:text-slate-500 transition-transform duration-200 hidden sm:block',
                profileOpen ? 'rotate-180' : '',
              ].join(' ')}
            />
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-900/8 animate-fade-in-down overflow-hidden z-50">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow">
                    JD
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">James Dela Cruz</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield size={10} className="text-blue-500" />
                      <p className="text-[10px] text-blue-600 font-medium">Fleet Administrator</p>
                    </div>
                  </div>
                </div>
              </div>
              <ul className="py-1.5">
                {[
                  { icon: <User size={14} />, label: 'My Profile' },
                  { icon: <CreditCard size={14} />, label: 'Billing & Plan' },
                  { icon: <Settings size={14} />, label: 'Account Settings' },
                ].map((item) => (
                  <li key={item.label}>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors duration-100">
                      <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="py-1.5 border-t border-slate-100 dark:border-slate-800">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors duration-100">
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
