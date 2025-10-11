import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export interface NotificationData {
  orderId?: string
  type: 'new_delivery' | 'delivery_update' | 'general'
  title: string
  body: string
}

class NotificationService {
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    return finalStatus === 'granted'
  }

  async getExpoPushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        return null
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      })

      return token.data
    } catch (error) {
      console.error('Error getting push token:', error)
      return null
    }
  }

  async scheduleLocalNotification(data: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data,
        },
        trigger: null, // Show immediately
      })
    } catch (error) {
      console.error('Error scheduling notification:', error)
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
    } catch (error) {
      console.error('Error canceling notifications:', error)
    }
  }

  // Set up notification listeners
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener)
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener)
  }

  // Configure notification categories (for iOS)
  async configureNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('delivery', [
        {
          identifier: 'accept',
          buttonTitle: 'Aceitar',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'decline',
          buttonTitle: 'Recusar',
          options: {
            opensAppToForeground: false,
          },
        },
      ])
    }
  }
}

export default new NotificationService()