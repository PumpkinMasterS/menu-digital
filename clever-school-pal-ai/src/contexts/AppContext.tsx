import React, { createContext, useContext, useEffect, useState, startTransition } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useUnifiedAuth } from './UnifiedAuthContext';

export interface School {
  id: string;
  name: string;
  slug: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface AppContextType {
  mode: 'admin' | 'school';
  currentSchool: School | null;
  isAdminMode: boolean;
  isSchoolMode: boolean;
  resetAppState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUnifiedAuth();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  
  const [mode, setMode] = useState<'admin' | 'school'>('admin');
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);

  const resetAppState = () => {
    startTransition(() => {
      setMode('admin');
      setCurrentSchool(null);
    });
  };

  useEffect(() => {
    const handleAuthLogout = () => {
      resetAppState();
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

  useEffect(() => {
    const isAdminPath = location.pathname.startsWith('/admin');
    const isSchoolPath = location.pathname.startsWith('/escola');

    startTransition(() => {
      if (isAdminPath) {
        setMode('admin');
        setCurrentSchool(null);
      } else if (isSchoolPath && user?.role && ['diretor', 'coordenador'].includes(user.role)) {
        setMode('school');
        if (user.school_id && user.school_name) {
          setCurrentSchool({
            id: user.school_id,
            name: user.school_name,
            slug: user.school_id, // Usando school_id como slug
            address: '',
            contact_email: '',
            contact_phone: '',
            created_at: '',
            updated_at: ''
          });
        }
      }
    });
  }, [location.pathname, user, slug]);

  const value: AppContextType = {
    mode,
    currentSchool,
    isAdminMode: mode === 'admin',
    isSchoolMode: mode === 'school',
    resetAppState
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};