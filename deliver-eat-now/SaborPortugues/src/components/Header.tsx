import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface HeaderProps {
  address: string;
  cartItemCount: number;
}

const Header: React.FC<HeaderProps> = ({ address, cartItemCount }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Icon name="location-outline" size={24} color="#FF6347" />
        <Text style={styles.address} numberOfLines={1}>{address}</Text>
        <TouchableOpacity style={styles.cartContainer}>
          <Icon name="bag-outline" size={24} color="#333" />
          {cartItemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  address: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  cartContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: '#FF6347',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Header; 