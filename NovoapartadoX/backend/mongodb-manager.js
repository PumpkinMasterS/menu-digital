import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

dotenv.config()

class MultiProjectMongoDBManager {
  constructor() {
    this.connection = null
    this.currentProject = process.env.MONGODB_PROJECT || 'novoapartadox_prod'
    this.configFile = join(process.cwd(), '.mongo-projects.json')
    this.loadProjectsConfig()
  }

  loadProjectsConfig() {
    try {
      if (existsSync(this.configFile)) {
        const config = JSON.parse(readFileSync(this.configFile, 'utf8'))
        this.projects = config.projects || {}
        this.currentProject = config.currentProject || this.currentProject
      } else {
        this.projects = {}
        this.initializeDefaultProjects()
      }
    } catch (error) {
      console.warn('❌ Erro ao carregar configuração de projetos:', error.message)
      this.projects = {}
      this.initializeDefaultProjects()
    }
  }

  saveProjectsConfig() {
    try {
      const config = {
        projects: this.projects,
        currentProject: this.currentProject,
        updatedAt: new Date().toISOString()
      }
      writeFileSync(this.configFile, JSON.stringify(config, null, 2))
    } catch (error) {
      console.warn('❌ Erro ao salvar configuração:', error.message)
    }
  }

  initializeDefaultProjects() {
    this.projects = {
      'novoapartadox_prod': {
        name: 'Produção - NovoApartadoX',
        database: 'novoapartadox_prod',
        uri: 'mongodb+srv://whiswher_db_user:KgvXln6lckWmgGgB@cluster0.nrsrh8h.mongodb.net/novoapartadox_prod',
        description: 'Ambiente de produção principal',
        createdAt: new Date().toISOString()
      },
      'novoapartadox_dev': {
        name: 'Desenvolvimento - NovoApartadoX',
        database: 'novoapartadox_dev',
        uri: 'mongodb+srv://whiswher_db_user:KgvXln6lckWmgGgB@cluster0.nrsrh8h.mongodb.net/novoapartadox_dev',
        description: 'Ambiente de desenvolvimento',
        createdAt: new Date().toISOString()
      },
      'novoapartadox_test': {
        name: 'Teste - NovoApartadoX',
        database: 'novoapartadox_test',
        uri: 'mongodb+srv://whiswher_db_user:KgvXln6lckWmgGgB@cluster0.nrsrh8h.mongodb.net/novoapartadox_test',
        description: 'Ambiente de testes',
        createdAt: new Date().toISOString()
      }
    }
    this.saveProjectsConfig()
  }

