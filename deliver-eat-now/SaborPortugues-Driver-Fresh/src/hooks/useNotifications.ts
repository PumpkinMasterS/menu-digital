import { useEffect, useRef } from 'react'
import { Platform, Alert } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { supabase } from '@/config/supabase'

// Configurar como as notificações devem ser tratadas quando recebidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function useNotifications() {
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    // Verificar se o dispositivo suporta notificações antes de inicializar
    if (!Device.isDevice) {
      console.log('Notificações push só funcionam em dispositivos físicos')
      return
    }

    // Inicializar notificações com tratamento de erro
    const initializeNotifications = async () => {
      try {
        await registerForPushNotificationsAsync()
        
        // Listener para notificações recebidas enquanto o app está em primeiro plano
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          console.log('Notificação recebida:', notification)
          handleNotificationReceived(notification)
        })

        // Listener para quando o usuário toca na notificação
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Resposta da notificação:', response)
          handleNotificationResponse(response)
        })
      } catch (error) {
        console.error('Erro ao inicializar notificações:', error)
      }
    }

    initializeNotifications()

    return () => {
      try {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current)
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current)
        }
      } catch (error) {
        console.error('Erro ao limpar listeners de notificação:', error)
      }
    }
  }, [])

  const handleNotificationReceived = (notification: Notifications.Notification) => {
    const { title, body, data } = notification.request.content
    
    // Tratar diferentes tipos de notificação
    if (data?.type === 'new_delivery') {
      // Nova entrega disponível
      Alert.alert(
        'Nova Entrega Disponível! 🚚',
        body || 'Uma nova entrega está aguardando aceitação',
        [
          { text: 'Ver Depois', style: 'cancel' },
          { text: 'Ver Agora', onPress: () => {
            // Navegar para a tela de entregas
            // navigation.navigate('Home')
          }}
        ]
      )
    } else if (data?.type === 'delivery_update') {
      // Atualização de entrega
      console.log('Atualização de entrega:', data)
    }
  }

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content
    
    // Navegar baseado no tipo de notificação
    if (data?.type === 'new_delivery') {
      // Navegar para entregas
      // navigation.navigate('Home')
    } else if (data?.type === 'delivery_update' && data?.deliveryId) {
      // Navegar para detalhes da entrega
      // navigation.navigate('DeliveryDetails', { orderId: data.deliveryId })
    }
  }

  const registerForPushNotificationsAsync = async () => {
    let token

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }
        
        if (finalStatus !== 'granted') {
          console.log('Permissão de notificação negada')
          return
        }
        
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'saborportugues-driver-app'
          })
          token = tokenData.data
          console.log('Push token:', token)
          
          // Salvar o token no Supabase
          await savePushToken(token)
        } catch (tokenError) {
          console.error('Erro ao obter push token:', tokenError)
        }
      } else {
        console.log('Notificações push só funcionam em dispositivos físicos')
      }
    } catch (error) {
      console.error('Erro ao registrar para notificações push:', error)
    }

    return token
  }

  const savePushToken = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error } = await supabase
          .from('driver_push_tokens')
          .upsert({
            driver_id: user.id,
            push_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          })

        if (error) {
          console.error('Erro ao salvar push token:', error)
        } else {
          console.log('Push token salvo com sucesso')
        }
      }
    } catch (error) {
      console.error('Erro ao salvar push token:', error)
    }
  }

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Enviar imediatamente
    })
  }

  const clearAllNotifications = async () => {
    await Notifications.dismissAllNotificationsAsync()
  }

  return {
    sendLocalNotification,
    clearAllNotifications,
    registerForPushNotificationsAsync,
  }
} Funções mock para manter compatibilidade
  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    console.log('Notificação local (mock):', title, body)
  }

  const clearAllNotifications = async () => {
    console.log('Limpando notificações (mock)')
  }

  const registerForPushNotificationsAsync = async () => {
    console.log('Registro de push notifications (mock)')
    return null
  }

  return {
    sendLocalNotification,
    clearAllNotifications,
    registerForPushNotificationsAsync,
  }
}