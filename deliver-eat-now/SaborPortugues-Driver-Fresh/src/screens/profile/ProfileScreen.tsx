import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useAuth } from '@/hooks/useAuth'
import { useDriverStats } from '@/hooks/useDeliveries'
import { Card, Button } from '@/components/ui'
import DriverStatistics from '@/components/driver/DriverStatistics'
import { RootStackParamList } from '@/types'

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>()
  const { user, signOut } = useAuth()
  const { stats } = useDriverStats()
  const [showStatistics, setShowStatistics] = useState(false)

  const handleSignOut = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da aplicação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: signOut 
        },
      ]
    )
  }

  const handleViewHistory = () => {
    navigation.navigate('History')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.user_metadata?.name?.charAt(0)?.toUpperCase() || 'D'}
            </Text>
          </View>
          <Text style={styles.name}>
            {user?.user_metadata?.name || 'Driver'}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats Overview */}
        <Card style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Estatísticas Gerais</Text>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => setShowStatistics(true)}
            >
              <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
              <Icon name="arrow-forward" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.totalDeliveries || 0}</Text>
              <Text style={styles.statLabel}>Total de Entregas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(stats?.totalEarnings || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Ganho</Text>
            </View>
          </View>
        </Card>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleViewHistory}>
            <Text style={styles.menuItemText}>📋 Histórico de Entregas</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>⚙️ Configurações</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>❓ Ajuda e Suporte</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <Button
            title="Sair"
            variant="danger"
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>

      {/* Statistics Modal */}
      <Modal
        visible={showStatistics}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStatistics(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Estatísticas Detalhadas</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowStatistics(false)}
            >
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <DriverStatistics />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsCard: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 4,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  menuSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  signOutSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
})