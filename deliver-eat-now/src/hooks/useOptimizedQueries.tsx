import { useState, useCallback, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import useViewScopeCache from './useViewScopeCache'
import { useScoping } from './useScoping'
import { useQueryScope } from './useViewScope'

interface QueryOptions {
  useCache?: boolean
  cacheTimeout?: number
  skipRLS?: boolean
  batchSize?: number
  orderBy?: { column: string, ascending?: boolean }[]
  limit?: number
  offset?: number
}

interface QueryResult<T> {
  data: T | null
  error: any
  count?: number
  fromCache?: boolean
  executionTime?: number
  isLoading: boolean
}

interface BatchQueryResult<T> {
  results: T[]
  errors: any[]
  totalCount: number
  fromCache: boolean[]
  totalExecutionTime: number
}

const useOptimizedQueries = () => {
  const { profile } = useAuth()
  const { getEffectiveScope } = useScoping()
  const { getFilters: getViewScopeFilters, getScopeInfo } = useQueryScope()
  const cache = useViewScopeCache({
    ttl: 10 * 60 * 1000, // 10 minutes for query cache
    maxSize: 500,
    prefetchEnabled: true
  })

  const [queryStats, setQueryStats] = useState({
    totalQueries: 0,
    cacheHits: 0,
    averageExecutionTime: 0,
    slowQueries: 0
  })

  // Generate optimized query key
  const generateQueryKey = useCallback((
    table: string,
    filters: any,
    options: QueryOptions = {}
  ): string => {
    const scope = getEffectiveScope()
    const keyParts = [
      table,
      JSON.stringify(filters),
      JSON.stringify(options),
      scope.organizationId || 'null',
      scope.restaurantId || 'null',
      profile?.role || 'null'
    ]
    return keyParts.join(':')
  }, [getEffectiveScope, profile?.role])

  // Execute optimized query with caching
  const executeQuery = useCallback(async <T>(
    queryBuilder: () => any,
    cacheKey: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> => {
    const startTime = Date.now()
    
    // Check cache first
    if (options.useCache !== false) {
      const cachedResult = cache.getCachedStats(cacheKey)
      if (cachedResult) {
        setQueryStats(prev => ({
          ...prev,
          totalQueries: prev.totalQueries + 1,
          cacheHits: prev.cacheHits + 1
        }))
        
        return {
          data: cachedResult,
          error: null,
          fromCache: true,
          executionTime: 0,
          isLoading: false
        }
      }
    }

    try {
      const query = queryBuilder()
      const { data, error, count } = await query
      const executionTime = Date.now() - startTime

      // Update stats
      setQueryStats(prev => ({
        ...prev,
        totalQueries: prev.totalQueries + 1,
        averageExecutionTime: (prev.averageExecutionTime * (prev.totalQueries - 1) + executionTime) / prev.totalQueries,
        slowQueries: prev.slowQueries + (executionTime > 1000 ? 1 : 0)
      }))

      // Cache successful results
      if (!error && data && options.useCache !== false) {
        cache.cacheStats(cacheKey, data, options.cacheTimeout)
      }

      return {
        data,
        error,
        count,
        fromCache: false,
        executionTime,
        isLoading: false
      }
    } catch (error) {
      return {
        data: null,
        error,
        fromCache: false,
        executionTime: Date.now() - startTime,
        isLoading: false
      }
    }
  }, [cache, setQueryStats])

  // Optimized organizations query
  const getOrganizations = useCallback(async (
    filters: any = {},
    options: QueryOptions = {}
  ): Promise<QueryResult<any[]>> => {
    const cacheKey = generateQueryKey('organizations', filters, options)
    
    return executeQuery(
      () => {
        let query = supabase
          .from('organizations')
          .select(`
            *,
            restaurants:restaurants(count),
            active_users:profiles!profiles_organization_id_fkey(
              count
            )
          `, { count: 'exact' })

        // Apply scope-based filtering
        const scope = getEffectiveScope()
        if (scope.organizationId && profile?.role !== 'platform_owner') {
          query = query.eq('id', scope.organizationId)
        }

        // Apply custom filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })

        // Apply ordering
        if (options.orderBy) {
          options.orderBy.forEach(({ column, ascending = true }) => {
            query = query.order(column, { ascending })
          })
        } else {
          query = query.order('name', { ascending: true })
        }

        // Apply pagination
        if (options.limit) {
          query = query.limit(options.limit)
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
        }

        return query
      },
      cacheKey,
      options
    )
  }, [generateQueryKey, executeQuery, getEffectiveScope, profile?.role])

  // Optimized restaurants query with advanced filtering
  const getRestaurants = useCallback(async (
    filters: any = {},
    options: QueryOptions = {}
  ): Promise<QueryResult<any[]>> => {
    const cacheKey = generateQueryKey('restaurants', filters, options)
    
    return executeQuery(
      () => {
        let query = supabase
          .from('restaurants')
          .select(`
            *,
            organizations!restaurants_organization_id_fkey (
              id,
              name,
              slug
            ),
            menus:menus(count),
            orders:orders(count),
            avg_rating:orders(rating)
          `, { count: 'exact' })

        // Apply scope-based filtering
        const scope = getEffectiveScope()
        if (scope.organizationId) {
          query = query.eq('organization_id', scope.organizationId)
        }
        if (scope.restaurantId) {
          query = query.eq('id', scope.restaurantId)
        }

        // Apply custom filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'search') {
              query = query.or(`name.ilike.%${value}%,address.ilike.%${value}%`)
            } else {
              query = query.eq(key, value)
            }
          }
        })

        // Apply ordering with performance optimization
        if (options.orderBy) {
          options.orderBy.forEach(({ column, ascending = true }) => {
            query = query.order(column, { ascending })
          })
        } else {
          // Default: order by active status first, then by name (uses composite index)
          query = query.order('is_active', { ascending: false })
                       .order('name', { ascending: true })
        }

        // Apply pagination
        if (options.limit) {
          query = query.limit(options.limit)
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
        }

        return query
      },
      cacheKey,
      options
    )
  }, [generateQueryKey, executeQuery, getEffectiveScope])

  // Optimized users query with role-based filtering
  const getUsers = useCallback(async (
    filters: any = {},
    options: QueryOptions = {}
  ): Promise<QueryResult<any[]>> => {
    const cacheKey = generateQueryKey('profiles', filters, options)
    
    return executeQuery(
      () => {
        let query = supabase
          .from('profiles')
          .select(`
            *,
            organizations!profiles_organization_id_fkey (
              id,
              name,
              slug
            )
          `, { count: 'exact' })

        // Apply scope-based filtering
        const scope = getEffectiveScope()
        if (scope.organizationId && profile?.role !== 'platform_owner') {
          query = query.eq('organization_id', scope.organizationId)
        }

        // Apply role-based restrictions
        if (profile?.role === 'restaurant_admin') {
          query = query.in('role', ['kitchen', 'customer'])
        } else if (profile?.role === 'super_admin') {
          query = query.in('role', ['restaurant_admin', 'kitchen', 'driver', 'customer'])
        }

        // Apply custom filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'search') {
              query = query.or(`full_name.ilike.%${value}%,email.ilike.%${value}%`)
            } else {
              query = query.eq(key, value)
            }
          }
        })

        // Apply ordering (uses index on role, created_at)
        if (options.orderBy) {
          options.orderBy.forEach(({ column, ascending = true }) => {
            query = query.order(column, { ascending })
          })
        } else {
          query = query.order('role', { ascending: true })
                       .order('created_at', { ascending: false })
        }

        // Apply pagination
        if (options.limit) {
          query = query.limit(options.limit)
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
        }

        return query
      },
      cacheKey,
      options
    )
  }, [generateQueryKey, executeQuery, getEffectiveScope, profile?.role])

  // Optimized menu templates query
  const getMenuTemplates = useCallback(async (
    filters: any = {},
    options: QueryOptions = {}
  ): Promise<QueryResult<any[]>> => {
    const cacheKey = generateQueryKey('menu_templates', filters, options)
    
    return executeQuery(
      () => {
        let query = supabase
          .from('menu_templates')
          .select(`
            *,
            profiles!menu_templates_created_by_fkey (
              full_name
            ),
            items:menu_template_items(count)
          `, { count: 'exact' })

        // Apply visibility filtering
        if (profile?.role !== 'platform_owner') {
          query = query.eq('is_public', true)
        }

        // Apply custom filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'search') {
              query = query.or(`name.ilike.%${value}%,description.ilike.%${value}%`)
            } else {
              query = query.eq(key, value)
            }
          }
        })

        // Apply ordering (uses composite index on category, usage_count)
        if (options.orderBy) {
          options.orderBy.forEach(({ column, ascending = true }) => {
            query = query.order(column, { ascending })
          })
        } else {
          query = query.order('usage_count', { ascending: false })
                       .order('rating', { ascending: false })
        }

        // Apply pagination
        if (options.limit) {
          query = query.limit(options.limit)
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
        }

        return query
      },
      cacheKey,
      options
    )
  }, [generateQueryKey, executeQuery, profile?.role])

  // Optimized audit logs query
  const getAuditLogs = useCallback(async (
    filters: any = {},
    options: QueryOptions = {}
  ): Promise<QueryResult<any[]>> => {
    const cacheKey = generateQueryKey('audit_logs', filters, options)
    
    return executeQuery(
      () => {
        let query = supabase
          .from('audit_logs')
          .select(`
            *,
            profiles!audit_logs_user_id_fkey (
              full_name,
              email
            ),
            organizations!audit_logs_organization_id_fkey (
              name
            ),
            restaurants!audit_logs_restaurant_id_fkey (
              name
            )
          `, { count: 'exact' })

        // Apply scope-based filtering
        const scope = getEffectiveScope()
        if (scope.organizationId && profile?.role !== 'platform_owner') {
          query = query.eq('organization_id', scope.organizationId)
        }
        if (scope.restaurantId) {
          query = query.eq('restaurant_id', scope.restaurantId)
        }

        // Apply time-based filtering (performance optimization)
        const defaultTimeRange = new Date()
        defaultTimeRange.setDate(defaultTimeRange.getDate() - 30) // Last 30 days
        
        if (!filters.start_date) {
          query = query.gte('created_at', defaultTimeRange.toISOString())
        }

        // Apply custom filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'start_date') {
              query = query.gte('created_at', value)
            } else if (key === 'end_date') {
              query = query.lte('created_at', value)
            } else if (key === 'search') {
              query = query.or(`action.ilike.%${value}%,table_name.ilike.%${value}%`)
            } else {
              query = query.eq(key, value)
            }
          }
        })

        // Apply ordering (uses index on created_at DESC)
        query = query.order('created_at', { ascending: false })

        // Apply pagination
        if (options.limit) {
          query = query.limit(options.limit)
        } else {
          query = query.limit(100) // Default limit for audit logs
        }
        
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 100) - 1)
        }

        return query
      },
      cacheKey,
      options
    )
  }, [generateQueryKey, executeQuery, getEffectiveScope, profile?.role])

  // Batch query executor for multiple related queries
  const executeBatchQueries = useCallback(async <T>(
    queries: Array<{
      name: string
      queryFn: () => Promise<QueryResult<T>>
    }>
  ): Promise<BatchQueryResult<T>> => {
    const startTime = Date.now()
    
    const results = await Promise.allSettled(
      queries.map(({ queryFn }) => queryFn())
    )

    const processedResults: T[] = []
    const errors: any[] = []
    const fromCache: boolean[] = []
    let totalCount = 0

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        processedResults.push(result.value.data as T)
        errors.push(null)
        fromCache.push(result.value.fromCache || false)
        totalCount += result.value.count || 0
      } else {
        processedResults.push(null as T)
        errors.push(result.reason)
        fromCache.push(false)
      }
    })

    return {
      results: processedResults,
      errors,
      totalCount,
      fromCache,
      totalExecutionTime: Date.now() - startTime
    }
  }, [])

  // Intelligent query suggestions based on usage patterns
  const getQuerySuggestions = useCallback(() => {
    const scope = getEffectiveScope()
    const suggestions: string[] = []

    // Role-based suggestions
    if (profile?.role === 'platform_owner') {
      suggestions.push(
        'Organizations with highest activity',
        'Recent audit logs across all organizations',
        'Top performing menu templates'
      )
    } else if (profile?.role === 'super_admin') {
      suggestions.push(
        'Restaurants in your organization',
        'User activity in your region',
        'Popular menu templates for your restaurants'
      )
    } else if (profile?.role === 'restaurant_admin') {
      suggestions.push(
        'Your restaurant menu performance',
        'Staff activity logs',
        'Customer feedback and orders'
      )
    }

    return suggestions
  }, [getEffectiveScope, profile?.role])

  // Query performance analytics
  const getPerformanceMetrics = useCallback(() => {
    const cacheEfficiency = cache.getCacheEfficiency()
    
    return {
      ...queryStats,
      cacheEfficiency,
      recommendations: [
        ...(cacheEfficiency < 60 ? ['Consider increasing cache TTL'] : []),
        ...(queryStats.slowQueries > queryStats.totalQueries * 0.1 ? ['Review slow queries for optimization'] : []),
        ...(queryStats.averageExecutionTime > 500 ? ['Consider adding database indices'] : [])
      ]
    }
  }, [queryStats, cache])

  return {
    // Core query functions
    getOrganizations,
    getRestaurants,
    getUsers,
    getMenuTemplates,
    getAuditLogs,
    
    // Batch operations
    executeBatchQueries,
    
    // Utility functions
    executeQuery,
    generateQueryKey,
    getQuerySuggestions,
    getPerformanceMetrics,
    
    // Cache integration
    cache,
    
    // Stats
    queryStats
  }
}

export default useOptimizedQueries 