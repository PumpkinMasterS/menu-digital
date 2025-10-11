import React from 'react'
import { useViewScope } from '@/hooks/useViewScope'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, MapPin, Lock, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewScopeBreadcrumbProps {
  className?: string
}

const ViewScopeBreadcrumb: React.FC<ViewScopeBreadcrumbProps> = ({ className }) => {
  const { currentScope, exitScope, isInScope, getScopeLabel } = useViewScope()

  if (!isInScope || !currentScope) {
    return null
  }

  const getScopeIcon = () => {
    switch (currentScope.type) {
      case 'organization':
        return <MapPin className="w-4 h-4" />
      case 'restaurant':
        return <Eye className="w-4 h-4" />
      default:
        return <Eye className="w-4 h-4" />
    }
  }

  const getScopeColor = () => {
    switch (currentScope.type) {
      case 'organization':
        return 'bg-blue-600'
      case 'restaurant':
        return 'bg-green-600'
      default:
        return 'bg-gray-600'
    }
  }

  return (
    <div className={cn(
      "sticky top-0 z-50 border-b bg-gradient-to-r shadow-sm",
      getScopeColor(),
      className
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-white">
          {/* Left side - Scope info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getScopeIcon()}
              <span className="font-medium">
                {getScopeLabel()}
              </span>
            </div>
            
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Lock className="w-3 h-3 mr-1" />
              Visualização Contextual
            </Badge>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/90 hidden sm:block">
              Dados filtrados para este contexto
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exitScope}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Sair da Visualização
            </Button>
          </div>
        </div>

        {/* Breadcrumb trail */}
        {currentScope.parentScope && (
          <div className="mt-2 text-sm text-white/80">
            <span>Contexto:</span>
            <span className="mx-2">→</span>
            <span>{currentScope.parentScope.name}</span>
            <span className="mx-2">→</span>
            <span className="font-medium">{currentScope.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ViewScopeBreadcrumb 