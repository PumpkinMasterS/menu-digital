#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

console.log('🚀 Configurando AWS S3 para o projeto...\n')

// Verificar se as dependências estão instaladas
try {
  console.log('📦 Verificando dependências do AWS SDK...')
  execSync('npm list @aws-sdk/client-s3', { stdio: 'pipe' })
  console.log('✅ @aws-sdk/client-s3 já está instalado')
} catch (error) {
  console.log('📦 Instalando @aws-sdk/client-s3...')
  execSync('npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner', { stdio: 'inherit' })
}

// Verificar se o arquivo .env existe
const envPath = path.join(process.cwd(), '.env')
const envExamplePath = path.join(process.cwd(), '.env.example')

if (!fs.existsSync(envPath)) {
  console.log('\n🔧 Criando arquivo .env a partir de .env.example...')
  
  if (fs.existsSync(envExamplePath)) {
    const envContent = fs.readFileSync(envExamplePath, 'utf8')
    fs.writeFileSync(envPath, envContent)
    console.log('✅ Arquivo .env criado com sucesso')
  } else {
    console.log('❌ Arquivo .env.example não encontrado')
    process.exit(1)
  }
}

// Verificar se as variáveis do S3 estão configuradas
const envContent = fs.readFileSync(envPath, 'utf8')
const requiredVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME'
]

const missingVars = requiredVars.filter(varName => !envContent.includes(varName))

if (missingVars.length > 0) {
  console.log('\n⚠️  Variáveis do AWS S3 não configuradas:')
  missingVars.forEach(varName => console.log(`   - ${varName}`))
  
  console.log('\n📝 Por favor, adicione estas variáveis ao arquivo .env:')
  console.log('AWS_ACCESS_KEY_ID=seu_access_key_id_aqui')
  console.log('AWS_SECRET_ACCESS_KEY=seu_secret_access_key_aqui')
  console.log('AWS_REGION=us-east-1')
  console.log('AWS_S3_BUCKET_NAME=seu-bucket-nome-aqui')
  console.log('')
  console.log('💡 Você pode obter estas credenciais no AWS Console -> IAM')
} else {
  console.log('✅ Todas as variáveis do AWS S3 estão configuradas')
}

console.log('\n🎉 Configuração do AWS S3 concluída!')
console.log('\n📋 Próximos passos:')
console.log('1. Configure suas credenciais AWS no arquivo .env')
console.log('2. Crie um bucket S3 no AWS Console')
console.log('3. Execute o servidor: npm run dev')
console.log('4. Teste o upload em: http://localhost:4000')

// Verificar se o bucket existe (opcional)
console.log('\n🔍 Dica: Para criar um bucket S3, você pode:')
console.log('   - Usar AWS Console: https://s3.console.aws.amazon.com')
console.log('   - Usar AWS CLI: aws s3 mb s3://nome-do-seu-bucket')
console.log('   - Configurar políticas de acesso apropriadas')