import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar, Linking, Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('Initial session check:', session);
          
          // Verificar se o email está confirmado
          if (session?.user && !session.user.email_confirmed_at) {
            console.log('Email not confirmed, blocking access');
            Alert.alert(
              'Email não confirmado',
              'Por favor, confirma o teu email antes de continuar. Verifica a tua caixa de entrada.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Fazer logout se email não confirmado
                    supabase.auth.signOut();
                    setSession(null);
                  }
                }
              ]
            );
            return;
          }
          
          setSession(session);
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'Session:', session);
        
        // Verificar confirmação de email em mudanças de auth
        if (session?.user && !session.user.email_confirmed_at && event !== 'SIGNED_OUT') {
          console.log('Email not confirmed in auth change, blocking access');
          Alert.alert(
            'Email não confirmado',
            'Por favor, confirma o teu email antes de continuar. Verifica a tua caixa de entrada.',
            [
              {
                text: 'OK',
                onPress: () => {
                  supabase.auth.signOut();
                  setSession(null);
                }
              }
            ]
          );
          return;
        }
        
        setSession(session);
        setLoading(false);
      }
    );

    // Handle deep links
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', url);
      
      try {
        // Parse URL using native Linking for better compatibility
        const urlObj = new URL(url);
        console.log('📍 Parsed URL:', {
          scheme: urlObj.protocol.replace(':', ''),
          hostname: urlObj.hostname,
          pathname: urlObj.pathname,
          search: urlObj.search,
          searchParams: Object.fromEntries(urlObj.searchParams)
        });
        
        // Handle custom scheme (saborportugues://confirm?token=...)
        if (url.startsWith('saborportugues://')) {
          console.log('✅ Processing saborportugues:// scheme');
          
          // Check if this is a confirm action
          if (urlObj.hostname === 'confirm' || urlObj.pathname === '/confirm') {
            const token = urlObj.searchParams.get('token');
            const type = urlObj.searchParams.get('type') || 'signup';
            
            console.log('🎯 Extracted params:', { 
              token: token?.substring(0, 20) + '...', 
              type,
              allParams: Object.fromEntries(urlObj.searchParams)
            });
            
            if (token) {
              handleEmailConfirmation(token, type);
            } else {
              console.error('❌ No token found in URL');
              Alert.alert('Erro', 'Token não encontrado no link.');
            }
          } else {
            console.error('❌ Wrong path/hostname:', urlObj.hostname, urlObj.pathname);
            Alert.alert('Debug', `Caminho desconhecido: ${urlObj.hostname}${urlObj.pathname}`);
          }
        } 
        // Handle HTTPS URLs (universal links)
        else if (url.startsWith('https://')) {
          console.log('✅ Processing https:// scheme (universal link)');
          
          if (urlObj.pathname?.includes('app-redirect') || urlObj.pathname?.includes('auth/confirm')) {
            const token = urlObj.searchParams.get('token');
            const type = urlObj.searchParams.get('type') || 'signup';
            
            console.log('🎯 Universal link params:', { token: token?.substring(0, 20) + '...', type });
            
            if (token) {
              handleEmailConfirmation(token, type);
            } else {
              console.error('❌ No token found in universal link');
              Alert.alert('Erro', 'Token não encontrado no link universal.');
            }
          }
        } 
        // Handle Expo development URLs
        else if (url.startsWith('exp://')) {
          console.log('✅ Processing exp:// scheme (development)');
          
          const token = urlObj.searchParams.get('token');
          const type = urlObj.searchParams.get('type') || 'signup';
          
          if (token) {
            console.log('🧪 Development deep link with token:', token.substring(0, 20) + '...');
            handleEmailConfirmation(token, type);
          }
        } else {
          console.log('❌ Unknown scheme:', url);
          Alert.alert('Debug', `Esquema desconhecido: ${url}`);
        }
      } catch (error) {
        console.error('❌ Error parsing deep link:', error);
        Alert.alert('Erro', `Erro ao processar link: ${error.message}`);
      }
    };

    // Listen for incoming links when app is already open
    const linkingListener = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.unsubscribe();
      linkingListener?.remove();
    };
  }, []);

  const handleEmailConfirmation = async (token: string, type: string) => {
    console.log('🎯 Handling email confirmation:', { token: token.substring(0, 20) + '...', type });
    Alert.alert('Debug', `Processando token: ${token.substring(0, 20)}... tipo: ${type}`);
    
    try {
      if (type === 'signup') {
        console.log('📧 Processing signup confirmation...');
        // Handle signup confirmation
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });
        
        if (error) {
          console.error('❌ Signup confirmation error:', error);
          Alert.alert('Erro', `Não foi possível confirmar o email: ${error.message}`);
        } else {
          console.log('✅ Email confirmed successfully!');
          Alert.alert('Sucesso!', 'Email confirmado com sucesso! Podes agora usar a aplicação.');
          // Refresh session
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
        }
      } else if (type === 'recovery') {
        console.log('🔑 Processing recovery confirmation...');
        // Handle password reset
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });
        
        if (error) {
          console.error('❌ Recovery confirmation error:', error);
          Alert.alert('Erro', 'Não foi possível confirmar a recuperação de password.');
        } else {
          console.log('✅ Password reset confirmed!');
          Alert.alert('Sucesso!', 'Password redefinida com sucesso!');
        }
      } else if (type === 'magiclink') {
        console.log('🔮 Processing magic link...');
        // Handle magic link
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'magiclink'
        });
        
        if (error) {
          console.error('❌ Magic link error:', error);
          Alert.alert('Erro', `Não foi possível processar o magic link: ${error.message}`);
        } else {
          console.log('✅ Magic link processed successfully!');
          Alert.alert('Sucesso!', 'Login realizado com sucesso!');
          // Refresh session
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
        }
      }
    } catch (error) {
      console.error('💥 Email confirmation error:', error);
      Alert.alert('Erro', `Ocorreu um erro durante a confirmação: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>SaborPortuguês</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen onAuthSuccess={setSession} />;
  }

  return <HomeScreen user={session.user} onLogout={handleLogout} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
}); 