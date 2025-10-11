import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

type VehicleType = 'bicycle' | 'motorcycle' | 'car'

interface VehicleTypeSelectorProps {
  selectedType: VehicleType
  onSelect: (type: VehicleType) => void
}

const vehicleOptions = [
  {
    type: 'bicycle' as VehicleType,
    title: 'Bicicleta',
    description: 'Ideal para entregas rápidas na cidade',
    icon: 'pedal-bike',
    color: '#10B981'
  },
  {
    type: 'motorcycle' as VehicleType,
    title: 'Mota',
    description: 'Perfeita para distâncias médias',
    icon: 'motorcycle',
    color: '#F59E0B'
  },
  {
    type: 'car' as VehicleType,
    title: 'Carro',
    description: 'Para entregas maiores e longas distâncias',
    icon: 'directions-car',
    color: '#3B82F6'
  }
]

export default function VehicleTypeSelector({
  selectedType,
  onSelect
}: VehicleTypeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tipo de Veículo *</Text>
      <View style={styles.optionsContainer}>
        {vehicleOptions.map((option) => {
          const isSelected = selectedType === option.type
          
          return (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                { borderColor: isSelected ? option.color : '#E5E7EB' }
              ]}
              onPress={() => onSelect(option.type)}
            >
              <View style={[
                styles.iconContainer,
                { backgroundColor: isSelected ? option.color : '#F3F4F6' }
              ]}>
                <Icon 
                  name={option.icon} 
                  size={24} 
                  color={isSelected ? '#FFFFFF' : '#6B7280'} 
                />
              </View>
              
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionTitle,
                  isSelected && { color: option.color }
                ]}>
                  {option.title}
                </Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </View>
              
              {isSelected && (
                <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                  <Icon name="check" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  optionSelected: {
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
})