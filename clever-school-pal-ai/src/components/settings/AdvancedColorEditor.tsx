import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Wand2, 
  Copy, 
  RefreshCw,
  Save,
  Sparkles,
  Eye,
  Download,
  Upload as UploadIcon
} from 'lucide-react';

interface ColorPalette {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  category: 'education' | 'modern' | 'classic' | 'vibrant';
}

interface AdvancedColorEditorProps {
  currentColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  onColorsChange: (colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  }) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
}

const predefinedPalettes: ColorPalette[] = [
  {
    name: 'Azul Educacional',
    description: 'Paleta clássica para instituições de ensino',
    category: 'education',
    colors: {
      primary: '#2563eb',
      secondary: '#1d4ed8',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  {
    name: 'Verde Natureza',
    description: 'Inspirada na natureza e sustentabilidade',
    category: 'education',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#f97316',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  {
    name: 'Roxo Moderno',
    description: 'Paleta moderna e sofisticada',
    category: 'modern',
    colors: {
      primary: '#7c3aed',
      secondary: '#6d28d9',
      accent: '#ec4899',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  {
    name: 'Laranja Energia',
    description: 'Cores vibrantes e energéticas',
    category: 'vibrant',
    colors: {
      primary: '#ea580c',
      secondary: '#dc2626',
      accent: '#eab308',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  {
    name: 'Cinza Elegante',
    description: 'Paleta neutra e profissional',
    category: 'classic',
    colors: {
      primary: '#374151',
      secondary: '#1f2937',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#111827'
    }
  },
  {
    name: 'Teal Oceano',
    description: 'Inspirada nas cores do oceano',
    category: 'modern',
    colors: {
      primary: '#0d9488',
      secondary: '#0f766e',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    }
  }
];

export const AdvancedColorEditor: React.FC<AdvancedColorEditorProps> = ({
  currentColors,
  onColorsChange,
  onSave,
  isSaving = false
}) => {
  const [tempColors, setTempColors] = useState(currentColors);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Atualizar cores temporárias quando as cores atuais mudam
  useEffect(() => {
    setTempColors(currentColors);
  }, [currentColors]);

  // Aplicar cores temporárias em tempo real
  useEffect(() => {
    onColorsChange(tempColors);
  }, [tempColors, onColorsChange]);

  // Gerar paleta automática baseada na cor primária
  const generatePalette = (baseColor: string) => {
    setIsGenerating(true);
    
    // Simular processamento (em produção, usaria uma biblioteca como chroma.js)
    setTimeout(() => {
      const hsl = hexToHsl(baseColor);
      
      const newColors = {
        primary: baseColor,
        secondary: hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 0.1, 0.1)),
        accent: hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
        background: '#ffffff',
        text: hsl.l > 0.5 ? '#1f2937' : '#f9fafb'
      };
      
      setTempColors(newColors);
      setIsGenerating(false);
    }, 1000);
  };

  // Aplicar paleta pré-definida
  const applyPalette = (palette: ColorPalette) => {
    setTempColors(palette.colors);
  };

  // Resetar para cores padrão
  const resetColors = () => {
    const defaultColors = {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    };
    setTempColors(defaultColors);
  };

  // Copiar cor para clipboard
  const copyColor = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
    } catch (err) {
      console.error('Erro ao copiar cor:', err);
    }
  };

  // Exportar paleta
  const exportPalette = () => {
    const paletteData = {
      name: 'Minha Paleta Personalizada',
      colors: tempColors,
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(paletteData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paleta-cores.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtrar paletas por categoria
  const filteredPalettes = selectedCategory === 'all' 
    ? predefinedPalettes 
    : predefinedPalettes.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor Manual</TabsTrigger>
          <TabsTrigger value="palettes">Paletas Prontas</TabsTrigger>
          <TabsTrigger value="generator">Gerador IA</TabsTrigger>
        </TabsList>

        {/* Editor Manual */}
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Editor de Cores Manual
              </CardTitle>
              <CardDescription>
                Ajuste cada cor individualmente com precisão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Cores Principais</h4>
                  
                  <ColorInput
                    label="Cor Primária"
                    value={tempColors.primary}
                    onChange={(value) => setTempColors(prev => ({ ...prev, primary: value }))}
                    onCopy={() => copyColor(tempColors.primary)}
                  />

                  <ColorInput
                    label="Cor Secundária"
                    value={tempColors.secondary}
                    onChange={(value) => setTempColors(prev => ({ ...prev, secondary: value }))}
                    onCopy={() => copyColor(tempColors.secondary)}
                  />

                  <ColorInput
                    label="Cor de Destaque"
                    value={tempColors.accent}
                    onChange={(value) => setTempColors(prev => ({ ...prev, accent: value }))}
                    onCopy={() => copyColor(tempColors.accent)}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Cores de Fundo</h4>
                  
                  <ColorInput
                    label="Cor de Fundo"
                    value={tempColors.background}
                    onChange={(value) => setTempColors(prev => ({ ...prev, background: value }))}
                    onCopy={() => copyColor(tempColors.background)}
                  />

                  <ColorInput
                    label="Cor do Texto"
                    value={tempColors.text}
                    onChange={(value) => setTempColors(prev => ({ ...prev, text: value }))}
                    onCopy={() => copyColor(tempColors.text)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={onSave}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Cores
                  </Button>
                  
                  <Button variant="outline" onClick={resetColors}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Restaurar Padrão
                  </Button>

                  <Button variant="outline" onClick={exportPalette}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>

                <Badge variant="secondary" className="text-xs">
                  Mudanças aplicadas em tempo real
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paletas Prontas */}
        <TabsContent value="palettes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Paletas Pré-definidas
              </CardTitle>
              <CardDescription>
                Escolha entre paletas profissionais criadas especialmente para educação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  Todas
                </Button>
                <Button
                  variant={selectedCategory === 'education' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('education')}
                >
                  Educacional
                </Button>
                <Button
                  variant={selectedCategory === 'modern' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('modern')}
                >
                  Moderna
                </Button>
                <Button
                  variant={selectedCategory === 'classic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('classic')}
                >
                  Clássica
                </Button>
                <Button
                  variant={selectedCategory === 'vibrant' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('vibrant')}
                >
                  Vibrante
                </Button>
              </div>

              {/* Grid de Paletas */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPalettes.map((palette, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4" onClick={() => applyPalette(palette)}>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium">{palette.name}</h4>
                          <p className="text-xs text-muted-foreground">{palette.description}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {palette.category}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-1">
                          {Object.values(palette.colors).map((color, colorIndex) => (
                            <div
                              key={colorIndex}
                              className="w-8 h-8 rounded border-2 border-white shadow-sm"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gerador IA */}
        <TabsContent value="generator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Gerador Inteligente de Paletas
              </CardTitle>
              <CardDescription>
                Gere paletas harmoniosas automaticamente baseadas em uma cor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Cor Base</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Escolha uma cor como base para gerar a paleta completa
                  </p>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                      style={{ backgroundColor: tempColors.primary }}
                      onClick={() => document.getElementById('base-color')?.click()}
                    />
                    <Input
                      id="base-color"
                      type="color"
                      value={tempColors.primary}
                      onChange={(e) => setTempColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="w-20 h-12 p-1 border-0"
                    />
                    <Input
                      type="text"
                      value={tempColors.primary}
                      onChange={(e) => setTempColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="flex-1 font-mono"
                    />
                    <Button
                      onClick={() => generatePalette(tempColors.primary)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Gerar
                    </Button>
                  </div>
                </div>

                {isGenerating && (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Gerando paleta harmoniosa...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente auxiliar para input de cor
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCopy: () => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange, onCopy }) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
          style={{ backgroundColor: value }}
          onClick={() => document.getElementById(`color-${label}`)?.click()}
        />
        <Input
          id={`color-${label}`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 h-10 p-1 border-0"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Funções auxiliares para conversão de cores
const hexToHsl = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number) => {
  h /= 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 1/3) {
    r = x; g = c; b = 0;
  } else if (1/3 <= h && h < 1/2) {
    r = 0; g = c; b = x;
  } else if (1/2 <= h && h < 2/3) {
    r = 0; g = x; b = c;
  } else if (2/3 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}; 