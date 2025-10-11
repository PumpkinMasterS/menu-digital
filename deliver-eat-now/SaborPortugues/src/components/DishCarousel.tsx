import React from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import DishCard from './DishCard';

interface Dish {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface DishCarouselProps {
  title: string;
  dishes: Dish[];
}

const DishCarousel: React.FC<DishCarouselProps> = ({ title, dishes }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={dishes}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DishCard name={item.name} price={item.price} imageUrl={item.imageUrl} />
        )}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 16,
    color: '#222',
  },
});

export default DishCarousel; 