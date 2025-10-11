import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

interface SuspiciousEvent {
  id: string
  userId: string
  type: SuspiciousEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  details: any
  ipAddress?: string
  userAgent?: string
  location?: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: number
}

type SuspiciousEventType = 
  | 'multiple_failed_logins'
  | 'unusual_login_location'
  | 'rapid_api_requests'
  | 'privilege_escalation_attempt'
  | 'unusual_data_access'
  | 'suspicious_file_upload'
  | 'unauthorized_admin_access'
  | 'bulk_data_export'
  | 'unusual_session_pattern'
  | 'brute_force_attack'
  | 'sql_injection_attempt'
  | 'cross_site_scripting'

interface ActivityPattern {
  userId: string
  failedLogins: number[]
  loginLocations: string[]
  apiRequestTimes: number[]
  dataAccessPatterns: string[]
  sessionDurations: number[]
  lastUpdated: number
}

interface AlertConfig {
  maxFailedLogins: number
  failedLoginWindow: number
  maxApiRequestsPerMinute: number
  suspiciousLocationThreshold: number
  bulkDataExportThreshold: number
  adminAccessMonitoring: boolean
  realTimeAlerts: boolean
}

const DEFAULT_CONFIG: AlertConfig = {
  maxFailedLogins: 5,
  failedLoginWindow: 15 * 60 * 1000, // 15 minutes
  maxApiRequestsPerMinute: 120,
  suspiciousLocationThreshold: 1000, // km from usual locations
  bulkDataExportThreshold: 1000, // records
  adminAccessMonitoring: true,
  realTimeAlerts: true
}

// Risk scores for different event types
const RISK_SCORES: Record<SuspiciousEventType, number> = {
  multiple_failed_logins: 30,
  unusual_login_location: 20,
  rapid_api_requests: 25,
  privilege_escalation_attempt: 80,
  unusual_data_access: 40,
  suspicious_file_upload: 50,
  unauthorized_admin_access: 90,
  bulk_data_export: 60,
  unusual_session_pattern: 15,
  brute_force_attack: 70,
  sql_injection_attempt: 95,
  cross_site_scripting: 85
}

