import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
  version: number
}

interface ViewScopeCache {
  organizations: Map<string, CacheEntry>
  restaurants: Map<string, CacheEntry>
  users: Map<string, CacheEntry>
  hierarchies: Map<string, CacheEntry>
  stats: Map<string, CacheEntry>
  permissions: Map<string, CacheEntry>
}

interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number
  prefetchEnabled: boolean
  compressionEnabled: boolean
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  prefetchEnabled: true,
  compressionEnabled: true
}

const CACHE_KEYS = {
  ORGANIZATION: 'org',
  RESTAURANT: 'rest',
  USER: 'user',
  HIERARCHY: 'hier',
  STATS: 'stats',
  PERMISSIONS: 'perms'
} as const

const useViewScopeCache = (config: Partial<CacheConfig> = {}) => {
  const { profile } = useAuth()
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  const cacheRef = useRef<ViewScopeCache>({
    organizations: new Map(),
    restaurants: new Map(),
    users: new Map(),
    hierarchies: new Map(),
    stats: new Map(),
    permissions: new Map()
  })
  
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0
  })

  const [isPreloading, setIsPreloading] = useState(false)
  const [lastCleanup, setLastCleanup] = useState(Date.now())

  // Cache key generation with hierarchical structure
  const generateCacheKey = useCallback((type: string, id: string, scope?: any): string => {
    const baseKey = `${type}:${id}`
    if (scope) {
      const scopeKey = `${scope.organizationId || 'null'}:${scope.restaurantId || 'null'}`
      return `${baseKey}:${scopeKey}`
    }
    return baseKey
  }, [])

  // Compress large data objects
  const compressData = useCallback((data: any): string => {
    if (!finalConfig.compressionEnabled) return data
    
    try {
      // Simple compression by removing unnecessary whitespace from JSON
      return JSON.stringify(data, null, 0)
    } catch {
      return data
    }
  }, [finalConfig.compressionEnabled])

  // Decompress data
  const decompressData = useCallback((data: any): any => {
    if (!finalConfig.compressionEnabled) return data
    
    try {
      return typeof data === 'string' ? JSON.parse(data) : data
    } catch {
      return data
    }
  }, [finalConfig.compressionEnabled])

  // Set cache entry with automatic eviction
  const setCacheEntry = useCallback(<T>(
    cacheMap: Map<string, CacheEntry>,
    key: string,
    data: T,
    customTtl?: number
  ) => {
    const now = Date.now()
    const ttl = customTtl || finalConfig.ttl
    
    // Clean up expired entries if cache is too large
    if (cacheMap.size >= finalConfig.maxSize) {
      const entriesToRemove: string[] = []
      
      for (const [entryKey, entry] of cacheMap.entries()) {
        if (entry.expiresAt < now) {
          entriesToRemove.push(entryKey)
        }
      }
      
      // Remove expired entries
      entriesToRemove.forEach(entryKey => cacheMap.delete(entryKey))
      
      // If still too large, remove oldest entries
      if (cacheMap.size >= finalConfig.maxSize) {
        const entries = Array.from(cacheMap.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        
        const toRemove = entries.slice(0, Math.floor(finalConfig.maxSize * 0.2))
        toRemove.forEach(([entryKey]) => cacheMap.delete(entryKey))
        
        setCacheStats(prev => ({ ...prev, evictions: prev.evictions + toRemove.length }))
      }
    }

    const entry: CacheEntry<T> = {
      data: finalConfig.compressionEnabled ? compressData(data) : data,
      timestamp: now,
      expiresAt: now + ttl,
      version: 1
    }

    cacheMap.set(key, entry)
    setCacheStats(prev => ({ ...prev, size: getTotalCacheSize() }))
  }, [finalConfig, compressData])

  // Get cache entry with automatic expiration check
  const getCacheEntry = useCallback(<T>(
    cacheMap: Map<string, CacheEntry>,
    key: string
  ): T | null => {
    const entry = cacheMap.get(key)
    
    if (!entry) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }))
      return null
    }

    const now = Date.now()
    if (entry.expiresAt < now) {
      cacheMap.delete(key)
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }))
      return null
    }

    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }))
    return finalConfig.compressionEnabled ? decompressData(entry.data) : entry.data
  }, [finalConfig.compressionEnabled, decompressData])

  // Get total cache size across all maps
  const getTotalCacheSize = useCallback((): number => {
    const cache = cacheRef.current
    return cache.organizations.size + 
           cache.restaurants.size + 
           cache.users.size + 
           cache.hierarchies.size + 
           cache.stats.size + 
           cache.permissions.size
  }, [])

  // Organization cache operations
  const cacheOrganization = useCallback((orgId: string, data: any, ttl?: number) => {
    setCacheEntry(cacheRef.current.organizations, orgId, data, ttl)
  }, [setCacheEntry])

  const getCachedOrganization = useCallback((orgId: string) => {
    return getCacheEntry(cacheRef.current.organizations, orgId)
  }, [getCacheEntry])

  // Restaurant cache operations
  const cacheRestaurant = useCallback((restId: string, data: any, ttl?: number) => {
    setCacheEntry(cacheRef.current.restaurants, restId, data, ttl)
  }, [setCacheEntry])

  const getCachedRestaurant = useCallback((restId: string) => {
    return getCacheEntry(cacheRef.current.restaurants, restId)
  }, [getCacheEntry])

  // User cache operations
  const cacheUser = useCallback((userId: string, data: any, ttl?: number) => {
    setCacheEntry(cacheRef.current.users, userId, data, ttl)
  }, [setCacheEntry])

  const getCachedUser = useCallback((userId: string) => {
    return getCacheEntry(cacheRef.current.users, userId)
  }, [getCacheEntry])

  // Hierarchy cache operations
  const cacheHierarchy = useCallback((key: string, data: any, ttl?: number) => {
    setCacheEntry(cacheRef.current.hierarchies, key, data, ttl)
  }, [setCacheEntry])

  const getCachedHierarchy = useCallback((key: string) => {
    return getCacheEntry(cacheRef.current.hierarchies, key)
  }, [getCacheEntry])

  // Stats cache operations
  const cacheStats = useCallback((key: string, data: any, ttl?: number) => {
    setCacheEntry(cacheRef.current.stats, key, data, ttl)
  }, [setCacheEntry])

  const getCachedStats = useCallback((key: string) => {
    return getCacheEntry(cacheRef.current.stats, key)
  }, [getCacheEntry])

  // Permissions cache operations
  const cachePermissions = useCallback((key: string, data: any, ttl?: number) => {
    setCacheEntry(cacheRef.current.permissions, key, data, ttl)
  }, [setCacheEntry])

  const getCachedPermissions = useCallback((key: string) => {
    return getCacheEntry(cacheRef.current.permissions, key)
  }, [getCacheEntry])

  // Batch cache operations
  const batchCacheOrganizations = useCallback((organizations: Array<{ id: string, data: any }>) => {
    organizations.forEach(({ id, data }) => {
      cacheOrganization(id, data)
    })
  }, [cacheOrganization])

  const batchCacheRestaurants = useCallback((restaurants: Array<{ id: string, data: any }>) => {
    restaurants.forEach(({ id, data }) => {
      cacheRestaurant(id, data)
    })
  }, [cacheRestaurant])

  // Smart prefetching based on user role and context
  const prefetchData = useCallback(async (scope: any) => {
    if (!finalConfig.prefetchEnabled || isPreloading) return

    setIsPreloading(true)
    
    try {
      const prefetchPromises: Promise<any>[] = []

      // Prefetch based on user role
      if (profile?.role === 'platform_owner') {
        // Prefetch all organizations and key stats
        prefetchPromises.push(
          supabase
            .from('organizations')
            .select('*')
            .limit(20)
            .then(({ data }) => {
              if (data) {
                batchCacheOrganizations(data.map(org => ({ id: org.id, data: org })))
              }
            })
        )
      } else if (profile?.role === 'super_admin' && profile.organization_id) {
        // Prefetch restaurants in organization
        prefetchPromises.push(
          supabase
            .from('restaurants')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .then(({ data }) => {
              if (data) {
                batchCacheRestaurants(data.map(rest => ({ id: rest.id, data: rest })))
              }
            })
        )
      } else if (scope.restaurantId) {
        // Prefetch restaurant-specific data
        prefetchPromises.push(
          supabase
            .from('restaurants')
            .select('*')
            .eq('id', scope.restaurantId)
            .single()
            .then(({ data }) => {
              if (data) {
                cacheRestaurant(data.id, data)
              }
            })
        )
      }

      // Prefetch user hierarchy data
      if (profile?.id) {
        const hierarchyKey = generateCacheKey(CACHE_KEYS.HIERARCHY, profile.id, scope)
        
        prefetchPromises.push(
          supabase
            .from('profiles')
            .select(`
              *,
              organizations (
                id,
                name,
                slug
              )
            `)
            .eq('id', profile.id)
            .single()
            .then(({ data }) => {
              if (data) {
                cacheHierarchy(hierarchyKey, data, 10 * 60 * 1000) // 10 minutes for hierarchy
              }
            })
        )
      }

      await Promise.allSettled(prefetchPromises)
    } catch (error) {
      console.error('Prefetch error:', error)
    } finally {
      setIsPreloading(false)
    }
  }, [
    finalConfig.prefetchEnabled,
    isPreloading,
    profile,
    batchCacheOrganizations,
    batchCacheRestaurants,
    cacheRestaurant,
    cacheHierarchy,
    generateCacheKey
  ])

  // Cache invalidation
  const invalidateCache = useCallback((pattern?: string) => {
    const cache = cacheRef.current
    
    if (!pattern) {
      // Clear all caches
      cache.organizations.clear()
      cache.restaurants.clear()
      cache.users.clear()
      cache.hierarchies.clear()
      cache.stats.clear()
      cache.permissions.clear()
    } else {
      // Pattern-based invalidation
      const allMaps = [
        cache.organizations,
        cache.restaurants,
        cache.users,
        cache.hierarchies,
        cache.stats,
        cache.permissions
      ]

      allMaps.forEach(map => {
        const keysToDelete = Array.from(map.keys()).filter(key => 
          key.includes(pattern)
        )
        keysToDelete.forEach(key => map.delete(key))
      })
    }

    setCacheStats(prev => ({ ...prev, size: getTotalCacheSize() }))
  }, [getTotalCacheSize])

  // Periodic cleanup
  const cleanup = useCallback(() => {
    const now = Date.now()
    const cache = cacheRef.current
    const allMaps = [
      cache.organizations,
      cache.restaurants,
      cache.users,
      cache.hierarchies,
      cache.stats,
      cache.permissions
    ]

    let totalRemoved = 0
    
    allMaps.forEach(map => {
      const keysToDelete = Array.from(map.entries())
        .filter(([, entry]) => entry.expiresAt < now)
        .map(([key]) => key)
      
      keysToDelete.forEach(key => map.delete(key))
      totalRemoved += keysToDelete.length
    })

    if (totalRemoved > 0) {
      setCacheStats(prev => ({
        ...prev,
        size: getTotalCacheSize(),
        evictions: prev.evictions + totalRemoved
      }))
    }

    setLastCleanup(now)
  }, [getTotalCacheSize])

  // Auto cleanup every 2 minutes
  useEffect(() => {
    const interval = setInterval(cleanup, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [cleanup])

  // Calculate cache efficiency
  const getCacheEfficiency = useCallback(() => {
    const total = cacheStats.hits + cacheStats.misses
    if (total === 0) return 0
    return (cacheStats.hits / total) * 100
  }, [cacheStats])

  // Get cache diagnostic info
  const getDiagnostics = useCallback(() => {
    const cache = cacheRef.current
    
    return {
      stats: cacheStats,
      efficiency: getCacheEfficiency(),
      sizes: {
        organizations: cache.organizations.size,
        restaurants: cache.restaurants.size,
        users: cache.users.size,
        hierarchies: cache.hierarchies.size,
        stats: cache.stats.size,
        permissions: cache.permissions.size,
        total: getTotalCacheSize()
      },
      config: finalConfig,
      lastCleanup: new Date(lastCleanup).toISOString(),
      isPreloading
    }
  }, [cacheStats, getCacheEfficiency, getTotalCacheSize, finalConfig, lastCleanup, isPreloading])

  return {
    // Cache operations
    cacheOrganization,
    getCachedOrganization,
    cacheRestaurant,
    getCachedRestaurant,
    cacheUser,
    getCachedUser,
    cacheHierarchy,
    getCachedHierarchy,
    cacheStats: cacheStats,
    getCachedStats,
    cachePermissions,
    getCachedPermissions,
    
    // Batch operations
    batchCacheOrganizations,
    batchCacheRestaurants,
    
    // Utility functions
    prefetchData,
    invalidateCache,
    cleanup,
    generateCacheKey,
    
    // Diagnostics
    getDiagnostics,
    getCacheEfficiency,
    
    // State
    isPreloading,
    cacheStats: cacheStats
  }
}

export default useViewScopeCache 