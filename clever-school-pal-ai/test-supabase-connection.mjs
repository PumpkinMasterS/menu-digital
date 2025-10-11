import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test 1: Basic connection
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .limit(1);
    
    if (schoolsError) {
      console.log('❌ Schools query error:', schoolsError.message);
      fs.writeFileSync('connection-result.txt', `SCHOOLS_ERROR: ${schoolsError.message}\n`);
    } else {
      console.log('✅ Schools query successful:', schools?.length || 0, 'records');
      fs.writeFileSync('connection-result.txt', `SCHOOLS_SUCCESS: ${schools?.length || 0} records\n`);
    }
    
    // Test 2: Students query
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    if (studentsError) {
      console.log('❌ Students query error:', studentsError.message);
      fs.appendFileSync('connection-result.txt', `STUDENTS_ERROR: ${studentsError.message}\n`);
    } else {
      console.log('✅ Students query successful:', students?.length || 0, 'records');
      fs.appendFileSync('connection-result.txt', `STUDENTS_SUCCESS: ${students?.length || 0} records\n`);
    }
    
    // Test 3: Contents query
    const { data: contents, error: contentsError } = await supabase
      .from('contents')
      .select('*')
      .limit(1);
    
    if (contentsError) {
      console.log('❌ Contents query error:', contentsError.message);
      fs.appendFileSync('connection-result.txt', `CONTENTS_ERROR: ${contentsError.message}\n`);
    } else {
      console.log('✅ Contents query successful:', contents?.length || 0, 'records');
      fs.appendFileSync('connection-result.txt', `CONTENTS_SUCCESS: ${contents?.length || 0} records\n`);
    }
    
    console.log('🎯 Test completed. Check connection-result.txt for details.');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    fs.writeFileSync('connection-result.txt', `UNEXPECTED_ERROR: ${error.message}\n`);
  }
}

testConnection();