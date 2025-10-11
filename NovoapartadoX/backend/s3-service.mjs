import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dotenv from 'dotenv'
import crypto from 'crypto'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN

// Gerar nome único para o arquivo
function generateUniqueFileName(originalName) {
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(8).toString('hex')
  const extension = originalName.split('.').pop()
  return `${timestamp}-${randomString}.${extension}`
}

// Upload de arquivo para o S3
export async function uploadToS3(fileBuffer, originalName, folder = 'uploads') {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME não configurado')
    }

    const fileName = generateUniqueFileName(originalName)
    const key = `${folder}/${fileName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(originalName),
      ACL: 'public-read', // Tornar o arquivo público
      Metadata: {
        originalName: originalName,
        uploadedAt: new Date().toISOString()
      }
    })

    await s3Client.send(command)

    // Retornar URL pública
    let publicUrl
    if (CLOUDFRONT_DOMAIN) {
      // Usar CloudFront CDN se configurado
      publicUrl = `https://${CLOUDFRONT_DOMAIN}/${key}`
    } else {
      // URL direta do S3
      publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    }

    return {
      success: true,
      key: key,
      url: publicUrl,
      fileName: fileName,
      originalName: originalName
    }

  } catch (error) {
    console.error('Erro no upload para S3:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Gerar URL assinada para upload direto do frontend
export async function generatePresignedUploadUrl(fileName, folder = 'uploads') {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME não configurado')
    }

    const key = `${folder}/${generateUniqueFileName(fileName)}`
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: getContentType(fileName),
      ACL: 'public-read'
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hora

    return {
      success: true,
      signedUrl: signedUrl,
      key: key,
      publicUrl: CLOUDFRONT_DOMAIN 
        ? `https://${CLOUDFRONT_DOMAIN}/${key}`
        : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    }

  } catch (error) {
    console.error('Erro ao gerar URL assinada:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Deletar arquivo do S3
export async function deleteFromS3(key) {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME não configurado')
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })

    await s3Client.send(command)
    return { success: true }

  } catch (error) {
    console.error('Erro ao deletar do S3:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Gerar URL assinada para download
export async function generatePresignedDownloadUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return { success: true, signedUrl: signedUrl }

  } catch (error) {
    console.error('Erro ao gerar URL de download:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper para determinar content type
function getContentType(fileName) {
  const extension = fileName.toLowerCase().split('.').pop()
  
  const contentTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  return contentTypes[extension] || 'application/octet-stream'
}

// Verificar se o S3 está configurado
export function isS3Configured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.AWS_S3_BUCKET_NAME)
}

export default {
  uploadToS3,
  deleteFromS3,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  isS3Configured
}