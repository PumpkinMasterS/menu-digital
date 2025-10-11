const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

supabase.auth.admin.listUsers().then(({data, error}) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total users:', data.users.length);
    data.users.forEach((user, i) => {
      console.log(`${i+1}. Email: ${user.email}, ID: ${user.id}, Confirmed: ${!!user.email_confirmed_at}`);
    });
  }
});