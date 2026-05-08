import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DashboardCanvas from './components/DashboardCanvas'

export type NavItem = 'dispatch' | 'waybills' | 'allocator' | 'maintenance' | 'analytics' | 'fleet-monitor'

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>('dispatch')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-[260px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <DashboardCanvas activeNav={activeNav} />
      </div>
    </div>
  )
}

export default App
