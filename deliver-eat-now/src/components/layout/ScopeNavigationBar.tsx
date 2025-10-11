import { useViewScope } from '@/hooks/useViewScope'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Eye, Building2, Utensils, Crown, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ScopeNavigationBar = () => {
  const { currentScope, exitScope, getScopeLabel, isInScope } = useViewScope()
  const { profile } = useAuth()
  const navigate = useNavigate()

  if (!isInScope) return null

  const handleGoBack = () => {
    exitScope()
    // Navigate back to appropriate dashboard
    if (profile?.role === 'platform_owner') {
      navigate('/admin')
    } else if (profile?.role === 'super_admin') {
      navigate('/admin')
    }
  }

  const getIcon = () => {
    if (!currentScope) return <Eye className="h-4 w-4" />
    
    switch (currentScope.type) {
      case 'organization':
        return <Building2 className="h-4 w-4" />
      case 'restaurant':
        return <Utensils className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getScopeTypeLabel = () => {
    if (!currentScope) return 'Scope'
    
    switch (currentScope.type) {
      case 'organization':
        return 'Organização'
      case 'restaurant':
        return 'Restaurante'
      default:
        return 'Contexto'
    }
  }

  return (
    <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center space-x-2 bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>

          <div className="flex items-center space-x-2">
            {getIcon()}
            <span className="text-sm font-medium text-emerald-800">
              A visualizar como:
            </span>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
              {getScopeTypeLabel()}
            </Badge>
            <span className="font-semibold text-emerald-900">
              {currentScope?.name}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-emerald-700">
            <Crown className="h-4 w-4" />
            <span>Role real:</span>
            <Badge variant="outline" className="border-emerald-300 text-emerald-800">
              {profile?.role}
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
          >
            <Home className="h-4 w-4 mr-1" />
            Início
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ScopeNavigationBar 