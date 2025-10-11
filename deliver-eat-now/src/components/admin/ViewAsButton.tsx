import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Eye, Building2, Store, ChevronDown } from 'lucide-react'
import { useViewScope } from '@/hooks/useViewScope'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface ViewAsButtonProps {
  organization?: {
    id: string
    name: string
  }
  restaurant?: {
    id: string
    name: string
    organization_id?: string
    organization?: {
      id: string
      name: string
    }
  }
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const ViewAsButton: React.FC<ViewAsButtonProps> = ({
  organization,
  restaurant,
  variant = 'outline',
  size = 'sm',
  className
}) => {
  const { profile } = useAuth()
  const { enterScope, canEnterScope, isInScope, currentScope } = useViewScope()

  // Don't show if user can't enter any scope
  const canViewAsOrg = organization && canEnterScope('organization')
  const canViewAsRestaurant = restaurant && canEnterScope('restaurant')

  if (!canViewAsOrg && !canViewAsRestaurant) {
    return null
  }

  // If only one option available, show simple button
  if (canViewAsOrg && !canViewAsRestaurant) {
    const isCurrentScope = currentScope?.type === 'organization' && currentScope?.id === organization!.id

    return (
      <Button
        variant={isCurrentScope ? 'default' : variant}
        size={size}
        className={className}
        onClick={() => {
          if (isCurrentScope) {
            toast.info('Já está a visualizar esta organização')
            return
          }
          
          enterScope({
            type: 'organization',
            id: organization!.id,
            name: organization!.name
          })
        }}
        disabled={isCurrentScope}
      >
        <Building2 className="w-4 h-4 mr-2" />
        {isCurrentScope ? 'A Visualizar' : 'Ver como Organização'}
      </Button>
    )
  }

  if (canViewAsRestaurant && !canViewAsOrg) {
    const isCurrentScope = currentScope?.type === 'restaurant' && currentScope?.id === restaurant!.id

    return (
      <Button
        variant={isCurrentScope ? 'default' : variant}
        size={size}
        className={className}
        onClick={() => {
          if (isCurrentScope) {
            toast.info('Já está a visualizar este restaurante')
            return
          }

          enterScope({
            type: 'restaurant',
            id: restaurant!.id,
            name: restaurant!.name,
            metadata: {
              organization_id: restaurant!.organization_id || restaurant!.organization?.id
            }
          })
        }}
        disabled={isCurrentScope}
      >
        <Store className="w-4 h-4 mr-2" />
        {isCurrentScope ? 'A Visualizar' : 'Ver como Restaurante'}
      </Button>
    )
  }

  // Both options available - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Eye className="w-4 h-4 mr-2" />
          Ver como
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canViewAsOrg && (
          <DropdownMenuItem
            onClick={() => {
              const isCurrentScope = currentScope?.type === 'organization' && currentScope?.id === organization!.id
              
              if (isCurrentScope) {
                toast.info('Já está a visualizar esta organização')
                return
              }
              
              enterScope({
                type: 'organization',
                id: organization!.id,
                name: organization!.name
              })
            }}
            disabled={currentScope?.type === 'organization' && currentScope?.id === organization!.id}
          >
            <Building2 className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>Ver como Organização</span>
              <span className="text-xs text-gray-500 truncate">{organization!.name}</span>
            </div>
          </DropdownMenuItem>
        )}
        
        {canViewAsRestaurant && (
          <DropdownMenuItem
            onClick={() => {
              const isCurrentScope = currentScope?.type === 'restaurant' && currentScope?.id === restaurant!.id
              
              if (isCurrentScope) {
                toast.info('Já está a visualizar este restaurante')
                return
              }

              enterScope({
                type: 'restaurant',
                id: restaurant!.id,
                name: restaurant!.name,
                metadata: {
                  organization_id: restaurant!.organization_id || restaurant!.organization?.id
                },
                parentScope: organization ? {
                  type: 'organization',
                  id: organization.id,
                  name: organization.name
                } : undefined
              })
            }}
            disabled={currentScope?.type === 'restaurant' && currentScope?.id === restaurant!.id}
          >
            <Store className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>Ver como Restaurante</span>
              <span className="text-xs text-gray-500 truncate">{restaurant!.name}</span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ViewAsButton 