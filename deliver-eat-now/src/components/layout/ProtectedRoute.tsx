import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string | string[]
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (requiredRole && profile?.role) {
    // Check if role is allowed
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    
    // Special access rules
    const hasAccess = 
      allowedRoles.includes(profile.role) ||
      // Platform owner has access to everything
      profile.role === 'platform_owner' ||
      // Super admin has access to admin areas
      (profile.role === 'super_admin' && allowedRoles.includes('admin'))
    
    if (!hasAccess) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
