import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import BottomTabs from './src/navigation/BottomTabs';
import AuthScreen from './screens/AuthScreen';
import AuthScreenWeb from './screens/AuthScreenWeb';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Iniciando verificação de sessão');
    
    // Verificar se estamos numa URL de callback (apenas para web)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = window.location.href;
      if (url.includes('/auth/callback') || url.includes('#access_token=')) {
        console.log('🔄 Detectado callback de autenticação');
        // Processar o callback
        handleAuthCallback();
        return;
      }
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('Erro ao obter sessão:', error);
      console.log('Sessão obtida:', session);
      setSession(session);
      setLoading(false);
    }).catch(error => {
      console.error('Erro inesperado:', error);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Mudança de estado de auth:', session);
      setSession(session);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('🔄 Processando callback de autenticação...');
      
      // Para web, o Supabase automaticamente processa o hash/query params
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro no callback:', error);
        setLoading(false);
        return;
      }

      if (session) {
        console.log('✅ Autenticação bem-sucedida:', session.user.email);
        setSession(session);
        // Limpar a URL
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, '/');
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro inesperado no callback:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <NavigationContainer>
        {session ? <BottomTabs /> : (
          Platform.OS === 'web' ? 
            <AuthScreenWeb onAuthSuccess={setSession} /> : 
            <AuthScreen onAuthSuccess={setSession} />
        )}
      </NavigationContainer>
    </>
  );
}