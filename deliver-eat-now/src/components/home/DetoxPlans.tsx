
import { Button } from "@/components/ui/button";
import { Check, Leaf, Calendar, Users } from "lucide-react";

const plans = [
  {
    name: "Tradicional Semanal",
    price: "€79",
    period: "/semana",
    meals: "14 refeições",
    description: "Comida tradicional portuguesa para 7 dias",
    features: [
      "2 refeições por dia",
      "Pratos tradicionais variados",
      "Entrega diária incluída",
      "Ingredientes frescos",
      "Apoio nutricional"
    ],
    color: "from-orange-400 to-red-500",
    popular: false,
  },
  {
    name: "Saudável Mensal",
    price: "€249",
    period: "/mês",
    meals: "60 refeições",
    description: "Plano equilibrado com comida portuguesa saudável",
    features: [
      "2 refeições por dia",
      "Baixo teor de gordura",
      "Entrega diária incluída",
      "Plano personalizado",
      "Consulta nutricional",
      "App de acompanhamento"
    ],
    color: "from-green-400 to-emerald-500",
    popular: true,
  },
  {
    name: "Família Portuguesa",
    price: "€159",
    period: "/semana",
    meals: "28 refeições",
    description: "Perfeito para famílias que amam comida portuguesa",
    features: [
      "4 refeições por dia",
      "Porções familiares",
      "Entrega diária incluída",
      "Pratos tradicionais",
      "Flexibilidade de pausar"
    ],
    color: "from-yellow-400 to-orange-500",
    popular: false,
  },
];

const DetoxPlans = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Leaf className="h-6 w-6 text-emerald-500" />
            <span className="text-emerald-600 font-medium">PLANOS SEMANAIS</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Comida portuguesa todos os dias na tua mesa
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Escolhe o plano perfeito para saborear o melhor da gastronomia portuguesa. 
            Refeições preparadas com carinho, entregues fresquinhas na tua porta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-white rounded-3xl shadow-lg border-2 ${plan.popular ? 'border-emerald-500 transform scale-105' : 'border-gray-100'} overflow-hidden`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    MAIS POPULAR
                  </div>
                </div>
              )}
              
              <div className={`h-24 bg-gradient-to-r ${plan.color}`}></div>
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
                
                <div className="flex items-center space-x-4 mb-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{plan.meals}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>Entrega diária</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${plan.popular ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-900 hover:bg-gray-800'} text-white py-3`}
                  size="lg"
                >
                  Começar Plano
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Não tens a certeza? Experimenta primeiro com um plano semanal
          </p>
          <Button variant="outline" size="lg" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
            Ver Todos os Planos
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DetoxPlans;
