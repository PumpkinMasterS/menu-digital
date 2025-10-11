import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Linking, Alert } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { AuthProvider } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import AppNavigator from '@/navigation/AppNavigator'
import ErrorBoundary from '@/components/ErrorBoundary'
import InitializationCheck from '@/components/InitializationCheck'

const linking = {
  prefixes: ['saborportugues://'],
  config: {
    screens: {
      Auth: {
        screens: {
          Activation: 'driver-activation',
        },
      },
    },
  },
}

function AppContent() {
  // Inicializar notificações (erro tratado dentro do hook)
  useNotifications()

  useEffect(() => {
    // Handle deep links when app is already open
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url)
    }

    try {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        handleDeepLink(url)
      })

      // Handle deep link when app is opened from closed state
      Linking.getInitialURL().then((url) => {
        if (url) {
          handleDeepLink(url)
        }
      }).catch((error) => {
        console.error('Erro ao obter URL inicial:', error)
      })

      return () => subscription?.remove()
    } catch (error) {
      console.error('Erro ao configurar deep linking:', error)
    }
  }, [])

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer linking={linking}>
        <AppNavigator />
      </NavigationContainer>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <InitializationCheck>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </InitializationCheck>
    </ErrorBoundary>
  )
}