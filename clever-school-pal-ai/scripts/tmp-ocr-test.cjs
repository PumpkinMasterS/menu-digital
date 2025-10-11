// tmp-ocr-test.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing env: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const bucket = 'tmp-ocr';

    const path = `e2e/test-${Date.now()}.txt`;
    const content = Buffer.from('E2E upload check at ' + new Date().toISOString(), 'utf-8');

    const { data: up, error: upErr } = await supabase.storage.from(bucket).upload(path, content, {
      contentType: 'text/plain',
      upsert: false,
    });
    if (upErr) {
      console.error('Upload error:', upErr);
      process.exit(1);
    }
    console.log('Upload OK:', up?.path || path);

    const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (signErr) {
      console.error('Signed URL error:', signErr);
      process.exit(1);
    }
    console.log('Signed URL (60s):', signed?.signedUrl);

    process.exit(0);
  } catch (e) {
    console.error('Fatal:', e);
    process.exit(1);
  }
})();