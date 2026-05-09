import React, { useState } from 'react'
import { Plus, Loader2, Package, Truck, LayoutGrid, CheckCircle2, ChevronDown, MapPin, X } from 'lucide-react'
import PageHeader from '../PageHeader'
import { supabase } from '../../lib/supabase'

type ContainerType = '20-footer' | '40-footer' | 'LCL'

interface AllocationItem {
  id: string
  type: ContainerType
  weight: string
}

const CAPACITY_MAP: Record<ContainerType, number> = {
  '20-footer': 50,
  '40-footer': 100,
  'LCL': 25,
}

const CargoWaybillAllocator: React.FC = () => {
  const [clientName, setClientName] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedType, setSelectedType] = useState<ContainerType>('20-footer')
  const [items, setItems] = useState<AllocationItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const currentCapacity = items.reduce((acc, item) => acc + CAPACITY_MAP[item.type], 0)
  const isOverCapacity = currentCapacity > 100

  const handleAddItem = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isOverCapacity) return
    const newItem: AllocationItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedType,
      weight: selectedType === '40-footer' ? '22t' : selectedType === '20-footer' ? '12t' : '4t'
    }
    setItems([...items, newItem])
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0 || isOverCapacity || !clientName || !destination) return
    setIsGenerating(true)
    
    try {
      const trackingNumber = `WAY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      
      const { error: waybillError } = await supabase.from('waybills').insert({
        tracking_number: trackingNumber,
        client_name: clientName,
        origin: 'Central Hub',
        destination: destination,
        container_type: items[0].type,
        status: 'Loading'
      })

      if (waybillError) throw waybillError

      const { error: milestoneError } = await supabase.from('tracking_milestones').insert({
        waybill_id: trackingNumber,
        title: 'Manifest Generated',
        location: 'Central Hub',
        status: 'completed',
        order_index: 1
      })

      if (milestoneError) throw milestoneError

      setGenerated(true)
      // Reset form after short delay
      setTimeout(() => {
        setGenerated(false)
        setClientName('')
        setDestination('')
        setItems([])
      }, 3000)
    } catch (error) {
      console.error('Error generating waybill:', error)
      alert('Database insertion failed. Have you run the Supabase schema migrations?')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Cargo Waybill Allocator"
        subtitle="Intelligent allocation wizard for prime mover capacity and dispatch generation"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left Pane: The Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">Allocation Details</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fill in the dispatch manifest to generate a digital waybill</p>
          </div>
          
          <div className="p-8 flex-1 overflow-y-auto">
            <form id="allocator-form" onSubmit={handleGenerate} className="space-y-6">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Client Name</label>
                <div className="relative">
                   <input 
                     type="text" 
                     value={clientName}
                     onChange={(e) => setClientName(e.target.value)}
                     placeholder="e.g. NexaCorp Logistics Inc."
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-xl px-4 py-3 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Destination Route</label>
                <div className="relative">
                   <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                   <input 
                     type="text" 
                     value={destination}
                     onChange={(e) => setDestination(e.target.value)}
                     placeholder="e.g. Pier 4 to Laguna Warehouse"
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-xl pl-11 pr-4 py-3 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400"
                   />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Add Cargo Unit</label>
                    <div className="relative">
                      <select 
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as ContainerType)}
                        className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-xl px-4 py-3 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="20-footer">20-Footer Standard (50% Cap)</option>
                        <option value="40-footer">40-Footer High Cube (100% Cap)</option>
                        <option value="LCL">LCL / Back-to-back (25% Cap)</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddItem}
                    disabled={isOverCapacity || (currentCapacity + CAPACITY_MAP[selectedType] > 100)}
                    className="h-[46px] px-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* Added Items List */}
              {items.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 p-2 space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in-down" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Package size={16} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.type}</p>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Est. Weight: {item.weight}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </form>
          </div>
          
          <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
             <button 
                type="submit"
                form="allocator-form"
                disabled={items.length === 0 || isOverCapacity || !clientName || !destination || isGenerating || generated}
                className="w-full h-[52px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
             >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Generating Waybill...
                  </>
                ) : generated ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-300" /> Digital Waybill Created!
                  </>
                ) : (
                  <>
                    <LayoutGrid size={18} /> Generate Digital Waybill
                  </>
                )}
                
                {/* Button shine effect */}
                {!isGenerating && !generated && (
                   <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 animate-[shine_3s_infinite]" />
                )}
             </button>
          </div>
        </div>

        {/* Right Pane: Volume Visualizer */}
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[600px] relative">
          
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[#0a192f] opacity-50"
            style={{
              backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          <div className="relative z-10 px-8 py-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Truck size={20} className="text-blue-400" /> Chassis Visualizer
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Real-time load and balance monitoring</p>
            </div>
            
            <div className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                isOverCapacity 
                  ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                  : currentCapacity === 100 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              }`}>
               Capacity: {currentCapacity}%
            </div>
          </div>

          <div className="relative z-10 flex-1 p-8 flex flex-col items-center justify-center">
             
             {/* The Trailer Graphic */}
             <div className="relative w-full max-w-sm h-64 border-b-4 border-slate-700 flex items-end justify-center pb-2">
                
                {/* Wheels */}
                <div className="absolute -bottom-3 right-8 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 shadow-lg"></div>
                <div className="absolute -bottom-3 right-16 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 shadow-lg"></div>
                
                {/* Hitch */}
                <div className="absolute bottom-0 left-0 w-8 h-2 bg-slate-600 rounded-l-md"></div>

                {/* Capacity Fill Area */}
                <div className="relative w-11/12 h-48 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-600 p-2 flex flex-col-reverse justify-start overflow-hidden backdrop-blur-sm">
                   
                   {/* Ghost state when empty */}
                   {items.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 font-semibold text-sm tracking-widest uppercase">
                       Awaiting Cargo
                     </div>
                   )}

                   {/* Render added blocks */}
                   {items.map((item, idx) => {
                     const heightPct = CAPACITY_MAP[item.type];
                     const isRed = isOverCapacity && idx === items.length - 1; // Mark the last item that tipped it over as red
                     return (
                       <div 
                         key={item.id} 
                         className={`w-full rounded-md shadow-inner flex items-center justify-center transition-all duration-500 animate-fade-in-down mb-1 relative overflow-hidden group ${
                           isRed 
                             ? 'bg-gradient-to-r from-red-600 to-red-500 border border-red-400'
                             : 'bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400'
                         }`}
                         style={{ height: `${heightPct}%` }}
                       >
                          {/* Inner container texture */}
                          <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)'
                          }} />
                          
                          <span className="relative z-10 text-white font-bold text-sm tracking-wide shadow-black/50 drop-shadow-md">
                            {item.type}
                          </span>
                       </div>
                     )
                   })}
                </div>
             </div>

             <div className="mt-12 w-full max-w-sm space-y-4">
                <div className="flex justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                {/* Animated fill bar */}
                <div className="h-3 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shadow-inner">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                       isOverCapacity ? 'bg-red-500' : currentCapacity === 100 ? 'bg-amber-500' : 'bg-emerald-500'
                     }`}
                     style={{ width: `${Math.min(currentCapacity, 100)}%` }}
                   >
                     {/* Shimmer effect inside progress bar */}
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                   </div>
                </div>
                
                {isOverCapacity && (
                  <p className="text-center text-xs font-bold text-red-400 animate-pulse mt-2">
                    Warning: Legal load limit exceeded. Remove cargo.
                  </p>
                )}
             </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default CargoWaybillAllocator
