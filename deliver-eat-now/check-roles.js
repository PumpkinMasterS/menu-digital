import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://misswwtaysshbnnsjhtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pc3N3d3RheXNzaGJubnNqaHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MTczMjYsImV4cCI6MjA2NzI5MzMyNn0.fm4pHr65zETB3zcQE--faMicdWr7pSDCatTKfMy0suE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
  console.log('🔍 Verificando roles atuais no sistema...');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('role')
    .not('role', 'is', null);
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  const roleCounts = {};
  profiles.forEach(profile => {
    roleCounts[profile.role] = (roleCounts[profile.role] || 0) + 1;
  });
  
  console.log('📊 Distribuição de roles:');
  Object.entries(roleCounts).forEach(([role, count]) => {
    console.log(`   - ${role}: ${count} usuários`);
  });
  
  console.log('\n✅ Verificação concluída!');
}

checkRoles();

