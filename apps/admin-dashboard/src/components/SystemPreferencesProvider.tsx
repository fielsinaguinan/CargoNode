import React, { createContext, useContext, useState, useEffect } from 'react'

type SystemPreferencesState = {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (value: boolean) => void
}

const initialState: SystemPreferencesState = {
  sidebarCollapsed: false,
  setSidebarCollapsed: () => null,
}

const SystemPreferencesContext = createContext<SystemPreferencesState>(initialState)

export function SystemPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('cargonode-sidebar-collapsed') === 'true'
  })

  const value = {
    sidebarCollapsed,
    setSidebarCollapsed: (val: boolean) => {
      localStorage.setItem('cargonode-sidebar-collapsed', String(val))
      setSidebarCollapsed(val)
    },
  }

  return (
    <SystemPreferencesContext.Provider value={value}>
      {children}
    </SystemPreferencesContext.Provider>
  )
}

export const useSystemPreferences = () => {
  const context = useContext(SystemPreferencesContext)
  if (context === undefined) {
    throw new Error('useSystemPreferences must be used within a SystemPreferencesProvider')
  }
  return context
}
