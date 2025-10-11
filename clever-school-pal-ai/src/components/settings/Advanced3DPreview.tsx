import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { 
  Monitor, 
  Smartphone, 
  Tablet,
  Eye,
  Settings,
  Users,
  BookOpen,
  BarChart3,
  Home,
  Bell,
  Search,
  Plus
} from 'lucide-react';

interface Advanced3DPreviewProps {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export const Advanced3DPreview: React.FC<Advanced3DPreviewProps> = ({ colors }) => {
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedView, setSelectedView] = useState<'dashboard' | 'sidebar' | 'cards' | 'forms'>('dashboard');

  const deviceSizes = {
    desktop: { width: '100%', height: '600px' },
    tablet: { width: '768px', height: '500px' },
    mobile: { width: '375px', height: '600px' }
  };

  const currentSize = deviceSizes[selectedDevice];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Preview 3D Interativo
        </CardTitle>
        <div className="flex items-center gap-4">
          {/* Seletor de Dispositivo */}
          <div className="flex gap-2">
            <Button
              variant={selectedDevice === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDevice('desktop')}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Desktop
            </Button>
            <Button
              variant={selectedDevice === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDevice('tablet')}
            >
              <Tablet className="w-4 h-4 mr-2" />
              Tablet
            </Button>
            <Button
              variant={selectedDevice === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDevice('mobile')}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Mobile
            </Button>
          </div>

