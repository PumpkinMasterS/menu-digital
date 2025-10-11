import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

interface ViewScopeContext {
  // Current scope
  currentScope: ViewScope | null
  
  // Actions
  enterScope: (scope: ViewScope) => void
  exitScope: () => void
  
  // Helpers
  isInScope: boolean
  canEnterScope: (targetType: ScopeType) => boolean
  getScopeLabel: () => string
}

interface ViewScope {
  type: ScopeType
  id: string
  name: string
  parentScope?: ViewScope
  metadata?: any
}

type ScopeType = 'organization' | 'restaurant'

// Create context
const ViewScopeContext = createContext<ViewScopeContext | null>(null)

// Provider component
export const ViewScopeProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth()
  const [currentScope, setCurrentScope] = useState<ViewScope | null>(null)

  // Check if user can enter a specific scope type
  const canEnterScope = useCallback((targetType: ScopeType): boolean => {
    if (!profile) return false

    // Platform Owner can enter organization scope
    if (profile.role === 'platform_owner' && targetType === 'organization') {
      return true
    }

    // Super Admin can enter restaurant scope (within their organization)
    if (profile.role === 'super_admin' && targetType === 'restaurant') {
      return true
    }

    // Platform Owner can also enter restaurant scope (through organization)
    if (profile.role === 'platform_owner' && targetType === 'restaurant') {
      return true
    }

    return false
  }, [profile])

  // Enter a scope
  const enterScope = useCallback((scope: ViewScope) => {
    if (!canEnterScope(scope.type)) {
      toast.error('Não tem permissões para entrar neste contexto')
      return
    }

    setCurrentScope(scope)
    
    toast.success(`A visualizar como ${scope.name}`, {
      description: 'Os dados estão agora filtrados por este contexto'
    })
  }, [canEnterScope])

  // Exit current scope
  const exitScope = useCallback(() => {
    if (currentScope) {
      toast.info(`Saiu da visualização de ${currentScope.name}`)
      setCurrentScope(null)
    }
  }, [currentScope])

  // Get scope label for UI
  const getScopeLabel = useCallback((): string => {
    if (!currentScope) return ''
    
    const typeLabels = {
      organization: 'Organização',
      restaurant: 'Restaurante'
    }
    
    return `${typeLabels[currentScope.type]}: ${currentScope.name}`
  }, [currentScope])

  const value: ViewScopeContext = {
    currentScope,
    enterScope,
    exitScope,
    isInScope: !!currentScope,
    canEnterScope,
    getScopeLabel
  }

  return (
    <ViewScopeContext.Provider value={value}>
      {children}
    </ViewScopeContext.Provider>
  )
}

// Hook to use view scope
export const useViewScope = (): ViewScopeContext => {
  const context = useContext(ViewScopeContext)
  if (!context) {
    throw new Error('useViewScope must be used within ViewScopeProvider')
  }
  return context
}

// Helper hook to get filtered scope for queries
export const useQueryScope = () => {
  const { profile } = useAuth()
  const { currentScope } = useViewScope()

  const getFilters = useCallback(() => {
    const filters: Record<string, any> = {}

    // If in scope, apply scope filters
    if (currentScope) {
      switch (currentScope.type) {
        case 'organization':
          filters.organization_id = currentScope.id
          break
        case 'restaurant':
          filters.restaurant_id = currentScope.id
          // Also need organization_id for some queries
          if (currentScope.metadata?.organization_id) {
            filters.organization_id = currentScope.metadata.organization_id
          }
          break
      }
    } else {
      // No scope - apply user's natural filters
      switch (profile?.role) {
        case 'super_admin':
          if (profile.organization_id) {
            filters.organization_id = profile.organization_id
          }
          break
        case 'restaurant_admin':
        case 'kitchen':
          // These roles already have natural restaurant filtering
          // Will be handled by existing role-based queries
          break
      }
    }

    return filters
  }, [currentScope, profile])

  const getScopeInfo = useCallback(() => {
    return {
      isInScope: !!currentScope,
      scopeType: currentScope?.type,
      scopeId: currentScope?.id,
      scopeName: currentScope?.name,
      originalRole: profile?.role,
      filters: getFilters()
    }
  }, [currentScope, profile, getFilters])

  return {
    getFilters,
    getScopeInfo,
    isInScope: !!currentScope,
    currentScope
  }
}

export default useViewScope 