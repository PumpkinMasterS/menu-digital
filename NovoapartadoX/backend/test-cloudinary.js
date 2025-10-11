import { isCloudinaryConfigured } from './cloudinary-service.mjs'

console.log('🔍 Testando configuração do Cloudinary...')

const configStatus = isCloudinaryConfigured()

if (configStatus.configured) {
  console.log('✅ Cloudinary configurado corretamente!')
  console.log('📋 Detalhes da configuração:')
  console.log(`   Cloud Name: ${configStatus.cloudName}`)
  console.log(`   API Key: ${configStatus.apiKey ? '✅ Configurada' : '❌ Faltando'}`)
  console.log(`   API Secret: ${configStatus.apiSecret ? '✅ Configurada' : '❌ Faltando'}`)
  
  if (configStatus.apiKey && configStatus.apiSecret) {
    console.log('🎉 Todas as credenciais estão presentes!')
    console.log('📝 Próximo passo: Testar upload com npm run dev')
  } else {
    console.log('❌ Credenciais incompletas. Verifique o arquivo .env')
  }
} else {
  console.log('❌ Cloudinary não está configurado')
  console.log('💡 Verifique se as variáveis estão no arquivo .env:')
  console.log('   CLOUDINARY_CLOUD_NAME=seu-cloud-name')
  console.log('   CLOUDINARY_API_KEY=sua-api-key')
  console.log('   CLOUDINARY_API_SECRET=sua-api-secret')
}

console.log('\n📊 Status atual:')
console.log(JSON.stringify(configStatus, null, 2))