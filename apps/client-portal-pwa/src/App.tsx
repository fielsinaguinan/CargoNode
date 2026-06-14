import React, { useState, useEffect } from 'react'
import {
  Search,
  MapPin,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Copy,
  CheckCheck,
  Ship,
  Calendar,
  ChevronDown,
  Package,
  HelpCircle,
  Send,
  LogOut,
  Settings,
  Sun,
  Moon,
  Monitor,
  User,
  X,
  CreditCard,
  UploadCloud
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { z } from 'zod'

// --- Security Validation Schemas ---
const profileSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  contact_person: z.string().min(2, "Contact person must be at least 2 characters"),
  phone_number: z.string().regex(/^\+?[\d\s-]{8,}$/, "Invalid phone number"),
  default_address: z.string().min(10, "Address must be at least 10 characters")
})

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/\d/, "Password must contain at least 1 number"),
  confirmPassword: z.string(),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactPerson: z.string().min(2, "Contact person must be at least 2 characters"),
  phoneNumber: z.string().regex(/^\+?[\d\s-]{8,}$/, "Invalid phone number"),
  defaultAddress: z.string().min(10, "Address must be at least 10 characters"),
  agreeToTerms: z.literal(true, {
    message: "You must agree to the Terms of Service and Privacy Policy"
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

const bookingSchema = z.object({
  client_name: z.string().min(2, "Client name is required"),
  origin: z.string().min(3, "Origin terminal must be at least 3 characters"),
  destination: z.string().min(3, "Destination hub must be at least 3 characters"),
  container_type: z.enum(['20-footer', '40-footer', 'LCL']),
  target_date: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, { message: "Invalid target date" })
})

const supportSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(100, "Subject is too long"),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message is too long")
})
// -----------------------------------
function App() {
  // Auth state
  const [user, setUser] = useState<any>(null)
  const [authView, setAuthView] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [defaultAddress, setDefaultAddress] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Client Profile state
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Portal view state
  const [activeTab, setActiveTab] = useState<'track' | 'book' | 'billing' | 'support' | 'settings'>('track')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<{ waybill: any, milestones: any[] } | null>(null)
  const [error, setError] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('cargonode_recent_searches')
    return saved ? JSON.parse(saved) : []
  })

  // Copy feedback toast
  const [copiedId, setCopiedId] = useState(false)

  // Theme state
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('cargonode_pwa_theme') as 'system' | 'light' | 'dark') || 'system'
  })

  // User Dropdown & Profile Modal State
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    contact_person: '',
    phone_number: '',
    default_address: ''
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState('')

  // Billing & Invoices State
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null)

  // Fetch invoices
  useEffect(() => {
    if (user && activeTab === 'billing') {
      setInvoicesLoading(true)
      supabase.from('invoices')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (data && !error) setInvoices(data)
          setInvoicesLoading(false)
        })
    }
  }, [user, activeTab])

  const handleUploadProof = async (invoiceId: string, file: File) => {
    if (!user) return
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.")
      return
    }
    setUploadingInvoiceId(invoiceId)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${invoiceId}-${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { error: updateError } = await supabase.from('invoices')
        .update({ proof_url: uploadData.path, status: 'Under Review' })
        .eq('id', invoiceId)

      if (updateError) throw updateError

      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, proof_url: uploadData.path, status: 'Under Review' } : inv))
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to upload proof")
    } finally {
      setUploadingInvoiceId(null)
    }
  }

  // Sync profile form when modal opens
  useEffect(() => {
    if (isSettingsModalOpen && clientProfile) {
      setProfileForm({
        company_name: clientProfile.company_name || '',
        contact_person: clientProfile.contact_person || '',
        phone_number: clientProfile.phone_number || '',
        default_address: clientProfile.default_address || ''
      })
    }
  }, [isSettingsModalOpen, clientProfile])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setProfileSaveError('')
    try {
      // 1. Zod Schema Validation
      const validatedData = profileSchema.parse(profileForm)

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || !session?.user) throw new Error("Authentication error.")

      // 2. RLS Security: .eq('id', session.user.id) ensures the authenticated user can only update their own profile
      const { error } = await supabase.from('client_profiles').update({
        company_name: validatedData.company_name,
        contact_person: validatedData.contact_person,
        phone_number: validatedData.phone_number,
        default_address: validatedData.default_address
      }).eq('id', session.user.id)

      if (error) throw error

      setProfileSaveSuccess(true)
      setClientProfile((prev: any) => ({ ...prev, ...profileForm }))
      setTimeout(() => {
        setProfileSaveSuccess(false)
        setIsSettingsModalOpen(false)
      }, 2000)
    } catch (err: any) {
      console.error(err)
      if (err instanceof z.ZodError) {
        setProfileSaveError((err as any).errors[0].message)
      } else {
        setProfileSaveError(err.message || 'Failed to save profile.')
      }
    } finally {
      setIsSavingProfile(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('cargonode_pwa_theme', theme)
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    origin: '',
    destination: '',
    container_type: '20-footer' as '20-footer' | '40-footer' | 'LCL',
    target_date: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState('')

  // Support & FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: ''
  })
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false)
  const [supportSuccess, setSupportSuccess] = useState(false)
  const [supportError, setSupportError] = useState('')

  const faqs = [
    {
      question: "How do I track my cargo manifest?",
      answer: "Navigate to the 'Track' tab and enter your active Waybill Number (e.g. WB-XXXXXXXX). You will receive instant live updates as our fleet dispatch monitor publishes milestones."
    },
    {
      question: "What container types are supported?",
      answer: "We support 20-footer and 40-footer standard dry vans, as well as Less than Container Load (LCL) shipments."
    },
    {
      question: "How can I check billing and invoices?",
      answer: "For billing queries, please contact our accounts dispatch using the form below. Standard net-30 terms apply to verified corporate client accounts."
    },
    {
      question: "What should I do if a shipment is delayed?",
      answer: "Manifest delays are visible in real-time. If a delayed status appears, our dispatcher is already rerouting the truck. You can send a direct query using the form below for detailed telemetry."
    }
  ]

  // Listen to Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch client profiles when authenticated user changes
  useEffect(() => {
    if (user) {
      setProfileLoading(true)
      supabase.from('client_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setClientProfile(data)
            setBookingForm(prev => ({ ...prev, client_name: data.company_name || '' }))
          } else {
            setBookingForm(prev => ({ ...prev, client_name: user.email?.split('@')[0] || '' }))
          }
          setProfileLoading(false)
        })
    } else {
      setClientProfile(null)
      setBookingForm(prev => ({ ...prev, client_name: '' }))
    }
  }, [user])

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail || !authPassword) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      })
      if (error) throw error
    } catch (err: any) {
      console.error(err)
      setAuthError(err.message || 'Failed to sign in. Please verify your credentials.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      // 1. Zod Schema Validation
      const validatedData = registerSchema.parse({
        email: authEmail,
        password: authPassword,
        confirmPassword: authConfirmPassword,
        companyName: companyName,
        contactPerson: contactPerson,
        phoneNumber: phoneNumber,
        defaultAddress: defaultAddress,
        agreeToTerms: agreeToTerms
      })

      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password
      })
      if (error) throw error

      if (data?.user) {
        // Insert client profiles data
        const { error: profileErr } = await supabase.from('client_profiles').insert([{
          id: data.user.id,
          email: validatedData.email,
          company_name: validatedData.companyName,
          contact_person: validatedData.contactPerson,
          phone_number: validatedData.phoneNumber,
          default_address: validatedData.defaultAddress
        }])
        if (profileErr) throw profileErr
      }
    } catch (err: any) {
      console.error(err)
      if (err instanceof z.ZodError) {
        setAuthError((err as any).errors[0].message)
      } else {
        setAuthError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleCopyWaybill = async (trackNum: string) => {
    try {
      await navigator.clipboard.writeText(trackNum)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch { /* fallback silent fail */ }
  }

  const executeTrack = async (trackId: string) => {
    if (!trackId) return
    setTrackingNumber(trackId)
    setIsSearching(true)
    setResult(null)
    setError('')

    try {
      // 1. Fetch Waybill (Public Read enabled via RLS)
      const { data: waybill, error: waybillError } = await supabase
        .from('waybills')
        .select('*')
        .eq('tracking_number', trackId.toUpperCase())
        .single()

      if (waybillError || !waybill) {
        throw new Error('Waybill not found')
      }

      // 2. Fetch tracking milestones
      const { data: milestones, error: milestonesError } = await supabase
        .from('tracking_milestones')
        .select('*')
        .eq('waybill_id', waybill.tracking_number)
        .order('order_index', { ascending: true })

      if (milestonesError) throw milestonesError

      setResult({ waybill, milestones: milestones || [] })

      // Save to recent searches
      setRecentSearches(prev => {
        const newSearches = [waybill.tracking_number, ...prev.filter(id => id !== waybill.tracking_number)].slice(0, 3)
        localStorage.setItem('cargonode_recent_searches', JSON.stringify(newSearches))
        return newSearches
      })
    } catch (err) {
      console.error(err)
      setError('We could not find a dispatch manifest with that tracking number. Please check and try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    await executeTrack(trackingNumber)
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingError('')
    if (!user) return
    setIsSubmitting(true)

    try {
      // 1. Zod Schema Validation
      const validatedData = bookingSchema.parse({
        client_name: bookingForm.client_name,
        origin: bookingForm.origin,
        destination: bookingForm.destination,
        container_type: bookingForm.container_type,
        target_date: bookingForm.target_date
      })

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || !session?.user) throw new Error("Authentication error. Please log in again.")

      const payload = {
        client_name: validatedData.client_name,
        origin: validatedData.origin,
        destination: validatedData.destination,
        container_type: validatedData.container_type,
        target_date: new Date(validatedData.target_date).toISOString(),
        status: 'Pending',
        // 2. RLS Security: client_id is injected strictly from the authenticated session,
        // enforcing Row Level Security insert policies.
        client_id: session.user.id,
      }

      const { error } = await supabase.from('customer_bookings').insert([payload])
      if (error) throw error

      setBookingSuccess(true)
      setBookingForm(prev => ({ ...prev, origin: '', destination: '', target_date: '' }))
      setTimeout(() => setBookingSuccess(false), 4000)
    } catch (err: any) {
      console.error("Booking error:", err)
      if (err instanceof z.ZodError) {
        setBookingError((err as any).errors[0].message)
      } else {
        setBookingError(err.message || 'An unknown error occurred during booking.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Support Ticket Submissions
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSupportError('')
    if (!user) return
    setIsSubmittingSupport(true)

    try {
      // 1. Zod Schema Validation
      const validatedData = supportSchema.parse(supportForm)

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || !session?.user) throw new Error("Authentication error. Please log in again.")

      // 2. Forward the support request as a real-time notification alert to the Admin dashboard.
      // Notification insert is executed with the authenticated session context.
      const { error } = await supabase.from('notifications').insert([{
        type: 'info',
        title: `Support Ticket: ${validatedData.subject}`,
        description: `From ${clientProfile?.company_name || session.user.email}: ${validatedData.message}`,
      }])

      if (error) throw error

      setSupportSuccess(true)
      setSupportForm({ subject: '', message: '' })
      setTimeout(() => setSupportSuccess(false), 4000)
    } catch (err: any) {
      console.error(err)
      if (err instanceof z.ZodError) {
        setSupportError((err as any).errors[0].message)
      } else {
        setSupportError(err.message || 'Failed to submit support request.')
      }
    } finally {
      setIsSubmittingSupport(false)
    }
  }

  // Subscribe to live updates if we have a result
  useEffect(() => {
    if (!result?.waybill) return

    const channel = supabase.channel(`public:waybill:${result.waybill.tracking_number}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tracking_milestones',
        filter: `waybill_id=eq.${result.waybill.tracking_number}`
      }, async () => {
        const { data: newMilestones } = await supabase
          .from('tracking_milestones')
          .select('*')
          .eq('waybill_id', result.waybill.tracking_number)
          .order('order_index', { ascending: true })

        if (newMilestones) {
          setResult(prev => prev ? { ...prev, milestones: newMilestones } : null)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [result?.waybill?.tracking_number])

  // RENDER SECURITY GATE: Sign-In / Registration Screen
  if (!user) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[#060b13] p-4 relative overflow-y-auto">
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        {/* Radial Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[130px] pointer-events-none"></div>

        {/* Card Container Restraint */}
        <div className="max-w-md w-full relative z-10 py-12 my-auto">
          
          {/* Logo Outside the Box */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="flex justify-center">
              <img src="/PrimaryLogoForLightMode.png" alt="CargoNode Primary Logo" className="h-16 object-contain block dark:hidden" />
              <img src="/PrimaryLogoForDarkMode.png" alt="CargoNode Primary Logo" className="h-16 object-contain hidden dark:block" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Client Portal</p>
          </div>

          <div className="w-full relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl dark:shadow-none">

            {/* Toggle Tabs */}
            <div className="flex gap-2 bg-white/5 rounded-2xl p-1 mb-6">
              <button
                onClick={() => { setAuthView('login'); setAuthError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${authView === 'login' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthView('register'); setAuthError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${authView === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Register
              </button>
            </div>

            {authError && (
              <div className="mb-4 bg-red-500/15 border border-red-500/25 rounded-xl p-3.5 text-xs font-medium text-red-400 flex items-start gap-2.5 animate-fade-in-down">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={authView === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {authView === 'register' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="e.g. NexaCorp Logistics Inc."
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Contact Person</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={e => setContactPerson(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Default Address</label>
                    <input
                      type="text"
                      value={defaultAddress}
                      onChange={e => setDefaultAddress(e.target.value)}
                      placeholder="123 Logistics Way, Port City"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Corporate Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="client@company.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              {authView === 'register' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Confirm Password</label>
                    <input
                      type="password"
                      value={authConfirmPassword}
                      onChange={e => setAuthConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeToTerms}
                      onChange={e => setAgreeToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                      required
                    />
                    <label htmlFor="terms" className="text-xs text-slate-400 leading-tight">
                      I agree to the <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Terms of Service</a> and <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</a>
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              >
                {authLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : authView === 'login' ? (
                  'Sign In to Dashboard'
                ) : (
                  'Submit Registration'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  // RENDER PWA CONTENT: Authenticated Client Portal Layout
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 relative overflow-hidden flex flex-col">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/20 dark:bg-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/20 dark:bg-accent/5 blur-[120px] pointer-events-none"></div>
      {/* Dynamic Client Header */}
      <header className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between z-50 sticky top-0 bg-white/60 dark:bg-slate-900/30 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 shrink-0">
            <img src="/PrimaryLogoForLightMode.png" alt="CargoNode Logo" className="h-full w-auto object-contain block dark:hidden" />
            <img src="/PrimaryLogoForDarkMode.png" alt="CargoNode Logo" className="h-full w-auto object-contain hidden dark:block" />
          </div>
          <div className="hidden sm:block min-w-0">
            <h1 className="text-xs font-bold text-slate-900 dark:text-white leading-none font-display tracking-tight truncate">
              CargoNode Portal
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setActiveTab('support'); setResult(null); setError(''); }}
            className={`p-2 rounded-xl transition-all cursor-pointer ${activeTab === 'support' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary hover:bg-white/5 dark:hover:bg-slate-800'}`}
            title="Support"
          >
            <HelpCircle size={16} />
          </button>
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700/50 mx-1"></div>

          {/* User Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-white/10 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shrink-0">
                <User size={14} />
              </div>
              <div className="text-left hidden md:block max-w-[120px]">
                <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
                  {profileLoading ? 'Loading...' : clientProfile?.company_name || 'My Profile'}
                </p>
                <p className="text-[9px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isUserDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden z-50 animate-fade-in-down origin-top-right">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 md:hidden">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
                      {clientProfile?.company_name || 'My Profile'}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(true);
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <User size={14} className="text-primary" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer mt-0.5"
                    >
                      <Settings size={14} className="text-slate-500" />
                      Preferences
                    </button>
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer mt-1"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 relative z-10 custom-scrollbar">
        <div className="max-w-4xl mx-auto w-full">
          
          {/* Tab Switcher */}
          <div className="sticky top-4 z-40 flex justify-center mb-6 pointer-events-none">
            <div className="flex gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-full p-1.5 border border-white dark:border-slate-600/50 shadow-lg shadow-slate-200/50 dark:shadow-none w-full max-w-[380px] pointer-events-auto">
              <button
                onClick={() => { setActiveTab('track'); setResult(null); setError(''); }}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer',
                  activeTab === 'track'
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                ].join(' ')}
              >
                <Search size={14} />
                Track
              </button>
              <button
                onClick={() => { setActiveTab('book'); setResult(null); setError(''); }}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer',
                  activeTab === 'book'
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                ].join(' ')}
              >
                <Ship size={14} />
                Book
              </button>
              <button
                onClick={() => { setActiveTab('billing'); setResult(null); setError(''); }}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer',
                  activeTab === 'billing'
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-md dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                ].join(' ')}
              >
                <CreditCard size={14} />
                Billing
              </button>
            </div>
          </div>

        {/* ═══════════════ TRACK TAB ═══════════════ */}
        {activeTab === 'track' && (
          <>
            {/* Search Input Section */}
            {!result && (
              <div className="mb-8 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-white dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl p-6 sm:p-8 relative z-10">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-display tracking-tight">Track Cargo</h2>
                <p className="text-xs text-slate-500 mb-6">Enter your waybill or container tracking number for live telemetry.</p>

                <form onSubmit={handleTrack} className="space-y-4">
                  <div className="relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Waybill Tracking Number"
                      className={`w-full bg-white/5 dark:bg-black/20 border ${error ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/50' : 'border-white/10 dark:border-slate-700 focus:border-primary focus:ring-primary/40'} rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-foreground dark:text-white placeholder:text-slate-400 outline-none focus:ring-[3px] focus:shadow-[0_0_20px_rgba(37,99,235,0.25)] backdrop-blur-sm transition-all`}
                    />
                  </div>
                  {error && (
                    <p className="text-[11px] text-red-500 font-semibold flex items-start gap-1.5 animate-fade-in-down">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={!trackingNumber || isSearching}
                    className="w-full bg-accent hover:bg-accent/90 text-white rounded-2xl py-3.5 text-sm font-bold shadow-lg shadow-accent/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 cursor-pointer"
                  >
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Track Container'}
                  </button>
                </form>

                {recentSearches.length > 0 && (
                  <div className="mt-8 animate-fade-in-up">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Clock size={14} /> Recent Searches
                    </p>
                    <div className="space-y-2">
                      {recentSearches.map(id => (
                        <button
                          key={id}
                          onClick={() => executeTrack(id)}
                          className="w-full bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 hover:border-primary/50 hover:bg-white/20 p-3.5 rounded-xl flex items-center justify-between transition-colors group text-left cursor-pointer shadow-sm"
                        >
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-primary/90">{id}</span>
                          <span className="text-[9px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Track &rarr;</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tracking Milestones Timeline */}
            {result && (
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm animate-fade-in-down">
                <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Waybill</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800 font-mono tracking-tight">{result.waybill.tracking_number.toUpperCase()}</p>
                      <button
                        onClick={() => handleCopyWaybill(result.waybill.tracking_number)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-all relative group cursor-pointer"
                        title="Copy tracking number"
                      >
                        {copiedId ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copiedId && (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-lg text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl animate-fade-in-down">
                            Copied!
                          </span>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-700 mt-1">{result.waybill.origin} &rarr; {result.waybill.destination}</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{result.waybill.container_type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`border px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${result.waybill.status === 'In Transit' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        result.waybill.status === 'Delayed' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                          result.waybill.status === 'Delivered' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                            'bg-primary/10 border-primary/20 text-primary'
                      }`}>
                      {result.waybill.status === 'In Transit' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse relative"><span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span></span>}
                      {result.waybill.status}
                    </div>
                    <button
                      onClick={() => { setResult(null); setTrackingNumber(''); }}
                      className="text-[9px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Search Again
                    </button>
                  </div>
                </div>

                <div className="relative pl-[18px]">
                  {/* Vertical Line */}
                  <div className="absolute left-[19px] top-4 bottom-6 w-0.5 bg-slate-100"></div>

                  {result.milestones.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 italic text-center">No timeline events recorded yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {result.milestones.map((item: any, index: number) => {
                        const isCompleted = item.status === 'completed'
                        const isCurrent = item.status === 'current'
                        const isPending = item.status === 'pending'
                        const dateObj = new Date(item.timestamp)
                        const timeString = isNaN(dateObj.getTime()) ? 'Pending' : dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

                        return (
                          <div
                            key={item.id}
                            className="relative flex items-start gap-4 animate-fade-in-up"
                            style={{ animationDelay: `${index * 120}ms` }}
                          >
                            <div className="relative z-10 flex-shrink-0 mt-0.5 -ml-[18px]">
                              {isCompleted && (
                                <div className="w-8 h-8 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-sm">
                                  <Check size={14} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                              {isCurrent && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 border-[3px] border-white flex items-center justify-center relative shadow-sm">
                                  <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40"></span>
                                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                </div>
                              )}
                              {isPending && (
                                <div className="w-8 h-8 rounded-full bg-slate-100 border-[3px] border-white flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 pb-1">
                              <p className={`text-xs font-bold ${isPending ? 'text-slate-400' : 'text-slate-800'}`}>
                                {item.title}
                              </p>
                              <p className={`text-[10px] font-bold mt-1 ${isPending ? 'text-slate-400' : 'text-blue-600'}`}>
                                {timeString}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <MapPin size={11} className={isPending ? 'text-slate-300' : 'text-slate-400'} />
                                <span className={`text-[10px] font-semibold ${isPending ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {item.location || 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ BOOK FREIGHT TAB ═══════════════ */}
        {activeTab === 'book' && (
          <div className="mb-8 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-2xl dark:shadow-none rounded-2xl p-6 sm:p-8 relative z-10">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-display tracking-tight">Book Freight</h2>
            <p className="text-xs text-slate-500 mb-6">Submit a dry cargo booking request. Our live dispatchers will review it shortly.</p>

            {/* Success Notification */}
            {bookingSuccess && (
              <div className="mb-6 animate-fade-in-down">
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-lg shadow-emerald-100/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Booking Submitted!</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Your request is queued for dispatcher manifest generation.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {bookingError && (
              <div className="mb-6 animate-fade-in-down">
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-red-200 rounded-2xl p-4 shadow-lg shadow-red-100/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50/80 to-rose-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={18} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-800">Booking Failed</p>
                      <p className="text-[10px] text-red-600 font-semibold mt-0.5">{bookingError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Locked Identity Booking Form */}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="relative space-y-4">
                  {/* Client Identity Block */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Company Name (Registered)</label>
                    <input
                      type="text"
                      value={bookingForm.client_name}
                      disabled
                      required
                      className="w-full bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  {/* Origin & Destination */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><MapPin size={11} /> Origin Terminal</span>
                      </label>
                      <input
                        type="text"
                        value={bookingForm.origin}
                        onChange={e => setBookingForm(prev => ({ ...prev, origin: e.target.value }))}
                        placeholder="e.g. Manila Port Terminal 3"
                        required
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm backdrop-blur-sm"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><MapPin size={11} /> Destination Hub</span>
                      </label>
                      <input
                        type="text"
                        value={bookingForm.destination}
                        onChange={e => setBookingForm(prev => ({ ...prev, destination: e.target.value }))}
                        placeholder="e.g. Cavite logistics complex"
                        required
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  {/* Container & Target Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><Package size={11} /> Container Type</span>
                      </label>
                      <div className="relative">
                        <select
                          value={bookingForm.container_type}
                          onChange={e => setBookingForm(prev => ({ ...prev, container_type: e.target.value as any }))}
                          className="w-full appearance-none bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 pr-9 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-sm backdrop-blur-sm"
                        >
                          <option value="20-footer">20-footer</option>
                          <option value="40-footer">40-footer</option>
                          <option value="LCL">LCL</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        <span className="flex items-center gap-1.5"><Calendar size={11} /> Target Date</span>
                      </label>
                      <input
                        type="date"
                        value={bookingForm.target_date}
                        onChange={e => setBookingForm(prev => ({ ...prev, target_date: e.target.value }))}
                        required
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm backdrop-blur-sm"
                      />
                    </div>
                  </div>
                </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !bookingForm.origin || !bookingForm.destination || !bookingForm.target_date}
                className="w-full bg-accent hover:bg-accent/90 text-white rounded-2xl py-3.5 text-sm font-bold shadow-lg shadow-accent/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:active:scale-100 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Ship size={14} />
                    Submit Booking Request
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ═══════════════ BILLING & INVOICES TAB ═══════════════ */}
        {activeTab === 'billing' && (
          <div className="mb-8 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 shadow-2xl dark:shadow-none rounded-2xl p-6 sm:p-8 relative z-10 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-display tracking-tight flex items-center gap-2">
              <CreditCard size={24} className="text-primary" /> Billing & Invoices
            </h2>
            <p className="text-xs text-slate-500 mb-8">Manage your corporate accounts and submit proof of payments via bank transfer.</p>

            {invoicesLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 bg-white/50 dark:bg-black/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <CreditCard size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-bold text-slate-500">No Invoices Found</p>
                <p className="text-xs text-slate-400 mt-1">You currently have no pending or past invoices.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-white font-mono tracking-tight">{invoice.invoice_number}</p>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                            invoice.status === 'Under Review' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                            invoice.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Issued: {new Date(invoice.created_at).toLocaleDateString()} {invoice.due_date && `| Due: ${new Date(invoice.due_date).toLocaleDateString()}`}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-sm text-slate-500 font-medium">{invoice.currency}</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-white">{Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    {(invoice.status === 'Pending' || invoice.status === 'Rejected') ? (
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/30">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Bank Transfer Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Bank Name</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">BDO Unibank, Inc.</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Account Name</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">CargoNode Logistics Inc.</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Account Number</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">0012-3456-7890</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">SWIFT / BIC Code</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">BNORPHMM</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <UploadCloud size={14} /> Upload Proof of Payment (PDF/JPG/PNG, Max 5MB)
                          </label>
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadProof(invoice.id, e.target.files[0]);
                              }
                            }}
                            disabled={uploadingInvoiceId === invoice.id}
                            className="block w-full text-xs text-slate-500 dark:text-slate-400
                              file:mr-4 file:py-2.5 file:px-4
                              file:rounded-xl file:border-0
                              file:text-xs file:font-bold
                              file:bg-primary/10 file:text-primary
                              hover:file:bg-primary/20 file:cursor-pointer file:transition-colors disabled:opacity-50"
                          />
                          {uploadingInvoiceId === invoice.id && (
                            <p className="text-[10px] text-primary font-bold mt-2 flex items-center gap-1.5">
                              <Loader2 size={12} className="animate-spin" /> Uploading securely...
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 border border-slate-100 dark:border-slate-700/30">
                        <CheckCheck size={16} className={invoice.status === 'Paid' ? 'text-emerald-500' : 'text-blue-500'} />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {invoice.status === 'Paid' ? 'Payment received and verified. Thank you.' : 'Proof of payment is currently under review by our accounts team.'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ HELP & SUPPORT TAB ═══════════════ */}
        {activeTab === 'support' && (
          <div className="mb-8 space-y-6 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-white dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl p-6 sm:p-8 relative z-10 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-display tracking-tight">Help & Support</h2>
              <p className="text-xs text-slate-500">Find quick guides or submit a support ticket directly to our live Dispatch Command Center.</p>
            </div>

            {/* Accordion FAQ Grid */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frequently Asked Questions</h3>

              <div className="space-y-2">
                {faqs.map((faq, idx) => {
                  const isOpen = activeFaq === idx
                  return (
                      <div
                        key={idx}
                        className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-200"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFaq(isOpen ? null : idx)}
                          className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50/40 dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">{faq.question}</span>
                          <ChevronDown
                            size={14}
                            className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
                          />
                        </button>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-40 border-t border-slate-100/50 dark:border-slate-700/50 p-5' : 'max-h-0'}`}>
                        <p className="text-xs text-slate-500 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Helpdesk Form */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submit Live Support Ticket</h3>

              {/* Support success message */}
              {supportSuccess && (
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-lg shadow-emerald-100/30 animate-fade-in-down">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Support Ticket Forwarded!</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Dispatcher alerts have received your request for review.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Support error message */}
              {supportError && (
                <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-red-200 rounded-2xl p-4 shadow-lg shadow-red-100/30 animate-fade-in-down">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50/80 to-rose-50/50 pointer-events-none"></div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={18} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-800">Submission Failed</p>
                      <p className="text-[10px] text-red-600 font-semibold mt-0.5">{supportError}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div className="relative space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Ticket Subject</label>
                      <input
                        type="text"
                        value={supportForm.subject}
                        onChange={e => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="e.g. Waybill Delay Query or Invoicing issue"
                        required
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm backdrop-blur-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Message / Inquiry Details</label>
                      <textarea
                        rows={4}
                        value={supportForm.message}
                        onChange={e => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Detail the issue or manifest codes here..."
                        required
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-sm backdrop-blur-sm"
                      />
                    </div>
                  </div>

                <button
                  type="submit"
                  disabled={isSubmittingSupport || !supportForm.subject || !supportForm.message}
                  className="w-full bg-accent hover:bg-accent/90 text-white rounded-2xl py-3.5 text-sm font-bold shadow-lg shadow-accent/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:active:scale-100 cursor-pointer animate-pulse-light"
                >
                  {isSubmittingSupport ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending Ticket...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      Submit Support Ticket
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════ SETTINGS TAB ═══════════════ */}
        {activeTab === 'settings' && (
          <div className="mb-8 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-white dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl p-6 sm:p-8 relative z-10 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 font-display tracking-tight">Preferences</h2>
            <p className="text-xs text-slate-500 mb-8">Customize your Portal experience.</p>
            
            <div className="space-y-8">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Monitor size={14} /> Theme Appearance
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setTheme('light')} 
                    className={`flex-1 py-3 px-4 rounded-xl border ${theme === 'light' ? 'border-primary bg-primary/10 text-primary dark:text-primary/90' : 'border-white/10 dark:border-slate-700 bg-white/5 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'} font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm`}
                  >
                    <Sun size={14} /> Light
                  </button>
                  <button 
                    onClick={() => setTheme('dark')} 
                    className={`flex-1 py-3 px-4 rounded-xl border ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary dark:text-primary/90' : 'border-white/10 dark:border-slate-700 bg-white/5 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'} font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm`}
                  >
                    <Moon size={14} /> Dark
                  </button>
                  <button 
                    onClick={() => setTheme('system')} 
                    className={`flex-1 py-3 px-4 rounded-xl border ${theme === 'system' ? 'border-primary bg-primary/10 text-primary dark:text-primary/90' : 'border-white/10 dark:border-slate-700 bg-white/5 dark:bg-black/20 text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'} font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm`}
                  >
                    <Monitor size={14} /> System
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>

      {/* Profile Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsSettingsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white/90 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 shadow-2xl dark:shadow-none rounded-3xl overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between p-6 border-b border-white/10 dark:border-slate-700/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-2">
                <User size={18} className="text-primary" /> Profile Settings
              </h2>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 rounded-xl hover:bg-white/10 dark:hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleProfileSave} className="p-6 space-y-5">
              {profileSaveSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <CheckCheck size={14} /> Profile updated successfully!
                </div>
              )}
              {profileSaveError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} /> {profileSaveError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Corporate Name</label>
                  <input
                    type="text"
                    disabled
                    value={profileForm.company_name}
                    className="w-full bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-start gap-1">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    To change your registered corporate entity name, please submit a Support Ticket.
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={profileForm.contact_person}
                    onChange={e => setProfileForm(p => ({...p, contact_person: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone_number}
                    onChange={e => setProfileForm(p => ({...p, phone_number: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Default Business/Warehouse Address</label>
                  <textarea
                    required
                    rows={2}
                    value={profileForm.default_address}
                    onChange={e => setProfileForm(p => ({...p, default_address: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm resize-none"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-accent/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75 disabled:active:scale-100 cursor-pointer"
                >
                  {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
