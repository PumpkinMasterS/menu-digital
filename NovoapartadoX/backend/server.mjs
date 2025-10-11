import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { createServer } from 'http'
import { Server } from 'socket.io'
import MultiProjectMongoDBManager from './mongodb-manager.js'
import NotificationService from './services/notificationService.js'
import { uploadMiddleware, generateUploadUrl, smartUpload, processUpload } from './upload-middleware.mjs'
import { 
  loginRateLimit, 
  loginValidators, 
  registerValidators,
  validateInput,
  generateTokens,
  verifyToken,
  authMiddleware,
  hashPassword,
  verifyPassword,
  sanitizeUser,
  securityLogger
} from './auth-security.js'
import {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  corsOptions,
  helmetConfig,
  mongoSanitizeConfig,
  hppConfig,
  validateContentType,
  customSecurityHeaders,
  ipValidation
} from './middleware/security.js'
import { initCache, cache, cacheMiddleware, cacheUtils } from './utils/cache.js'
import { 
  compressionConfig, 
  smartCompressionMiddleware, 
  apiCompressionMiddleware,
  imageOptimizationMiddleware 
} from './middleware/compression.js'
import analytics from './utils/analytics.js'
import { setupSwagger } from './swagger.js'

dotenv.config()

// Captura de erros de processo para evitar crash com eventos não tratados (ex: Busboy/Multer)
process.on('uncaughtException', (err) => {
  if (err && /Unexpected end of form/i.test(String(err.message || ''))) {
    console.error('Erro multipart não fatal:', err.message)
    return
  }
  console.error('Uncaught exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

// Inicializar gerenciador de múltiplos projetos MongoDB
const mongoManager = new MultiProjectMongoDBManager()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5174",
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Inicializar serviço de notificações
const notificationService = new NotificationService(io)

// Aplicar middlewares de segurança na ordem correta
app.use(customSecurityHeaders) // Headers de segurança customizados
app.use(helmetConfig) // Helmet para headers de segurança
app.use(ipValidation) // Validação de IP
app.use(generalLimiter) // Rate limiting geral
app.use(cors(corsOptions)) // CORS com configurações seguras
// Responder preflight (OPTIONS) globalmente com as mesmas opções de CORS
app.options('*', cors(corsOptions))
app.use(validateContentType) // Validação de Content-Type

// Middlewares de performance
app.use(compressionConfig) // Compressão geral
app.use(imageOptimizationMiddleware) // Otimização de imagens
app.use(analytics.trackingMiddleware()) // Tracking de analytics

app.use(express.json({ limit: '10mb' })) // Limite de payload JSON
app.use(mongoSanitizeConfig) // Sanitização MongoDB
app.use(hppConfig) // Proteção contra HTTP Parameter Pollution
app.use(securityLogger) // Logging de segurança

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/novoapartadox'
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || (process.env.NODE_ENV !== 'production' ? 'admin@site.test' : '')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'admin123' : '')
const DEMO_EMAIL = process.env.DEMO_EMAIL || (process.env.NODE_ENV !== 'production' ? 'demo@site.test' : '')
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'demo123' : '')

// Variáveis de demonstração (DEV)
const DEMO_SEED_MODEL = process.env.DEMO_SEED_MODEL === 'true' || (process.env.NODE_ENV !== 'production')
const DEMO_MODEL_NAME = process.env.DEMO_MODEL_NAME || 'Modelo Demo'
const DEMO_MODEL_EMAIL = process.env.DEMO_MODEL_EMAIL || 'demo.model@site.test'
const DEMO_MODEL_CATEGORY = process.env.DEMO_MODEL_CATEGORY || 'fashion'
const DEMO_MODEL_PHONE = process.env.DEMO_MODEL_PHONE || ''
const DEMO_MODEL_BIO = process.env.DEMO_MODEL_BIO || 'Perfil de demonstração para testes.'

// Modelo Listing (Mongoose)
const listingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  age: { type: Number, min: 18, max: 99 },
  measurements: {
    height: { type: Number }, // altura em cm
    weight: { type: Number }, // peso em kg
    bust: { type: Number },   // busto em cm
    waist: { type: Number },  // cintura em cm
    hips: { type: Number }    // quadril em cm
  },
  services: [{
    name: { type: String, required: true },
    price: { type: Number, min: 0 },
    duration: { type: String } // ex: "1 hora", "30 minutos"
  }],
  description: { type: String },
  photos: [String],
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  category: { type: String, enum: ['acompanhante', 'massagista', 'dominatrix', 'outro'], default: 'acompanhante' },
  languages: [{ type: String }],
  availability: {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  location: {
    address: { type: String },
    neighborhood: { type: String },
    canTravel: { type: Boolean, default: false }
  },
  stats: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    calls: { type: Number, default: 0 }
  }
}, { timestamps: true })

const Listing = mongoose.models.Listing || mongoose.model('Listing', listingSchema)

// Conexão MongoDB (com fallback sem DB) usando gerenciador de múltiplos projetos
async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI não definido. A correr em modo mock.')
    return false
  }
  try {
    // Usar o gerenciador de múltiplos projetos para conectar
    await mongoManager.connect()
    console.log('MongoDB ligado através do gerenciador de múltiplos projetos')
    return true
  } catch (err) {
    console.error('Erro a ligar MongoDB:', err.message)
    return false
  }
}

// Dados mock iniciais
const mockListings = [
  { 
    id: '1', 
    name: 'Maria Luísa', 
    phone: '925795572', 
    city: 'Lisboa', 
    age: 25,
    measurements: { height: 168, weight: 58, bust: 90, waist: 60, hips: 92 },
    services: [
      { name: 'Encontro Social', price: 150, duration: '1 hora' },
      { name: 'Massagem Relaxante', price: 100, duration: '45 minutos' }
    ],
    description: 'Acompanhante elegante e discreta para encontros sociais e momentos especiais.',
    photos: [
      { 
        url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face', 
        thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
        isPrimary: true 
      },
      { 
        url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop', 
        thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        isPrimary: false 
      }
    ], 
    verified: true,
    active: true,
    featured: true,
    category: 'acompanhante',
    languages: ['Português', 'Inglês'],
    availability: { monday: true, tuesday: true, wednesday: false, thursday: true, friday: true, saturday: false, sunday: false },
    location: { neighborhood: 'Avenidas Novas', canTravel: true }
  },
  { 
    id: '2', 
    name: 'Park Haeinn', 
    phone: '927647585', 
    city: 'Lisboa', 
    age: 28,
    measurements: { height: 172, weight: 55, bust: 88, waist: 58, hips: 90 },
    services: [
      { name: 'Massagem Tântrica', price: 200, duration: '1 hora' },
      { name: 'Terapia Corporal', price: 120, duration: '50 minutos' }
    ],
    description: 'Massagista profissional especializada em técnicas orientais de relaxamento.',
    photos: [
      { 
        url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face', 
        thumbnail: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=100&h=100&fit=crop&crop=face',
        isPrimary: true 
      },
      { 
        url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db1604?w=400&h=400&fit=crop', 
        thumbnail: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db1604?w=100&h=100&fit=crop',
        isPrimary: false 
      }
    ], 
    verified: true,
    active: true,
    featured: false,
    category: 'massagista',
    languages: ['Coreano', 'Inglês', 'Português'],
    availability: { monday: false, tuesday: true, wednesday: true, thursday: false, friday: true, saturday: true, sunday: false },
    location: { neighborhood: 'Príncipe Real', canTravel: false }
  },
  { 
    id: '3', 
    name: 'Karen Carvalho', 
    phone: '931908884', 
    city: 'Lisboa', 
    age: 32,
    measurements: { height: 175, weight: 62, bust: 95, waist: 65, hips: 98 },
    services: [
      { name: 'Dominatrix Session', price: 300, duration: '2 horas' },
      { name: 'Role Play', price: 180, duration: '1 hora' }
    ],
    description: 'Dominatrix experiente para sessões de BDSM e role play personalizado.',
    photos: [
      { 
        url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=400&h=400&fit=crop&crop=face', 
        thumbnail: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=100&h=100&fit=crop&crop=face',
        isPrimary: true 
      },
      { 
        url: 'https://images.unsplash.com/photo-1519764622345-23439dd774f7?w=400&h=400&fit=crop', 
        thumbnail: 'https://images.unsplash.com/photo-1519764622345-23439dd774f7?w=100&h=100&fit=crop',
        isPrimary: false 
      }
    ], 
    verified: true,
    active: true,
    featured: true,
    category: 'dominatrix',
    languages: ['Português', 'Espanhol'],
    availability: { monday: true, tuesday: false, wednesday: true, thursday: false, friday: true, saturday: false, sunday: true },
    location: { neighborhood: 'Alcântara', canTravel: true }
  },
  { 
    id: '4', 
    name: 'Sofia Mendes', 
    phone: '912345678', 
    city: 'Porto', 
    age: 29,
    measurements: { height: 170, weight: 60, bust: 92, waist: 62, hips: 94 },
    services: [
      { name: 'Jantar Romântico', price: 180, duration: '2 horas' },
      { name: 'Encontro Casual', price: 120, duration: '1 hora' }
    ],
    description: 'Companhia sofisticada para eventos sociais e jantares românticos.',
    photos: [
      { 
        url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face', 
        thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
        isPrimary: true 
      },
      { 
        url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop', 
        thumbnail: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop',
        isPrimary: false 
      }
    ], 
    verified: true,
    active: true,
    featured: false,
    category: 'acompanhante',
    languages: ['Português', 'Francês'],
    availability: { monday: true, tuesday: true, wednesday: true, thursday: false, friday: true, saturday: false, sunday: false },
    location: { neighborhood: 'Foz do Douro', canTravel: true }
  },
  { 
    id: '5', 
    name: 'Yuki Tanaka', 
    phone: '934567890', 
    city: 'Lisboa', 
    age: 26,
    measurements: { height: 165, weight: 52, bust: 86, waist: 56, hips: 88 },
    services: [
      { name: 'Massagem Shiatsu', price: 160, duration: '1 hora' },
      { name: 'Terapia Japonesa', price: 140, duration: '45 minutos' }
    ],
    description: 'Especialista em técnicas de massagem tradicionais japonesas para relaxamento profundo.',
    photos: [
      { 
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face', 
        thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
        isPrimary: true 
      },
      { 
        url: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=400&h=400&fit=crop', 
        thumbnail: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=100&h=100&fit=crop',
        isPrimary: false 
      }
    ], 
    verified: true,
    active: true,
    featured: true,
    category: 'massagista',
    languages: ['Japonês', 'Inglês', 'Português'],
    availability: { monday: false, tuesday: true, wednesday: false, thursday: true, friday: false, saturday: true, sunday: true },
    location: { neighborhood: 'Chiado', canTravel: false }
  }
]

