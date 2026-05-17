import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, ActivityIndicator } from 'react-native'
import * as Location from 'expo-location'
import * as Network from 'expo-network'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { MapPin, Wifi, WifiOff, Package, CheckCircle, LogOut } from 'lucide-react-native'

const ASYNC_STORAGE_SYNC_KEY = '@cargonode_gps_queue'

export default function DashboardScreen() {
  const [shiftActive, setShiftActive] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [queuedSyncs, setQueuedSyncs] = useState(0)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Driver identity & assigned truck
  const [primMoverId, setPrimMoverId] = useState<string | null>(null)
  const [activeWaybill, setActiveWaybill] = useState<any | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Fetch the authenticated driver's assigned prime mover + active waybill
  useEffect(() => {
    const fetchDriverProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Prefer prime_mover_id from user metadata (set by admin when creating driver account)
        const metaPmId = user.user_metadata?.prime_mover_id as string | undefined

        if (metaPmId) {
          setPrimMoverId(metaPmId)
          // Fetch this truck's current active waybill
          const { data: waybill } = await supabase
            .from('waybills')
            .select('*')
            .eq('prime_mover_id', metaPmId)
            .in('status', ['Loading', 'In Transit'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (waybill) setActiveWaybill(waybill)
        } else {
          // Fallback for demo: pick the first active waybill in the system
          const { data: waybill } = await supabase
            .from('waybills')
            .select('*')
            .in('status', ['Loading', 'In Transit'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (waybill) {
            setActiveWaybill(waybill)
            setPrimMoverId(waybill.prime_mover_id)
          }
        }
      } catch (e) {
        console.error('Failed to fetch driver profile:', e)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchDriverProfile()
  }, [])

  // Real-time listener for waybill assignments
  useEffect(() => {
    if (!primMoverId) return

    const fetchCurrentWaybill = async () => {
      const { data } = await supabase
        .from('waybills')
        .select('*')
        .eq('prime_mover_id', primMoverId)
        .in('status', ['Loading', 'In Transit'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      setActiveWaybill(data || null)
    }

    const channel = supabase
      .channel('driver_waybills_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waybills', filter: `prime_mover_id=eq.${primMoverId}` },
        () => {
          fetchCurrentWaybill()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [primMoverId])

  // Pulse animation for the Start Shift button
  useEffect(() => {
    if (shiftActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
      pulseAnim.stopAnimation()
    }
  }, [shiftActive])

  // Network listener & Queue flusher
  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkNetworkAndFlush = async () => {
      const netState = await Network.getNetworkStateAsync()
      const currentOnline = netState.isConnected && netState.isInternetReachable !== false
      setIsOnline(!!currentOnline)

      if (currentOnline) {
        await flushSyncQueue()
      } else {
        const stored = await AsyncStorage.getItem(ASYNC_STORAGE_SYNC_KEY)
        if (stored) {
          const queue = JSON.parse(stored)
          setQueuedSyncs(queue.length)
        }
      }
    }

    interval = setInterval(checkNetworkAndFlush, 10000)
    checkNetworkAndFlush()

    return () => clearInterval(interval)
  }, [])

  // GPS Telemetry Engine (30s interval) — P1: payload strictly matches gps_logs schema
  useEffect(() => {
    let locationInterval: NodeJS.Timeout

    const captureLocation = async () => {
      if (!shiftActive || !primMoverId) return

      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'GPS is required for telemetry.')
          setShiftActive(false)
          return
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })

        // Payload strictly matches public.gps_logs schema:
        // (id UUID default, prime_mover_id, latitude, longitude, timestamp default NOW(), created_at default NOW())
        const payload = {
          prime_mover_id: primMoverId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          // timestamp and created_at use DB defaults — no overrides needed
        }

        const netState = await Network.getNetworkStateAsync()
        if (netState.isConnected) {
          const { error } = await supabase.from('gps_logs').insert([payload])
          if (error) throw error
          console.log(`[GPS] Log synced for ${primMoverId}`)
        } else {
          await queuePayload(payload)
        }
      } catch (e) {
        console.error('[GPS] Telemetry error:', e)
        // Do not queue on error — corrupted coordinates shouldn't be stored
      }
    }

    if (shiftActive) {
      captureLocation()
      locationInterval = setInterval(captureLocation, 30000)
    }

    return () => {
      if (locationInterval) clearInterval(locationInterval)
    }
  }, [shiftActive, primMoverId])

  // --- Offline Sync Protocol Helpers ---
  const queuePayload = async (payload: object) => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_STORAGE_SYNC_KEY)
      const queue = stored ? JSON.parse(stored) : []
      queue.push(payload)
      await AsyncStorage.setItem(ASYNC_STORAGE_SYNC_KEY, JSON.stringify(queue))
      setQueuedSyncs(queue.length)
      console.log(`[GPS] Queued offline (${queue.length} pending)`)
    } catch (e) {
      console.error('[GPS] Failed to queue payload:', e)
    }
  }

  const flushSyncQueue = async () => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_STORAGE_SYNC_KEY)
      if (!stored) return

      const queue = JSON.parse(stored)
      if (queue.length === 0) return

      console.log(`[GPS] Flushing ${queue.length} offline logs to Supabase...`)
      const { error } = await supabase.from('gps_logs').insert(queue)

      if (!error) {
        await AsyncStorage.removeItem(ASYNC_STORAGE_SYNC_KEY)
        setQueuedSyncs(0)
        console.log('[GPS] Flush successful')
      } else {
        console.error('[GPS] Flush failed:', error.message)
      }
    } catch (e) {
      console.error('[GPS] Flush exception:', e)
    }
  }

  const handleToggleShift = async () => {
    const isStarting = !shiftActive
    
    try {
      if (isStarting) {
        // Start Shift
        if (primMoverId) {
          await supabase.from('prime_movers').update({ status: 'In Transit' }).eq('id', primMoverId)
        }
        if (activeWaybill && activeWaybill.status === 'Loading') {
          await supabase.from('waybills').update({ status: 'In Transit' }).eq('tracking_number', activeWaybill.tracking_number)
          
          await supabase.from('tracking_milestones').insert({
            waybill_id: activeWaybill.tracking_number,
            title: 'Shift Started / In Transit',
            location: activeWaybill.origin,
            status: 'in-progress',
            order_index: 2,
          })
          
          setActiveWaybill({ ...activeWaybill, status: 'In Transit' })
        }
        setShiftActive(true)
      } else {
        // End Shift
        if (primMoverId) {
          await supabase.from('prime_movers').update({ status: 'Pier Standby' }).eq('id', primMoverId)
        }
        setShiftActive(false)
      }
    } catch (e) {
      console.error('Failed to toggle shift status:', e)
      Alert.alert('Error', 'Failed to sync shift status with server.')
    }
  }

  const handleMarkDelivered = async () => {
    if (!activeWaybill) return
    Alert.alert(
      'Confirm Delivery',
      `Mark waybill ${activeWaybill.tracking_number} as delivered?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const { error } = await supabase
              .from('waybills')
              .update({ status: 'Delivered' })
              .eq('tracking_number', activeWaybill.tracking_number)

            if (!error) {
              // Update prime_mover status to Active so it reflects empty on map
              if (primMoverId) {
                await supabase.from('prime_movers').update({ status: 'Active' }).eq('id', primMoverId)
              }

              // Insert final tracking milestone
              await supabase.from('tracking_milestones').insert({
                waybill_id: activeWaybill.tracking_number,
                title: 'Cargo Delivered',
                location: activeWaybill.destination,
                status: 'completed',
                order_index: 99,
              })
              setActiveWaybill({ ...activeWaybill, status: 'Delivered' })
              Alert.alert('Delivered ✓', 'Waybill has been marked as delivered and the client portal has been updated.')
            } else {
              Alert.alert('Error', 'Failed to update waybill status: ' + error.message)
            }
          }
        }
      ]
    )
  }

  const handleSignOut = async () => {
    setShiftActive(false)
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#10b981" size="large" />
        <Text style={{ color: '#64748b', marginTop: 16, fontSize: 13 }}>Authenticating driver profile...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Top Header - Network Status */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TERMINAL HUB</Text>
        <View style={styles.headerRight}>
          <View style={styles.networkBadge}>
            {isOnline ? (
              <Wifi size={16} color="#10b981" />
            ) : (
              <WifiOff size={16} color="#ef4444" />
            )}
            <Text style={[styles.networkText, { color: isOnline ? '#10b981' : '#ef4444' }]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <LogOut size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Sync Counter */}
      {!isOnline && queuedSyncs > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>Offline Syncs Pending: {queuedSyncs}</Text>
          <Text style={styles.syncSubtext}>Will auto-flush when signal returns</Text>
        </View>
      )}

      {/* Current Waybill Info */}
      <View style={styles.waybillCard}>
        <View style={styles.waybillHeader}>
          <Package size={20} color="#3b82f6" />
          <Text style={styles.waybillTitle}>
            {activeWaybill ? 'ACTIVE WAYBILL' : 'NO ACTIVE WAYBILL'}
          </Text>
          {primMoverId && (
            <Text style={styles.pmBadge}>{primMoverId}</Text>
          )}
        </View>
        {activeWaybill ? (
          <>
            <Text style={styles.waybillNumber}>{activeWaybill.tracking_number}</Text>
            <View style={styles.routeRow}>
              <MapPin size={16} color="#64748b" />
              <Text style={styles.routeText}>
                {activeWaybill.origin} → {activeWaybill.destination}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.noWaybillText}>
            No active waybill assigned to this vehicle. Contact dispatch.
          </Text>
        )}
      </View>

      {/* Massive Shift Toggle Button */}
      <View style={styles.toggleContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.shiftBtn, shiftActive ? styles.shiftBtnActive : styles.shiftBtnInactive]}
            onPress={handleToggleShift}
            activeOpacity={0.8}
            disabled={!primMoverId}
          >
            <Text style={[styles.shiftBtnText, shiftActive ? styles.shiftBtnTextActive : styles.shiftBtnTextInactive]}>
              {shiftActive ? 'END SHIFT' : 'START SHIFT'}
            </Text>
            {shiftActive && <Text style={styles.transmittingText}>Transmitting Telemetry...</Text>}
            {!primMoverId && <Text style={styles.noTruckText}>No truck assigned</Text>}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Mark Delivered Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.deliveredBtn,
            (!shiftActive || !activeWaybill || activeWaybill?.status === 'Delivered') && { opacity: 0.4 }
          ]}
          onPress={handleMarkDelivered}
          disabled={!shiftActive || !activeWaybill || activeWaybill?.status === 'Delivered'}
        >
          <CheckCircle size={24} color="#000000" />
          <Text style={styles.deliveredBtnText}>
            {activeWaybill?.status === 'Delivered' ? 'DELIVERED ✓' : 'MARK AS DELIVERED'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  networkText: {
    fontSize: 12,
    fontWeight: '800',
  },
  signOutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
  },
  syncBanner: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef444450',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  syncText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  syncSubtext: {
    color: '#ef444480',
    fontSize: 12,
    marginTop: 4,
  },
  waybillCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 16,
    padding: 20,
  },
  waybillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  waybillTitle: {
    color: '#3b82f6',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    flex: 1,
  },
  pmBadge: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 11,
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b98140',
  },
  waybillNumber: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  noWaybillText: {
    color: '#475569',
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  toggleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftBtn: {
    width: 280,
    height: 280,
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  shiftBtnInactive: {
    backgroundColor: '#111111',
    borderColor: '#333333',
  },
  shiftBtnActive: {
    backgroundColor: '#042f2e',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  shiftBtnText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  shiftBtnTextInactive: {
    color: '#475569',
  },
  shiftBtnTextActive: {
    color: '#10b981',
  },
  transmittingText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    opacity: 0.8,
  },
  noTruckText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 8,
  },
  footer: {
    marginTop: 'auto',
  },
  deliveredBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 16,
  },
  deliveredBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
})
