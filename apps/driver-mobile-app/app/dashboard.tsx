import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native'
import * as Location from 'expo-location'
import * as Network from 'expo-network'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { MapPin, Wifi, WifiOff, Package, CheckCircle } from 'lucide-react-native'

const ASYNC_STORAGE_SYNC_KEY = '@cargonode_gps_queue'

export default function DashboardScreen() {
  const [shiftActive, setShiftActive] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [queuedSyncs, setQueuedSyncs] = useState(0)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulse animation for the Start Shift button
  useEffect(() => {
    if (shiftActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
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

      // If we regained connection, flush the queue
      if (currentOnline) {
        await flushSyncQueue()
      } else {
        // Update local queue count for UI
        const stored = await AsyncStorage.getItem(ASYNC_STORAGE_SYNC_KEY)
        if (stored) {
          const queue = JSON.parse(stored)
          setQueuedSyncs(queue.length)
        }
      }
    }

    // Check network every 10 seconds
    interval = setInterval(checkNetworkAndFlush, 10000)
    checkNetworkAndFlush()

    return () => clearInterval(interval)
  }, [])

  // GPS Telemetry Engine (30s interval)
  useEffect(() => {
    let locationInterval: NodeJS.Timeout

    const captureLocation = async () => {
      if (!shiftActive) return

      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'GPS is required for telemetry.')
          setShiftActive(false)
          return
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        
        const payload = {
          prime_mover_id: 'PM-215', // Hardcoded for demo, normally from Auth context
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed || 0,
          recorded_at: new Date().toISOString()
        }

        const netState = await Network.getNetworkStateAsync()
        if (netState.isConnected) {
          // ONLINE: Direct insert
          const { error } = await supabase.from('gps_logs').insert([payload])
          if (error) throw error
          console.log('GPS log synced directly')
        } else {
          // OFFLINE: Queue it
          await queuePayload(payload)
        }
      } catch (e) {
        console.error('Telemetry Error:', e)
        // Fallback queueing
        await queuePayload({
          prime_mover_id: 'PM-215',
          latitude: 0,
          longitude: 0,
          speed: 0,
          recorded_at: new Date().toISOString()
        })
      }
    }

    if (shiftActive) {
      // Immediate ping on start, then every 30s
      captureLocation()
      locationInterval = setInterval(captureLocation, 30000)
    }

    return () => {
      if (locationInterval) clearInterval(locationInterval)
    }
  }, [shiftActive])

  // --- Offline Sync Protocol Helpers ---
  const queuePayload = async (payload: any) => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_STORAGE_SYNC_KEY)
      const queue = stored ? JSON.parse(stored) : []
      queue.push(payload)
      await AsyncStorage.setItem(ASYNC_STORAGE_SYNC_KEY, JSON.stringify(queue))
      setQueuedSyncs(queue.length)
      console.log('GPS log queued offline')
    } catch (e) {
      console.error('Failed to queue payload', e)
    }
  }

  const flushSyncQueue = async () => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_STORAGE_SYNC_KEY)
      if (!stored) return

      const queue = JSON.parse(stored)
      if (queue.length === 0) return

      console.log(`Flushing ${queue.length} logs to Supabase...`)
      
      const { error } = await supabase.from('gps_logs').insert(queue)
      
      if (!error) {
        await AsyncStorage.removeItem(ASYNC_STORAGE_SYNC_KEY)
        setQueuedSyncs(0)
        console.log('Sync flush successful')
      }
    } catch (e) {
      console.error('Flush failed', e)
    }
  }

  const handleMarkDelivered = async () => {
    Alert.alert('Delivered', 'Waybill has been marked as delivered.')
  }

  return (
    <View style={styles.container}>
      {/* Top Header - Network Status */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TERMINAL HUB</Text>
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
          <Text style={styles.waybillTitle}>ACTIVE WAYBILL</Text>
        </View>
        <Text style={styles.waybillNumber}>WAY-X88B92</Text>
        <View style={styles.routeRow}>
          <MapPin size={16} color="#64748b" />
          <Text style={styles.routeText}>Manila Pier 4 → Laguna Warehouse</Text>
        </View>
      </View>

      {/* Massive Shift Toggle Button */}
      <View style={styles.toggleContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.shiftBtn, shiftActive ? styles.shiftBtnActive : styles.shiftBtnInactive]}
            onPress={() => setShiftActive(!shiftActive)}
            activeOpacity={0.8}
          >
            <Text style={[styles.shiftBtnText, shiftActive ? styles.shiftBtnTextActive : styles.shiftBtnTextInactive]}>
              {shiftActive ? 'END SHIFT' : 'START SHIFT'}
            </Text>
            {shiftActive && <Text style={styles.transmittingText}>Transmitting Telemetry...</Text>}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Mark Delivered Action */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.deliveredBtn, !shiftActive && { opacity: 0.5 }]} 
          onPress={handleMarkDelivered}
          disabled={!shiftActive}
        >
          <CheckCircle size={24} color="#000000" />
          <Text style={styles.deliveredBtnText}>MARK AS DELIVERED</Text>
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
  },
  waybillTitle: {
    color: '#3b82f6',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
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