// Seed DB com dados mock caso esteja vazio
async function seedIfEmpty() {
  try {
    const connected = mongoose.connection.readyState === 1
    if (!connected) return
    const count = await Listing.countDocuments()
    if (count === 0) {
      await Listing.insertMany(mockListings.map(m => ({
        name: m.name,
        phone: m.phone,
        city: m.city,
        photos: m.photos,
        verified: m.verified
      })))
      console.log('Seed: inseridos mock listings no MongoDB')
    }
  } catch (e) {
    console.warn('Seed falhou:', e.message)
  }
}
// Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Busca avançada de listings
app.get('/api/listings/search', async (req, res) => {
  try {
    const {
      query,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      bedrooms,
      bathrooms,
      propertyType,
      location,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query
    
    let filter = {}
    
    // Filtro por texto
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'location.city': { $regex: query, $options: 'i' } },
        { 'location.neighborhood': { $regex: query, $options: 'i' } }
      ]
    }
    
    // Filtro por preço
    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }
    
    // Filtro por área
    if (minArea || maxArea) {
      filter.area = {}
      if (minArea) filter.area.$gte = Number(minArea)
      if (maxArea) filter.area.$lte = Number(maxArea)
    }
    
    // Filtro por quartos
    if (bedrooms) {
      filter.bedrooms = { $gte: Number(bedrooms) }
    }
    
    // Filtro por banheiros
    if (bathrooms) {
      filter.bathrooms = { $gte: Number(bathrooms) }
    }
    
    // Filtro por tipo de propriedade
    if (propertyType) {
      filter.propertyType = propertyType
    }
    
    // Filtro por localização
    if (location) {
      filter.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.neighborhood': { $regex: location, $options: 'i' } }
      ]
    }
    
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    const skip = (page - 1) * limit
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      const filtered = mockListings.filter(l => {
        // Filtro de texto
        if (query) {
          const searchQuery = query.toLowerCase()
          if (!l.title.toLowerCase().includes(searchQuery) &&
              !l.description.toLowerCase().includes(searchQuery) &&
              !l.location.city.toLowerCase().includes(searchQuery) &&
              !l.location.neighborhood.toLowerCase().includes(searchQuery)) {
            return false
          }
        }
        
        // Filtro de preço
        if (minPrice && l.price < Number(minPrice)) return false
        if (maxPrice && l.price > Number(maxPrice)) return false
        
        // Filtro de área
        if (minArea && l.area < Number(minArea)) return false
        if (maxArea && l.area > Number(maxArea)) return false
        
        // Filtro de quartos
        if (bedrooms && l.bedrooms < Number(bedrooms)) return false
        
        // Filtro de banheiros
        if (bathrooms && l.bathrooms < Number(bathrooms)) return false
        
        // Filtro de tipo de propriedade
        if (propertyType && l.propertyType !== propertyType) return false
        
        // Filtro de localização
        if (location) {
          const searchLocation = location.toLowerCase()
          if (!l.location.city.toLowerCase().includes(searchLocation) &&
              !l.location.neighborhood.toLowerCase().includes(searchLocation)) {
            return false
          }
        }
        
        return true
      })
      
      // Ordenação para mock data
      filtered.sort((a, b) => {
        if (sortBy === 'createdAt') {
          return sortOrder === 'desc' ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt)
        }
        if (sortBy === 'price') {
          return sortOrder === 'desc' ? b.price - a.price : a.price - b.price
        }
        if (sortBy === 'title') {
          return sortOrder === 'desc' 
            ? b.title.localeCompare(a.title)
            : a.title.localeCompare(b.title)
        }
        return 0
      })
      
      const paginated = filtered.slice(skip, skip + parseInt(limit))
      
      return res.json({
        listings: paginated,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
        currentPage: parseInt(page)
      })
    }
    
    const listings = await Listing.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
    
    const total = await Listing.countDocuments(filter)
    
    res.json({
      listings,
      total,
      pages,
      currentPage: parseInt(page)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Endpoints administrativos para gestão de fotos de modelos
app.get('/api/admin/models', auth('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const skip = (page - 1) * limit
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      return res.json({ models: [], total: 0, pages: 0 })
    }
    
    const query = search ? { name: { $regex: search, $options: 'i' } } : {}
    
    const models = await Model.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-photos') // Não enviar fotos na listagem
      .exec()
    
    const total = await Model.countDocuments(query)
    const pages = Math.ceil(total / limit)
    
    res.json({
      models,
      total,
      pages,
      currentPage: parseInt(page)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/admin/models/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    const model = await Model.findById(id)
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    res.json(model)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/admin/models/:id/photos', auth('admin'), uploadMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const files = req.files || []
    
    console.log('Upload de fotos recebido para o modelo:', id)
    console.log('Número de arquivos:', files.length)
    console.log('Arquivos:', files.map(f => ({ filename: f.filename, size: f.size })))
    
    if (files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto enviada' })
    }
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      console.log('Modo mock: adicionando fotos ao modelo')
      return res.json({ message: 'Fotos adicionadas (mock)', photos: files.map(f => ({ url: f.path, isPrimary: false })) })
    }
    
    const model = await Model.findById(id)
    if (!model) {
      console.error('Modelo não encontrado:', id)
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    const newPhotos = files.map(file => ({
      url: `/uploads/${file.filename}`,
      thumbnail: `/uploads/${file.filename}`,
      isPrimary: model.photos.length === 0, // Primeira foto é primary
      uploadedAt: new Date()
    }))
    
    model.photos.push(...newPhotos)
    await model.save()
    
    console.log('Fotos adicionadas com sucesso ao modelo:', id)
    
    res.json({
      message: 'Fotos adicionadas com sucesso',
      photos: newPhotos
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/admin/models/:id/photos/:photoIndex/primary', auth('admin'), async (req, res) => {
  try {
    const { id, photoIndex } = req.params
    const index = parseInt(photoIndex)
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      return res.json({ message: 'Foto definida como principal (mock)' })
    }
    
    const model = await Model.findById(id)
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    if (index < 0 || index >= model.photos.length) {
      return res.status(400).json({ error: 'Índice de foto inválido' })
    }
    
    // Remover primary de todas as fotos
    model.photos.forEach(photo => {
      photo.isPrimary = false
    })
    
    // Definir a foto selecionada como primary
    model.photos[index].isPrimary = true
    await model.save()
    
    res.json({ message: 'Foto definida como principal' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/admin/models/:id/photos/:photoIndex', auth('admin'), async (req, res) => {
  try {
    const { id, photoIndex } = req.params
    const index = parseInt(photoIndex)
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      return res.json({ message: 'Foto removida (mock)' })
    }
    
    const model = await Model.findById(id)
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    if (index < 0 || index >= model.photos.length) {
      return res.status(400).json({ error: 'Índice de foto inválido' })
    }
    
    const removedPhoto = model.photos[index]
    model.photos.splice(index, 1)
    
    // Se a foto removida era primary e ainda existem fotos, definir a primeira como primary
    if (removedPhoto.isPrimary && model.photos.length > 0) {
      model.photos[0].isPrimary = true
    }
    
    await model.save()
    
    res.json({ message: 'Foto removida com sucesso' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Endpoint original de listings mantido para compatibilidade
app.get('/api/listings', async (req, res) => {
  try {
    const { 
      city = 'Lisboa', 
      category, 
      featured, 
      verified, 
      page = 1, 
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      minAge,
      maxAge,
      minPrice,
      maxPrice
    } = req.query
    
    const filters = { active: true }
    
    if (city && city !== 'all') filters.city = new RegExp(city, 'i')
    if (category && category !== 'all') filters.category = category
    if (featured === 'true') filters.featured = true
    if (verified === 'true') filters.verified = true
    if (search) filters.name = new RegExp(search, 'i')
    if (minAge) filters.age = { ...filters.age, $gte: parseInt(minAge) }
    if (maxAge) filters.age = { ...filters.age, $lte: parseInt(maxAge) }
    
    const skip = (page - 1) * limit
    let sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    
    // Ajustar ordenação para campos específicos
    if (sortBy === 'price') {
      sort = { 'services.0.price': sortOrder === 'desc' ? -1 : 1 }
    }
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      let filtered = mockListings.filter(l => {
        if (!l.active) return false
        if (city && city !== 'all' && !l.city?.toLowerCase().includes(city.toLowerCase())) return false
        if (category && category !== 'all' && l.category !== category) return false
        if (featured === 'true' && !l.featured) return false
        if (verified === 'true' && !l.verified) return false
        if (search && !l.name?.toLowerCase().includes(search.toLowerCase())) return false
        if (minAge && l.age < parseInt(minAge)) return false
        if (maxAge && l.age > parseInt(maxAge)) return false
        if (minPrice && (!l.services?.[0]?.price || l.services[0].price < parseInt(minPrice))) return false
        if (maxPrice && l.services?.[0]?.price && l.services[0].price > parseInt(maxPrice)) return false
        return true
      })
      
      // Ordenação para mock data
      filtered.sort((a, b) => {
        if (sortBy === 'createdAt') {
          return sortOrder === 'desc' ? -1 : 1
        }
        if (sortBy === 'name') {
          return sortOrder === 'desc' 
            ? b.name.localeCompare(a.name)
            : a.name.localeCompare(b.name)
        }
        if (sortBy === 'age') {
          return sortOrder === 'desc' ? b.age - a.age : a.age - b.age
        }
        if (sortBy === 'price') {
          const priceA = a.services?.[0]?.price || 0
          const priceB = b.services?.[0]?.price || 0
          return sortOrder === 'desc' ? priceB - priceA : priceA - priceB
        }
        return 0
      })
      
      const paginated = filtered.slice(skip, skip + parseInt(limit))
      
      return res.json({
        listings: paginated,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
        currentPage: parseInt(page)
      })
    }
    
    // Filtros de preço para MongoDB
    if (minPrice || maxPrice) {
      const priceFilter = {}
      if (minPrice) priceFilter.$gte = parseInt(minPrice)
      if (maxPrice) priceFilter.$lte = parseInt(maxPrice)
      filters['services.price'] = priceFilter
    }
    
    const listings = await Listing.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .exec()
    
    const total = await Listing.countDocuments(filters)
    const pages = Math.ceil(total / limit)
    
    res.json({
      listings,
      total,
      pages,
      currentPage: parseInt(page)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Endpoint para modelos criarem/atualizarem seus próprios perfis
app.post('/api/my-profile', authMiddleware('model', JWT_SECRET), async (req, res) => {
  try {
    const userId = req.user.id
    const profileData = req.body
    
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      // Modo mock - encontrar ou criar perfil
      let listing = mockListings.find(l => l.userId === userId)
      if (listing) {
        // Atualizar perfil existente
        Object.assign(listing, profileData, { 
          updatedAt: new Date(),
          active: false // Novo perfil precisa ser ativado pelo admin
        })
      } else {
        // Criar novo perfil
        listing = {
          id: String(Date.now()),
          userId,
          ...profileData,
          active: false,
          verified: false,
          featured: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        mockListings.push(listing)
      }
      return res.json({ message: 'Perfil salvo com sucesso. Aguarde ativação pelo administrador.', listing })
    }
    
    // Modo MongoDB
    const listing = await Listing.findOneAndUpdate(
      { userId },
      { 
        ...profileData,
        active: false, // Novo perfil precisa ser ativado pelo admin
        updatedAt: new Date()
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true 
      }
    )
    
    res.json({ message: 'Perfil salvo com sucesso. Aguarde ativação pelo administrador.', listing })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Endpoint para modelos verem seu próprio perfil
app.get('/api/my-profile', authMiddleware('model', JWT_SECRET), async (req, res) => {
  try {
    const userId = req.user.id
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.userId === userId)
      return res.json(listing || null)
    }
    
    const listing = await Listing.findOne({ userId })
    res.json(listing)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Se for ID placeholder, retornar mock
    if (id && id.toString().startsWith('placeholder-')) {
      const mockModel = {
        _id: id,
        name: `Modelo ${id.replace('placeholder-', '')}`,
        city: 'Lisboa',
        age: 22 + (parseInt(id.replace('placeholder-', '')) % 10),
        verified: true,
        photos: [{ url: `https://placehold.co/600x800?text=Modelo+${id.replace('placeholder-', '')}` }]
      }
      return res.json(mockModel)
    }
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      const found = mockListings.find(l => String(l.id) === String(id))
      if (!found) return res.status(404).json({ error: 'Not found' })
      return res.json(found)
    }
    const doc = await Listing.findById(id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Endpoints para sistema de reviews

// Criar uma nova review
app.post('/api/reviews', async (req, res) => {
  try {
    const { listingId, userId, rating, comment } = req.body
    
    // Verificar se o usuário já fez review para este listing
    const existingReview = await Review.findOne({ listingId, userId })
    if (existingReview) {
      return res.status(400).json({ error: 'Você já avaliou este imóvel' })
    }
    
    const review = new Review({
      listingId,
      userId,
      rating,
      comment,
      status: 'pending'
    })
    
    await review.save()
    res.status(201).json(review)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar review' })
  }
})

// Obter reviews de um listing
app.get('/api/listings/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ 
      listingId: req.params.id, 
      status: 'approved' 
    }).populate('userId', 'name')
    
    res.json(reviews)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar reviews' })
  }
})

// Obter estatísticas de reviews de um listing
app.get('/api/listings/:id/reviews/stats', async (req, res) => {
  try {
    const stats = await Review.aggregate([
      { $match: { listingId: new mongoose.Types.ObjectId(req.params.id), status: 'approved' } },
      {
        $group: {
          _id: '$listingId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ])
    
    res.json(stats[0] || { averageRating: 0, totalReviews: 0, ratingDistribution: [] })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

// Marcar review como útil
app.put('/api/reviews/:id/helpful', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpful: 1 } },
      { new: true }
    )
    res.json(review)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar como útil' })
  }
})

// Reportar review
app.put('/api/reviews/:id/report', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { reportCount: 1 } },
      { new: true }
    )
    res.json(review)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reportar review' })
  }
})

// Upload de fotos para modelos (admin only)
app.post('/api/models/:id/upload-photos', authMiddleware('admin', JWT_SECRET), async (req, res) => {
  try {
    const { id } = req.params
    const { photos } = req.body // Array de URLs/base64 das fotos
    
    const model = await Model.findById(id)
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    // Adicionar novas fotos ao modelo
    const newPhotos = photos.map((photo, index) => ({
      url: `/uploads/models/${id}/photo_${index}_${Date.now()}.jpg`,
      thumbnail: `/uploads/models/${id}/thumb_${index}_${Date.now()}.jpg`,
      isPrimary: model.photos.length === 0 && index === 0, // Primeira foto é primary
      uploadedAt: new Date()
    }))
    
    model.photos.push(...newPhotos)
    await model.save()
    
    res.json({ 
      success: true, 
      message: 'Fotos uploadadas com sucesso',
      photos: newPhotos 
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload das fotos' })
  }
})

// Criar nova modelo (admin only)
app.post('/api/models', authMiddleware('admin', JWT_SECRET), async (req, res) => {
  try {
    const { name, email, phone, category, bio, socialMedia } = req.body
    
    // Gerar slug a partir do nome
    let slug = generateSlug(name)
    
    // Verificar se o slug já existe e adicionar sufixo numérico se necessário
    let counter = 1
    let originalSlug = slug
    while (await Model.findOne({ slug })) {
      slug = `${originalSlug}-${counter}`
      counter++
    }
    
    const model = new Model({
      name,
      email,
      phone,
      category,
      bio,
      slug,
      socialMedia
    })
    
    await model.save()
    res.status(201).json(model)
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email já cadastrado' })
    } else {
      res.status(500).json({ error: 'Erro ao criar modelo' })
    }
  }
})

// Obter todas as modelos com ordenação por prioridade
app.get('/api/models', async (req, res) => {
  try {
    const { sortBy = 'priority' } = req.query;
    
    // Carregar configuração de prioridade (se existir)
    let priorityConfig = null;
    try {
      const cfgDoc = await PriorityConfig.findOne({}).lean();
      if (cfgDoc) priorityConfig = cfgDoc;
    } catch (_) {}
    
    let models = await Model.find({ active: true })
    
    // Calcular score de prioridade para cada modelo
    models = models.map(model => {
      const modelObj = model.toObject();
      modelObj.priorityScore = calculateModelPriorityScore(modelObj, priorityConfig);
      return modelObj;
    });
    
    // Ordenar modelos
    if (sortBy === 'priority') {
      models.sort((a, b) => b.priorityScore - a.priorityScore);
    } else if (sortBy === 'name') {
      models.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'createdAt') {
      models.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    res.json(models)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar modelos' })
  }
})

// Endpoints administrativos para configurar o algoritmo de prioridade
app.get('/api/admin/priority-config', auth('admin'), async (req, res) => {
  try {
    const cfg = await PriorityConfig.findOne({}).lean()
    res.json(cfg || {})
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter configuração de prioridade' })
  }
})

app.put('/api/admin/priority-config', auth('admin'), async (req, res) => {
  try {
    const payload = req.body || {}
    const updated = await PriorityConfig.findOneAndUpdate({}, payload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar configuração de prioridade' })
  }
})

// Obter modelo específico por ID ou slug
app.get('/api/models/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params
    
    // Ignorar se for "stats" para não conflitar com a rota /api/models/stats
    if (identifier === 'stats') {
      return res.status(404).json({ error: 'Rota não encontrada' })
    }
    
    // Verificar se é um ObjectId válido
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier)
    
    let model
    if (isObjectId) {
      model = await Model.findById(identifier)
    } else {
      // Buscar por slug
      model = await Model.findOne({ slug: identifier, active: true })
    }
    
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    res.json(model)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar modelo' })
  }
})

// Atualizar modelo (admin only)
app.put('/api/models/:id', auth('admin'), async (req, res) => {
  try {
    // Se o nome foi alterado, atualizar o slug
    if (req.body.name) {
      let slug = generateSlug(req.body.name)
      
      // Verificar se o slug já existe (excluindo o próprio modelo)
      let counter = 1
      let originalSlug = slug
      while (await Model.findOne({ slug, _id: { $ne: req.params.id } })) {
        slug = `${originalSlug}-${counter}`
        counter++
      }
      
      req.body.slug = slug
    }
    
    const model = await Model.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    res.json(model)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar modelo' })
  }
})

// Deletar modelo (admin only - soft delete)
app.delete('/api/models/:id', auth('admin'), async (req, res) => {
  try {
    const model = await Model.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    )
    
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    res.json({ message: 'Modelo desativado com sucesso' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar modelo' })
  }
})

// Excluir modelo definitivamente (admin only - hard delete)
app.delete('/api/models/:id/permanent', auth('admin'), async (req, res) => {
  try {
    const model = await Model.findByIdAndDelete(req.params.id)
    
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    res.json({ message: 'Modelo excluído permanentemente com sucesso' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir modelo' })
  }
})

// Endpoint para obter estatísticas das modelos
app.get('/api/models/stats', auth(), async (req, res) => {
  try {
    // Estatísticas simuladas - você implementaria com dados reais
    const stats = {
      totalModels: 25,
      activeModels: 18,
      verifiedModels: 15,
      totalPhotos: 156,
      averagePhotosPerModel: 6.24,
      modelsByCategory: {
        fitness: 8,
        fashion: 6,
        beauty: 5,
        lifestyle: 6
      },
      recentUploads: 12,
      storageUsage: '2.3GB'
    }
    
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

// Endpoint para estatísticas do modelo logado
app.get('/api/stats/my-stats', auth(), async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id
    
    // Estatísticas simuladas para o modelo
    const stats = {
      profileViews: Math.floor(Math.random() * 1000) + 100,
      whatsappClicks: Math.floor(Math.random() * 100) + 10,
      timeSpent: Math.floor(Math.random() * 60) + 10, // minutos
      photos: 12,
      lastActive: new Date().toISOString(),
      monthlyViews: Math.floor(Math.random() * 5000) + 500,
      monthlyClicks: Math.floor(Math.random() * 500) + 50
    }
    
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas' })
  }
})

app.post('/api/listings', auth('admin'), async (req, res) => {
  const connected = mongoose.connection.readyState === 1
  if (!connected) {
    const obj = { id: String(Date.now()), ...req.body }
    mockListings.push(obj)
    return res.status(201).json(obj)
  }
  const doc = await Listing.create(req.body)
  res.status(201).json(doc)
})

// pasta uploads
const uploadDir = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = Date.now() + '_' + Math.random().toString(36).substring(2, 15) + ext
    cb(null, name)
  }
})
const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 20 // máximo 20 arquivos por upload
  },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/i
    const ext = path.extname(file.originalname)
    if (allowed.test(ext)) cb(null, true)
    else cb(new Error('Tipo de ficheiro não permitido. Use JPEG, PNG, WebP ou GIF'))
  }
})

// servir uploads estaticos
app.use('/uploads', express.static(uploadDir))

// modelos adicionais
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: { type: String, enum: ['admin','model'], default: 'model' },
  passwordHash: String,
  avatar: String,
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true })
const User = mongoose.models.User || mongoose.model('User', userSchema)

// Modelo Review para avaliações
const reviewSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 500 },
  verified: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true })

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema)

// Função para gerar slugs a partir do nome
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove múltiplos hífens consecutivos
    .trim('-') // Remove hífens no início e fim
}

// Função para calcular score de prioridade do perfil
function calculateModelPriorityScore(model, config) {
  let score = 0;
  const cfg = config || {
    timeGrowthPerDay: 1.5,       // crescimento diário do benefício de tempo
    timeMaxBoost: 150,           // teto do benefício de tempo
    featuredBoost: 40,
    activeBoost: 20,
    stats: { 
      viewsPerPoint: 200, 
      likesPerPoint: 20, 
      callsPerPoint: 10, 
      engagementMultiplier: 1 
    },
    content: { 
      photoWeight: 3, 
      maxPhotosWeight: 15, 
      primaryPhotoBonus: 10 
    },
    completeness: { 
      name: 10, 
      bio: 10, 
      bioMinLength: 50,
      phone: 10, 
      social: 10, 
      photos: 10, 
      photosMinCount: 3 
    },
    recentUpdateBonusDays: 3,
    recentUpdateBonus: 10,
  };

  // Destaque e atividade (verificação removida)
  if (model.featured) score += cfg.featuredBoost;
  if (model.active) score += cfg.activeBoost;

  // Estatísticas
  const stats = model.stats || {};
  score += Math.floor((stats.totalViews || 0) / cfg.stats.viewsPerPoint);
  score += Math.floor((stats.totalLikes || 0) / cfg.stats.likesPerPoint);
  score += Math.floor((stats.totalCalls || 0) / cfg.stats.callsPerPoint);
  score += Math.floor((stats.engagementRate || 0) * cfg.stats.engagementMultiplier);

  // Conteúdo (fotos)
  const numPhotos = Array.isArray(model.photos) ? model.photos.length : 0;
  score += Math.min(numPhotos * cfg.content.photoWeight, cfg.content.maxPhotosWeight);
  const hasPrimaryPhoto = (model.photos || []).some(photo => photo.isPrimary);
  if (hasPrimaryPhoto) score += cfg.content.primaryPhotoBonus;

  // Tempo (benefício que cresce com o tempo desde criação)
  if (model.createdAt) {
    const daysSinceCreation = Math.floor((new Date() - new Date(model.createdAt)) / (1000 * 60 * 60 * 24));
    const timeBoost = Math.min(Math.floor(daysSinceCreation * cfg.timeGrowthPerDay), cfg.timeMaxBoost);
    score += Math.max(0, timeBoost);
  }

  // Bônus por atualização recente
  if (model.updatedAt) {
    const daysSinceUpdate = Math.floor((new Date() - new Date(model.updatedAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate < cfg.recentUpdateBonusDays) score += cfg.recentUpdateBonus;
  }

  // Completude do perfil
  let completeness = 0;
  if (model.name) completeness += cfg.completeness.name;
  const bioLen = (model.bio || '').length;
  if (bioLen >= cfg.completeness.bioMinLength) completeness += cfg.completeness.bio;
  if (model.phone) completeness += cfg.completeness.phone;
  const hasSocial = !!(model.socialMedia && (model.socialMedia.instagram || model.socialMedia.twitter || model.socialMedia.tiktok));
  if (hasSocial) completeness += cfg.completeness.social;
  if (numPhotos >= cfg.completeness.photosMinCount) completeness += cfg.completeness.photos;
  score += completeness;

  return Math.max(0, score);
}

// Schema de configuração administrativa do algoritmo de prioridade
const priorityConfigSchema = new mongoose.Schema({
  timeGrowthPerDay: { type: Number, default: 1.5 },
  timeMaxBoost: { type: Number, default: 150 },
  featuredBoost: { type: Number, default: 40 },
  activeBoost: { type: Number, default: 20 },
  stats: {
    viewsPerPoint: { type: Number, default: 200 },
    likesPerPoint: { type: Number, default: 20 },
    callsPerPoint: { type: Number, default: 10 },
    engagementMultiplier: { type: Number, default: 1 }
  },
  content: {
    photoWeight: { type: Number, default: 3 },
    maxPhotosWeight: { type: Number, default: 15 },
    primaryPhotoBonus: { type: Number, default: 10 }
  },
  completeness: {
    name: { type: Number, default: 10 },
    bio: { type: Number, default: 10 },
    bioMinLength: { type: Number, default: 50 },
    phone: { type: Number, default: 10 },
    social: { type: Number, default: 10 },
    photos: { type: Number, default: 10 },
    photosMinCount: { type: Number, default: 3 }
  },
  recentUpdateBonusDays: { type: Number, default: 3 },
  recentUpdateBonus: { type: Number, default: 10 },
}, { timestamps: true })

const PriorityConfig = mongoose.models.PriorityConfig || mongoose.model('PriorityConfig', priorityConfigSchema)

// Modelo Model para as modelos (admin managed)
const modelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  city: { type: String },
  category: { type: String, enum: ['fitness', 'fashion', 'beauty', 'lifestyle'], required: true },
  bio: { type: String, maxlength: 500 },
  slug: { type: String, unique: true, sparse: true },
  // Campos adicionais de perfil
  nationality: { type: String },
  eyeColor: { type: String },
  age: { type: Number, min: 18, max: 99 },
  height: { type: Number }, // metros (ex.: 1.60)
  weight: { type: Number }, // kg (ex.: 63)
  photos: [{
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
  }],
  stats: {
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    totalCalls: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  },
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  socialMedia: {
    instagram: String,
    twitter: String,
    tiktok: String
  }
}, { timestamps: true })

const Model = mongoose.models.Model || mongoose.model('Model', modelSchema)

// Mock users quando sem DB
const mockUsers = []

async function seedAdminIfMissing() {
  try {
    const connected = mongoose.connection.readyState === 1
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.warn('ADMIN_EMAIL/ADMIN_PASSWORD não definidos; a usar fallback DEV apenas se existir admin prévio ou login mock.')
    }
    if (connected) {
      const exists = await User.findOne({ email: ADMIN_EMAIL })
      if (!exists && ADMIN_EMAIL && ADMIN_PASSWORD) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
        await User.create({ name: 'Admin', email: ADMIN_EMAIL, role: 'admin', passwordHash })
        console.log('Seed admin criado na BD:', ADMIN_EMAIL)
      }
    } else {
      // modo mock: garantir admin em memória para DEV
      if (ADMIN_EMAIL && ADMIN_PASSWORD && !mockUsers.find(u => u.email === ADMIN_EMAIL)) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
        mockUsers.push({ id: 'admin-mock', name: 'Admin', email: ADMIN_EMAIL, role: 'admin', passwordHash, tokenVersion: 0 })
        console.log('Seed admin mock criado:', ADMIN_EMAIL)
        console.log('Total de usuários mock após criação do admin:', mockUsers.length)
      }
    }
  } catch (e) {
    console.warn('Falha a semear admin:', e.message)
  }
}

