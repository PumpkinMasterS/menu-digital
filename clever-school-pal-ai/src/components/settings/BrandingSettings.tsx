import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Upload, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Wand2,
  Monitor
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { AdvancedImageUpload } from './AdvancedImageUpload';
import { AdvancedColorEditor } from './AdvancedColorEditor';
import { Advanced3DPreview } from './Advanced3DPreview';

export const BrandingSettings: React.FC = () => {
  const { user } = useUnifiedAuth();
  const {
    branding,
    loading,
    error,
    updateBranding,
    uploadLogo,
    removeLogo,
    getCurrentColors
  } = useBranding();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('logos');
  const [isUploading, setIsUploading] = useState(false);
  const [tempColors, setTempColors] = useState(getCurrentColors());

  // Verificar se o usuário é diretor
  if (user?.role !== 'diretor') {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Apenas diretores podem gerenciar as configurações de branding da escola.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações de branding...</p>
        </CardContent>
      </Card>
    );
  }

  const handleUploadSuccess = (type: string) => {
    setMessage({ 
      type: 'success', 
      text: `${type} atualizado com sucesso!` 
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUploadError = (error: string) => {
    setMessage({ 
      type: 'error', 
      text: error 
    });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleLogoUpload = async (file: File) => {
    try {
      await uploadLogo(file);
      handleUploadSuccess('Logo');
    } catch (error) {
      handleUploadError(error instanceof Error ? error.message : 'Erro no upload do logo');
    }
  };

  const handleLogoRemove = async () => {
    try {
      await removeLogo();
      handleUploadSuccess('Logo removido');
    } catch (error) {
      handleUploadError(error instanceof Error ? error.message : 'Erro ao remover logo');
    }
  };

  const handleSaveColors = async () => {
    try {
      await updateBranding({
        primary_color: tempColors.primary,
        secondary_color: tempColors.secondary,
        accent_color: tempColors.accent,
        background_color: tempColors.background,
        text_color: tempColors.text
      });
      handleUploadSuccess('Cores salvas');
    } catch (error) {
      handleUploadError(error instanceof Error ? error.message : 'Erro ao salvar cores');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            Sistema de Branding Avançado
          </h2>
          <p className="text-muted-foreground mt-1">
            Personalize completamente a identidade visual da sua escola
          </p>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          Nível Enterprise
        </Badge>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logos" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Logos
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview 3D
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Avançado
          </TabsTrigger>
        </TabsList>

        {/* Tab: Logos */}
        <TabsContent value="logos" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <AdvancedImageUpload
              type="logo"
              title="Logo da Escola"
              description="Logo principal que aparece na sidebar e cabeçalhos"
              recommendedSize="400x120px (máx. 5MB)"
              currentUrl={branding?.logo_url || undefined}
              onUpload={handleLogoUpload}
              onRemove={handleLogoRemove}
              isUploading={isUploading}
              maxSize={5}
            />
          </div>

          {/* Logo Preview */}
          {branding?.logo_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Preview do Logo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Sidebar Preview */}
                  <div>
                    <h4 className="font-medium mb-3">Na Sidebar</h4>
                    <div 
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: tempColors.primary }}
                    >
                      <img 
                        src={branding.logo_url} 
                        alt="Logo na sidebar"
                        className="h-8 object-contain"
                      />
                    </div>
                  </div>

                  {/* Header Preview */}
                  <div>
                    <h4 className="font-medium mb-3">No Cabeçalho</h4>
                    <div className="border rounded-lg p-4 bg-card">
                      <img 
                        src={branding.logo_url} 
                        alt="Logo no cabeçalho"
                        className="h-10 object-contain"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Cores */}
        <TabsContent value="colors" className="space-y-6">
          <AdvancedColorEditor
            currentColors={tempColors}
            onColorsChange={(newColors) => setTempColors(newColors)}
            onSave={handleSaveColors}
            isSaving={isUploading}
          />
        </TabsContent>

        {/* Tab: Preview 3D */}
        <TabsContent value="preview" className="space-y-6">
          <Advanced3DPreview
            colors={tempColors}
          />
        </TabsContent>

        {/* Tab: Avançado */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Funcionalidades Avançadas
              </CardTitle>
              <CardDescription>
                Recursos adicionais para personalização completa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Templates */}
              <div>
                <h4 className="font-medium mb-3">Templates de Branding</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'Educacional Clássico', colors: ['#2563eb', '#1d4ed8', '#f59e0b'] },
                    { name: 'Moderno Tech', colors: ['#7c3aed', '#6d28d9', '#ec4899'] },
                    { name: 'Natureza Verde', colors: ['#059669', '#047857', '#f97316'] }
                  ].map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <h5 className="font-medium mb-2">{template.name}</h5>
                        <div className="flex gap-1 mb-3">
                          {template.colors.map((color, colorIndex) => (
                            <div
                              key={colorIndex}
                              className="w-6 h-6 rounded border-2 border-white shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <Button size="sm" variant="outline" className="w-full">
                          Aplicar Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Exportar/Importar */}
              <div>
                <h4 className="font-medium mb-3">Backup e Restauração</h4>
                <div className="flex gap-4">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Exportar Configurações
                  </Button>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Importar Configurações
                  </Button>
                </div>
              </div>

              {/* Histórico */}
              <div>
                <h4 className="font-medium mb-3">Histórico de Mudanças</h4>
                <div className="space-y-2">
                  {[
                    { action: 'Logo atualizado', date: '2024-01-15 10:30', user: 'Maria Santos' },
                    { action: 'Cores alteradas', date: '2024-01-14 15:45', user: 'Maria Santos' },
                    { action: 'Favicon adicionado', date: '2024-01-13 09:15', user: 'Maria Santos' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.action}</p>
                        <p className="text-sm text-muted-foreground">por {item.user}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};