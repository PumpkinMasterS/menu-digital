import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'

// Criar uma versão simplificada do servidor para testes
const app = express()
app.use(express.json())

// Schema simplificado do listing para testes
const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  city: { type: String, required: true },
  price: { type: Number, required: true },
  age: { type: Number, required: true },
  verified: { type: Boolean, default: false },
  category: { type: String, default: 'standard' },
  images: [String],
  createdAt: { type: Date, default: Date.now }
})

const Listing = mongoose.model('Listing', listingSchema)

// Rota de listings para teste
app.get('/api/listings', async (req, res) => {
  try {
    const {
      city,
      search,
      minAge,
      maxAge,
      minPrice,
      maxPrice,
      category,
      verified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query

    let filter = {}

    if (city) filter.city = new RegExp(city, 'i')
    if (search) filter.title = new RegExp(search, 'i')
    if (minAge) filter.age = { ...filter.age, $gte: parseInt(minAge) }
    if (maxAge) filter.age = { ...filter.age, $lte: parseInt(maxAge) }
    if (minPrice) filter.price = { ...filter.price, $gte: parseInt(minPrice) }
    if (maxPrice) filter.price = { ...filter.price, $lte: parseInt(maxPrice) }
    if (category && category !== 'all') filter.category = category
    if (verified === 'true') filter.verified = true

    const sortOptions = {}
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1

    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const listings = await Listing.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Listing.countDocuments(filter)
    const pages = Math.ceil(total / parseInt(limit))

    res.json({
      listings,
      total,
      pages,
      currentPage: parseInt(page)
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

describe('Listings API', () => {
  beforeEach(async () => {
    // Criar dados de teste
    await Listing.create([
      {
        title: 'Apartamento Lisboa Centro',
        city: 'Lisboa',
        price: 1200,
        age: 25,
        verified: true,
        category: 'premium',
        images: ['image1.jpg']
      },
      {
        title: 'Casa Porto Vintage',
        city: 'Porto',
        price: 800,
        age: 30,
        verified: false,
        category: 'standard',
        images: ['image2.jpg']
      },
      {
        title: 'Estúdio Lisboa Moderno',
        city: 'Lisboa',
        price: 600,
        age: 22,
        verified: true,
        category: 'premium',
        images: ['image3.jpg']
      }
    ])
  })

  describe('GET /api/listings', () => {
    test('deve retornar todos os listings', async () => {
      const response = await request(app)
        .get('/api/listings')
        .expect(200)

      expect(response.body.listings).toHaveLength(3)
      expect(response.body.total).toBe(3)
      expect(response.body.pages).toBe(1)
      expect(response.body.currentPage).toBe(1)
    })

    test('deve filtrar por cidade', async () => {
      const response = await request(app)
        .get('/api/listings?city=Lisboa')
        .expect(200)

      expect(response.body.listings).toHaveLength(2)
      expect(response.body.listings.every(listing => listing.city === 'Lisboa')).toBe(true)
    })

    test('deve filtrar por pesquisa', async () => {
      const response = await request(app)
        .get('/api/listings?search=Apartamento')
        .expect(200)

      expect(response.body.listings).toHaveLength(1)
      expect(response.body.listings[0].title).toContain('Apartamento')
    })

    test('deve filtrar por faixa de preço', async () => {
      const response = await request(app)
        .get('/api/listings?minPrice=700&maxPrice=1000')
        .expect(200)

      expect(response.body.listings).toHaveLength(1)
      expect(response.body.listings[0].price).toBe(800)
    })

    test('deve filtrar por faixa de idade', async () => {
      const response = await request(app)
        .get('/api/listings?minAge=20&maxAge=25')
        .expect(200)

      expect(response.body.listings).toHaveLength(2)
      expect(response.body.listings.every(listing => listing.age >= 20 && listing.age <= 25)).toBe(true)
    })

    test('deve filtrar por categoria', async () => {
      const response = await request(app)
        .get('/api/listings?category=premium')
        .expect(200)

      expect(response.body.listings).toHaveLength(2)
      expect(response.body.listings.every(listing => listing.category === 'premium')).toBe(true)
    })

    test('deve filtrar por verificação', async () => {
      const response = await request(app)
        .get('/api/listings?verified=true')
        .expect(200)

      expect(response.body.listings).toHaveLength(2)
      expect(response.body.listings.every(listing => listing.verified === true)).toBe(true)
    })

    test('deve ordenar por preço crescente', async () => {
      const response = await request(app)
        .get('/api/listings?sortBy=price&sortOrder=asc')
        .expect(200)

      const prices = response.body.listings.map(listing => listing.price)
      expect(prices).toEqual([600, 800, 1200])
    })

    test('deve ordenar por preço decrescente', async () => {
      const response = await request(app)
        .get('/api/listings?sortBy=price&sortOrder=desc')
        .expect(200)

      const prices = response.body.listings.map(listing => listing.price)
      expect(prices).toEqual([1200, 800, 600])
    })

    test('deve paginar resultados', async () => {
      const response = await request(app)
        .get('/api/listings?page=1&limit=2')
        .expect(200)

      expect(response.body.listings).toHaveLength(2)
      expect(response.body.total).toBe(3)
      expect(response.body.pages).toBe(2)
      expect(response.body.currentPage).toBe(1)
    })

    test('deve combinar múltiplos filtros', async () => {
      const response = await request(app)
        .get('/api/listings?city=Lisboa&verified=true&minPrice=500&maxPrice=1000')
        .expect(200)

      expect(response.body.listings).toHaveLength(1)
      expect(response.body.listings[0].title).toBe('Estúdio Lisboa Moderno')
    })
  })
})