async function seedDemoModelIfMissing() {
  try {
    const connected = mongoose.connection.readyState === 1
    if (!DEMO_EMAIL || !DEMO_PASSWORD) {
      console.warn('DEMO_EMAIL/DEMO_PASSWORD não definidos; a usar fallback DEV apenas se existir demo model prévio ou login mock.')
    }
    if (connected) {
      const exists = await User.findOne({ email: DEMO_EMAIL })
      if (!exists && DEMO_EMAIL && DEMO_PASSWORD) {
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
        await User.create({ name: 'Demo Model', email: DEMO_EMAIL, role: 'model', passwordHash })
        console.log('Seed demo model criado na BD:', DEMO_EMAIL)
      }
    } else {
      // modo mock: garantir demo model em memória para DEV
      if (DEMO_EMAIL && DEMO_PASSWORD && !mockUsers.find(u => u.email === DEMO_EMAIL)) {
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
        mockUsers.push({ id: 'demo-model-mock', name: 'Demo Model', email: DEMO_EMAIL, role: 'model', passwordHash, tokenVersion: 0 })
        console.log('Seed demo model mock criado:', DEMO_EMAIL)
        console.log('Total de usuários mock após criação do demo model:', mockUsers.length)
      }
    }
  } catch (e) {
    console.warn('Falha a semear demo model:', e.message)
  }
}

const statsSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  calls: { type: Number, default: 0 },
  date: { type: Date, default: () => new Date() }
})
const Stat = mongoose.models.Stat || mongoose.model('Stat', statsSchema)

// Schema para estatísticas detalhadas de modelos
const modelStatsSchema = new mongoose.Schema({
  modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model', required: true },
  date: { type: Date, default: () => new Date() },
  dailyStats: {
    profileViews: { type: Number, default: 0 },
    profileClicks: { type: Number, default: 0 },
    phoneClicks: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    photoViews: { type: Number, default: 0 }
  },
  hourlyStats: [{
    hour: { type: Number, min: 0, max: 23 },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
  }]
}, { timestamps: true })

modelStatsSchema.index({ modelId: 1, date: 1 }, { unique: true })
const ModelStat = mongoose.models.ModelStat || mongoose.model('ModelStat', modelStatsSchema)

// Schema para Favoritos
const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  createdAt: { type: Date, default: () => new Date() }
}, { timestamps: true })

favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true })
const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema)

// middleware de autenticação
function auth(requiredRole) {
  return (req, res, next) => {
    const hdr = req.headers.authorization || ''
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
    if (!token) return res.status(401).json({ error: 'No token' })
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      if (requiredRole && payload.role !== requiredRole) return res.status(403).json({ error: 'Forbidden' })
      req.user = payload
      next()
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}

// middleware de autorização para recursos específicos de modelo
function modelResourceAuth() {
  return async (req, res, next) => {
    try {
      const { id } = req.params
      const user = req.user
      
      // Admin tem acesso a tudo
      if (user.role === 'admin') {
        return next()
      }
      
      // Modelo só pode acessar seus próprios recursos
      if (user.role === 'model') {
        const connected = mongoose.connection.readyState === 1
        if (connected) {
          // Verificar se o modelo está tentando acessar seus próprios dados
          const model = await Model.findById(id)
          if (!model) {
            return res.status(404).json({ error: 'Modelo não encontrado' })
          }
          
          // Verificar se o email do modelo corresponde ao email do usuário autenticado
          if (model.email !== user.email) {
            return res.status(403).json({ error: 'Acesso negado - só pode acessar seus próprios dados' })
          }
        } else {
          // Modo mock - verificar se o ID corresponde ao usuário
          if (id !== user.sub) {
            return res.status(403).json({ error: 'Acesso negado - só pode acessar seus próprios dados' })
          }
        }
        
        return next()
      }
      
      // Outras roles não autorizadas
      return res.status(403).json({ error: 'Acesso negado' })
      
    } catch (error) {
      console.error('Erro no middleware de autorização:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
}

// middleware para verificar se usuário é admin ou o próprio modelo
function adminOrSelfAuth() {
  return async (req, res, next) => {
    try {
      const { id } = req.params
      const user = req.user
      
      // Admin tem acesso a tudo
      if (user.role === 'admin') {
        return next()
      }
      
      // Modelo só pode acessar seus próprios recursos
      if (user.role === 'model') {
        const connected = mongoose.connection.readyState === 1
        if (connected) {
          // Verificar se o ID do parâmetro corresponde ao ID do usuário
          if (id !== user.sub) {
            return res.status(403).json({ error: 'Acesso negado - só pode acessar seus próprios dados' })
          }
        } else {
          // Modo mock
          if (id !== user.sub) {
            return res.status(403).json({ error: 'Acesso negado - só pode acessar seus próprios dados' })
          }
        }
        
        return next()
      }
      
      // Outras roles não autorizadas
      return res.status(403).json({ error: 'Acesso negado' })
      
    } catch (error) {
      console.error('Erro no middleware de autorização:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
}

// auth melhorado com segurança
app.post('/api/auth/login', authLimiter, loginValidators, validateInput, async (req, res) => {
  const start = Date.now()
  // Mapa de tentativas por identidade e hash dummy para uniformizar tempo
  app.locals.loginAttempts = app.locals.loginAttempts || new Map()
  app.locals.dummyPasswordHash = app.locals.dummyPasswordHash || bcrypt.hashSync('invalid_password_123', 12)
  const attempts = app.locals.loginAttempts

  // Configurações de proteção
  const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutos
  const LOGIN_MAX_ATTEMPTS = 5
  const LOGIN_BLOCK_MS = 15 * 60 * 1000 // 15 minutos
  const MIN_RESPONSE_MS = 600
  const MAX_JITTER_MS = 150
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS)
  const ensureUniformDelay = async () => {
    const elapsed = Date.now() - start
    const wait = Math.max(0, MIN_RESPONSE_MS + jitter - elapsed)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
  }

  const getIdentityKey = () => {
    const email = (req.body?.email || '').toLowerCase().trim()
    return email || `ip:${req.ip}`
  }
  const identityKey = getIdentityKey()
  const nowTs = Date.now()
  let rec = attempts.get(identityKey)
  if (!rec) {
    rec = { count: 0, firstAttemptAt: nowTs, blockedUntil: 0 }
    attempts.set(identityKey, rec)
  } else {
    if (nowTs - rec.firstAttemptAt > LOGIN_WINDOW_MS) {
      rec.count = 0
      rec.firstAttemptAt = nowTs
      rec.blockedUntil = 0
    }
  }

  try {
    if (rec.blockedUntil && rec.blockedUntil > nowTs) {
      const retryAfterSec = Math.ceil((rec.blockedUntil - nowTs) / 1000)
      res.setHeader('Retry-After', String(retryAfterSec))
      await ensureUniformDelay()
      return res.status(429).json({
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        code: 'IDENTITY_RATE_LIMIT'
      })
    }

    const { email, password } = req.body

    const connected = mongoose.connection.readyState === 1
    if (connected) {
      const user = await User.findOne({ email })
      const passwordHash = user?.passwordHash || app.locals.dummyPasswordHash
      const isValidPassword = await verifyPassword(password, passwordHash)

      if (!user || !isValidPassword) {
        rec.count += 1
        if (rec.count >= LOGIN_MAX_ATTEMPTS) {
          rec.blockedUntil = Date.now() + LOGIN_BLOCK_MS
          rec.count = 0
          rec.firstAttemptAt = Date.now()
        }
        await ensureUniformDelay()
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        })
      }
      
      if (user.role !== 'admin' && user.role !== 'model') {
        rec.count += 1
        if (rec.count >= LOGIN_MAX_ATTEMPTS) {
          rec.blockedUntil = Date.now() + LOGIN_BLOCK_MS
          rec.count = 0
          rec.firstAttemptAt = Date.now()
        }
        await ensureUniformDelay()
        return res.status(403).json({ 
          error: 'Acesso não autorizado',
          code: 'UNAUTHORIZED_ROLE'
        })
      }
      
      // Limpar tentativas em sucesso
      attempts.delete(identityKey)

      const payload = { 
        sub: user._id, 
        role: user.role, 
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        tokenVersion: user.tokenVersion || 0
      }
      
      const { accessToken, refreshToken } = generateTokens(payload, JWT_SECRET)
      
      await ensureUniformDelay()
      return res.json({ 
        accessToken, 
        refreshToken,
        user: sanitizeUser(user.toObject()),
        expiresIn: 900 // 15 minutos
      })
    } else {
      // Modo mock
      const user = mockUsers.find(u => u.email === email)
      const passwordHash = user?.passwordHash || app.locals.dummyPasswordHash
      const isValidPassword = await verifyPassword(password, passwordHash)

      if (!user || !isValidPassword) {
        rec.count += 1
        if (rec.count >= LOGIN_MAX_ATTEMPTS) {
          rec.blockedUntil = Date.now() + LOGIN_BLOCK_MS
          rec.count = 0
          rec.firstAttemptAt = Date.now()
        }
        await ensureUniformDelay()
        return res.status(401).json({ 
          error: 'Credenciais inválidas (mock)',
          code: 'INVALID_CREDENTIALS'
        })
      }
      
      if (user.role !== 'admin' && user.role !== 'model') {
        rec.count += 1
        if (rec.count >= LOGIN_MAX_ATTEMPTS) {
          rec.blockedUntil = Date.now() + LOGIN_BLOCK_MS
          rec.count = 0
          rec.firstAttemptAt = Date.now()
        }
        await ensureUniformDelay()
        return res.status(403).json({ 
          error: 'Acesso não autorizado (mock)',
          code: 'UNAUTHORIZED_ROLE'
        })
      }
      
      attempts.delete(identityKey)

      const payload = { 
        sub: user.id, 
        role: user.role, 
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        tokenVersion: user.tokenVersion || 0
      }
      
      const { accessToken, refreshToken } = generateTokens(payload, JWT_SECRET)
      
      await ensureUniformDelay()
      return res.json({ 
        accessToken, 
        refreshToken,
        user: sanitizeUser(user),
        expiresIn: 900 // 15 minutos
      })
    }
  } catch (e) {
    console.error('Login error:', e)
    await ensureUniformDelay()
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    })
  }
})

// Rota para refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token requerido',
        code: 'NO_REFRESH_TOKEN'
      })
    }
    
    const decoded = verifyToken(refreshToken, JWT_SECRET, 'refresh')
    
    // Buscar usuário atualizado e efetuar rotação atômica
    const connected = mongoose.connection.readyState === 1
    let user
    
    if (connected) {
      user = await User.findOneAndUpdate(
        { _id: decoded.sub, tokenVersion: decoded.tokenVersion ?? 0 },
        { $inc: { tokenVersion: 1 } },
        { new: true }
      )
      if (!user) {
        return res.status(401).json({ 
          error: 'Refresh token inválido ou já utilizado',
          code: 'ROTATED_REFRESH_TOKEN'
        })
      }
    } else {
      user = mockUsers.find(u => u.id === decoded.sub)
      if (!user) {
        return res.status(401).json({ 
          error: 'Usuário não encontrado (mock)',
          code: 'USER_NOT_FOUND'
        })
      }
      if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        return res.status(401).json({ 
          error: 'Refresh token inválido ou já utilizado (mock)',
          code: 'ROTATED_REFRESH_TOKEN'
        })
      }
      user.tokenVersion = (user.tokenVersion ?? 0) + 1
    }
    
    const payload = { 
      sub: user._id || user.id, 
      role: user.role, 
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      tokenVersion: user.tokenVersion || 0
    }
    
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload, JWT_SECRET)
    
    return res.json({ 
      accessToken, 
      refreshToken: newRefreshToken,
      user: sanitizeUser(connected ? user.toObject() : user),
      expiresIn: 900 // 15 minutos
    })
  } catch (e) {
    console.error('Refresh token error:', e)
    res.status(401).json({ 
      error: 'Refresh token inválido',
      code: 'INVALID_REFRESH_TOKEN'
    })
  }
})

