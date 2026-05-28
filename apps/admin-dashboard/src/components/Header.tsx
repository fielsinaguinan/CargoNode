import React, { useState, useRef, useEffect } from 'react'
import {
  Bell,
  ChevronDown,
  Menu,
  Sun,
  Shield,
  User,
  LogOut,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Info,
  Moon,
  SunMoon,
  HelpCircle,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { NavItem } from '../App'

interface HeaderProps {
  onMenuClick: () => void
  onNavigate: (nav: NavItem) => void
}

interface Notification {
  id: string
  type: 'alert' | 'info' | 'success'
  title: string
  description: string
  created_at: string
  is_read: boolean
}

const timeAgo = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const notifIcon = (type: Notification['type']) => {
  if (type === 'alert') return <AlertTriangle size={14} className="text-amber-500" />
  if (type === 'success') return <CheckCircle2 size={14} className="text-emerald-500" />
  return <Info size={14} className="text-blue-500" />
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onNavigate }) => {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data && !error) {
        setNotifications(data as Notification[])
      }
    }
    fetchNotifications()

    const channel = supabase.channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markAllRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
  }

  const markAsRead = async (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const initial = user?.email?.[0].toUpperCase() || 'U'

  const unread = notifications.filter((n) => !n.is_read).length

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
    <div className="absolute top-4 right-4 sm:right-6 z-50 flex items-center gap-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-1.5 rounded-2xl shadow-lg transition-colors duration-300">
      {/* Hamburger — mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150 dark:hover:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse-dot border border-white dark:border-slate-900" />
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
                <button 
                  onClick={markAllRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Mark all read
                </button>
              </div>
              <ul className="divide-y divide-slate-50 dark:divide-slate-800/50 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={[
                      'flex gap-3 px-5 py-3.5 cursor-pointer transition-colors duration-100',
                      n.is_read ? 'hover:bg-slate-50 dark:hover:bg-slate-800' : 'bg-amber-50/40 dark:bg-amber-500/5 hover:bg-amber-50/70 dark:hover:bg-amber-500/10',
                    ].join(' ')}
                  >
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {notifIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">{n.title}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.description}</p>
                    </div>
                    {!n.is_read && (
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
              {initial}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-none truncate max-w-[120px]">{user?.email || 'User'}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Administrator</p>
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
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow">
                    {initial}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield size={10} className="text-blue-500" />
                      <p className="text-[10px] text-blue-600 font-medium">Administrator</p>
                    </div>
                  </div>
                </div>
              </div>
              <ul className="py-1.5">
                {[
                  { icon: <User size={14} />, label: 'My Profile', nav: 'profile' as NavItem },
                  { icon: <SunMoon size={14} />, label: 'Preferences', nav: 'preferences' as NavItem },
                  { icon: <Settings size={14} />, label: 'Account Settings', nav: 'settings' as NavItem },
                  { icon: <HelpCircle size={14} />, label: 'Help & Support', nav: 'help' as NavItem },
                ].map((item) => (
                  <li key={item.label}>
                    <button 
                      onClick={() => { onNavigate(item.nav); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors duration-100"
                    >
                      <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="py-1.5 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-100"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

export default Header
