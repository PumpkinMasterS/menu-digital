import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

async function testConnection() {
  console.log('🔗 Testando conexão com MongoDB Atlas...')
  console.log('URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@')) // Mask password
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    
    console.log('✅ Conexão bem-sucedida!')
    console.log('📊 Informações do servidor:')
    
    const adminDb = mongoose.connection.db.admin()
    const serverInfo = await adminDb.serverInfo()
    console.log('Versão:', serverInfo.version)
    console.log('Host:', mongoose.connection.host)
    console.log('Database:', mongoose.connection.name)
    
    // Listar coleções
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log('\n📋 Coleções existentes:')
    collections.forEach(col => console.log(' -', col.name))
    
    await mongoose.disconnect()
    console.log('\n✅ Teste concluído com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message)
    console.log('\n🔍 Possíveis causas:')
    console.log('1. String de conexão incorreta')
    console.log('2. IP não está na whitelist do Atlas')
    console.log('3. Problemas de rede')
    console.log('4. Credenciais inválidas')
    process.exit(1)
  }
}

testConnection()