const useSuspiciousActivity = (customConfig?: Partial<AlertConfig>) => {
  const { user, profile } = useAuth()
  const config = { ...DEFAULT_CONFIG, ...customConfig }
  
  const [suspiciousEvents, setSuspiciousEvents] = useState<SuspiciousEvent[]>([])
  const [activityPatterns, setActivityPatterns] = useState<Map<string, ActivityPattern>>(new Map())
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  
  const monitoringIntervalRef = useRef<NodeJS.Timeout>()
  const eventIdCounterRef = useRef(0)

  // Generate unique event ID
  const generateEventId = useCallback(() => {
    return `suspicious_${Date.now()}_${++eventIdCounterRef.current}`
  }, [])

  // Get user's current location (simplified)
  const getCurrentLocation = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      return `${data.city}, ${data.country_name}` || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }, [])

  // Get user's IP address
  const getCurrentIP = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip || 'unknown'
    } catch {
      return 'unknown'
    }
  }, [])

  // Calculate distance between two locations (simplified)
  const calculateDistance = useCallback((loc1: string, loc2: string): number => {
    // This is a simplified distance calculation
    // In a real app, you'd use proper geolocation APIs
    if (loc1 === loc2) return 0
    if (loc1 === 'Unknown' || loc2 === 'Unknown') return 0
    
    // Mock distance calculation - in reality would use lat/lng
    const cities1 = loc1.split(',')[0]?.trim().toLowerCase()
    const cities2 = loc2.split(',')[0]?.trim().toLowerCase()
    
    if (cities1 === cities2) return 0
    return Math.random() * 2000 // Random distance for demo
  }, [])

  // Create suspicious event
  const createSuspiciousEvent = useCallback(async (
    type: SuspiciousEventType,
    details: any,
    userId?: string
  ): Promise<SuspiciousEvent> => {
    const targetUserId = userId || user?.id || ''
    const currentIP = await getCurrentIP()
    const currentLocation = await getCurrentLocation()
    
    const severity = RISK_SCORES[type] >= 80 ? 'critical' 
                   : RISK_SCORES[type] >= 60 ? 'high'
                   : RISK_SCORES[type] >= 30 ? 'medium' : 'low'

    const event: SuspiciousEvent = {
      id: generateEventId(),
      userId: targetUserId,
      type,
      severity,
      timestamp: Date.now(),
      details,
      ipAddress: currentIP,
      userAgent: navigator.userAgent,
      location: currentLocation,
      resolved: false
    }

    // Store event
    setSuspiciousEvents(prev => [event, ...prev].slice(0, 1000)) // Keep last 1000 events

    // Log to database
    try {
      await supabase.from('audit_logs').insert({
        user_id: targetUserId,
        action: 'suspicious_activity',
        resource_type: 'security',
        resource_id: event.id,
        details: {
          eventType: type,
          severity,
          riskScore: RISK_SCORES[type],
          ...details,
          ipAddress: currentIP,
          location: currentLocation,
          userAgent: navigator.userAgent
        }
      })
    } catch (error) {
      console.warn('Failed to log suspicious activity:', error)
    }

    // Send real-time alert if enabled
    if (config.realTimeAlerts && alertsEnabled) {
      await sendAlert(event)
    }

    return event
  }, [user, config.realTimeAlerts, alertsEnabled, generateEventId, getCurrentIP, getCurrentLocation])

  // Send alert to administrators
  const sendAlert = useCallback(async (event: SuspiciousEvent) => {
    // Toast notification for current user if they're an admin
    if (profile?.role === 'platform_owner' || profile?.role === 'super_admin') {
      const severityColor = {
        low: 'bg-yellow-500',
        medium: 'bg-orange-500', 
        high: 'bg-red-500',
        critical: 'bg-red-700'
      }[event.severity]

      toast.error(`Suspicious Activity Detected`, {
        description: `${event.type.replace(/_/g, ' ')} - ${event.severity} severity`,
        duration: event.severity === 'critical' ? 0 : 5000, // Critical alerts stay until dismissed
        action: {
          label: 'View Details',
          onClick: () => console.log('Show event details:', event)
        }
      })
    }

    // In a real app, would also send email/SMS alerts to admins
    try {
      // Mock notification to admins
      await supabase.from('notifications').insert({
        recipient_type: 'role',
        recipient_id: 'platform_owner',
        title: 'Suspicious Activity Alert',
        message: `${event.type.replace(/_/g, ' ')} detected for user ${event.userId}`,
        priority: event.severity,
        data: event
      })
    } catch (error) {
      console.warn('Failed to send admin notification:', error)
    }
  }, [profile, alertsEnabled])

  // Monitor failed login attempts
  const monitorFailedLogin = useCallback(async (userId: string, details: any) => {
    const pattern = activityPatterns.get(userId) || {
      userId,
      failedLogins: [],
      loginLocations: [],
      apiRequestTimes: [],
      dataAccessPatterns: [],
      sessionDurations: [],
      lastUpdated: Date.now()
    }

    const now = Date.now()
    const windowStart = now - config.failedLoginWindow

    // Add failed login
    pattern.failedLogins.push(now)
    pattern.failedLogins = pattern.failedLogins.filter(time => time > windowStart)

    // Check if threshold exceeded
    if (pattern.failedLogins.length >= config.maxFailedLogins) {
      await createSuspiciousEvent('multiple_failed_logins', {
        failedAttempts: pattern.failedLogins.length,
        timeWindow: config.failedLoginWindow,
        ...details
      }, userId)
    }

    setActivityPatterns(prev => new Map(prev.set(userId, pattern)))
  }, [activityPatterns, config.failedLoginWindow, config.maxFailedLogins, createSuspiciousEvent])

  // Monitor unusual login locations
  const monitorLoginLocation = useCallback(async (userId: string, details: any) => {
    const currentLocation = await getCurrentLocation()
    const pattern = activityPatterns.get(userId) || {
      userId,
      failedLogins: [],
      loginLocations: [currentLocation],
      apiRequestTimes: [],
      dataAccessPatterns: [],
      sessionDurations: [],
      lastUpdated: Date.now()
    }

    // Check against usual locations
    const distances = pattern.loginLocations.map(loc => 
      calculateDistance(currentLocation, loc)
    )

    const minDistance = Math.min(...distances, Infinity)
    
    if (minDistance > config.suspiciousLocationThreshold) {
      await createSuspiciousEvent('unusual_login_location', {
        currentLocation,
        usualLocations: pattern.loginLocations,
        distanceFromNearest: minDistance,
        ...details
      }, userId)
    }

    // Add location to pattern
    if (!pattern.loginLocations.includes(currentLocation)) {
      pattern.loginLocations.push(currentLocation)
      pattern.loginLocations = pattern.loginLocations.slice(-10) // Keep last 10 locations
    }

    setActivityPatterns(prev => new Map(prev.set(userId, pattern)))
  }, [activityPatterns, config.suspiciousLocationThreshold, getCurrentLocation, calculateDistance, createSuspiciousEvent])

  // Monitor API request patterns
  const monitorApiRequests = useCallback(async (userId: string, endpoint: string) => {
    const pattern = activityPatterns.get(userId) || {
      userId,
      failedLogins: [],
      loginLocations: [],
      apiRequestTimes: [],
      dataAccessPatterns: [],
      sessionDurations: [],
      lastUpdated: Date.now()
    }

    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000

    // Add request time
    pattern.apiRequestTimes.push(now)
    pattern.apiRequestTimes = pattern.apiRequestTimes.filter(time => time > oneMinuteAgo)

    // Check if exceeding rate limits
    if (pattern.apiRequestTimes.length > config.maxApiRequestsPerMinute) {
      await createSuspiciousEvent('rapid_api_requests', {
        requestsPerMinute: pattern.apiRequestTimes.length,
        endpoint,
        threshold: config.maxApiRequestsPerMinute
      }, userId)
    }

    setActivityPatterns(prev => new Map(prev.set(userId, pattern)))
  }, [activityPatterns, config.maxApiRequestsPerMinute, createSuspiciousEvent])

  // Monitor data access patterns
  const monitorDataAccess = useCallback(async (
    userId: string, 
    resourceType: string, 
    operation: string,
    recordCount?: number
  ) => {
    // Check for bulk data export
    if (operation === 'export' && recordCount && recordCount > config.bulkDataExportThreshold) {
      await createSuspiciousEvent('bulk_data_export', {
        resourceType,
        recordCount,
        threshold: config.bulkDataExportThreshold
      }, userId)
    }

    // Check for unusual admin access
    if (config.adminAccessMonitoring && (resourceType === 'admin' || operation === 'admin')) {
      const userProfile = profile || await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (userProfile.data?.role !== 'platform_owner' && userProfile.data?.role !== 'super_admin') {
        await createSuspiciousEvent('unauthorized_admin_access', {
          resourceType,
          operation,
          userRole: userProfile.data?.role
        }, userId)
      }
    }
  }, [config.bulkDataExportThreshold, config.adminAccessMonitoring, profile, createSuspiciousEvent])

  // Monitor for potential security attacks
  const monitorSecurityAttack = useCallback(async (
    type: 'sql_injection' | 'xss' | 'brute_force',
    details: any
  ) => {
    const eventType: SuspiciousEventType = 
      type === 'sql_injection' ? 'sql_injection_attempt' :
      type === 'xss' ? 'cross_site_scripting' : 'brute_force_attack'

    await createSuspiciousEvent(eventType, details)
  }, [createSuspiciousEvent])

  // Resolve suspicious event
  const resolveEvent = useCallback(async (eventId: string, resolution: string) => {
    setSuspiciousEvents(prev => 
      prev.map(event => 
        event.id === eventId 
          ? { 
              ...event, 
              resolved: true, 
              resolvedBy: user?.id,
              resolvedAt: Date.now()
            }
          : event
      )
    )

    // Log resolution
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id || '',
        action: 'resolve_suspicious_activity',
        resource_type: 'security',
        resource_id: eventId,
        details: { resolution }
      })
    } catch (error) {
      console.warn('Failed to log event resolution:', error)
    }

    toast.success('Suspicious activity resolved')
  }, [user])

  // Get event statistics
  const getEventStats = useCallback(() => {
    const now = Date.now()
    const last24Hours = now - 24 * 60 * 60 * 1000
    const last7Days = now - 7 * 24 * 60 * 60 * 1000

    const events24h = suspiciousEvents.filter(e => e.timestamp > last24Hours)
    const events7d = suspiciousEvents.filter(e => e.timestamp > last7Days)

    const severityCounts = {
      critical: events24h.filter(e => e.severity === 'critical').length,
      high: events24h.filter(e => e.severity === 'high').length,
      medium: events24h.filter(e => e.severity === 'medium').length,
      low: events24h.filter(e => e.severity === 'low').length
    }

    const typeCounts = events7d.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalEvents: suspiciousEvents.length,
      events24h: events24h.length,
      events7d: events7d.length,
      unresolvedEvents: suspiciousEvents.filter(e => !e.resolved).length,
      severityCounts,
      typeCounts,
      riskScore: events24h.reduce((sum, e) => sum + RISK_SCORES[e.type], 0)
    }
  }, [suspiciousEvents])

  // Monitor activity patterns periodically
  useEffect(() => {
    if (!isMonitoring) return

    monitoringIntervalRef.current = setInterval(() => {
      // Clean up old patterns
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      setActivityPatterns(prev => {
        const newMap = new Map()
        prev.forEach((pattern, userId) => {
          if (now - pattern.lastUpdated < maxAge) {
            newMap.set(userId, pattern)
          }
        })
        return newMap
      })
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current)
      }
    }
  }, [isMonitoring])

  return {
    // Event data
    suspiciousEvents: suspiciousEvents.slice(0, 100), // Return last 100 events
    activityPatterns: Array.from(activityPatterns.values()),
    
    // Configuration
    config,
    isMonitoring,
    setIsMonitoring,
    alertsEnabled,
    setAlertsEnabled,
    
    // Monitoring functions
    monitorFailedLogin,
    monitorLoginLocation,
    monitorApiRequests,
    monitorDataAccess,
    monitorSecurityAttack,
    
    // Management functions
    createSuspiciousEvent,
    resolveEvent,
    
    // Utilities
    getEventStats,
    riskScores: RISK_SCORES
  }
}

export default useSuspiciousActivity 