const fs = require('fs');
const path = require('path');

console.log('🧹 Limpando arquivos desnecessários para produção...\n');

// Arquivos e padrões para remover
const filesToRemove = [
  // Arquivos de teste
  'test-*.js',
  'test-*.mjs', 
  'quick-test.js',
  'quick-test.mjs',
  'setup-e2e-test.js',
  'demo-script.js',
  
  // Arquivos de desenvolvimento
  'package-test.json',
  'come acessar os roles.xlsx',
  
  // Documentação de desenvolvimento
  'test-*.md',
  'TESTE-*.md',
  
  // Duplicados identificados
  'src/pages/AdminDashboard-updated.tsx'
];

// Diretórios para remover completamente
const dirsToRemove = [
  '.cursor',
  '.github' // opcional - manter se usando CI/CD
];

let removedCount = 0;
let errorCount = 0;

// Função para verificar se arquivo corresponde ao padrão
function matchesPattern(filename, pattern) {
  const regex = new RegExp(pattern.replace('*', '.*'));
  return regex.test(filename);
}

// Remover arquivos
filesToRemove.forEach(pattern => {
  try {
    if (pattern.includes('*')) {
      // Padrão com wildcard - buscar arquivos correspondentes
      const files = fs.readdirSync('.').filter(file => matchesPattern(file, pattern));
      files.forEach(file => {
        try {
          fs.unlinkSync(file);
          console.log(`✅ Removido: ${file}`);
          removedCount++;
        } catch (err) {
          console.log(`⚠️  Não foi possível remover: ${file} (${err.message})`);
          errorCount++;
        }
      });
    } else {
      // Arquivo específico
      if (fs.existsSync(pattern)) {
        fs.unlinkSync(pattern);
        console.log(`✅ Removido: ${pattern}`);
        removedCount++;
      } else {
        console.log(`ℹ️  Arquivo não encontrado: ${pattern}`);
      }
    }
  } catch (err) {
    console.log(`❌ Erro ao processar: ${pattern} (${err.message})`);
    errorCount++;
  }
});

// Remover diretórios
dirsToRemove.forEach(dir => {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Diretório removido: ${dir}`);
      removedCount++;
    } else {
      console.log(`ℹ️  Diretório não encontrado: ${dir}`);
    }
  } catch (err) {
    console.log(`❌ Erro ao remover diretório: ${dir} (${err.message})`);
    errorCount++;
  }
});

// Limpeza específica do src
console.log('\n🔍 Verificando duplicações no src/...');

// Verificar se ainda existem duplicações
const potentialDuplicates = [
  'src/pages/AdminDashboard-updated.tsx'
];

potentialDuplicates.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`✅ Duplicado removido: ${file}`);
      removedCount++;
    } catch (err) {
      console.log(`❌ Erro ao remover duplicado: ${file} (${err.message})`);
      errorCount++;
    }
  }
});

// Verificar arquivos .log
console.log('\n📋 Verificando arquivos de log...');
const logFiles = fs.readdirSync('.').filter(file => file.endsWith('.log'));
if (logFiles.length > 0) {
  console.log(`⚠️  Encontrados ${logFiles.length} arquivos .log - considere removê-los manualmente:`);
  logFiles.forEach(file => console.log(`   - ${file}`));
}

// Verificar node_modules desnecessários
console.log('\n📦 Verificando dependências...');
if (fs.existsSync('node_modules')) {
  const nodeModulesSize = fs.statSync('node_modules').size;
  console.log(`ℹ️  node_modules presente - execute 'npm prune' para remover dependências desnecessárias`);
}

// Sumário
console.log('\n📊 RESUMO DA LIMPEZA:');
console.log(`✅ Arquivos/diretórios removidos: ${removedCount}`);
console.log(`❌ Erros encontrados: ${errorCount}`);

if (removedCount > 0) {
  console.log('\n🎉 Limpeza concluída! Projeto otimizado para produção.');
} else {
  console.log('\n✨ Projeto já estava limpo!');
}

// Comandos adicionais recomendados
console.log('\n🚀 PRÓXIMOS PASSOS RECOMENDADOS:');
console.log('   1. npm prune (remover dependências não utilizadas)');
console.log('   2. npm run build (gerar build otimizado)');
console.log('   3. npm run build:analyze (analisar tamanho do bundle)'); 