          {/* Seletor de Vista */}
          <div className="flex gap-2">
            <Button
              variant={selectedView === 'dashboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant={selectedView === 'sidebar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('sidebar')}
            >
              Sidebar
            </Button>
            <Button
              variant={selectedView === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('cards')}
            >
              Cards
            </Button>
            <Button
              variant={selectedView === 'forms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('forms')}
            >
              Forms
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <div 
            className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg transition-all duration-300"
            style={{ 
              width: currentSize.width, 
              height: currentSize.height,
              maxWidth: '100%',
              transform: selectedDevice === 'mobile' ? 'scale(0.8)' : 'scale(1)',
              transformOrigin: 'top center'
            }}
          >
            {selectedView === 'dashboard' && (
              <DashboardPreview colors={colors} device={selectedDevice} />
            )}
            {selectedView === 'sidebar' && (
              <SidebarPreview colors={colors} device={selectedDevice} />
            )}
            {selectedView === 'cards' && (
              <CardsPreview colors={colors} device={selectedDevice} />
            )}
            {selectedView === 'forms' && (
              <FormsPreview colors={colors} device={selectedDevice} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente Preview do Dashboard
const DashboardPreview: React.FC<{ colors: any; device: string }> = ({ colors, device }) => (
  <div className="h-full flex" style={{ backgroundColor: colors.background }}>
    {/* Sidebar */}
    <div 
      className={`${device === 'mobile' ? 'w-16' : 'w-64'} h-full flex flex-col`}
      style={{ backgroundColor: colors.primary }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/20">
        <div className="w-8 h-8 rounded bg-white/20 mx-auto"></div>
        {device !== 'mobile' && (
          <h2 className="text-white text-sm font-semibold mt-2 text-center">Connect AI</h2>
        )}
      </div>
      
      {/* Menu Items */}
      <nav className="flex-1 p-2 space-y-1">
        {[
          { icon: Home, label: 'Dashboard', active: true },
          { icon: Users, label: 'Alunos', active: false },
          { icon: BookOpen, label: 'Conteúdos', active: false },
          { icon: BarChart3, label: 'Relatórios', active: false },
          { icon: Settings, label: 'Configurações', active: false }
        ].map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              item.active 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {device !== 'mobile' && (
              <span className="text-sm">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header 
        className="h-16 border-b border-gray-200 flex items-center justify-between px-6"
        style={{ backgroundColor: colors.background, color: colors.text }}
      >
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64"
            />
          </div>
          <Button size="sm" style={{ backgroundColor: colors.accent, color: 'white' }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
          <div className="w-8 h-8 rounded-full bg-gray-300"></div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 space-y-6" style={{ backgroundColor: colors.background }}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Total Alunos', value: '1,234', change: '+12%' },
            { title: 'Conteúdos Ativos', value: '89', change: '+5%' },
            { title: 'Taxa de Sucesso', value: '94%', change: '+2%' }
          ].map((stat, index) => (
            <div key={index} className="bg-card p-4 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold" style={{ color: colors.text }}>
                  {stat.value}
                </span>
                <span 
                  className="text-sm font-medium px-2 py-1 rounded"
                  style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
            Progresso dos Alunos
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2" style={{ color: colors.primary }} />
              <p className="text-sm text-gray-500">Gráfico de Progresso</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
);

// Componente Preview da Sidebar
const SidebarPreview: React.FC<{ colors: any; device: string }> = ({ colors, device: _device }) => (
  <div className="h-full flex">
    <div 
      className="w-80 h-full flex flex-col"
      style={{ backgroundColor: colors.primary }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
                            <h2 className="text-white font-semibold">Connect AI</h2>
            <p className="text-white/70 text-sm">Escola Secundária</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="text-white/50 text-xs font-medium uppercase tracking-wide mb-3">
          Principal
        </div>
        
        {[
          { icon: Home, label: 'Dashboard', active: true, badge: null },
          { icon: Users, label: 'Alunos', active: false, badge: '234' },
          { icon: BookOpen, label: 'Conteúdos', active: false, badge: null },
          { icon: BarChart3, label: 'Relatórios', active: false, badge: null }
        ].map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              item.active 
                ? 'bg-white/20 text-white shadow-lg' 
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ backgroundColor: colors.accent, color: 'white' }}
              >
                {item.badge}
              </Badge>
            )}
          </div>
        ))}

        <div className="text-white/50 text-xs font-medium uppercase tracking-wide mb-3 mt-6">
          Configurações
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configurações</span>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/20">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10">
          <div className="w-8 h-8 rounded-full bg-white/20"></div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Maria Santos</p>
            <p className="text-white/70 text-xs">Diretora</p>
          </div>
          <Bell className="w-4 h-4 text-white/70" />
        </div>
      </div>
    </div>

    {/* Preview Area */}
    <div className="flex-1 bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Eye className="w-16 h-16 mx-auto mb-4" style={{ color: colors.primary }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>
          Preview da Sidebar
        </h3>
        <p className="text-gray-500 text-sm">
          Visualização das cores aplicadas na navegação lateral
        </p>
      </div>
    </div>
  </div>
);

// Componente Preview dos Cards
const CardsPreview: React.FC<{ colors: any; device: string }> = ({ colors, device: _device }) => (
  <div className="h-full p-6 space-y-6" style={{ backgroundColor: colors.background }}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { title: 'Card Principal', type: 'primary' },
        { title: 'Card Secundário', type: 'secondary' },
        { title: 'Card de Destaque', type: 'accent' },
        { title: 'Card Informativo', type: 'info' },
        { title: 'Card de Sucesso', type: 'success' },
        { title: 'Card de Alerta', type: 'warning' }
      ].map((card, index) => (
        <div 
          key={index}
          className="p-6 rounded-lg shadow-sm border-2 transition-all hover:shadow-md"
          style={{
            backgroundColor: card.type === 'primary' ? colors.primary : 
                           card.type === 'secondary' ? colors.secondary :
                           card.type === 'accent' ? colors.accent : 'white',
            borderColor: card.type === 'primary' ? colors.primary : 
                        card.type === 'secondary' ? colors.secondary :
                        card.type === 'accent' ? colors.accent : '#e5e7eb',
            color: ['primary', 'secondary', 'accent'].includes(card.type) ? 'white' : colors.text
          }}
        >
          <h3 className="font-semibold mb-2">{card.title}</h3>
          <p className="text-sm opacity-80">
            Este é um exemplo de como o card ficará com as cores aplicadas.
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs opacity-70">Exemplo</span>
            <div className="w-6 h-6 rounded-full bg-white/20"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Componente Preview dos Forms
const FormsPreview: React.FC<{ colors: any; device: string }> = ({ colors, device: _device }) => (
  <div className="h-full p-6" style={{ backgroundColor: colors.background }}>
    <div className="max-w-2xl mx-auto">
      <div className="bg-card p-8 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>
          Formulário de Exemplo
        </h2>
        
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Nome Completo
            </label>
            <input 
              type="text" 
              className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                borderColor: '#e5e7eb'
              }}
              placeholder="Digite seu nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Email
            </label>
            <input 
              type="email" 
              className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                borderColor: '#e5e7eb'
              }}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Tipo de Usuário
            </label>
            <select 
              className="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                borderColor: '#e5e7eb'
              }}
            >
              <option>Selecione uma opção</option>
              <option>Diretor</option>
              <option>Coordenador</option>
              <option>Professor</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Button 
              type="button"
              className="flex-1"
              style={{ 
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none'
              }}
            >
              Salvar
            </Button>
            <Button 
              type="button"
              variant="outline"
              className="flex-1"
              style={{ 
                borderColor: colors.secondary,
                color: colors.secondary
              }}
            >
              Cancelar
            </Button>
          </div>

          <div className="text-center">
            <Button 
              type="button"
              variant="ghost"
              size="sm"
              style={{ color: colors.accent }}
            >
              Precisa de ajuda?
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
);