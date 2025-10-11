import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface RestaurantBannerProps {
  name: string;
  category: string;
  imageUrl: string;
}

const RestaurantBanner: React.FC<RestaurantBannerProps> = ({ name, category, imageUrl }) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.category}>{category}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  info: {
    flexShrink: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  category: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
});

export default RestaurantBanner; 