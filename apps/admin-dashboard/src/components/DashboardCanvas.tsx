import React from 'react'
import type { NavItem } from '../App'
import DispatchBoard from './pages/DispatchBoard'
import CargoWaybills from './pages/CargoWaybills'
import CargoWaybillAllocator from './pages/CargoWaybillAllocator'
import Maintenance from './pages/Maintenance'
import Analytics from './pages/Analytics'
import FleetDispatchMonitor from './pages/FleetDispatchMonitor'
import PendingBookings from './pages/PendingBookings'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Inventory from './pages/Inventory'
import Help from './pages/Help'
import DriverRoster from './pages/DriverRoster'
import FleetRegistry from './pages/FleetRegistry'
import Preferences from './pages/Preferences'
import Billing from './pages/Billing'
import { useAuth } from '../contexts/AuthContext'
import { ShieldAlert } from 'lucide-react'

interface DashboardCanvasProps {
  activeNav: NavItem
  setActiveNav: (nav: NavItem) => void
}

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-fade-in-down">
    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
      <ShieldAlert size={32} className="text-red-500" />
    </div>
    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Access Denied</h2>
    <p className="text-sm">You do not have permission to view this module.</p>
  </div>
)

const DashboardCanvas: React.FC<DashboardCanvasProps> = ({ activeNav, setActiveNav }) => {
  const { userRole } = useAuth()

  const renderPage = () => {
    // RBAC Guardrail
    const adminRestrictedModules = ['analytics', 'driver-roster', 'fleet-registry', 'settings', 'billing']
    const opsRestrictedModules = ['dispatch', 'waybills', 'allocator', 'bookings', 'inventory', 'billing']
    
    let isRestricted = false

    if (userRole === 'Maintenance') {
      isRestricted = adminRestrictedModules.includes(activeNav) || opsRestrictedModules.includes(activeNav)
    } else if (userRole === 'Dispatcher') {
      isRestricted = adminRestrictedModules.includes(activeNav)
    }

    if (isRestricted) {
      return <AccessDenied />
    }

    switch (activeNav) {
      case 'dispatch':      return <DispatchBoard setActiveNav={setActiveNav} />
      case 'waybills':      return <CargoWaybills setActiveNav={setActiveNav} />
      case 'allocator':     return <CargoWaybillAllocator />
      case 'bookings':      return <PendingBookings />
      case 'billing':       return <Billing />
      case 'maintenance':   return <Maintenance />
      case 'analytics':     return <Analytics />
      case 'fleet-monitor': return <FleetDispatchMonitor setActiveNav={setActiveNav} />
      case 'profile':       return <Profile />
      case 'settings':      return <Settings />
      case 'preferences':   return <Preferences />
      case 'inventory':     return <Inventory setActiveNav={setActiveNav} />
      case 'help':          return <Help />
      case 'driver-roster': return <DriverRoster />
      case 'fleet-registry':return <FleetRegistry />
    }
  }

  return (
    <main className="flex-1 pt-20">
      <div className="max-w-7xl mx-auto px-6 pb-24">
        {renderPage()}
      </div>
    </main>
  )
}

export default DashboardCanvas
