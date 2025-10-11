import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { GOOGLE_AUTH_CONFIG } from '../config/google-auth';

const { width, height } = Dimensions.get('window');

interface AuthScreenProps {
  onAuthSuccess: (session: any) => void;
}

export default function AuthScreenWeb({ onAuthSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailFlow, setShowEmailFlow] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para Google Sign-In (versão web)
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log('🚀 Iniciando Google Sign-In para web...');
      
      // Usar o método nativo do Supabase para web
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ Supabase Google auth error:', error);
        Alert.alert('Erro', 'Não foi possível fazer login com Google. Tenta novamente.');
      } else {
        console.log('✅ Google login initiated:', data);
        // O redirecionamento será automático
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      Alert.alert('Erro', 'Não foi possível fazer login com Google. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para iniciar o fluxo de email
  const handleEmailFlow = () => {
    setShowEmailFlow(true);
  };

  // Função para enviar magic link
  const handleContinueWithEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, insere o teu email');
      return;
    }

    if (!isValidEmail(email.trim())) {
      Alert.alert('Erro', 'Por favor, insere um email válido');
      return;
    }

    if (!privacyAccepted) {
      Alert.alert('Aceitar Termos', 'Tens que aceitar os termos e privacidade para continuar');
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Enviando magic link para:', email.trim());
      
      // Usar signInWithOtp para magic links
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('❌ Magic link error:', error);
        Alert.alert('Erro', 'Não foi possível enviar o link. Tenta novamente mais tarde.');
      } else {
        console.log('✅ Magic link sent successfully:', data);
        Alert.alert(
          'Link enviado! 📧',
          'Verifica o teu email e clica no link para confirmares a tua conta.'
        );
      }
    } catch (error: any) {
      console.error('❌ Auth error:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Componente de Política de Privacidade
  const PrivacyPolicyModal = () => (
    <Modal visible={showPrivacyModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Política de Privacidade</Text>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalText}>
            A SaborPortuguês está comprometida em proteger a tua privacidade. Esta política explica como recolhemos, usamos e protegemos os teus dados pessoais de acordo com o GDPR.
            {'\n\n'}
            <Text style={styles.modalSubtitle}>1. Dados que Recolhemos</Text>
            {'\n'}
            • Email e informações de contacto{'\n'}
            • Preferências alimentares e alergias{'\n'}
            • Histórico de encomendas e pagamentos{'\n'}
            • Localização para entregas{'\n'}
            • Dados de utilização da aplicação
            {'\n\n'}
            <Text style={styles.modalSubtitle}>2. Como Usamos os Dados</Text>
            {'\n'}
            • Processar e entregar as tuas encomendas{'\n'}
            • Melhorar a nossa aplicação e serviços{'\n'}
            • Enviar notificações sobre encomendas{'\n'}
            • Recomendações personalizadas{'\n'}
            • Suporte ao cliente e resolução de problemas
            {'\n\n'}
            <Text style={styles.modalSubtitle}>3. Os Teus Direitos</Text>
            {'\n'}
            • Aceder aos teus dados pessoais{'\n'}
            • Corrigir informações incorretas{'\n'}
            • Eliminar a tua conta{'\n'}
            • Portabilidade dos dados{'\n'}
            • Retirar consentimento a qualquer momento
            {'\n\n'}
            <Text style={styles.modalSubtitle}>4. Segurança</Text>
            {'\n'}
            Usamos medidas técnicas e organizacionais adequadas para proteger os teus dados contra acesso não autorizado, alteração, divulgação ou destruição.
            {'\n\n'}
            <Text style={styles.modalSubtitle}>5. Contacto</Text>
            {'\n'}
            Para questões sobre privacidade: admin@comituga.eu{'\n'}
            Encarregado de Proteção de Dados: dpo@comituga.eu{'\n'}
            Última atualização: Janeiro 2025
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Componente de Termos e Condições
  const TermsModal = () => (
    <Modal visible={showTermsModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowTermsModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Termos de Serviço</Text>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalText}>
            Bem-vindo à SaborPortuguês! Ao criar uma conta e usar os nossos serviços, aceitas os seguintes termos e condições:
            {'\n\n'}
            <Text style={styles.modalSubtitle}>1. Elegibilidade e Conta</Text>
            {'\n'}
            • Deves ter pelo menos 18 anos para usar este serviço{'\n'}
            • És responsável por manter a segurança da tua conta{'\n'}
            • Uma conta por pessoa, uso pessoal apenas{'\n'}
            • Fornecer informações verdadeiras e atualizadas
            {'\n\n'}
            <Text style={styles.modalSubtitle}>2. Encomendas e Pagamentos</Text>
            {'\n'}
            • Preços incluem todos os impostos aplicáveis{'\n'}
            • Pagamento é processado no momento da encomenda{'\n'}
            • Cancelamentos só até 5 minutos após confirmação{'\n'}
            • Entregas sujeitas às áreas de cobertura{'\n'}
            • Taxa de entrega pode aplicar-se
            {'\n\n'}
            <Text style={styles.modalSubtitle}>3. Alergias e Restrições</Text>
            {'\n'}
            • Informar alergias alimentares é tua responsabilidade{'\n'}
            • Restaurantes farão o melhor para acomodar{'\n'}
            • SaborPortuguês não se responsabiliza por reações alérgicas{'\n'}
            • Confirma sempre ingredientes diretamente com o restaurante
            {'\n\n'}
            <Text style={styles.modalSubtitle}>4. Comportamento do Utilizador</Text>
            {'\n'}
            • Tratar entregadores e restaurantes com respeito{'\n'}
            • Não usar o serviço para atividades ilegais{'\n'}
            • Não fazer encomendas falsas ou fraudulentas{'\n'}
            • Estar disponível no momento da entrega
            {'\n\n'}
            <Text style={styles.modalSubtitle}>5. Limitação de Responsabilidade</Text>
            {'\n'}
            • SaborPortuguês atua como intermediário{'\n'}
            • Qualidade da comida é responsabilidade do restaurante{'\n'}
            • Tempos de entrega são estimativas{'\n'}
            • Reembolsos sujeitos à política de cada restaurante
            {'\n\n'}
            <Text style={styles.modalSubtitle}>6. Contacto e Suporte</Text>
            {'\n'}
            Email: admin@comituga.eu{'\n'}
            Telefone: +351 21 123 4567{'\n'}
            Última atualização: Janeiro 2025
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (showEmailFlow) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        {/* Header com botão de voltar */}
        <View style={styles.emailHeader}>
          <TouchableOpacity 
            onPress={() => setShowEmailFlow(false)}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.emailTitle}>Inscreve-te ou faz o login</Text>
        </View>

        <View style={styles.emailContainer}>
          <Text style={styles.emailLabel}>E-mail</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="Qual o e-mail?"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {/* Checkbox de consentimento */}
          <View style={styles.consentContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setPrivacyAccepted(!privacyAccepted)}
            >
              <View style={[styles.checkboxBox, privacyAccepted && styles.checkboxChecked]}>
                {privacyAccepted && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
            </TouchableOpacity>
            <View style={styles.consentTextContainer}>
              <Text style={styles.consentText}>
                Eu autorizo a SaborPortuguês a guardar o meu endereço de e-mail e nome de acordo com a{' '}
                <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
                  <Text style={styles.linkText}>política de privacidade</Text>
                </TouchableOpacity>
                {' '}e{' '}
                <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                  <Text style={styles.linkText}>termos e condições</Text>
                </TouchableOpacity>
                {' '}da empresa.
              </Text>
            </View>
          </View>

          {/* Botão Continuar */}
          <TouchableOpacity
            style={[styles.continueButton, (!email.trim() || !privacyAccepted) && styles.continueButtonDisabled]}
            onPress={handleContinueWithEmail}
            disabled={loading || !email.trim() || !privacyAccepted}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.continueButtonText}>Continuar</Text>
            )}
          </TouchableOpacity>
        </View>

        <PrivacyPolicyModal />
        <TermsModal />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>SABORES AUTÊNTICOS{'\n'}DE PORTUGAL</Text>
            <View style={styles.heroImageContainer}>
              {/* Ícone de comida portuguesa */}
              <View style={styles.heroImagePlaceholder}>
                <Text style={styles.heroImageText}>🇵🇹</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Auth Buttons Section */}
      <View style={styles.authSection}>
        {/* Google Sign-In Button */}
        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#2d5a5a" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continuar com Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Email Button */}
        <TouchableOpacity style={styles.emailButton} onPress={handleEmailFlow}>
          <Text style={styles.emailIcon}>✉</Text>
          <Text style={styles.emailButtonText}>Continuar com e-mail</Text>
        </TouchableOpacity>

        {/* Outro link */}
        <TouchableOpacity style={styles.otherButton}>
          <Text style={styles.otherButtonText}>Outro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  heroSection: {
    flex: 0.6,
    width: '100%',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: width > 400 ? 28 : 24,
    fontWeight: 'bold',
    color: '#2d5a5a',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: width > 400 ? 36 : 32,
  },
  heroImageContainer: {
    marginTop: 20,
  },
  heroImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  heroImageText: {
    fontSize: 48,
  },
  authSection: {
    flex: 0.4,
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'flex-start',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 48,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285f4',
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#3c4043',
    fontWeight: '500',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 48,
  },
  emailIcon: {
    fontSize: 18,
    color: '#ffffff',
    marginRight: 12,
  },
  emailButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  otherButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  otherButtonText: {
    fontSize: 16,
    color: '#666666',
    textDecorationLine: 'underline',
  },
  // Email Flow Styles
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2d5a5a',
    fontWeight: 'bold',
  },
  emailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5a5a',
  },
  emailContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  emailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5a5a',
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  consentContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#dadce0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  consentTextContainer: {
    flex: 1,
  },
  consentText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  linkText: {
    color: '#FF6B35',
    textDecorationLine: 'underline',
  },
  continueButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  continueButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    fontSize: 24,
    color: '#666666',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d5a5a',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
  },
  modalSubtitle: {
    fontWeight: '600',
    color: '#2d5a5a',
  },
});