  async connect(projectName = null) {
    const targetProject = projectName || this.currentProject
    
    if (!this.projects[targetProject]) {
      console.error(`❌ Projeto "${targetProject}" não encontrado!`)
      return false
    }

    const project = this.projects[targetProject]
    
    try {
      console.log(`🔗 Conectando ao projeto: ${project.name}`)
      console.log(`📊 Database: ${project.database}`)
      
      this.connection = await mongoose.connect(project.uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })

      console.log('✅ Conexão bem-sucedida!')
      console.log(`🏷️  Host: ${mongoose.connection.host}`)
      console.log(`📁 Database atual: ${mongoose.connection.db.databaseName}`)
      
      this.currentProject = targetProject
      this.saveProjectsConfig()
      
      return true
    } catch (error) {
      console.error('❌ Erro na conexão:', error.message)
      return false
    }
  }

  addProject(projectId, config) {
    if (this.projects[projectId]) {
      console.warn(`⚠️  Projeto "${projectId}" já existe. Atualizando...`)
    }

    this.projects[projectId] = {
      ...config,
      updatedAt: new Date().toISOString(),
      createdAt: this.projects[projectId]?.createdAt || new Date().toISOString()
    }
    
    this.saveProjectsConfig()
    console.log(`✅ Projeto "${projectId}" adicionado/atualizado!`)
    return true
  }

  removeProject(projectId) {
    if (!this.projects[projectId]) {
      console.error(`❌ Projeto "${projectId}" não encontrado!`)
      return false
    }

    delete this.projects[projectId]
    
    if (this.currentProject === projectId) {
      this.currentProject = Object.keys(this.projects)[0] || 'novoapartadox_prod'
    }
    
    this.saveProjectsConfig()
    console.log(`✅ Projeto "${projectId}" removido!`)
    return true
  }

  listProjects() {
    console.log('\n📋 Projetos MongoDB disponíveis:')
    console.log('='.repeat(50))
    
    Object.entries(this.projects).forEach(([id, project]) => {
      const currentIndicator = id === this.currentProject ? ' ← ATUAL' : ''
      console.log(`\n🔹 ${id}${currentIndicator}`)
      console.log(`   Nome: ${project.name}`)
      console.log(`   Database: ${project.database}`)
      console.log(`   Descrição: ${project.description}`)
      console.log(`   Criado: ${new Date(project.createdAt).toLocaleString('pt-BR')}`)
    })
    
    console.log('\n' + '='.repeat(50))
  }

  async switchProject(projectId) {
    if (!this.projects[projectId]) {
      console.error(`❌ Projeto "${projectId}" não encontrado!`)
      this.listProjects()
      return false
    }

    console.log(`🔄 Alternando para projeto: ${projectId}`)
    
    // Desconectar se já estiver conectado
    if (this.connection) {
      await mongoose.disconnect()
      console.log('🔌 Desconectado do projeto anterior')
    }

    // Conectar ao novo projeto
    const success = await this.connect(projectId)
    
    if (success) {
      console.log(`✅ Agora usando projeto: ${this.projects[projectId].name}`)
    }
    
    return success
  }

  async getCurrentDatabaseInfo() {
    if (!this.connection) {
      console.error('❌ Não há conexão ativa!')
      return null
    }

    try {
      const db = mongoose.connection.db
      const stats = await db.stats()
      const collections = await db.listCollections().toArray()
      
      console.log('\n📊 Informações do Database Atual:')
      console.log('='.repeat(40))
      console.log(`🏷️  Nome: ${stats.db}`)
      console.log(`📁 Coleções: ${stats.collections}`)
      console.log(`📄 Documentos: ${stats.objects}`)
      console.log(`💾 Tamanho: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`)
      console.log(`💿 Armazenamento: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`)
      
      console.log('\n📋 Coleções disponíveis:')
      collections.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.name}`)
      })
      
      return { stats, collections }
    } catch (error) {
      console.error('❌ Erro ao obter informações:', error.message)
      return null
    }
  }

  async createCollection(collectionName, indexes = []) {
    if (!this.connection) {
      console.error('❌ Não há conexão ativa!')
      return false
    }

    try {
      const db = mongoose.connection.db
      
      // Verificar se a coleção já existe
      const collections = await db.listCollections({ name: collectionName }).toArray()
      
      if (collections.length === 0) {
        console.log(`📁 Criando coleção: ${collectionName}`)
        await db.createCollection(collectionName)
        
        // Criar índices se especificados
        if (indexes.length > 0) {
          const collection = db.collection(collectionName)
          for (const index of indexes) {
            await collection.createIndex(index.keys, index.options)
            console.log(`   📊 Índice criado: ${JSON.stringify(index.keys)}`)
          }
        }
        
        console.log(`✅ Coleção ${collectionName} criada com sucesso!`)
        return true
      } else {
        console.log(`ℹ️  Coleção ${collectionName} já existe`)
        return false
      }
    } catch (error) {
      console.error(`❌ Erro ao criar coleção ${collectionName}:`, error.message)
      return false
    }
  }

  async setupStandardCollections() {
    console.log('\n🚀 Configurando coleções padrão do projeto...')
    
    const collections = [
      {
        name: 'users',
        indexes: [
          { keys: { email: 1 }, options: { unique: true } },
          { keys: { role: 1 } },
          { keys: { createdAt: -1 } }
        ]
      },
      {
        name: 'listings',
        indexes: [
          { keys: { userId: 1 } },
          { keys: { city: 1 } },
          { keys: { category: 1 } },
          { keys: { active: 1 } },
          { keys: { verified: 1 } },
          { keys: { featured: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { price: 1 } }
        ]
      },
      {
        name: 'stats',
        indexes: [
          { keys: { listingId: 1, date: 1 }, options: { unique: true } }
        ]
      },
      {
        name: 'sessions',
        indexes: [
          { keys: { expires: 1 }, options: { expireAfterSeconds: 0 } }
        ]
      }
    ]

    let createdCount = 0
    for (const collectionConfig of collections) {
      const created = await this.createCollection(collectionConfig.name, collectionConfig.indexes)
      if (created) createdCount++
    }

    console.log(`✅ ${createdCount} coleções configuradas!`)
    return createdCount
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect()
      this.connection = null
      console.log('\n🔌 Desconectado do MongoDB')
      return true
    }
    return false
  }
}

// Interface de linha de comando
async function main() {
  const manager = new MultiProjectMongoDBManager()
  
  const args = process.argv.slice(2)
  const command = args[0]
  
  try {
    switch (command) {
      case 'list':
        manager.listProjects()
        break
        
      case 'switch':
        if (args.length < 2) {
          console.error('❌ Uso: node mongodb-manager.js switch <project-id>')
          process.exit(1)
        }
        await manager.switchProject(args[1])
        break
        
      case 'info':
        await manager.connect()
        await manager.getCurrentDatabaseInfo()
        break
        
      case 'setup':
        await manager.connect()
        await manager.setupStandardCollections()
        break
        
      case 'add':
        if (args.length < 5) {
          console.error('❌ Uso: node mongodb-manager.js add <id> <name> <database> <uri>')
          process.exit(1)
        }
        manager.addProject(args[1], {
          name: args[2],
          database: args[3],
          uri: args[4],
          description: args[5] || 'Novo projeto MongoDB'
        })
        break
        
      case 'remove':
        if (args.length < 2) {
          console.error('❌ Uso: node mongodb-manager.js remove <project-id>')
          process.exit(1)
        }
        manager.removeProject(args[1])
        break
        
      case 'connect':
        await manager.connect(args[1] || null)
        break
        
      default:
        console.log('\n🚀 MongoDB Multi-Project Manager')
        console.log('='.repeat(40))
        console.log('Comandos disponíveis:')
        console.log('  list          - Lista todos os projetos')
        console.log('  switch <id>   - Alterna para outro projeto')
        console.log('  info          - Mostra informações do database atual')
        console.log('  setup         - Configura coleções padrão')
        console.log('  add <id> <name> <db> <uri> [desc] - Adiciona novo projeto')
        console.log('  remove <id>   - Remove um projeto')
        console.log('  connect [id]  - Conecta a um projeto')
        console.log('')
        console.log('Exemplos:')
        console.log('  node mongodb-manager.js list')
        console.log('  node mongodb-manager.js switch novoapartadox_dev')
        console.log('  node mongodb-manager.js add meu_projeto "Meu Projeto" meu_db mongodb://...')
    }
    
  } catch (error) {
    console.error('❌ Erro no processo:', error.message)
  } finally {
    await manager.disconnect()
    process.exit(0)
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default MultiProjectMongoDBManager