import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  skipSuccessfulGets: boolean
  enableGlobalLimits: boolean
  warningThreshold: number
}

interface RateLimitEntry {
  timestamp: number
  endpoint: string
  method: string
  userId: string
  ip?: string
}

interface RateLimitStatus {
  remaining: number
  resetTime: number
  isLimited: boolean
  globalRemaining: number
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  // API endpoints
  'api/auth': { maxRequests: 5, windowMs: 15 * 60 * 1000, skipSuccessfulGets: false, enableGlobalLimits: true, warningThreshold: 4 },
  'api/uploads': { maxRequests: 10, windowMs: 60 * 1000, skipSuccessfulGets: true, enableGlobalLimits: true, warningThreshold: 8 },
  'api/orders': { maxRequests: 50, windowMs: 60 * 1000, skipSuccessfulGets: true, enableGlobalLimits: true, warningThreshold: 40 },
  'api/admin': { maxRequests: 30, windowMs: 60 * 1000, skipSuccessfulGets: false, enableGlobalLimits: true, warningThreshold: 25 },
  
  // Default fallback
  'default': { maxRequests: 100, windowMs: 60 * 1000, skipSuccessfulGets: true, enableGlobalLimits: true, warningThreshold: 80 }
}

const GLOBAL_LIMITS = {
  perUser: { maxRequests: 1000, windowMs: 60 * 60 * 1000 }, // 1000 requests per hour per user
  perIP: { maxRequests: 2000, windowMs: 60 * 60 * 1000 }    // 2000 requests per hour per IP
}

