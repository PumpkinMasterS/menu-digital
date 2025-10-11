import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import useViewScopeCache from './useViewScopeCache'
import useOptimizedQueries from './useOptimizedQueries'

interface HierarchyNode {
  id: string
  type: 'organization' | 'restaurant' | 'user' | 'menu' | 'template'
  parentId?: string
  data: any
  children?: HierarchyNode[]
  isLoaded: boolean
  isLoading: boolean
  hasChildren: boolean
  level: number
  expandedPath?: string[]
}

interface LazyLoadConfig {
  preloadDepth: number
  batchSize: number
  cacheStrategy: 'aggressive' | 'conservative' | 'none'
  enableVirtualization: boolean
  onDemandThreshold: number
}

interface LoadingState {
  nodeId: string
  progress: number
  estimatedTime?: number
  stage: 'fetching' | 'processing' | 'caching' | 'complete'
}

const DEFAULT_CONFIG: LazyLoadConfig = {
  preloadDepth: 2,
  batchSize: 20,
  cacheStrategy: 'aggressive',
  enableVirtualization: true,
  onDemandThreshold: 100
}

const useLazyHierarchy = (config: Partial<LazyLoadConfig> = {}) => {
  const { profile } = useAuth()
  const cache = useViewScopeCache()
  const queries = useOptimizedQueries()
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  const [rootNodes, setRootNodes] = useState<HierarchyNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map())
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: finalConfig.batchSize })
  
  const hierarchyRef = useRef<Map<string, HierarchyNode>>(new Map())
  const loadingQueueRef = useRef<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Create optimized hierarchy node
  const createHierarchyNode = useCallback((
    id: string,
    type: HierarchyNode['type'],
    data: any,
    parentId?: string,
    level: number = 0
  ): HierarchyNode => {
    return {
      id,
      type,
      parentId,
      data,
      children: [],
      isLoaded: false,
      isLoading: false,
      hasChildren: estimateHasChildren(type, data),
      level,
      expandedPath: parentId ? [...(getParentNode(parentId)?.expandedPath || []), id] : [id]
    }
  }, [])

  // Estimate if node has children based on type and data
  const estimateHasChildren = useCallback((type: HierarchyNode['type'], data: any): boolean => {
    switch (type) {
      case 'organization':
        return true // Organizations usually have restaurants
      case 'restaurant':
        return true // Restaurants have menus and users
      case 'user':
        return data.role === 'restaurant_admin' || data.role === 'super_admin'
      case 'menu':
        return true // Menus have items
      case 'template':
        return true // Templates have items
      default:
        return false
    }
  }, [])

  // Get parent node
  const getParentNode = useCallback((nodeId: string): HierarchyNode | undefined => {
    return hierarchyRef.current.get(nodeId)
  }, [])

  // Get children for a specific node type
  const loadNodeChildren = useCallback(async (
    node: HierarchyNode,
    forceReload: boolean = false
  ): Promise<HierarchyNode[]> => {
    if (node.isLoaded && !forceReload) {
      return node.children || []
    }

    // Set loading state
    setLoadingStates(prev => new Map(prev.set(node.id, {
      nodeId: node.id,
      progress: 10,
      stage: 'fetching'
    })))

    const startTime = Date.now()
    let children: HierarchyNode[] = []

    try {
      switch (node.type) {
        case 'organization':
          children = await loadOrganizationChildren(node)
          break
        case 'restaurant':
          children = await loadRestaurantChildren(node)
          break
        case 'user':
          children = await loadUserChildren(node)
          break
        case 'menu':
          children = await loadMenuChildren(node)
          break
        case 'template':
          children = await loadTemplateChildren(node)
          break
        default:
          children = []
      }

      // Update progress
      setLoadingStates(prev => new Map(prev.set(node.id, {
        nodeId: node.id,
        progress: 80,
        stage: 'processing'
      })))

      // Cache children if strategy allows
      if (finalConfig.cacheStrategy !== 'none') {
        const cacheKey = `hierarchy:${node.type}:${node.id}:children`
        cache.cacheHierarchy(cacheKey, children)
      }

      // Update progress
      setLoadingStates(prev => new Map(prev.set(node.id, {
        nodeId: node.id,
        progress: 100,
        stage: 'complete',
        estimatedTime: Date.now() - startTime
      })))

      // Remove loading state after delay
      setTimeout(() => {
        setLoadingStates(prev => {
          const newMap = new Map(prev)
          newMap.delete(node.id)
          return newMap
        })
      }, 1000)

      return children

    } catch (error) {
      console.error(`Error loading children for ${node.type} ${node.id}:`, error)
      
      // Clear loading state on error
      setLoadingStates(prev => {
        const newMap = new Map(prev)
        newMap.delete(node.id)
        return newMap
      })

      return []
    }
  }, [cache, finalConfig.cacheStrategy])

  // Load organization children (restaurants + users)
  const loadOrganizationChildren = useCallback(async (node: HierarchyNode): Promise<HierarchyNode[]> => {
    const [restaurantsResult, usersResult] = await Promise.all([
      queries.getRestaurants({ organization_id: node.id }, { limit: finalConfig.batchSize }),
      queries.getUsers({ organization_id: node.id, role: ['super_admin', 'restaurant_admin'] }, { limit: 10 })
    ])

    const children: HierarchyNode[] = []

    // Add restaurants
    if (restaurantsResult.data) {
      restaurantsResult.data.forEach(restaurant => {
        children.push(createHierarchyNode(
          restaurant.id,
          'restaurant',
          restaurant,
          node.id,
          node.level + 1
        ))
      })
    }

    // Add key users
    if (usersResult.data) {
      usersResult.data.forEach(user => {
        children.push(createHierarchyNode(
          user.id,
          'user',
          user,
          node.id,
          node.level + 1
        ))
      })
    }

    return children
  }, [queries, finalConfig.batchSize, createHierarchyNode])

  // Load restaurant children (menus + staff)
  const loadRestaurantChildren = useCallback(async (node: HierarchyNode): Promise<HierarchyNode[]> => {
    const [menusResult, staffResult] = await Promise.all([
      supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', node.id)
        .limit(finalConfig.batchSize),
      queries.getUsers({ 
        organization_id: node.data.organization_id,
        role: ['restaurant_admin', 'kitchen'] 
      }, { limit: 10 })
    ])

    const children: HierarchyNode[] = []

    // Add menus
    if (menusResult.data) {
      menusResult.data.forEach(menu => {
        children.push(createHierarchyNode(
          menu.id,
          'menu',
          menu,
          node.id,
          node.level + 1
        ))
      })
    }

    // Add staff
    if (staffResult.data) {
      staffResult.data.forEach(user => {
        children.push(createHierarchyNode(
          user.id,
          'user',
          user,
          node.id,
          node.level + 1
        ))
      })
    }

    return children
  }, [queries, finalConfig.batchSize, createHierarchyNode])

  // Load user children (assigned items/permissions)
  const loadUserChildren = useCallback(async (node: HierarchyNode): Promise<HierarchyNode[]> => {
    // For now, users don't have children in this implementation
    // Could be extended to show assigned restaurants, recent activities, etc.
    return []
  }, [])

  // Load menu children (menu items)
  const loadMenuChildren = useCallback(async (node: HierarchyNode): Promise<HierarchyNode[]> => {
    const { data: menuItems } = await supabase
      .from('meals')
      .select('*')
      .eq('restaurant_id', node.data.restaurant_id)
      .limit(finalConfig.batchSize)

    const children: HierarchyNode[] = []

    if (menuItems) {
      menuItems.forEach(item => {
        children.push(createHierarchyNode(
          item.id,
          'menu',
          item,
          node.id,
          node.level + 1
        ))
      })
    }

    return children
  }, [finalConfig.batchSize, createHierarchyNode])

  // Load template children (template items)
  const loadTemplateChildren = useCallback(async (node: HierarchyNode): Promise<HierarchyNode[]> => {
    const { data: templateItems } = await supabase
      .from('menu_template_items')
      .select('*')
      .eq('template_id', node.id)
      .order('sort_order', { ascending: true })
      .limit(finalConfig.batchSize)

    const children: HierarchyNode[] = []

    if (templateItems) {
      templateItems.forEach(item => {
        children.push(createHierarchyNode(
          item.id,
          'template',
          item,
          node.id,
          node.level + 1
        ))
      })
    }

    return children
  }, [finalConfig.batchSize, createHierarchyNode])

  // Expand node and load children if needed
  const expandNode = useCallback(async (nodeId: string) => {
    if (loadingQueueRef.current.has(nodeId)) {
      return // Already loading
    }

    const node = hierarchyRef.current.get(nodeId)
    if (!node) return

    // Add to expanded set
    setExpandedNodes(prev => new Set(prev.add(nodeId)))

    // Load children if not already loaded
    if (!node.isLoaded && node.hasChildren) {
      loadingQueueRef.current.add(nodeId)
      
      try {
        const children = await loadNodeChildren(node)
        
        // Update node in hierarchy
        const updatedNode = {
          ...node,
          children,
          isLoaded: true,
          isLoading: false
        }
        
        hierarchyRef.current.set(nodeId, updatedNode)
        
        // Update children in hierarchy ref
        children.forEach(child => {
          hierarchyRef.current.set(child.id, child)
        })

        // Update state
        setRootNodes(prev => updateNodeInTree(prev, nodeId, updatedNode))

        // Preload next level if configured
        if (finalConfig.preloadDepth > node.level + 1) {
          children.forEach(child => {
            if (child.hasChildren) {
              setTimeout(() => expandNode(child.id), 100) // Stagger preloading
            }
          })
        }

      } finally {
        loadingQueueRef.current.delete(nodeId)
      }
    }
  }, [loadNodeChildren, finalConfig.preloadDepth, updateNodeInTree])

  // Collapse node
  const collapseNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      newSet.delete(nodeId)
      return newSet
    })
  }, [])

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    if (expandedNodes.has(nodeId)) {
      collapseNode(nodeId)
    } else {
      expandNode(nodeId)
    }
  }, [expandedNodes, collapseNode, expandNode])

  // Update node in tree structure
  const updateNodeInTree = useCallback((
    nodes: HierarchyNode[],
    nodeId: string,
    updatedNode: HierarchyNode
  ): HierarchyNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return updatedNode
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeInTree(node.children, nodeId, updatedNode)
        }
      }
      return node
    })
  }, [])

  // Initialize root hierarchy based on user role
  const initializeHierarchy = useCallback(async () => {
    try {
      let initialNodes: HierarchyNode[] = []

      if (profile?.role === 'platform_owner') {
        // Load all organizations
        const organizationsResult = await queries.getOrganizations({}, { 
          limit: finalConfig.batchSize,
          orderBy: [{ column: 'name', ascending: true }]
        })

        if (organizationsResult.data) {
          initialNodes = organizationsResult.data.map(org => 
            createHierarchyNode(org.id, 'organization', org, undefined, 0)
          )
        }

      } else if (profile?.role === 'super_admin' && profile.organization_id) {
        // Load organization and its restaurants
        const [orgResult, restaurantsResult] = await Promise.all([
          queries.getOrganizations({ id: profile.organization_id }),
          queries.getRestaurants({ organization_id: profile.organization_id }, { 
            limit: finalConfig.batchSize 
          })
        ])

        if (orgResult.data && orgResult.data[0]) {
          const orgNode = createHierarchyNode(
            orgResult.data[0].id, 
            'organization', 
            orgResult.data[0], 
            undefined, 
            0
          )

          if (restaurantsResult.data) {
            orgNode.children = restaurantsResult.data.map(restaurant =>
              createHierarchyNode(restaurant.id, 'restaurant', restaurant, orgNode.id, 1)
            )
            orgNode.isLoaded = true
          }

          initialNodes = [orgNode]
        }

      } else if (profile?.role === 'restaurant_admin') {
        // Load only the user's restaurant
        const restaurantsResult = await queries.getRestaurants({}, { limit: 1 })
        
        if (restaurantsResult.data && restaurantsResult.data[0]) {
          initialNodes = [createHierarchyNode(
            restaurantsResult.data[0].id,
            'restaurant',
            restaurantsResult.data[0],
            undefined,
            0
          )]
        }
      }

      // Store nodes in ref
      initialNodes.forEach(node => {
        hierarchyRef.current.set(node.id, node)
        if (node.children) {
          node.children.forEach(child => {
            hierarchyRef.current.set(child.id, child)
          })
        }
      })

      setRootNodes(initialNodes)

      // Auto-expand first level if preload depth allows
      if (finalConfig.preloadDepth > 0) {
        initialNodes.forEach(node => {
          if (node.hasChildren) {
            expandNode(node.id)
          }
        })
      }

    } catch (error) {
      console.error('Error initializing hierarchy:', error)
    }
  }, [profile, queries, finalConfig, createHierarchyNode, expandNode])

  // Get flattened visible nodes for virtualization
  const getFlattenedNodes = useCallback((): HierarchyNode[] => {
    const flattened: HierarchyNode[] = []
    
    const traverse = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        flattened.push(node)
        if (expandedNodes.has(node.id) && node.children) {
          traverse(node.children)
        }
      })
    }

    traverse(rootNodes)
    return flattened
  }, [rootNodes, expandedNodes])

  // Get visible nodes for current viewport
  const getVisibleNodes = useCallback((): HierarchyNode[] => {
    const flattened = getFlattenedNodes()
    
    if (!finalConfig.enableVirtualization) {
      return flattened
    }

    return flattened.slice(visibleRange.start, visibleRange.end)
  }, [getFlattenedNodes, finalConfig.enableVirtualization, visibleRange])

  // Update visible range for virtualization
  const updateVisibleRange = useCallback((start: number, end: number) => {
    setVisibleRange({ start, end })
  }, [])

  // Search within hierarchy
  const searchHierarchy = useCallback(async (
    searchTerm: string,
    nodeTypes?: HierarchyNode['type'][]
  ): Promise<HierarchyNode[]> => {
    const results: HierarchyNode[] = []
    const searchLower = searchTerm.toLowerCase()

    // Search in loaded nodes first
    hierarchyRef.current.forEach(node => {
      if (nodeTypes && !nodeTypes.includes(node.type)) return
      
      const searchableText = [
        node.data.name,
        node.data.email,
        node.data.description,
        node.data.address
      ].filter(Boolean).join(' ').toLowerCase()

      if (searchableText.includes(searchLower)) {
        results.push(node)
      }
    })

    // If not enough results, search database
    if (results.length < 10) {
      const searchPromises: Promise<any>[] = []

      if (!nodeTypes || nodeTypes.includes('organization')) {
        searchPromises.push(
          queries.getOrganizations({ search: searchTerm }, { limit: 10 })
        )
      }

      if (!nodeTypes || nodeTypes.includes('restaurant')) {
        searchPromises.push(
          queries.getRestaurants({ search: searchTerm }, { limit: 10 })
        )
      }

      if (!nodeTypes || nodeTypes.includes('user')) {
        searchPromises.push(
          queries.getUsers({ search: searchTerm }, { limit: 10 })
        )
      }

      const searchResults = await Promise.allSettled(searchPromises)
      
      searchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          const nodeType = nodeTypes?.[index] || (['organization', 'restaurant', 'user'] as const)[index]
          result.value.data.forEach((item: any) => {
            if (!hierarchyRef.current.has(item.id)) {
              const node = createHierarchyNode(item.id, nodeType, item)
              results.push(node)
            }
          })
        }
      })
    }

    return results
  }, [queries, createHierarchyNode])

  // Initialize on mount
  useEffect(() => {
    if (profile) {
      initializeHierarchy()
    }
  }, [profile, initializeHierarchy])

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!finalConfig.enableVirtualization) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const nodeId = entry.target.getAttribute('data-node-id')
            if (nodeId) {
              const node = hierarchyRef.current.get(nodeId)
              if (node && !node.isLoaded && node.hasChildren && !loadingQueueRef.current.has(nodeId)) {
                expandNode(nodeId)
              }
            }
          }
        })
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [finalConfig.enableVirtualization, expandNode])

  return {
    // Hierarchy data
    rootNodes,
    expandedNodes,
    loadingStates,
    
    // Navigation functions
    expandNode,
    collapseNode,
    toggleNode,
    
    // Data access
    getFlattenedNodes,
    getVisibleNodes,
    updateVisibleRange,
    
    // Utilities
    searchHierarchy,
    initializeHierarchy,
    
    // Node operations
    loadNodeChildren,
    getParentNode,
    
    // Configuration
    config: finalConfig,
    
    // Intersection observer ref for manual setup
    observerRef: observerRef.current
  }
}

export default useLazyHierarchy 