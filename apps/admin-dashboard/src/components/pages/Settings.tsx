import React, { useState, useEffect } from 'react'
import { Bell, Smartphone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../PageHeader'

// Custom hook for local storage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue] as const
}

const Settings: React.FC = () => {
  // Use local storage for other settings so they persist
  const [urgentAlerts, setUrgentAlerts] = useLocalStorage('cargonode-urgent-alerts', true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [loadingSms, setLoadingSms] = useState(true)

  useEffect(() => {
    const fetchSmsSetting = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sms_alerts_enabled')
        .single()
      
      if (!error && data) {
        setSmsAlerts(data.value === 'true' || data.value === true)
      }
      setLoadingSms(false)
    }

    fetchSmsSetting()
  }, [])

  const handleSmsToggle = async (checked: boolean) => {
    setSmsAlerts(checked)
    await supabase
      .from('system_settings')
      .upsert({ key: 'sms_alerts_enabled', value: checked })
  }

  return (
    <div className="space-y-7 animate-fade-in-down">
      <PageHeader
        title="Account Settings"
        subtitle="Configure your workspace settings and security"
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Settings Group */}
        <div>
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications & Alerts</h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Bell size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Urgent Dispatch Alerts</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Notify when prime movers are severely delayed</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={urgentAlerts}
                  onChange={(e) => setUrgentAlerts(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">SMS Driver Notifications</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Send waybill updates to drivers via SMS</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={smsAlerts}
                  disabled={loadingSms}
                  onChange={(e) => handleSmsToggle(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings
