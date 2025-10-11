import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  padding?: 'none' | 'small' | 'medium' | 'large'
  shadow?: boolean
}

export function Card({ 
  children, 
  style, 
  padding = 'medium',
  shadow = true 
}: CardProps) {
  const cardStyle = [
    styles.base,
    shadow && styles.shadow,
    styles[padding],
    style,
  ]

  return (
    <View style={cardStyle}>
      {children}
    </View>
  )
}

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const getVariantFromStatus = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'info'
      case 'picked_up':
        return 'warning'
      case 'in_transit':
        return 'warning'
      case 'delivered':
        return 'success'
      case 'cancelled':
        return 'danger'
      default:
        return 'default'
    }
  }

  const badgeVariant = variant === 'default' ? getVariantFromStatus(status) : variant

  return (
    <View style={[styles.badge, styles[`badge${badgeVariant.charAt(0).toUpperCase() + badgeVariant.slice(1)}`]]}>
      <Text style={[styles.badgeText, styles[`badge${badgeVariant.charAt(0).toUpperCase() + badgeVariant.slice(1)}Text`]]}>
        {status.replace('_', ' ').toUpperCase()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  // Padding variants
  none: {
    padding: 0,
  },
  small: {
    padding: 8,
  },
  medium: {
    padding: 16,
  },
  large: {
    padding: 24,
  },
  
  // Badge styles
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeDefault: {
    backgroundColor: '#F3F4F6',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  badgeInfo: {
    backgroundColor: '#DBEAFE',
  },
  
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeDefaultText: {
    color: '#6B7280',
  },
  badgeSuccessText: {
    color: '#065F46',
  },
  badgeWarningText: {
    color: '#92400E',
  },
  badgeDangerText: {
    color: '#991B1B',
  },
  badgeInfoText: {
    color: '#1E40AF',
  },
})