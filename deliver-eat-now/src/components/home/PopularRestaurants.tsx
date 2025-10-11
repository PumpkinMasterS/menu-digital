
import RestaurantCard from "./RestaurantCard";

const restaurants = [
  {
    name: "Taberna do Real",
    cuisine: "Tradicional Portuguesa",
    rating: 4.8,
    deliveryTime: "25-35 min",
    deliveryFee: "€2.50",
    image: "bg-gradient-to-br from-red-400 to-orange-500",
    isPromoted: true,
  },
  {
    name: "Casa do Bacalhau",
    cuisine: "Especialidade em Bacalhau",
    rating: 4.9,
    deliveryTime: "30-40 min",
    deliveryFee: "€3.00",
    image: "bg-gradient-to-br from-yellow-400 to-orange-500",
  },
  {
    name: "Francesinha do Porto",
    cuisine: "Francesinha & Bifanas",
    rating: 4.7,
    deliveryTime: "20-30 min",
    deliveryFee: "€2.00",
    image: "bg-gradient-to-br from-amber-400 to-yellow-500",
  },
  {
    name: "Pastéis de Belém",
    cuisine: "Pastelaria Tradicional",
    rating: 4.6,
    deliveryTime: "15-25 min",
    deliveryFee: "€1.50",
    image: "bg-gradient-to-br from-yellow-300 to-amber-400",
  },
  {
    name: "Quinta Saudável",
    cuisine: "Comida Saudável • Planos Semanais",
    rating: 4.9,
    deliveryTime: "Entrega diária",
    deliveryFee: "Incluído",
    image: "bg-gradient-to-br from-emerald-400 to-teal-500",
    isPromoted: true,
  },
  {
    name: "Marisqueira do Cais",
    cuisine: "Mariscos & Peixes Frescos",
    rating: 4.5,
    deliveryTime: "35-45 min",
    deliveryFee: "€3.50",
    image: "bg-gradient-to-br from-blue-400 to-cyan-500",
  },
];

const PopularRestaurants = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Restaurantes Populares
            </h2>
            <p className="text-gray-600">Os sabores mais pedidos na tua área</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((restaurant, index) => (
            <RestaurantCard key={index} {...restaurant} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularRestaurants;