app.get('/api/auth/me', authMiddleware(null, JWT_SECRET), async (req, res) => {
  try {
    const { sub } = req.user || {}
    const connected = mongoose.connection.readyState === 1

    if (!sub) return res.status(401).json({ error: 'Token inválido' })

    if (connected) {
      const user = await User.findById(sub)
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
      const base = sanitizeUser(user.toObject())
      const canAccessAdmin = base.role === 'admin'
      const permissions = canAccessAdmin ? ['admin:*'] : ['model:*']
      return res.json({ user: { ...base, permissions, canAccessAdmin } })
    } else {
      const user = mockUsers.find(u => u.id === sub)
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado (mock)' })
      const base = sanitizeUser(user)
      const canAccessAdmin = base.role === 'admin'
      const permissions = canAccessAdmin ? ['admin:*'] : ['model:*']
      return res.json({ user: { ...base, permissions, canAccessAdmin } })
    }
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// Estatísticas detalhadas por modelo (admin only)
app.get('/api/models/:id/stats', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { days = 7 } = req.query
    
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      // Mock data para desenvolvimento
      return res.json({
        modelStats: {
          totalViews: Math.floor(Math.random() * 1000),
          totalLikes: Math.floor(Math.random() * 500),
          totalCalls: Math.floor(Math.random() * 100),
          engagementRate: Math.floor(Math.random() * 100)
        },
        dailyStats: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          views: Math.floor(Math.random() * 50),
          clicks: Math.floor(Math.random() * 20),
          calls: Math.floor(Math.random() * 5)
        })).reverse()
      })
    }
    
    // Buscar estatísticas do modelo
    const model = await Model.findById(id)
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrada' })
    }
    
    // Buscar estatísticas diárias
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const dailyStats = await Stat.aggregate([
      { $match: { listingId: new mongoose.Types.ObjectId(id), date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          views: { $sum: '$views' },
          clicks: { $sum: '$clicks' },
          calls: { $sum: '$calls' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', views: 1, clicks: 1, calls: 1 } }
    ])
    
    res.json({
      modelStats: model.stats,
      dailyStats
    })
    
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Estatísticas do modelo atual (para modelos acederem às suas próprias estatísticas)
app.get('/api/my-stats', auth('model'), async (req, res) => {
  try {
    const { sub: userId } = req.user
    const { days = 7 } = req.query
    
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      return res.json({
        modelStats: {
          totalViews: Math.floor(Math.random() * 1000),
          totalLikes: Math.floor(Math.random() * 500),
          totalCalls: Math.floor(Math.random() * 100),
          engagementRate: Math.floor(Math.random() * 100)
        },
        dailyStats: Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          views: Math.floor(Math.random() * 50),
          clicks: Math.floor(Math.random() * 20),
          calls: Math.floor(Math.random() * 5)
        })).reverse()
      })
    }
    
    // Buscar o modelo associado ao utilizador
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' })
    
    // Buscar o listing associado ao email do utilizador
    const listing = await Listing.findOne({ phone: user.email })
    if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
    
    // Buscar estatísticas diárias
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const dailyStats = await Stat.aggregate([
      { $match: { listingId: listing._id, date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          views: { $sum: '$views' },
          clicks: { $sum: '$clicks' },
          calls: { $sum: '$calls' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', views: 1, clicks: 1, calls: 1 } }
    ])
    
    res.json({
      modelStats: listing.stats,
      dailyStats,
      profileInfo: {
        name: listing.name,
        phone: listing.phone,
        city: listing.city,
        verified: listing.verified,
        active: listing.active
      }
    })
    
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})


// models scaffolding
app.get('/api/models', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(
        mockUsers.length ? mockUsers : [{ id: 'm1', name: 'Modelo Demo', email: 'demo@site.test', role: 'model' }]
      )
    }
    const all = await User.find().limit(50)
    res.json(all)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// admin cria contas de modelo
app.post('/api/admin/users', auth('admin'), async (req, res) => {
  try {
    const { name, email } = req.body || {}
    if (!name || !email) return res.status(400).json({ error: 'name e email são obrigatórios' })

    // Gerar senha automática (8 caracteres alfanuméricos)
    const generatedPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await hashPassword(generatedPassword)

    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      if (mockUsers.find(u => u.email === email)) return res.status(409).json({ error: 'Email já existe (mock)' })
      const obj = { 
        id: String(Date.now()), 
        name, 
        email, 
        role: 'model',
        passwordHash,
        tokenVersion: 0
      }
      mockUsers.push(obj)
      return res.status(201).json({ ...obj, generatedPassword })
    }

    const created = await User.create({ name, email, role: 'model', passwordHash })
    res.status(201).json({ ...created.toObject(), generatedPassword })
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Email já existe' })
    res.status(500).json({ error: e.message })
  }
})

// Atualizar dados do usuário (self ou admin)
app.patch('/api/users/:id', auth(), adminOrSelfAuth(), async (req, res) => {
  try {
    const { id } = req.params
    const { avatar, name, password } = req.body || {}

    const update = {}
    if (typeof avatar === 'string') update.avatar = avatar
    if (typeof name === 'string') update.name = name
    if (typeof password === 'string' && password.length >= 6) {
      update.passwordHash = await hashPassword(password)
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'Nada para atualizar' })
    }

    const connected = mongoose.connection.readyState === 1

    if (connected) {
      const updated = await User.findByIdAndUpdate(id, update, { new: true })
      if (!updated) return res.status(404).json({ error: 'Usuário não encontrado' })
      return res.json({ user: sanitizeUser(updated.toObject()) })
    } else {
      const idx = mockUsers.findIndex(u => u.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado (mock)' })
      mockUsers[idx] = { ...mockUsers[idx], ...update }
      return res.json({ user: sanitizeUser(mockUsers[idx]) })
    }
  } catch (e) {
    console.error('Erro ao atualizar usuário:', e)
    res.status(500).json({ error: e.message })
  }
})

// Endpoints para gestão de perfis (admin only)
app.patch('/api/admin/listings/:id/activate', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.id === id)
      if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
      listing.active = true
      return res.json({ message: 'Perfil ativado com sucesso', listing })
    }
    
    const updated = await Listing.findByIdAndUpdate(id, { active: true }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' })
    res.json({ message: 'Perfil ativado com sucesso', listing: updated })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/admin/listings/:id/deactivate', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.id === id)
      if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
      listing.active = false
      return res.json({ message: 'Perfil desativado com sucesso', listing })
    }
    
    const updated = await Listing.findByIdAndUpdate(id, { active: false }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' })
    res.json({ message: 'Perfil desativado com sucesso', listing: updated })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/admin/listings/:id/verify', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.id === id)
      if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
      listing.verified = true
      return res.json({ message: 'Perfil verificado com sucesso', listing })
    }
    
    const updated = await Listing.findByIdAndUpdate(id, { verified: true }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' })
    res.json({ message: 'Perfil verificado com sucesso', listing: updated })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/admin/listings/:id/unverify', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.id === id)
      if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
      listing.verified = false
      return res.json({ message: 'Verificação removida com sucesso', listing })
    }
    
    const updated = await Listing.findByIdAndUpdate(id, { verified: false }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' })
    res.json({ message: 'Verificação removida com sucesso', listing: updated })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/admin/listings/:id/feature', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.id === id)
      if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
      listing.featured = true
      return res.json({ message: 'Perfil destacado com sucesso', listing })
    }
    
    const updated = await Listing.findByIdAndUpdate(id, { featured: true }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' })
    res.json({ message: 'Perfil destacado com sucesso', listing: updated })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/admin/listings/:id/unfeature', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.id === id)
      if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
      listing.featured = false
      return res.json({ message: 'Destaque removido com sucesso', listing })
    }
    
    const updated = await Listing.findByIdAndUpdate(id, { featured: false }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' })
    res.json({ message: 'Destaque removido com sucesso', listing: updated })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
// Upload inteligente com S3 (preferencial)
app.post('/api/upload-s3', uploadLimiter, auth('admin'), uploadMiddleware, (req, res) => {
  if (!req.uploadResults || req.uploadResults.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Nenhum ficheiro enviado' 
    })
  }
  
  res.json({
    success: true,
    message: `${req.uploadResults.length} ficheiro(s) enviado(s) com sucesso`,
    files: req.uploadResults,
    storage: req.uploadResults[0]?.storage || 'local'
  })
})

