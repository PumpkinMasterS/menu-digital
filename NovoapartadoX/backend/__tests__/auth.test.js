import request from 'supertest'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

// Mock das variáveis de ambiente
process.env.JWT_SECRET = 'test-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'

// Criar uma versão simplificada do servidor para testes
const app = express()
app.use(express.json())

// Middleware simples de autenticação para testes
function authTestMiddleware(requiredRole = null) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token de acesso requerido' })
    }

    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: 'Permissões insuficientes' })
      }
      req.user = decoded
      next()
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' })
      }
      return res.status(401).json({ message: 'Token inválido' })
    }
  }
}

// Rotas protegidas para testes de autorização
app.get('/api/protected', authTestMiddleware(), (req, res) => {
  res.json({ message: 'Acesso permitido' })
})

app.get('/api/admin-only', authTestMiddleware('admin'), (req, res) => {
  res.json({ message: 'Acesso admin permitido' })
})

// Rota de refresh token para testes
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token é obrigatório' })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Refresh token inválido' })
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    return res.json({ accessToken })
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' })
  }
})

// Schema simplificado do usuário para testes
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, default: 'user' }
})

const User = mongoose.model('User', userSchema)

// Rotas de autenticação para teste
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = new User({ email, password: hashedPassword, name })
    await user.save()

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name }
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' })
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login realizado com sucesso',
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name }
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

describe('Autenticação', () => {
  describe('POST /api/auth/register', () => {
    test('deve registrar um novo usuário', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.message).toBe('Usuário criado com sucesso')
      expect(response.body.accessToken).toBeDefined()
      expect(response.body.refreshToken).toBeDefined()
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.name).toBe(userData.name)
    })

    test('deve retornar erro se email já existe', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User'
      }

      // Primeiro registro
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      // Segundo registro com mesmo email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.message).toBe('Usuário já existe')
    })

    test('deve retornar erro se campos obrigatórios estão ausentes', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400)

      expect(response.body.message).toBe('Email e senha são obrigatórios')
    })
  })
})

describe('Autorização e RBAC', () => {
  test('deve negar acesso sem token', async () => {
    const res = await request(app)
      .get('/api/protected')
      .expect(401)

    expect(res.body.message).toBe('Token de acesso requerido')
  })

  test('deve negar acesso com token inválido', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body.message).toBe('Token inválido')
  })

  test('deve negar acesso com token expirado', async () => {
    const expiredToken = jwt.sign({ userId: '123' }, process.env.JWT_SECRET, { expiresIn: '1ms' })
    // Esperar expirar
    await new Promise(r => setTimeout(r, 5))

    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)

    expect(res.body.message).toBe('Token expirado')
  })

  test('deve permitir acesso com token válido', async () => {
    const token = jwt.sign({ userId: '123', role: 'user' }, process.env.JWT_SECRET, { expiresIn: '15m' })

    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.message).toBe('Acesso permitido')
  })

  test('deve negar acesso admin-only para role user', async () => {
    const token = jwt.sign({ userId: '123', role: 'user' }, process.env.JWT_SECRET, { expiresIn: '15m' })

    const res = await request(app)
      .get('/api/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(res.body.message).toBe('Permissões insuficientes')
  })

  test('deve permitir acesso admin-only para role admin', async () => {
    const token = jwt.sign({ userId: '123', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '15m' })

    const res = await request(app)
      .get('/api/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.message).toBe('Acesso admin permitido')
  })
})

describe('Refresh Token', () => {
  test('deve retornar erro quando refresh token está ausente', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({})
      .expect(400)

    expect(res.body.message).toBe('Refresh token é obrigatório')
  })

  test('deve retornar erro quando refresh token é inválido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.token' })
      .expect(401)

    expect(res.body.message).toBe('Token inválido')
  })

  test('deve retornar erro quando refresh token não é do tipo refresh', async () => {
    const wrongTypeToken = jwt.sign({ userId: '123', type: 'access' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: wrongTypeToken })
      .expect(401)

    expect(res.body.message).toBe('Refresh token inválido')
  })

  test('deve emitir novo access token com refresh válido', async () => {
    const refreshToken = jwt.sign({ userId: '123', email: 'user@test', role: 'user', type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200)

    expect(res.body.accessToken).toBeDefined()
  })
})
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' })
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login realizado com sucesso',
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name }
    })
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})