import React, { ReactNode } from 'react'
import Header from './Header'

interface LayoutWithBreadcrumbProps {
  children: ReactNode
  showHeader?: boolean
  className?: string
}

const LayoutWithBreadcrumb: React.FC<LayoutWithBreadcrumbProps> = ({ 
  children, 
  showHeader = true, 
  className 
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className || ''}`}>
      {showHeader && <Header />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

export default LayoutWithBreadcrumb 