// Gerar URL assinada para upload direto do frontend
app.post('/api/generate-upload-url', auth('admin'), generateUploadUrl)

// Upload único (mantido para compatibilidade)
// Upload de uma foto (com Cloudinary)
app.post('/api/upload', uploadLimiter, auth(), smartUpload, processUpload, (req, res) => {
  if (!req.uploadResults || req.uploadResults.length === 0) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' })
  }
  
  res.json({ 
    success: true, 
    url: req.uploadResults[0].url,
    filename: req.uploadResults[0].filename,
    originalName: req.uploadResults[0].originalName,
    size: req.uploadResults[0].size,
    storage: req.uploadResults[0].storage
  })
})

// Upload múltiplo de fotos para galeria (com Cloudinary)
app.post('/api/upload-multiple', uploadLimiter, auth('admin'), smartUpload, processUpload, (req, res) => {
  if (!req.uploadResults || req.uploadResults.length === 0) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' })
  }
  
  res.json({ 
    success: true, 
    message: `${req.uploadResults.length} ficheiro(s) enviado(s) com sucesso`,
    files: req.uploadResults 
  })
})

// Endpoint para associar fotos a um perfil
app.post('/api/listings/:id/photos', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { photos } = req.body
    
    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({ error: 'Array de fotos é obrigatório' })
    }
    
    const connected = mongoose.connection.readyState === 1
    
    if (!connected) {
      const listing = mockListings.find(l => l.id === id)
      if (!listing) return res.status(404).json({ error: 'Perfil não encontrado' })
      listing.photos = [...(listing.photos || []), ...photos]
      return res.json({ message: 'Fotos associadas com sucesso', listing })
    }
    
    const updated = await Listing.findByIdAndUpdate(
      id,
      { $push: { photos: { $each: photos } } },
      { new: true }
    )
    
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' })
    res.json({ message: 'Fotos associadas com sucesso', listing: updated })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
