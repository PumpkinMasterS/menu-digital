
import { Button } from "@/components/ui/button";
import { Star, Clock, Truck } from "lucide-react";

interface RestaurantCardProps {
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  image: string;
  isPromoted?: boolean;
}

const RestaurantCard = ({ 
  name, 
  cuisine, 
  rating, 
  deliveryTime, 
  deliveryFee, 
  image, 
  isPromoted = false 
}: RestaurantCardProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      {isPromoted && (
        <div className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 inline-block">
          PROMOÇÃO
        </div>
      )}
      
      <div className="relative">
        <div className={`w-full h-48 ${image} rounded-t-2xl`}></div>
        <div className="absolute top-4 right-4 bg-white rounded-full px-2 py-1 text-xs font-medium flex items-center space-x-1">
          <Star className="h-3 w-3 text-yellow-500 fill-current" />
          <span>{rating}</span>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-1">{name}</h3>
        <p className="text-gray-600 text-sm mb-4">{cuisine}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{deliveryTime}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Truck className="h-4 w-4" />
            <span>{deliveryFee}</span>
          </div>
        </div>
        
        <Button className="w-full bg-emerald-500 hover:bg-emerald-600 group-hover:bg-emerald-600">
          Ver Menu
        </Button>
      </div>
    </div>
  );
};

export default RestaurantCard;
