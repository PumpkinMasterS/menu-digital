import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import fs from 'fs'

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

// Verificar se o Cloudinary está configurado
export function isCloudinaryConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && 
           process.env.CLOUDINARY_API_KEY && 
           process.env.CLOUDINARY_API_SECRET)
}

// Upload de arquivo para Cloudinary
export async function uploadToCloudinary(fileBuffer, fileName, folder = 'profiles') {
  try {
    if (!isCloudinaryConfigured()) {
      return {
        success: false,
        error: 'Cloudinary não configurado',
        storage: 'local'
      }
    }

    // Converter buffer para stream
    const stream = Readable.from(fileBuffer)
    
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto', // Detecta automaticamente imagem/vídeo
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, height: 1200, crop: 'limit' } // Tamanho máximo
          ]
        },
        (error, result) => {
          if (error) {
            reject({
              success: false,
              error: error.message,
              storage: 'cloudinary'
            })
          } else {
            resolve({
              success: true,
              url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              storage: 'cloudinary'
            })
          }
        }
      )

      stream.pipe(uploadStream)
    })

  } catch (error) {
    return {
      success: false,
      error: error.message,
      storage: 'cloudinary'
    }
  }
}

// Gerar URL otimizada com transformações
export function generateCloudinaryUrl(publicId, transformations = {}) {
  const defaultTransformations = {
    quality: 'auto',
    fetch_format: 'auto'
  }

  return cloudinary.url(publicId, {
    ...defaultTransformations,
    ...transformations
  })
}

// Gerar thumbnail
export function generateThumbnailUrl(publicId, width = 300, height = 300) {
  return cloudinary.url(publicId, {
    width: width,
    height: height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto'
  })
}

// Deletar arquivo do Cloudinary
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return {
      success: result.result === 'ok',
      result: result
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Upload direto de arquivo local (para migração)
export async function uploadLocalFile(filePath, folder = 'profiles') {
  try {
    if (!isCloudinaryConfigured()) {
      return {
        success: false,
        error: 'Cloudinary não configurado'
      }
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto'
    })

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      storage: 'cloudinary'
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Listar recursos no Cloudinary
export async function listCloudinaryResources(folder = 'profiles', maxResults = 100) {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: maxResults
    })

    return {
      success: true,
      resources: result.resources,
      total: result.resources.length
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Verificar uso da conta
export async function getCloudinaryUsage() {
  try {
    const result = await cloudinary.api.usage()
    return {
      success: true,
      usage: result
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

export default cloudinary