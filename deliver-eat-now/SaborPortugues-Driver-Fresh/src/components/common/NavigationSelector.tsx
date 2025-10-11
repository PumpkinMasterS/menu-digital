import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { NavigationDestination, navigationService } from '@/services/NavigationService'

interface NavigationSelectorProps {
  visible: boolean
  destination: NavigationDestination | null
  onClose: () => void
}

export default function NavigationSelector({
  visible,
  destination,
  onClose,
}: NavigationSelectorProps) {
  const handleNavigationOption = async (option: 'native' | 'google' | 'waze') => {
    if (!destination) return

    let success = false

    try {
      switch (option) {
        case 'native':
          success = await navigationService.openNativeNavigation(destination)
          break
        case 'google':
          success = await navigationService.openGoogleMaps(destination)
          break
        case 'waze':
          success = await navigationService.openWaze(destination)
          break
      }

      if (success) {
        onClose()
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível abrir o aplicativo de navegação. Verifique se está instalado.'
        )
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao abrir navegação')
    }
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Escolher Navegação</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {destination && (
            <View style={styles.destinationInfo}>
              <Icon name="place" size={20} color="#6B7280" />
              <Text style={styles.destinationText} numberOfLines={2}>
                {destination.address || `${destination.latitude}, ${destination.longitude}`}
              </Text>
            </View>
          )}

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleNavigationOption('native')}
            >
              <View style={styles.optionIcon}>
                <Icon name="navigation" size={24} color="#3B82F6" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Mapas do Sistema</Text>
                <Text style={styles.optionDescription}>
                  Usar o aplicativo de mapas padrão do dispositivo
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleNavigationOption('google')}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#E8F5E8' }]}>
                <Icon name="map" size={24} color="#10B981" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Google Maps</Text>
                <Text style={styles.optionDescription}>
                  Navegação com Google Maps
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleNavigationOption('waze')}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="traffic" size={24} color="#F59E0B" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Waze</Text>
                <Text style={styles.optionDescription}>
                  Navegação com alertas de trânsito
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  destinationText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  options: {
    padding: 20,
    gap: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
})