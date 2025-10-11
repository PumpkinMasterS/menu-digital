import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Palette, 
  Layout, 
  Type, 
  Zap, 
  Sparkles, 
  Monitor,
  Smartphone,
  Tablet,
  ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function StyleGuide() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              Design System 2025
            </h1>
            <p className="text-slate-600 mt-2">Guia de estilo moderno para dashboards unificados</p>
          </div>
        </div>

        {/* Color Palette */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-600" />
              Paleta de Cores 2025
            </CardTitle>
            <CardDescription>
              Sistema de cores moderno com gradientes e transparências
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Colors */}
            <div>
              <h3 className="font-semibold mb-3 text-slate-700">Cores Primárias</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg"></div>
                  <p className="text-sm font-medium">Primary Blue</p>
                  <code className="text-xs text-slate-500">from-blue-600 to-indigo-600</code>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg"></div>
                  <p className="text-sm font-medium">Success Green</p>
                  <code className="text-xs text-slate-500">from-emerald-500 to-teal-600</code>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg"></div>
                  <p className="text-sm font-medium">Warning Orange</p>
                  <code className="text-xs text-slate-500">from-orange-500 to-red-500</code>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg"></div>
                  <p className="text-sm font-medium">Neutral Dark</p>
                  <code className="text-xs text-slate-500">from-slate-700 to-slate-900</code>
                </div>
              </div>
            </div>

            {/* Background Colors */}
            <div>
              <h3 className="font-semibold mb-3 text-slate-700">Backgrounds</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="h-16 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl border border-slate-200/60"></div>
                  <p className="text-sm font-medium">Main Background</p>
                  <code className="text-xs text-slate-500">from-slate-50 via-blue-50 to-indigo-50</code>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-lg"></div>
                  <p className="text-sm font-medium">Card Background</p>
                  <code className="text-xs text-slate-500">bg-white/80 backdrop-blur-sm</code>
                </div>
                <div className="space-y-2">
                  <div className="h-16 bg-gradient-to-r from-white/60 to-slate-50/80 rounded-xl border border-slate-200/40"></div>
                  <p className="text-sm font-medium">Secondary Card</p>
                  <code className="text-xs text-slate-500">from-white/60 to-slate-50/80</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-indigo-600" />
              Tipografia
            </CardTitle>
            <CardDescription>
              Hierarquia tipográfica moderna e legível
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Heading 1 - Dashboard Title
                </h1>
                <code className="text-xs text-slate-500">text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent</code>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-800">
                  Heading 2 - Section Title
                </h2>
                <code className="text-xs text-slate-500">text-2xl font-semibold text-slate-800</code>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-700">
                  Heading 3 - Card Title
                </h3>
                <code className="text-xs text-slate-500">text-lg font-medium text-slate-700</code>
              </div>
              <div>
                <p className="text-slate-600">
                  Body text - Descrições e conteúdo geral
                </p>
                <code className="text-xs text-slate-500">text-slate-600</code>
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  Small text - Metadados e informações secundárias
                </p>
                <code className="text-xs text-slate-500">text-sm text-slate-500</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Components */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-emerald-600" />
              Componentes
            </CardTitle>
            <CardDescription>
              Elementos de interface padronizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Buttons */}
            <div>
              <h3 className="font-semibold mb-3 text-slate-700">Botões</h3>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                  Primary Button
                </Button>
                <Button variant="outline" className="bg-white/80 backdrop-blur-sm border-slate-200/60 hover:bg-slate-50">
                  Secondary Button
                </Button>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg">
                  Success Button
                </Button>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg">
                  Warning Button
                </Button>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h3 className="font-semibold mb-3 text-slate-700">Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700">Standard Card</CardTitle>
                    <CardDescription>Card padrão com backdrop blur</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">Conteúdo do card com transparência e blur.</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border-blue-200/60 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-blue-800">Gradient Card</CardTitle>
                    <CardDescription className="text-blue-600">Card com gradiente colorido</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-700">Card especial para destacar informações importantes.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="font-semibold mb-3 text-slate-700">Badges</h3>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
                  Ativo
                </Badge>
                <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50/80">
                  Pendente
                </Badge>
                <Badge className="bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg">
                  Inativo
                </Badge>
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                  Novo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Principles */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Princípios de Layout
            </CardTitle>
            <CardDescription>
              Diretrizes para layouts modernos e responsivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-slate-700">Espaçamento</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Containers: <code>max-w-7xl mx-auto p-6</code></li>
                  <li>• Seções: <code>space-y-6</code> ou <code>space-y-8</code></li>
                  <li>• Cards: <code>gap-4</code> ou <code>gap-6</code></li>
                  <li>• Elementos: <code>space-y-2</code> ou <code>space-y-4</code></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-700">Responsividade</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Grid: <code>grid-cols-1 md:grid-cols-2 lg:grid-cols-3</code></li>
                  <li>• Stats: <code>grid-cols-1 md:grid-cols-2 lg:grid-cols-5</code></li>
                  <li>• Flex: <code>flex-col md:flex-row</code></li>
                  <li>• Gaps: <code>gap-4 md:gap-6</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modern Effects */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Efeitos Modernos 2025
            </CardTitle>
            <CardDescription>
              Efeitos visuais para uma experiência premium
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-slate-700">Glassmorphism</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Background: <code>bg-white/80 backdrop-blur-sm</code></li>
                  <li>• Borders: <code>border-slate-200/60</code></li>
                  <li>• Shadows: <code>shadow-xl</code></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-700">Transições</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Hover: <code>hover:shadow-2xl transition-all duration-300</code></li>
                  <li>• Transform: <code>hover:scale-105</code></li>
                  <li>• Loading: <code>animate-spin</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Compatibility */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-green-600" />
              Compatibilidade
            </CardTitle>
            <CardDescription>
              Otimizado para todos os dispositivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Monitor className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold text-slate-700">Desktop</h3>
                <p className="text-sm text-slate-600">Layout completo com sidebar</p>
              </div>
              <div className="text-center">
                <Tablet className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold text-slate-700">Tablet</h3>
                <p className="text-sm text-slate-600">Grid adaptativo</p>
              </div>
              <div className="text-center">
                <Smartphone className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <h3 className="font-semibold text-slate-700">Mobile</h3>
                <p className="text-sm text-slate-600">Stack vertical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}