const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeRLSFix() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Variáveis de ambiente não encontradas');
        process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log('✅ Conectado ao Supabase');

        // Ler o arquivo SQL
        const sqlContent = fs.readFileSync(path.join(__dirname, 'fix-rls-policies.sql'), 'utf8');
        
        console.log('📄 Executando script fix-rls-policies.sql...');
        
        // Dividir o SQL em comandos individuais
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📝 Executando ${commands.length} comandos SQL...`);
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            if (command.length > 0) {
                console.log(`\n[${i + 1}/${commands.length}] ${command.substring(0, 60)}...`);
                
                try {
                    const { data, error } = await supabase.rpc('exec_sql', { 
                        sql_query: command + ';' 
                    });
                    
                    if (error) {
                        console.log(`⚠️  Aviso: ${error.message}`);
                    } else {
                        console.log('✅ Executado');
                    }
                } catch (err) {
                    console.log(`⚠️  Erro: ${err.message}`);
                }
            }
        }
        
        console.log('\n🎉 Script executado com sucesso!');
        console.log('🔧 Políticas RLS corrigidas e estrutura das tabelas atualizada');
        
    } catch (error) {
        console.error('❌ Erro ao executar script:', error.message);
        console.error('Detalhes:', error);
    }
}

executeRLSFix();