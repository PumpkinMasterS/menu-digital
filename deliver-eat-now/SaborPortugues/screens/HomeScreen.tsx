import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Header from '../src/components/Header';
import RestaurantBanner from '../src/components/RestaurantBanner';
import DishCarousel from '../src/components/DishCarousel';
import { dishes } from '../src/data/dishes';

const HomeScreen = () => {
  return (
    <>
      <Header address="Rua das Flores, 123, Lisboa" cartItemCount={3} />
      <ScrollView style={styles.container}>
        <RestaurantBanner
          name="Casa do Bacalhau"
          category="Comida Tradicional Portuguesa"
          imageUrl="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop"
        />
        <DishCarousel title="Pratos da Casa" dishes={dishes.slice(0, 4)} />
        <DishCarousel title="Mais Pedidos" dishes={dishes.slice(2, 6)} />
        <DishCarousel title="Especialidades" dishes={dishes} />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default HomeScreen; 