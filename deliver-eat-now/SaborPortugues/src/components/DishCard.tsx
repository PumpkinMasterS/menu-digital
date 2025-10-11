import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

interface DishCardProps {
  name: string;
  price: number;
  imageUrl: string;
}

const DishCard: React.FC<DishCardProps> = ({ name, price, imageUrl }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.price}>{price.toFixed(2)}€</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 16,
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  price: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
});

export default DishCard; 