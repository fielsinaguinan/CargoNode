import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, Shield, Key, Clock, LogOut } from 'lucide-react'
import PageHeader from '../PageHeader'

const Profile: React.FC = () => {
  const { user, signOut } = useAuth()
  
  const initial = user?.email?.[0].toUpperCase() || 'U'

  return (
    <div className="space-y-7 animate-fade-in-down">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal details and authentication"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Identity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">
            {initial}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            {user?.email || 'Unknown User'}
          </h2>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold">
            <Shield size={12} />
            Administrator
          </div>
          
          <div className="mt-8 w-full border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
            <button
              onClick={signOut}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors font-medium text-sm"
            >
              <LogOut size={16} />
              Sign Out of CargoNode
            </button>
          </div>
        </div>

        {/* Right Col - Details */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Account Details</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500">
                <Mail size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{user?.email}</p>
                <p className="text-xs text-emerald-500 mt-1 font-medium flex items-center gap-1">
                  Primary Contact
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500">
                <Key size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Authentication</p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">Password</p>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 font-medium">
                  Update Password
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500">
                <Clock size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Last Sign In</p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
