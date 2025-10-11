import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../../screens/HomeScreen';

const Tab = createBottomTabNavigator();

// Componentes temporários para as outras telas
const SearchScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18, color: '#333' }}>Procurar</Text>
    <Text style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Em desenvolvimento...</Text>
  </View>
);

const OrdersScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18, color: '#333' }}>Pedidos</Text>
    <Text style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Em desenvolvimento...</Text>
  </View>
);

const AccountScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18, color: '#333' }}>Conta</Text>
    <Text style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Em desenvolvimento...</Text>
  </View>
);

export default function BottomTabs() {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Início') iconName = 'home-outline';
          else if (route.name === 'Procurar') iconName = 'search-outline';
          else if (route.name === 'Pedidos') iconName = 'receipt-outline';
          else if (route.name === 'Conta') iconName = 'person-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6347',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Procurar" component={SearchScreen} />
      <Tab.Screen name="Pedidos" component={OrdersScreen} />
      <Tab.Screen name="Conta" component={AccountScreen} />
    </Tab.Navigator>
  );
} 