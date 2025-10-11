// Google Maps API Configuration
export const GOOGLE_MAPS_CONFIG = {
  // Obtenha sua chave em: https://console.cloud.google.com/
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  
  // Configurações padrão
  defaultCenter: { lat: 38.7223, lng: -9.1393 }, // Lisboa
  defaultZoom: 13,
  
  // Verificar se a API está configurada
  isConfigured: () => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    return !!(key && key !== '' && key.length > 10)
  },

  // Verificar se o Google Maps está carregado
  isLoaded: () => {
    return typeof window !== 'undefined' && typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined'
  },

  // Verificar se a chave tem formato válido
  isValidApiKey: () => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) return false
    
    // Chave de API do Google Maps deve começar com AIza
    return key.startsWith('AIza') && key.length >= 35
  },

  // Detectar se está usando chave secreta de assinatura por engano
  isUsingSigningSecret: () => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) return false
    
    // Chave secreta de assinatura geralmente termina com = e é base64
    return key.endsWith('=') && key.length < 35 && !key.startsWith('AIza')
  },

  // Aguardar carregamento do Google Maps
  waitForLoad: (timeout = 10000) => {
    return new Promise<boolean>((resolve) => {
      if (GOOGLE_MAPS_CONFIG.isLoaded()) {
        resolve(true)
        return
      }

      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        if (GOOGLE_MAPS_CONFIG.isLoaded()) {
          clearInterval(checkInterval)
          resolve(true)
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          resolve(false)
        }
      }, 100)
    })
  },
  
  // Mensagem de erro para configuração
  getConfigurationError: () => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!key || key === '') {
      return {
        title: "Google Maps API não configurada",
        message: "Para usar o sistema de áreas de entrega, configure a VITE_GOOGLE_MAPS_API_KEY no arquivo .env.local",
        type: "missing" as const,
        instructions: [
          "1. Acesse https://console.cloud.google.com/",
          "2. Vá para APIs e serviços → Credenciais", 
          "3. Encontre 'Maps Platform API Key' (não a chave secreta!)",
          "4. Copie a chave que começa com 'AIza...'",
          "5. Adicione VITE_GOOGLE_MAPS_API_KEY=AIzaSua_Chave_Aqui no arquivo .env.local",
          "6. Reinicie o servidor de desenvolvimento"
        ]
      }
    }

    if (GOOGLE_MAPS_CONFIG.isUsingSigningSecret()) {
      return {
        title: "⚠️ Chave incorreta detectada!",
        message: `Você configurou a chave secreta de assinatura (${key.substring(0, 10)}...) ao invés da chave de API do Maps Platform.`,
        type: "wrong_key" as const,
        instructions: [
          "🔍 PROBLEMA: Você usou a 'Chave secreta de assinatura de URL' ao invés da 'Maps Platform API Key'",
          "",
          "✅ SOLUÇÃO:",
          "1. Na Google Cloud Console → Credenciais",
          "2. Encontre a linha 'Maps Platform API Key' (não a chave secreta!)",
          "3. Copie a chave que COMEÇA com 'AIza...' (cerca de 39 caracteres)",
          "4. Substitua no .env.local:",
          `   ANTES: VITE_GOOGLE_MAPS_API_KEY=${key}`,
          "   DEPOIS: VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          "5. Reinicie o servidor (Ctrl+C e npm run dev)"
        ]
      }
    }

    if (!GOOGLE_MAPS_CONFIG.isValidApiKey()) {
      return {
        title: "Formato de chave inválido",
        message: `A chave fornecida (${key.substring(0, 10)}...) não parece ser uma chave válida do Google Maps API.`,
        type: "invalid_format" as const,
        instructions: [
          "A chave de API do Google Maps deve:",
          "✅ Começar com 'AIza'",
          "✅ Ter cerca de 39 caracteres",
          "✅ Não terminar com '=' (isso é chave secreta!)",
          "",
          "Verifique se copiou a chave correta da Google Cloud Console."
        ]
      }
    }

    return {
      title: "Erro desconhecido na configuração",
      message: "A chave parece válida, mas há um problema na configuração.",
      type: "unknown" as const,
      instructions: [
        "1. Verifique se as APIs estão ativadas na Google Cloud Console",
        "2. Confirme as restrições de domínio",
        "3. Verifique o console do navegador (F12) para mais detalhes",
        "4. Teste a chave no arquivo test-google-maps-load.html"
      ]
    }
  }
}

export default GOOGLE_MAPS_CONFIG 