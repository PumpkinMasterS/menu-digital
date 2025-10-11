import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { uploadToS3, generatePresignedUploadUrl, isS3Configured } from './s3-service.mjs'
import { uploadToCloudinary, isCloudinaryConfigured } from './cloudinary-service.mjs'

// Configuração do multer para upload local (fallback)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads'
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Gerar nome único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const extension = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + extension)
  }
})

// Filtro de arquivos
const fileFilter = (req, file, cb) => {
  // Permitir apenas imagens e vídeos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true)
  } else {
    cb(new Error('Apenas imagens e vídeos são permitidos!'), false)
  }
}

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
    files: 20 // Máximo de 20 arquivos por upload
  }
})

// Middleware de upload inteligente
const smartUpload = upload.array('photos', 20)

// Middleware para processar uploads (S3 ou local)
export async function processUpload(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return next()
    }

    const uploadResults = []
    const useCloudinary = isCloudinaryConfigured()
    const useS3 = isS3Configured() && !useCloudinary // Só usar S3 se Cloudinary não estiver configurado

    for (const file of req.files) {
      let uploadResult

      if (useCloudinary) {
        // Upload para Cloudinary (prioridade máxima)
        const fileBuffer = fs.readFileSync(file.path)
        uploadResult = await uploadToCloudinary(fileBuffer, file.originalname, 'profiles')
        
        // Remover arquivo local após upload
        fs.unlinkSync(file.path)
      } else if (useS3) {
        // Upload para S3
        const fileBuffer = fs.readFileSync(file.path)
        uploadResult = await uploadToS3(fileBuffer, file.originalname, 'profiles')
        
        // Remover arquivo local após upload para S3
        fs.unlinkSync(file.path)
      } else {
        // Usar upload local
        uploadResult = {
          success: true,
          url: `/uploads/${file.filename}`,
          key: file.filename,
          fileName: file.filename,
          originalName: file.originalname
        }
      }

      if (uploadResult.success) {
        uploadResults.push({
          url: uploadResult.url,
          key: uploadResult.key || uploadResult.public_id,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName,
          storage: useCloudinary ? 'cloudinary' : (useS3 ? 's3' : 'local'),
          public_id: uploadResult.public_id // Para Cloudinary
        })
      }
    }

    // Adicionar resultados ao request
    req.uploadResults = uploadResults
    next()

  } catch (error) {
    console.error('Erro no processamento de upload:', error)
    
    // Limpar arquivos em caso de erro
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro no processamento de arquivos',
      message: error.message
    })
  }
}

// Gerar URL assinada para upload direto do frontend
export async function generateUploadUrl(req, res) {
  try {
    const { fileName, folder = 'profiles' } = req.body

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'Nome do arquivo é obrigatório'
      })
    }

    if (!isS3Configured()) {
      return res.status(400).json({
        success: false,
        error: 'Upload direto não configurado. Use upload multipart.'
      })
    }

    const result = await generatePresignedUploadUrl(fileName, folder)

    if (result.success) {
      res.json({
        success: true,
        signedUrl: result.signedUrl,
        publicUrl: result.publicUrl,
        key: result.key
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }

  } catch (error) {
    console.error('Erro ao gerar URL de upload:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}

// Middleware combinado
export const uploadMiddleware = [
  smartUpload,
  processUpload
]

export { smartUpload }
export default uploadMiddleware