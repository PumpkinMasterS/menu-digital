import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShoppingBag, User, Search, MapPin, LogOut, ShoppingCart, Crown, CreditCard, Smartphone, ChefHat, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Link } from "react-router-dom";

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const { getTotalItems } = useCart();

  const getDashboardLink = () => {
    switch (profile?.role) {
      case 'platform_owner':
        return '/platform-owner';
      case 'restaurant_admin':
        return '/restaurant-admin';
      case 'driver':
        return '/driver';
      case 'customer':
        return '/customer';
      case 'super_admin':
        return '/admin';
      default:
        return '/customer';
    }
  };

  const getDashboardLabel = () => {
    switch (profile?.role) {
      case 'platform_owner':
        return 'Painel Platform Owner';
      case 'restaurant_admin':
        return 'Dashboard Restaurante';
      case 'driver':
        return 'Dashboard Motorista';
      case 'customer':
        return 'Minha Conta';
      case 'super_admin':
        return 'Painel Admin';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link 
              to={profile?.role === 'platform_owner' ? '/platform-owner' : "/"} 
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <h1 className="text-2xl font-bold text-emerald-600">SaborPortuguês</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Lisboa, Portugal</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input 
                type="text" 
                placeholder="Procurar restaurantes, francesinha, bacalhau..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Restaurant Registration Link */}
            {!user || profile?.role === 'customer' ? (
              <Link to="/register-restaurant">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-emerald-700 hover:bg-emerald-50">
                  <ChefHat className="h-4 w-4" />
                  <span className="hidden lg:block">Registar Restaurante</span>
                </Button>
              </Link>
            ) : null}

            <Link to="/subscriptions">
              <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="hidden sm:block">Subscrições</span>
              </Button>
            </Link>
            
            <Link to="/help">
              <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                <span className="hidden lg:block">Ajuda</span>
              </Button>
            </Link>
            
            {/* Carrinho - só aparece se o usuário estiver logado */}
            {user && (
              getTotalItems() > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative">
                      <ShoppingCart className="h-5 w-5" />
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {getTotalItems()}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">Carrinho de Compras</p>
                      <p className="text-xs text-gray-600">{getTotalItems()} item(s)</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/checkout-mbway" className="flex items-center space-x-2 w-full">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <span>Checkout MB WAY</span>
                        <Badge variant="secondary" className="ml-auto text-xs">🇵🇹</Badge>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/checkout" className="flex items-center space-x-2 w-full">
                        <CreditCard className="h-4 w-4 text-gray-600" />
                        <span>Checkout Stripe</span>
                        <Badge variant="outline" className="ml-auto text-xs">Backup</Badge>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" className="relative" disabled>
                  <ShoppingCart className="h-5 w-5" />
                </Button>
              )
            )}
            
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Olá, {profile?.full_name || user.email}
                </span>
                <Link to={getDashboardLink()}>
                  <Button variant="outline" size="sm">
                    {getDashboardLabel()}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={async () => {
                  try {
                    await signOut()
                  } catch (error) {
                    console.error('Logout failed:', error)
                  }
                }}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                  Entrar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
