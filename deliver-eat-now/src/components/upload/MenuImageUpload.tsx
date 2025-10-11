import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface MenuImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (imageUrl: string) => void
  folder: 'categories' | 'items' | 'modifiers'
  restaurantId: string
}

const MenuImageUpload: React.FC<MenuImageUploadProps> = ({
  currentImageUrl,
  onImageUploaded,
  folder,
  restaurantId
}) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas ficheiros de imagem",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O ficheiro deve ter menos de 5MB",
        variant: "destructive"
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurantId}/${folder}/${Date.now()}.${fileExt}`

      // Create preview URL
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      toast({
        title: "Sucesso",
        description: "Imagem carregada com sucesso"
      })

      onImageUploaded(publicUrl)
      setUploadProgress(100)

    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar a imagem",
        variant: "destructive"
      })
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeImage = () => {
    setPreviewUrl(null)
    onImageUploaded('')
  }

  return (
    <div className="space-y-3">
      <Label>Imagem</Label>
      
      {previewUrl ? (
        <Card className="relative group">
          <CardContent className="p-3">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  size="sm"
                  variant="destructive"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeImage}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="p-6">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Clique para carregar uma imagem ou arraste aqui
              </p>
              <p className="text-xs text-gray-500 mb-4">
                PNG, JPG, JPEG até 5MB
              </p>
              <Button variant="outline" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                Escolher Ficheiro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>A carregar...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`image-upload-${folder}`}
        disabled={uploading}
      />
      <label
        htmlFor={`image-upload-${folder}`}
        className="cursor-pointer"
      >
        {!previewUrl && (
          <div className="absolute inset-0" />
        )}
      </label>
    </div>
  )
}

export default MenuImageUpload 