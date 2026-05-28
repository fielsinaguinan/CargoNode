import React, { createContext, useContext, useEffect, useState } from "react"

type AccessibilityState = {
  reducedMotion: boolean
  setReducedMotion: (value: boolean) => void
  highContrast: boolean
  setHighContrast: (value: boolean) => void
  largeText: boolean
  setLargeText: (value: boolean) => void
}

const initialState: AccessibilityState = {
  reducedMotion: false,
  setReducedMotion: () => null,
  highContrast: false,
  setHighContrast: () => null,
  largeText: false,
  setLargeText: () => null,
}

const AccessibilityContext = createContext<AccessibilityState>(initialState)

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('cargonode-a11y-reduced-motion') === 'true'
  })
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('cargonode-a11y-high-contrast') === 'true'
  })
  const [largeText, setLargeText] = useState(() => {
    return localStorage.getItem('cargonode-a11y-large-text') === 'true'
  })

  useEffect(() => {
    const root = window.document.documentElement
    
    if (reducedMotion) root.classList.add("reduce-motion")
    else root.classList.remove("reduce-motion")
    
    if (highContrast) root.classList.add("high-contrast")
    else root.classList.remove("high-contrast")
    
    if (largeText) root.classList.add("large-text")
    else root.classList.remove("large-text")
  }, [reducedMotion, highContrast, largeText])

  const value = {
    reducedMotion,
    setReducedMotion: (val: boolean) => {
      localStorage.setItem('cargonode-a11y-reduced-motion', String(val))
      setReducedMotion(val)
    },
    highContrast,
    setHighContrast: (val: boolean) => {
      localStorage.setItem('cargonode-a11y-high-contrast', String(val))
      setHighContrast(val)
    },
    largeText,
    setLargeText: (val: boolean) => {
      localStorage.setItem('cargonode-a11y-large-text', String(val))
      setLargeText(val)
    },
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext)
  if (context === undefined)
    throw new Error("useAccessibility must be used within an AccessibilityProvider")
  return context
}
