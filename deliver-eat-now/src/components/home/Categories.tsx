
import { Button } from "@/components/ui/button";
import { Fish, Coffee, UtensilsCrossed, Beef, Pizza, IceCream } from "lucide-react";

const categories = [
  { name: "Pratos Tradicionais", icon: UtensilsCrossed, color: "bg-orange-100 text-orange-600" },
  { name: "Peixes & Mariscos", icon: Fish, color: "bg-blue-100 text-blue-600" },
  { name: "Carnes & Grelhados", icon: Beef, color: "bg-red-100 text-red-600" },
  { name: "Café & Pastelaria", icon: Coffee, color: "bg-amber-100 text-amber-600" },
  { name: "Pizza & Italiana", icon: Pizza, color: "bg-green-100 text-green-600" },
  { name: "Sobremesas", icon: IceCream, color: "bg-pink-100 text-pink-600" },
];

const Categories = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Explora por Categoria
          </h2>
          <p className="text-lg text-gray-600">
            Da tradição portuguesa aos sabores internacionais
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                className="flex flex-col items-center p-6 h-auto hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-16 h-16 rounded-2xl ${category.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-8 w-8" />
                </div>
                <span className="text-sm font-medium text-gray-900 text-center leading-tight">
                  {category.name}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