const useRateLimit = () => {
  const { user } = useAuth()
  const [rateLimitEntries, setRateLimitEntries] = useState<Map<string, RateLimitEntry[]>>(new Map())
  const [globalEntries, setGlobalEntries] = useState<RateLimitEntry[]>([])
  const [isEnabled, setIsEnabled] = useState(true)
  
  const cleanupIntervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef<Set<string>>(new Set())

  // Clean up expired entries
  const cleanupExpiredEntries = useCallback(() => {
    const now = Date.now()
    
    setRateLimitEntries(prev => {
      const newMap = new Map()
      prev.forEach((entries, key) => {
        const config = getConfigForEndpoint(key)
        const validEntries = entries.filter(entry => 
          now - entry.timestamp < config.windowMs
        )
        if (validEntries.length > 0) {
          newMap.set(key, validEntries)
        }
      })
      return newMap
    })

    setGlobalEntries(prev => 
      prev.filter(entry => now - entry.timestamp < GLOBAL_LIMITS.perUser.windowMs)
    )
  }, [])

  // Get configuration for endpoint
  const getConfigForEndpoint = useCallback((endpoint: string): RateLimitConfig => {
    // Find matching config
    const matchingKey = Object.keys(DEFAULT_CONFIGS).find(key => 
      key !== 'default' && endpoint.startsWith(key)
    )
    return DEFAULT_CONFIGS[matchingKey || 'default']
  }, [])

  // Get current user's IP (simplified - in real app would get from request headers)
  const getCurrentIP = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip || 'unknown'
    } catch {
      return 'unknown'
    }
  }, [])

  // Check if endpoint is rate limited
  const checkRateLimit = useCallback(async (
    endpoint: string,
    method: string = 'GET'
  ): Promise<RateLimitStatus> => {
    if (!isEnabled || !user) {
      return {
        remaining: Infinity,
        resetTime: 0,
        isLimited: false,
        globalRemaining: Infinity
      }
    }

    const config = getConfigForEndpoint(endpoint)
    const now = Date.now()
    const windowStart = now - config.windowMs
    const cacheKey = `${endpoint}:${method}`

    // Get current entries for this endpoint/method
    const currentEntries = rateLimitEntries.get(cacheKey) || []
    const validEntries = currentEntries.filter(entry => entry.timestamp > windowStart)

    // Check endpoint-specific limit
    const remaining = Math.max(0, config.maxRequests - validEntries.length)
    const isLimited = remaining === 0
    const resetTime = validEntries.length > 0 
      ? Math.min(...validEntries.map(e => e.timestamp)) + config.windowMs
      : now + config.windowMs

    // Check global limits if enabled
    let globalRemaining = Infinity
    if (config.enableGlobalLimits) {
      const globalWindowStart = now - GLOBAL_LIMITS.perUser.windowMs
      const validGlobalEntries = globalEntries.filter(entry => 
        entry.timestamp > globalWindowStart && entry.userId === user.id
      )
      globalRemaining = Math.max(0, GLOBAL_LIMITS.perUser.maxRequests - validGlobalEntries.length)
    }

    // Show warning if approaching limit
    if (remaining <= config.warningThreshold && !warningShownRef.current.has(cacheKey)) {
      warningShownRef.current.add(cacheKey)
      toast.warning(`Approaching rate limit for ${endpoint}`, {
        description: `${remaining} requests remaining in this window`
      })
      
      // Reset warning after window expires
      setTimeout(() => {
        warningShownRef.current.delete(cacheKey)
      }, config.windowMs)
    }

    return {
      remaining,
      resetTime,
      isLimited: isLimited || globalRemaining === 0,
      globalRemaining
    }
  }, [isEnabled, user, rateLimitEntries, globalEntries, getConfigForEndpoint])

  // Record a request
  const recordRequest = useCallback(async (
    endpoint: string,
    method: string = 'GET',
    wasSuccessful: boolean = true
  ) => {
    if (!isEnabled || !user) return

    const config = getConfigForEndpoint(endpoint)
    
    // Skip recording if it's a successful GET and config says to skip
    if (config.skipSuccessfulGets && method === 'GET' && wasSuccessful) {
      return
    }

    const now = Date.now()
    const cacheKey = `${endpoint}:${method}`
    const userIP = await getCurrentIP()

    const newEntry: RateLimitEntry = {
      timestamp: now,
      endpoint,
      method,
      userId: user.id,
      ip: userIP
    }

    // Record endpoint-specific entry
    setRateLimitEntries(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(cacheKey) || []
      newMap.set(cacheKey, [...current, newEntry])
      return newMap
    })

    // Record global entry
    setGlobalEntries(prev => [...prev, newEntry])

    // Log to audit table for suspicious activity monitoring
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'api_request',
        resource_type: 'api_endpoint',
        resource_id: endpoint,
        details: {
          method,
          timestamp: now,
          ip: userIP,
          successful: wasSuccessful
        }
      })
    } catch (error) {
      console.warn('Failed to log API request:', error)
    }
  }, [isEnabled, user, getConfigForEndpoint, getCurrentIP])

  // Get rate limit status for multiple endpoints
  const batchCheckRateLimit = useCallback(async (
    requests: Array<{ endpoint: string; method?: string }>
  ): Promise<Record<string, RateLimitStatus>> => {
    const results: Record<string, RateLimitStatus> = {}
    
    for (const request of requests) {
      const key = `${request.endpoint}:${request.method || 'GET'}`
      results[key] = await checkRateLimit(request.endpoint, request.method)
    }
    
    return results
  }, [checkRateLimit])

  // Reset rate limits for a user (admin function)
  const resetUserLimits = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return

    setRateLimitEntries(prev => {
      const newMap = new Map()
      prev.forEach((entries, key) => {
        const filteredEntries = entries.filter(entry => entry.userId !== targetUserId)
        if (filteredEntries.length > 0) {
          newMap.set(key, filteredEntries)
        }
      })
      return newMap
    })

    setGlobalEntries(prev => 
      prev.filter(entry => entry.userId !== targetUserId)
    )

    toast.success('Rate limits reset successfully')
  }, [user])

  // Get current rate limit stats
  const getRateLimitStats = useCallback(() => {
    if (!user) return null

    const now = Date.now()
    const stats: Record<string, any> = {}

    rateLimitEntries.forEach((entries, key) => {
      const config = getConfigForEndpoint(key.split(':')[0])
      const windowStart = now - config.windowMs
      const validEntries = entries.filter(entry => 
        entry.timestamp > windowStart && entry.userId === user.id
      )
      
      stats[key] = {
        used: validEntries.length,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - validEntries.length),
        resetTime: validEntries.length > 0 
          ? Math.min(...validEntries.map(e => e.timestamp)) + config.windowMs
          : now + config.windowMs
      }
    })

    // Global stats
    const globalWindowStart = now - GLOBAL_LIMITS.perUser.windowMs
    const validGlobalEntries = globalEntries.filter(entry => 
      entry.timestamp > globalWindowStart && entry.userId === user.id
    )

    stats.global = {
      used: validGlobalEntries.length,
      limit: GLOBAL_LIMITS.perUser.maxRequests,
      remaining: Math.max(0, GLOBAL_LIMITS.perUser.maxRequests - validGlobalEntries.length),
      resetTime: validGlobalEntries.length > 0 
        ? Math.min(...validGlobalEntries.map(e => e.timestamp)) + GLOBAL_LIMITS.perUser.windowMs
        : now + GLOBAL_LIMITS.perUser.windowMs
    }

    return stats
  }, [user, rateLimitEntries, globalEntries, getConfigForEndpoint])

  // Setup cleanup interval
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(cleanupExpiredEntries, 60 * 1000) // Clean every minute

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [cleanupExpiredEntries])

  // Initial cleanup
  useEffect(() => {
    cleanupExpiredEntries()
  }, [cleanupExpiredEntries])

  return {
    // Core functions
    checkRateLimit,
    recordRequest,
    batchCheckRateLimit,
    
    // Admin functions
    resetUserLimits,
    
    // Utilities
    getRateLimitStats,
    getConfigForEndpoint,
    
    // Configuration
    isEnabled,
    setIsEnabled,
    
    // Status
    rateLimitEntries: Array.from(rateLimitEntries.entries()),
    globalEntries: globalEntries.filter(entry => entry.userId === user?.id)
  }
}

export default useRateLimit 