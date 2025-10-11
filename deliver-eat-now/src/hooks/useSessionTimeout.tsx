import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface SessionTimeoutConfig {
  idleTimeoutMs: number
  absoluteTimeoutMs: number
  warningTimeMs: number
  checkIntervalMs: number
  extendOnActivity: boolean
  logoutOnTimeout: boolean
}

interface ActivityEvent {
  timestamp: number
  type: 'mouse' | 'keyboard' | 'touch' | 'api' | 'navigation'
  details?: any
}

interface SessionState {
  lastActivity: number
  sessionStart: number
  isIdle: boolean
  timeUntilTimeout: number
  timeUntilWarning: number
  isWarningShown: boolean
  totalSessionTime: number
}

// Default timeout configurations by role
const ROLE_CONFIGS: Record<string, SessionTimeoutConfig> = {
  platform_owner: {
    idleTimeoutMs: 30 * 60 * 1000,      // 30 minutes idle
    absoluteTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours absolute
    warningTimeMs: 5 * 60 * 1000,       // 5 minutes warning
    checkIntervalMs: 30 * 1000,         // Check every 30 seconds
    extendOnActivity: true,
    logoutOnTimeout: true
  },
  super_admin: {
    idleTimeoutMs: 45 * 60 * 1000,      // 45 minutes idle
    absoluteTimeoutMs: 12 * 60 * 60 * 1000, // 12 hours absolute
    warningTimeMs: 5 * 60 * 1000,       // 5 minutes warning
    checkIntervalMs: 30 * 1000,         // Check every 30 seconds
    extendOnActivity: true,
    logoutOnTimeout: true
  },
  restaurant_admin: {
    idleTimeoutMs: 60 * 60 * 1000,      // 1 hour idle
    absoluteTimeoutMs: 12 * 60 * 60 * 1000, // 12 hours absolute
    warningTimeMs: 10 * 60 * 1000,      // 10 minutes warning
    checkIntervalMs: 60 * 1000,         // Check every minute
    extendOnActivity: true,
    logoutOnTimeout: true
  },
  kitchen: {
    idleTimeoutMs: 2 * 60 * 60 * 1000,  // 2 hours idle (kitchen staff may step away)
    absoluteTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours absolute
    warningTimeMs: 15 * 60 * 1000,      // 15 minutes warning
    checkIntervalMs: 2 * 60 * 1000,     // Check every 2 minutes
    extendOnActivity: true,
    logoutOnTimeout: false               // Don't auto-logout kitchen staff
  },
  default: {
    idleTimeoutMs: 60 * 60 * 1000,      // 1 hour idle
    absoluteTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours absolute
    warningTimeMs: 10 * 60 * 1000,      // 10 minutes warning
    checkIntervalMs: 60 * 1000,         // Check every minute
    extendOnActivity: true,
    logoutOnTimeout: true
  }
}

// Events that count as user activity
const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
] as const

