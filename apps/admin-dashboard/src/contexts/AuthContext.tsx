import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AdminRole = 'Superadmin' | 'Dispatcher' | 'Maintenance'

interface AuthContextType {
  session: Session | null
  user: User | null
  userRole: AdminRole
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<AdminRole>('Dispatcher')
  
  const [authLoading, setAuthLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(true)

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error || !data) {
        setUserRole('Dispatcher')
      } else {
        setUserRole(data.role as AdminRole)
      }
    } catch (e) {
      setUserRole('Dispatcher')
    } finally {
      setRoleLoading(false)
    }
  }

  // Handle Auth Session
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Handle Role Fetching Reactively
  useEffect(() => {
    if (user) {
      setRoleLoading(true)
      fetchRole(user.id)
    } else {
      setUserRole('Dispatcher')
      setRoleLoading(false)
    }
  }, [user])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user,
    userRole,
    loading: authLoading || roleLoading,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

