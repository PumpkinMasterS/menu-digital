import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processando callback de autenticação...');
        
        // Obter a sessão atual após o redirecionamento
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erro no callback:', error);
          // Redirecionar para a página de login com erro
          window.location.href = '/?error=auth_failed';
          return;
        }

        if (session) {
          console.log('✅ Autenticação bem-sucedida:', session.user.email);
          // Redirecionar para a página principal
          window.location.href = '/';
        } else {
          console.log('⚠️ Nenhuma sessão encontrada');
          window.location.href = '/?error=no_session';
        }
      } catch (error) {
        console.error('❌ Erro inesperado no callback:', error);
        window.location.href = '/?error=unexpected';
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={styles.text}>Processando autenticação...</Text>
      <Text style={styles.subtext}>Aguarda um momento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5a5a',
    marginTop: 20,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
});