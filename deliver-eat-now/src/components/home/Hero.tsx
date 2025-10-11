
import { Button } from "@/components/ui/button";
import { Clock, Star, Truck } from "lucide-react";

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-emerald-50 to-teal-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Sabores tradicionais portugueses,
              <span className="text-emerald-600"> entregues na tua casa</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Descobre os melhores restaurantes de comida tradicional portuguesa. 
              Francesinha, bacalhau, pastéis de nata e muito mais. Entrega garantida em 30 minutos.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8 py-3">
                Pedir Agora
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-3 hover:bg-emerald-50">
                Ver Planos Semanais
              </Button>
            </div>

            <div className="flex items-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span>Entrega em 30min</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-emerald-500" />
                <span>4.8★ (8k avaliações)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-emerald-500" />
                <span>Entrega grátis €15+</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-lg transform rotate-2 hover:rotate-0 transition-transform cursor-pointer group">
                  <div className="w-full h-32 rounded-lg mb-4 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=300&h=200&fit=crop" 
                      alt="Francesinha" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900">Francesinha</h3>
                  <p className="text-emerald-600 font-bold">€8.50</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform cursor-pointer group">
                  <div className="w-full h-32 rounded-lg mb-4 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=200&fit=crop" 
                      alt="Pastéis de Nata" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900">Pastéis de Nata</h3>
                  <p className="text-emerald-600 font-bold">€1.20 cada</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg transform rotate-1 hover:rotate-0 transition-transform cursor-pointer group">
                  <div className="w-full h-32 rounded-lg mb-4 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=300&h=200&fit=crop" 
                      alt="Bacalhau à Brás" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900">Bacalhau à Brás</h3>
                  <p className="text-emerald-600 font-bold">€12.90</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg transform -rotate-2 hover:rotate-0 transition-transform cursor-pointer group">
                  <div className="w-full h-32 rounded-lg mb-4 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=200&fit=crop" 
                      alt="Caldo Verde" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900">Caldo Verde</h3>
                  <p className="text-emerald-600 font-bold">€4.50</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
