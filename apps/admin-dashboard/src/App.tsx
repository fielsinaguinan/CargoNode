import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DashboardCanvas from './components/DashboardCanvas'
import { ProtectedRoute } from './components/ProtectedRoute'
import LoginPage from './components/pages/LoginPage'

export type NavItem = 'dispatch' | 'waybills' | 'allocator' | 'bookings' | 'maintenance' | 'analytics' | 'fleet-monitor' | 'profile' | 'settings' | 'inventory' | 'help' | 'driver-roster' | 'fleet-registry'

const DashboardLayout: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>('dispatch')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
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
        <Header onMenuClick={() => setSidebarOpen(true)} onNavigate={(nav) => setActiveNav(nav)} />
        <DashboardCanvas activeNav={activeNav} setActiveNav={setActiveNav} />
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
