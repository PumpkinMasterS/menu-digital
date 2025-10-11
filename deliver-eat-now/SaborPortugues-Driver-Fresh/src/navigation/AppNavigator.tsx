import React from 'react'
import { Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui'

// Screens
import LoginScreen from '@/screens/auth/LoginScreen'
import ActivationScreen from '@/screens/auth/ActivationScreen'
import OnboardingWizard from '@/screens/onboarding/OnboardingWizard'
import HomeScreen from '@/screens/delivery/HomeScreen'
import ActiveDeliveryScreen from '@/screens/delivery/ActiveDeliveryScreen'
import DeliveryDetailsScreen from '@/screens/delivery/DeliveryDetailsScreen'
import MapScreen from '@/screens/delivery/MapScreen'
import ProfileScreen from '@/screens/profile/ProfileScreen'
import HistoryScreen from '@/screens/profile/HistoryScreen'

// Types
import { RootStackParamList, BottomTabParamList } from '@/types'

const Stack = createStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<BottomTabParamList>()

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Entregas',
          tabBarIcon: ({ color, size }) => (
            // Aqui você pode usar ícones do react-native-vector-icons
            // Por agora, vamos usar texto
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Active" 
        component={ActiveDeliveryScreen}
        options={{
          title: 'Ativa',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🚗</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🗺️</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  )
}

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Activation" component={ActivationScreen} />
    </Stack.Navigator>
  )
}

function OnboardingStack() {
  const { refreshUser } = useAuth()
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="OnboardingWizard" 
        options={{ headerShown: false }}
      >
        {() => (
          <OnboardingWizard
            onComplete={() => {
              // O refreshUser já é chamado dentro do OnboardingWizard
              // Aqui não precisamos fazer nada adicional
            }}
            onCancel={() => {
              // Implementar lógica de cancelamento se necessário
              console.log('Onboarding cancelado')
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  )
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Main" 
        component={TabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DeliveryDetails" 
        component={DeliveryDetailsScreen}
        options={{
          title: 'Detalhes da Entrega',
          headerStyle: {
            backgroundColor: '#10B981',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
      <Stack.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          title: 'Histórico',
          headerStyle: {
            backgroundColor: '#10B981',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
    </Stack.Navigator>
  )
}

export default function AppNavigator() {
  const { user, loading, needsOnboarding } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : needsOnboarding ? (
        <OnboardingStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  )
}