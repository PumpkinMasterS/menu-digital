const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando todos os servidores...');

// Função para iniciar um processo e mostrar o output
function startServer(name, command, args, cwd) {
  console.log(`\n📦 Iniciando ${name}...`);
  
  const process = spawn(command, args, {
    cwd: cwd,
    stdio: 'inherit',
    shell: true
  });
  
  process.on('error', (error) => {
    console.error(`❌ Erro ao iniciar ${name}:`, error);
  });
  
  process.on('close', (code) => {
    console.log(`\n📋 ${name} encerrado com código: ${code}`);
  });
  
  return process;
}

// Iniciar aplicação web principal
const webApp = startServer(
  'Aplicação Web Principal',
  'npm',
  ['run', 'dev'],
  __dirname
);

// Aguardar um pouco antes de iniciar os outros
setTimeout(() => {
  // Iniciar app cliente mobile
  const clientApp = startServer(
    'App Cliente Mobile',
    'npx',
    ['expo', 'start', '--web', '--port', '3000'],
    path.join(__dirname, 'SaborPortugues')
  );
  
  // Aguardar mais um pouco antes de iniciar o driver
  setTimeout(() => {
    // Iniciar app driver mobile
    const driverApp = startServer(
      'App Driver Mobile',
      'npx',
      ['expo', 'start', '--web', '--port', '3001'],
      path.join(__dirname, 'SaborPortugues-Driver-Fresh')
    );
    
    console.log('\n✅ Todos os servidores iniciados!');
    console.log('\n🌐 Links para acesso:');
    console.log('   📱 App Web: http://localhost:8081 (ou 8082 se 8081 estiver ocupado)');
    console.log('   📱 App Cliente: http://localhost:3000');
    console.log('   📱 App Driver: http://localhost:3001');
    console.log('\n🔐 Credenciais de acesso:');
    console.log('   Email: admin@platform.com');
    console.log('   Password: admin123456');
    console.log('   Role: platform_owner');
    
  }, 5000);
}, 5000);

// Lidar com encerramento
process.on('SIGINT', () => {
  console.log('\n\n🛑 Encerrando todos os servidores...');
  process.exit(0);
});

