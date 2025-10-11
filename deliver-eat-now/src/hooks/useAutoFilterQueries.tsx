import { useCallback } from 'react'
import { useViewScope } from './useViewScope'

export const useAutoFilterQueries = () => {
  const { currentScope } = useViewScope()

  const applyFilters = useCallback((
    query: any,
    table: string
  ) => {
    if (!currentScope) return query

    // Se estamos no scope de organização, filtrar por organization_id
    if (currentScope.type === 'organization' && currentScope.id) {
      switch (table) {
        case 'restaurants':
          return query.eq('organization_id', currentScope.id)
        case 'orders':
          // Filtrar pedidos por restaurantes da organização
          return query.in('restaurant_id', 
            `(SELECT id FROM restaurants WHERE organization_id = '${currentScope.id}')`
          )
        case 'profiles':
          // Filtrar utilizadores da organização
          return query.eq('organization_id', currentScope.id)
        case 'drivers':
          return query.eq('organization_id', currentScope.id)
        default:
          return query
      }
    }

    // Se estamos no scope de restaurante, filtrar por restaurant_id
    if (currentScope.type === 'restaurant' && currentScope.id) {
      switch (table) {
        case 'orders':
          return query.eq('restaurant_id', currentScope.id)
        case 'meals':
          return query.eq('restaurant_id', currentScope.id)
        case 'order_items':
          // Filtrar itens por pedidos do restaurante
          return query.in('order_id',
            `(SELECT id FROM orders WHERE restaurant_id = '${currentScope.id}')`
          )
        case 'profiles':
          // Filtrar apenas restaurant_admin e kitchen deste restaurante
          return query
            .eq('restaurant_id', currentScope.id)
            .in('role', ['restaurant_admin', 'kitchen'])
        default:
          return query
      }
    }

    return query
  }, [currentScope])

  const withAutoFilter = useCallback((
    table: string,
    query: any
  ) => {
    return applyFilters(query, table)
  }, [applyFilters])

  return {
    applyFilters,
    withAutoFilter,
    currentScope,
    isFiltered: !!currentScope
  }
} 