connectDB().then(async () => {
  // Inicializar sistema de cache
  await initCache()
  
  // tentar semear base de dados se estiver vazia e criar admin
  seedIfEmpty().catch(()=>{})
  seedAdminIfMissing().catch(()=>{})
  seedDemoModelIfMissing().catch(()=>{})
  
  // Configurar Socket.IO para notificações
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id)
    
    // Juntar-se a salas específicas (por exemplo, por usuário)
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`)
      console.log(`Usuário ${userId} juntou-se à sala`)
    })
    
    // Lidar com desconexão
    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id)
    })
  })
  
  // Configurar Swagger
  setupSwagger(app)
  
  server.listen(PORT, () => console.log(`API a ouvir na porta ${PORT}`))
})

// Fallback de estatísticas em memória quando DB não está ligado
const mockStats = {
  // '2025-01-01': { views: 0, clicks: 0, calls: 0 }
}

function dayKey(d = new Date()) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Registo de eventos
app.post('/api/stats/track', async (req, res) => {
  try {
    const { listingId, type } = req.body || {}
    if (!listingId || !['view','click','call'].includes(type)) {
      return res.status(400).json({ error: 'listingId e type (view|click|call) são obrigatórios' })
    }

    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      const k = dayKey()
      mockStats[k] = mockStats[k] || { views: 0, clicks: 0, calls: 0 }
      mockStats[k][type + 's'] = (mockStats[k][type + 's'] || 0) + 1
      return res.json({ ok: true, source: 'mock' })
    }

    const today = new Date()
    today.setHours(0,0,0,0)
    const update = { $inc: { [`${type}s`]: 1 } }
    await Stat.findOneAndUpdate(
      { listingId, date: { $gte: today } },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    
    // Atualizar estatísticas totais do modelo
    if (type === 'call') {
      await Model.findByIdAndUpdate(
        listingId,
        { $inc: { totalCalls: 1 } },
        { new: true }
      )
    }
    
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Tracking detalhado para estatísticas de modelos
app.post('/api/stats/track-model', async (req, res) => {
  try {
    const { modelId, type, hour } = req.body || {}
    const validTypes = ['profileView', 'profileClick', 'phoneClick', 'whatsappClick', 'photoView']
    
    if (!modelId || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'modelId e type válido são obrigatórios' })
    }

    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      return res.json({ ok: true, source: 'mock' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Atualizar estatísticas diárias
    const updateDaily = { $inc: { [`dailyStats.${type}`]: 1 } }
    await ModelStat.findOneAndUpdate(
      { modelId, date: today },
      updateDaily,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    
    // Atualizar estatísticas horárias se fornecido
    if (hour !== undefined && hour >= 0 && hour <= 23) {
      const hourlyUpdate = {
        $inc: { 
          'hourlyStats.$[elem].views': type.includes('View') ? 1 : 0,
          'hourlyStats.$[elem].clicks': type.includes('Click') ? 1 : 0
        }
      }
      
      const hourlyOptions = {
        upsert: true,
        arrayFilters: [{ 'elem.hour': hour }],
        new: true
      }
      
      await ModelStat.findOneAndUpdate(
        { modelId, date: today, 'hourlyStats.hour': hour },
        hourlyUpdate,
        hourlyOptions
      )
    }
    
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Dashboard de estatísticas para modelos (acesso próprio)
app.get('/api/models/my-stats', auth('model'), async (req, res) => {
  try {
    const userId = req.user.id
    const { days = 7 } = req.query
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      return res.json({
        dailyStats: [],
        hourlyStats: [],
        totalStats: { profileViews: 0, profileClicks: 0, phoneClicks: 0, whatsappClicks: 0, photoViews: 0 }
      })
    }
    
    // Encontrar o modelo associado ao usuário
    const model = await Model.findOne({ email: req.user.email })
    if (!model) {
      return res.status(404).json({ error: 'Modelo não encontrado' })
    }
    
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - parseInt(days))
    
    // Buscar estatísticas dos últimos N dias
    const stats = await ModelStat.find({
      modelId: model._id,
      date: { $gte: sinceDate }
    }).sort({ date: 1 })
    
    // Calcular totais
    const totalStats = {
      profileViews: 0,
      profileClicks: 0,
      phoneClicks: 0,
      whatsappClicks: 0,
      photoViews: 0
    }
    
    stats.forEach(stat => {
      totalStats.profileViews += stat.dailyStats.profileViews || 0
      totalStats.profileClicks += stat.dailyStats.profileClicks || 0
      totalStats.phoneClicks += stat.dailyStats.phoneClicks || 0
      totalStats.whatsappClicks += stat.dailyStats.whatsappClicks || 0
      totalStats.photoViews += stat.dailyStats.photoViews || 0
    })
    
    res.json({
      dailyStats: stats,
      totalStats,
      modelInfo: {
        name: model.name,
        email: model.email,
        totalViews: model.stats.totalViews || 0,
        totalCalls: model.stats.totalCalls || 0
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Endpoint seguro para estatísticas do modelo (apenas próprias estatísticas)
app.get('/api/models/:id/stats', auth('model'), adminOrSelfAuth(), async (req, res) => {
  try {
    const { id } = req.params
    const { days = 7 } = req.query
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) {
      return res.json({
        dailyStats: [],
        hourlyStats: [],
        totalStats: { profileViews: 0, profileClicks: 0, phoneClicks: 0, whatsappClicks: 0, photoViews: 0 }
      })
    }
    
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - parseInt(days))
    
    // Buscar estatísticas dos últimos N dias
    const stats = await ModelStat.find({
      modelId: id,
      date: { $gte: sinceDate }
    }).sort({ date: 1 })
    
    // Calcular totais
    const totalStats = {
      profileViews: 0,
      profileClicks: 0,
      phoneClicks: 0,
      whatsappClicks: 0,
      photoViews: 0
    }
    
    stats.forEach(stat => {
      totalStats.profileViews += stat.dailyStats.profileViews || 0
      totalStats.profileClicks += stat.dailyStats.profileClicks || 0
      totalStats.phoneClicks += stat.dailyStats.phoneClicks || 0
      totalStats.whatsappClicks += stat.dailyStats.whatsappClicks || 0
      totalStats.photoViews += stat.dailyStats.photoViews || 0
    })
    
    // Buscar informações do modelo
    const model = await Model.findById(id)
    
    res.json({
      dailyStats: stats,
      totalStats,
      modelInfo: {
        name: model?.name || 'Modelo',
        email: model?.email || '',
        totalViews: model?.stats?.totalViews || 0,
        totalCalls: model?.stats?.totalCalls || 0
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Endpoints para Favoritos
app.post('/api/favorites/:listingId', authMiddleware(null, JWT_SECRET), async (req, res) => {
  try {
    const { listingId } = req.params
    const userId = req.user.id
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) return res.json({ ok: true, favorited: true })
    
    const favorite = await Favorite.findOneAndUpdate(
      { userId, listingId },
      { userId, listingId },
      { upsert: true, new: true }
    )
    
    res.json({ ok: true, favorited: true, favorite })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/favorites/:listingId', authMiddleware(null, JWT_SECRET), async (req, res) => {
  try {
    const { listingId } = req.params
    const userId = req.user.id
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) return res.json({ ok: true, favorited: false })
    
    await Favorite.findOneAndDelete({ userId, listingId })
    
    res.json({ ok: true, favorited: false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/favorites', authMiddleware(null, JWT_SECRET), async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 12 } = req.query
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) return res.json({ favorites: [], total: 0, pages: 0 })
    
    const skip = (page - 1) * limit
    
    const favorites = await Favorite.find({ userId })
      .populate('listingId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec()
    
    const total = await Favorite.countDocuments({ userId })
    const pages = Math.ceil(total / limit)
    
    res.json({
      favorites: favorites.map(f => f.listingId),
      total,
      pages,
      currentPage: parseInt(page)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/favorites/check/:listingId', authMiddleware(null, JWT_SECRET), async (req, res) => {
  try {
    const { listingId } = req.params
    const userId = req.user.id
    
    const connected = mongoose.connection.readyState === 1
    if (!connected) return res.json({ favorited: false })
    
    const favorite = await Favorite.findOne({ userId, listingId })
    
    res.json({ favorited: !!favorite })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Resumo admin dos últimos N dias
app.get('/api/admin/stats-summary', auth('admin'), async (req, res) => {
  try {
    const days = Math.max(1, Math.min(60, Number(req.query.days || 7)))
    const connected = mongoose.connection.readyState === 1
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    since.setHours(0,0,0,0)

    if (!connected) {
      const out = []
      const now = new Date()
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const k = dayKey(d)
        const { views = 0, clicks = 0, calls = 0 } = mockStats[k] || {}
        out.push({ date: k, views, clicks, calls })
      }
      return res.json({ days, series: out, source: 'mock' })
    }

    const series = await Stat.aggregate([
      { $match: { date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          views: { $sum: '$views' },
          clicks: { $sum: '$clicks' },
          calls: { $sum: '$calls' },
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', views: 1, clicks: 1, calls: 1 } }
    ])

    // Garantir dias sem dados vêm a zero
    const map = new Map(series.map(r => [r.date, r]))
    const out = []
    for (let d = new Date(since), i = 0; i < days; i++, d.setDate(d.getDate() + 1)) {
      const k = dayKey(d)
      out.push(map.get(k) || { date: k, views: 0, clicks: 0, calls: 0 })
    }

    res.json({ days, series: out })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Rotas de Analytics
import analyticsRoutes from './routes/analytics.js'
import notificationRoutes, { setNotificationService } from './routes/notifications.js'
import testNotificationRoutes, { setTestNotificationService } from './routes/testNotifications.js'
app.use('/api/analytics', analyticsRoutes)

// Configurar serviço de notificações nas rotas
setNotificationService(notificationService)
app.use('/api/notifications', notificationRoutes)

// Configurar serviço de teste de notificações
setTestNotificationService(notificationService)
app.use('/api/test-notifications', testNotificationRoutes)

// Redirecionamento com tracking para WhatsApp
app.get('/r/wa/:id', async (req, res) => {
  try {
    const { id } = req.params
    const connected = mongoose.connection.readyState === 1

    if (!connected) {
      // Sem DB, não há tracking consistente; voltar à home
      return res.redirect(302, process.env.FRONTEND_URL || 'http://localhost:5174/')
    }

    const model = await Model.findById(id)
    if (!model || !model.phone) {
      return res.redirect(302, process.env.FRONTEND_URL || 'http://localhost:5174/')
    }

    const phoneDigits = String(model.phone).replace(/[^0-9+]/g, '')
    const today = new Date(); today.setHours(0,0,0,0)

    // Atualizar estatísticas detalhadas do modelo (whatsappClicks)
    await ModelStat.findOneAndUpdate(
      { modelId: model._id, date: today },
      {
        $setOnInsert: { modelId: model._id, date: today },
        $inc: { 'dailyStats.whatsappClicks': 1, 'dailyStats.profileClicks': 1 }
      },
      { upsert: true }
    )

    // Tracking genérico
    try { await analytics.trackEvent('whatsapp_click', { modelId: String(model._id), phone: phoneDigits }) } catch {}

    const waUrl = `https://wa.me/${phoneDigits}`
    return res.redirect(302, waUrl)
  } catch (e) {
    console.error('Erro no redirecionamento WhatsApp:', e)
    return res.redirect(302, process.env.FRONTEND_URL || 'http://localhost:5174/')
  }
})

