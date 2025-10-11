import MultiProjectMongoDBManager from './mongodb-manager.js'

async function testManager() {
    console.log('🧪 Testando MultiProjectMongoDBManager...')
    
    const manager = new MultiProjectMongoDBManager()
    
    console.log('📋 Listando projetos:')
    manager.listProjects()
    
    console.log('\n🔗 Testando conexão:')
    const connected = await manager.connect()
    
    if (connected) {
        console.log('\n📊 Obtendo informações:')
        await manager.getCurrentDatabaseInfo()
        
        console.log('\n🚀 Configurando coleções:')
        await manager.setupStandardCollections()
        
        await manager.disconnect()
    }
    
    console.log('✅ Teste concluído!')
}

testManager().catch(console.error)