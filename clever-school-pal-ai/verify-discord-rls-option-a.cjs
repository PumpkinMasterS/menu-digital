const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function runSQL(client, query) {
  // Try exec_sql with { sql }
  try {
    const { data, error } = await client.rpc('exec_sql', { sql: query });
    if (!error) return { data };
  } catch (_) {}
  // Try exec_sql with { sql_query }
  try {
    const { data, error } = await client.rpc('exec_sql', { sql_query: query });
    if (!error) return { data };
  } catch (_) {}
  // Try sql with { query }
  try {
    const { data, error } = await client.rpc('sql', { query });
    if (!error) return { data };
  } catch (finalError) {
    return { error: finalError };
  }
  return { error: new Error('All SQL RPC attempts failed') };
}

async function verifyTable(client, table) {
  console.log(`\n=== ${table} ===`);

  // RLS status (try RPC then REST fallback via view)
  const rlsQuery = `SELECT schemaname, tablename, rls_enabled FROM public.v_rls_status WHERE tablename = '${table}';`;
  let rlsRes = await runSQL(client, rlsQuery);
  if (rlsRes.error) {
    try {
      const { data, error } = await client
        .from('v_rls_status')
        .select('schemaname, tablename, rls_enabled')
        .eq('tablename', table)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      rlsRes = { data: data ? [data] : [] };
    } catch (e) {
      console.log('  [RLS] Error:', e.message || rlsRes.error.message || rlsRes.error);
    }
  }
  if (!rlsRes.error) {
    const rel = (rlsRes.data && rlsRes.data[0]) || {};
    console.log(`  [RLS] Enabled: ${rel && rel.rls_enabled ? 'YES' : 'NO'}`);
  }

  // Policies list (try RPC then REST fallback via view)
  const polQuery = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM public.v_pg_policies
    WHERE tablename = '${table}'
    ORDER BY policyname;
  `;
  let polRes = await runSQL(client, polQuery);
  if (polRes.error) {
    try {
      const { data, error } = await client
        .from('v_pg_policies')
        .select('schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check')
        .eq('tablename', table)
        .order('policyname', { ascending: true });
      if (error) throw error;
      polRes = { data };
    } catch (e) {
      console.log('  [Policies] Error:', e.message || polRes.error.message || polRes.error);
      return;
    }
  }

  const policies = polRes.data || [];
  console.log(`  [Policies] Count: ${policies.length}`);
  for (const p of policies) {
    console.log(`   • ${p.policyname} (cmd=${p.cmd})`);
    console.log(`     USING: ${p.qual || 'true'}`);
    console.log(`     WITH CHECK: ${p.with_check || 'true'}`);
  }

  // Simple Option A expectation check
  const expected = [
    `${table}_service_role_all`,
    `${table}_super_admin_manage`
  ];
  const names = new Set(policies.map(p => p.policyname));
  const missing = expected.filter(n => !names.has(n));
  if (missing.length === 0 && policies.length === 2) {
    console.log('  [Check] OK: Option A policies present and only these two exist.');
  } else {
    console.log('  [Check] WARN: Expected only policies:', expected.join(', '));
    if (missing.length > 0) console.log('         Missing:', missing.join(', '));
    const extras = policies.map(p => p.policyname).filter(n => !expected.includes(n));
    if (extras.length > 0) console.log('         Extra policies:', extras.join(', '));
  }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const admin = createClient(url, serviceKey);
  const tables = [
    'discord_interactions',
    'discord_guilds',
    'discord_channels',
    'discord_users',
    'discord_bot_config'
  ];
  console.log('Listing active RLS policies with service-role...');
  for (const t of tables) {
    await verifyTable(admin, t);
  }
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});