const useSessionTimeout = (customConfig?: Partial<SessionTimeoutConfig>) => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  
  const [sessionState, setSessionState] = useState<SessionState>({
    lastActivity: Date.now(),
    sessionStart: Date.now(),
    isIdle: false,
    timeUntilTimeout: 0,
    timeUntilWarning: 0,
    isWarningShown: false,
    totalSessionTime: 0
  })
  
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([])
  const [isEnabled, setIsEnabled] = useState(true)
  
  const timeoutIntervalRef = useRef<NodeJS.Timeout>()
  const warningToastRef = useRef<string | number>()
  const lastActivityRef = useRef<number>(Date.now())
  const sessionStartRef = useRef<number>(Date.now())

  // Get configuration for current user
  const getConfig = useCallback((): SessionTimeoutConfig => {
    const userRole = profile?.role || 'default'
    const baseConfig = ROLE_CONFIGS[userRole] || ROLE_CONFIGS.default
    return { ...baseConfig, ...customConfig }
  }, [profile?.role, customConfig])

  // Record user activity
  const recordActivity = useCallback((
    type: ActivityEvent['type'] = 'mouse',
    details?: any
  ) => {
    if (!isEnabled || !user) return

    const now = Date.now()
    lastActivityRef.current = now

    const newActivity: ActivityEvent = {
      timestamp: now,
      type,
      details
    }

    setActivityLog(prev => {
      // Keep only last 100 activities to prevent memory bloat
      const newLog = [...prev, newActivity].slice(-100)
      return newLog
    })

    setSessionState(prev => ({
      ...prev,
      lastActivity: now,
      isIdle: false
    }))

    // Dismiss warning if active again
    if (warningToastRef.current) {
      toast.dismiss(warningToastRef.current)
      warningToastRef.current = undefined
    }
  }, [isEnabled, user])

  // Handle session timeout
  const handleTimeout = useCallback(async (reason: 'idle' | 'absolute') => {
    const config = getConfig()
    
    // Log timeout event
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id || '',
        action: 'session_timeout',
        resource_type: 'session',
        resource_id: user?.id || '',
        details: {
          reason,
          sessionDuration: Date.now() - sessionStartRef.current,
          lastActivity: lastActivityRef.current,
          userAgent: navigator.userAgent
        }
      })
    } catch (error) {
      console.warn('Failed to log session timeout:', error)
    }

    if (config.logoutOnTimeout) {
      toast.error('Session expired', {
        description: `Your session has expired due to ${reason === 'idle' ? 'inactivity' : 'maximum session time'}`
      })
      
      await signOut()
      navigate('/login')
    } else {
      toast.warning('Session timeout warning', {
        description: 'Your session would normally expire, but auto-logout is disabled for your role',
        action: {
          label: 'Extend Session',
          onClick: () => extendSession()
        }
      })
    }
  }, [user, signOut, navigate, getConfig])

  // Show timeout warning
  const showTimeoutWarning = useCallback((timeRemaining: number) => {
    const minutes = Math.ceil(timeRemaining / (60 * 1000))
    
    warningToastRef.current = toast.warning('Session expiring soon', {
      description: `Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}`,
      duration: timeRemaining,
      action: {
        label: 'Extend Session',
        onClick: () => extendSession()
      }
    })

    setSessionState(prev => ({
      ...prev,
      isWarningShown: true
    }))
  }, [])

  // Extend session manually
  const extendSession = useCallback(() => {
    recordActivity('api', { action: 'manual_extend' })
    
    if (warningToastRef.current) {
      toast.dismiss(warningToastRef.current)
      warningToastRef.current = undefined
    }

    setSessionState(prev => ({
      ...prev,
      isWarningShown: false
    }))

    toast.success('Session extended')
  }, [recordActivity])

  // Check session status
  const checkSessionStatus = useCallback(() => {
    if (!isEnabled || !user) return

    const config = getConfig()
    const now = Date.now()
    const timeSinceActivity = now - lastActivityRef.current
    const totalSessionTime = now - sessionStartRef.current

    // Calculate timeouts
    const timeUntilIdleTimeout = Math.max(0, config.idleTimeoutMs - timeSinceActivity)
    const timeUntilAbsoluteTimeout = Math.max(0, config.absoluteTimeoutMs - totalSessionTime)
    const timeUntilTimeout = Math.min(timeUntilIdleTimeout, timeUntilAbsoluteTimeout)
    
    // Update session state
    setSessionState(prev => ({
      ...prev,
      timeUntilTimeout,
      timeUntilWarning: Math.max(0, timeUntilTimeout - config.warningTimeMs),
      isIdle: timeSinceActivity > config.idleTimeoutMs / 2, // Consider idle at 50% of timeout
      totalSessionTime
    }))

    // Check for timeout
    if (timeUntilIdleTimeout === 0) {
      handleTimeout('idle')
      return
    }

    if (timeUntilAbsoluteTimeout === 0) {
      handleTimeout('absolute')
      return
    }

    // Show warning if approaching timeout
    if (timeUntilTimeout <= config.warningTimeMs && !sessionState.isWarningShown) {
      showTimeoutWarning(timeUntilTimeout)
    }
  }, [isEnabled, user, getConfig, handleTimeout, showTimeoutWarning, sessionState.isWarningShown])

  // Get session statistics
  const getSessionStats = useCallback(() => {
    if (!user) return null

    const config = getConfig()
    const now = Date.now()
    const timeSinceActivity = now - lastActivityRef.current
    const totalSessionTime = now - sessionStartRef.current

    return {
      sessionDuration: totalSessionTime,
      timeSinceLastActivity: timeSinceActivity,
      activitiesCount: activityLog.length,
      isIdle: timeSinceActivity > config.idleTimeoutMs / 2,
      timeUntilTimeout: Math.min(
        config.idleTimeoutMs - timeSinceActivity,
        config.absoluteTimeoutMs - totalSessionTime
      ),
      config
    }
  }, [user, getConfig, activityLog.length])

  // Reset session (admin function)
  const resetSession = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now
    sessionStartRef.current = now
    
    setSessionState({
      lastActivity: now,
      sessionStart: now,
      isIdle: false,
      timeUntilTimeout: 0,
      timeUntilWarning: 0,
      isWarningShown: false,
      totalSessionTime: 0
    })
    
    setActivityLog([])
    
    if (warningToastRef.current) {
      toast.dismiss(warningToastRef.current)
      warningToastRef.current = undefined
    }

    toast.success('Session reset successfully')
  }, [])

  // Setup activity listeners
  useEffect(() => {
    if (!isEnabled) return

    const handleActivity = (event: Event) => {
      recordActivity('mouse', { 
        type: event.type,
        timestamp: Date.now()
      })
    }

    const handleKeyActivity = (event: KeyboardEvent) => {
      recordActivity('keyboard', {
        key: event.key,
        timestamp: Date.now()
      })
    }

    // Add event listeners
    ACTIVITY_EVENTS.forEach(event => {
      if (event === 'keypress') {
        document.addEventListener(event, handleKeyActivity, true)
      } else {
        document.addEventListener(event, handleActivity, true)
      }
    })

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        if (event === 'keypress') {
          document.removeEventListener(event, handleKeyActivity, true)
        } else {
          document.removeEventListener(event, handleActivity, true)
        }
      })
    }
  }, [isEnabled, recordActivity])

  // Setup timeout checking interval
  useEffect(() => {
    if (!isEnabled || !user) return

    const config = getConfig()
    timeoutIntervalRef.current = setInterval(checkSessionStatus, config.checkIntervalMs)

    return () => {
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current)
      }
    }
  }, [isEnabled, user, checkSessionStatus, getConfig])

  // Initialize session on mount
  useEffect(() => {
    if (user) {
      const now = Date.now()
      lastActivityRef.current = now
      sessionStartRef.current = now
      recordActivity('navigation', { action: 'session_start' })
    }
  }, [user, recordActivity])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current)
      }
      if (warningToastRef.current) {
        toast.dismiss(warningToastRef.current)
      }
    }
  }, [])

  return {
    // Session state
    sessionState,
    activityLog: activityLog.slice(-10), // Return last 10 activities
    
    // Configuration
    config: getConfig(),
    isEnabled,
    setIsEnabled,
    
    // Actions
    recordActivity,
    extendSession,
    resetSession,
    
    // Utilities
    getSessionStats,
    
    // Manual timeout (for testing)
    forceTimeout: () => handleTimeout('idle')
  }
}

export default useSessionTimeout 