// Error handler (Multer/Busboy e genérico) — manter no fim para apanhar erros de rotas anteriores
app.use((err, req, res, next) => {
  try {
    console.error('Express error handler:', err && (err.stack || err.message) || err)
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Tamanho de ficheiro excede o limite' })
    }
    if (err && err.message && err.message.includes('Unexpected end of form')) {
      return res.status(400).json({ error: 'Formulário incompleto (upload interrompido)' })
    }
    if (err && (err.name === 'MulterError')) {
      return res.status(400).json({ error: err.message })
    }
    if (err) {
      return res.status(500).json({ error: err.message || 'Erro interno' })
    }
    return next()
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno' })
  }
})

// Sistema de Backup Automático
const backupDir = path.resolve(process.cwd(), 'backups')
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

// Função para criar backup da base de dados
async function createDatabaseBackup() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Backup automático: Base de dados não conectada, skipando backup')
      return
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
    
    // Backup de modelos
    const models = await Model.find({})
    const users = await User.find({})
    const listings = await Listing.find({})
    const reviews = await Review.find({})
    const stats = await Stat.find({})
    const modelStats = await ModelStat.find({})
    const favorites = await Favorite.find({})
    
    const backupData = {
      timestamp: new Date().toISOString(),
      models,
      users,
      listings,
      reviews,
      stats,
      modelStats,
      favorites
    }
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
    console.log(`Backup automático criado: ${backupFile}`)
    
    // Manter apenas os últimos 7 backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse()
    
    if (files.length > 7) {
      for (let i = 7; i < files.length; i++) {
        fs.unlinkSync(path.join(backupDir, files[i]))
        console.log(`Backup antigo removido: ${files[i]}`)
      }
    }
    
  } catch (error) {
    console.error('Erro ao criar backup automático:', error.message)
  }
}

// Agendar backup diário às 2h da manhã
const scheduleBackup = () => {
  const now = new Date()
  const targetTime = new Date(now)
  targetTime.setHours(2, 0, 0, 0) // 2h da manhã
  
  if (now > targetTime) {
    targetTime.setDate(targetTime.getDate() + 1)
  }
  
  const timeUntilBackup = targetTime.getTime() - now.getTime()
  
  setTimeout(() => {
    createDatabaseBackup()
    // Agendar próximo backup para 24 horas depois
    setInterval(createDatabaseBackup, 24 * 60 * 60 * 1000)
  }, timeUntilBackup)
  
  console.log(`Backup automático agendado para ${targetTime.toLocaleString('pt-PT')}`)
}

// Iniciar agendamento de backup
scheduleBackup()

// Endpoint manual para trigger de backup (admin only)
app.post('/api/admin/backup', auth('admin'), async (req, res) => {
  try {
    await createDatabaseBackup()
    res.json({ message: 'Backup manual executado com sucesso' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao executar backup: ' + error.message })
  }
})

// Endpoint para listar backups disponíveis (admin only)
app.get('/api/admin/backups', auth('admin'), async (req, res) => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .map(f => ({
        filename: f,
        path: path.join(backupDir, f),
        size: fs.statSync(path.join(backupDir, f)).size,
        created: fs.statSync(path.join(backupDir, f)).birthtime
      }))
    
    res.json({ backups: files })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar backups: ' + error.message })
  }
})