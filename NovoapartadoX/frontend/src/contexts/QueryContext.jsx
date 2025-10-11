import React, { createContext, useContext } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Configuração otimizada do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos
      staleTime: 5 * 60 * 1000,
      // Manter cache por 10 minutos
      cacheTime: 10 * 60 * 1000,
      // Retry automático em caso de erro
      retry: (failureCount, error) => {
        // Não retry em erros 4xx
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // Máximo 3 tentativas
        return failureCount < 3
      },
      // Delay exponencial entre retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch em foco da janela apenas se dados estão stale
      refetchOnWindowFocus: false,
      // Refetch na reconexão
      refetchOnReconnect: true,
      // Não refetch no mount se dados estão fresh
      refetchOnMount: true
    },
    mutations: {
      // Retry mutations em caso de erro de rede
      retry: (failureCount, error) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 2
      },
      retryDelay: 1000
    }
  }
})

// Context para acessar o QueryClient
const QueryContext = createContext(queryClient)

// Provider component
export const QueryProvider = ({ children }) => {
  return (
    <QueryContext.Provider value={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools 
            initialIsOpen={false}
            position="bottom-right"
          />
        )}
      </QueryClientProvider>
    </QueryContext.Provider>
  )
}

// Hook para acessar o QueryClient
export const useQueryClient = () => {
  const client = useContext(QueryContext)
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryProvider')
  }
  return client
}

// Hooks personalizados para queries comuns
export const useModelsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['models', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/models?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      return response.json()
    },
    ...options
  })
}

export const useModelQuery = (id, options = {}) => {
  return useQuery({
    queryKey: ['model', id],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/models/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) {
        throw new Error('Failed to fetch model')
      }
      return response.json()
    },
    enabled: !!id,
    ...options
  })
}

export const useUserQuery = (options = {}) => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }
      return response.json()
    },
    ...options
  })
}

// Mutations comuns
export const useLoginMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (credentials) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas ao usuário
      queryClient.invalidateQueries({ queryKey: ['user'] })
      // Armazenar token se necessário
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
    }
  })
}

export const useLogoutMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      if (!response.ok) {
        throw new Error('Logout failed')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Limpar cache do usuário
      queryClient.removeQueries({ queryKey: ['user'] })
      // Remover token
      localStorage.removeItem('token')
      // Redirecionar para login se necessário
    }
  })
}

export const useCreateModelMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (modelData) => {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create model')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidar lista de modelos
      queryClient.invalidateQueries({ queryKey: ['models'] })
    }
  })
}

export const useUpdateModelMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...modelData }) => {
      const response = await fetch(`/api/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update model')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Atualizar cache do modelo específico
      queryClient.setQueryData(['model', variables.id], data)
      // Invalidar lista de modelos
      queryClient.invalidateQueries({ queryKey: ['models'] })
    }
  })
}

export const useDeleteModelMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/models/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete model')
      }
      
      return response.json()
    },
    onSuccess: (data, id) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: ['model', id] })
      // Invalidar lista de modelos
      queryClient.invalidateQueries({ queryKey: ['models'] })
    }
  })
}

// Prefetch utilities
export const prefetchModel = (queryClient, id) => {
  return queryClient.prefetchQuery({
    queryKey: ['model', id],
    queryFn: async () => {
      const response = await fetch(`/api/models/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch model')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000
  })
}

export const prefetchModels = (queryClient, filters = {}) => {
  return queryClient.prefetchQuery({
    queryKey: ['models', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/models?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000
  })
}

export default QueryProvider