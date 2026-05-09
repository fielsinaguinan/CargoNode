import React from 'react'
import type { NavItem } from '../App'
import DispatchBoard from './pages/DispatchBoard'
import CargoWaybills from './pages/CargoWaybills'
import CargoWaybillAllocator from './pages/CargoWaybillAllocator'
import Maintenance from './pages/Maintenance'
import Analytics from './pages/Analytics'
import FleetDispatchMonitor from './pages/FleetDispatchMonitor'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Inventory from './pages/Inventory'
import Help from './pages/Help'

interface DashboardCanvasProps {
  activeNav: NavItem
  setActiveNav: (nav: NavItem) => void
}

const DashboardCanvas: React.FC<DashboardCanvasProps> = ({ activeNav, setActiveNav }) => {
  const renderPage = () => {
    switch (activeNav) {
      case 'dispatch':      return <DispatchBoard />
      case 'waybills':      return <CargoWaybills setActiveNav={setActiveNav} />
      case 'allocator':     return <CargoWaybillAllocator />
      case 'maintenance':   return <Maintenance />
      case 'analytics':     return <Analytics />
      case 'fleet-monitor': return <FleetDispatchMonitor />
      case 'profile':       return <Profile />
      case 'settings':      return <Settings />
      case 'inventory':     return <Inventory setActiveNav={setActiveNav} />
      case 'help':          return <Help />
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderPage()}
      </div>
    </main>
  )
}

export default DashboardCanvas
