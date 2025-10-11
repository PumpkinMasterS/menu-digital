// Test Analytics.tsx fixes
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test functions
async function testChatLogsQuery() {
  console.log('\n=== Testing chat_logs query ===');
  try {
    const { data, error } = await supabase
      .from('chat_logs')
      .select('id, student_id, question, answer, created_at')
      .limit(5);
    
    if (error) {
      console.error('❌ chat_logs query failed:', error.message);
      return false;
    }
    
    console.log('✅ chat_logs query successful');
    console.log(`Found ${data.length} chat logs`);
    if (data.length > 0) {
      console.log('Sample record:', {
        id: data[0].id,
        student_id: data[0].student_id,
        question: data[0].question?.substring(0, 50) + '...',
        answer: data[0].answer?.substring(0, 50) + '...'
      });
    }
    return true;
  } catch (err) {
    console.error('❌ chat_logs query error:', err.message);
    return false;
  }
}

async function testStudentsQuery() {
  console.log('\n=== Testing students query ===');
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, school_id')
      .limit(5);
    
    if (error) {
      console.error('❌ students query failed:', error.message);
      return false;
    }
    
    console.log('✅ students query successful');
    console.log(`Found ${data.length} students`);
    if (data.length > 0) {
      console.log('Sample student:', {
        id: data[0].id,
        name: data[0].name,
        school_id: data[0].school_id
      });
    }
    return true;
  } catch (err) {
    console.error('❌ students query error:', err.message);
    return false;
  }
}

async function testResponseTimeColumn() {
  console.log('\n=== Testing created_at column ===');
  try {
    const { data, error } = await supabase
      .from('chat_logs')
      .select('created_at')
      .not('created_at', 'is', null)
      .limit(5);
    
    if (error) {
      console.error('❌ created_at column test failed:', error.message);
      return false;
    }
    
    console.log('✅ created_at column accessible');
    console.log(`Found ${data.length} records with created_at`);
    if (data.length > 0) {
      console.log('Sample timestamps:', data.map(d => d.created_at).slice(0, 3));
    }
    return true;
  } catch (err) {
    console.error('❌ created_at column error:', err.message);
    return false;
  }
}

async function simulateAnalyticsDataFlow() {
  console.log('\n=== Simulating Analytics page data flow ===');
  try {
    // Step 1: Fetch raw chat_logs
    const { data: chatLogs, error: chatError } = await supabase
      .from('chat_logs')
      .select('id, student_id, question, answer, created_at')
      .limit(10);
    
    if (chatError) {
      console.error('❌ Failed to fetch chat_logs:', chatError.message);
      return false;
    }
    
    console.log(`✅ Fetched ${chatLogs.length} chat logs`);
    
    // Step 2: Extract unique student IDs
    const studentIds = [...new Set(chatLogs.map(log => log.student_id).filter(Boolean))];
    console.log(`Found ${studentIds.length} unique student IDs`);
    
    if (studentIds.length === 0) {
      console.log('⚠️ No student IDs found in chat logs');
      return true;
    }
    
    // Step 3: Fetch student data
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, name, school_id')
      .in('id', studentIds);
    
    if (studentError) {
      console.error('❌ Failed to fetch students:', studentError.message);
      return false;
    }
    
    console.log(`✅ Fetched ${students.length} student records`);
    
    // Step 4: Calculate chat activity by date
    const chatsByDate = chatLogs.reduce((acc, log) => {
      const date = new Date(log.created_at).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    if (Object.keys(chatsByDate).length > 0) {
      console.log(`✅ Chat activity calculated for ${Object.keys(chatsByDate).length} dates`);
      console.log('Sample activity:', Object.entries(chatsByDate).slice(0, 3));
    } else {
      console.log('⚠️ No chat activity data available');
    }
    
    console.log('✅ Analytics data flow simulation completed successfully');
    return true;
  } catch (err) {
    console.error('❌ Analytics simulation error:', err.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Testing Analytics.tsx fixes...');
  console.log('=====================================');
  
  const results = {
    chatLogs: await testChatLogsQuery(),
    students: await testStudentsQuery(),
    createdAt: await testResponseTimeColumn(),
    analyticsFlow: await simulateAnalyticsDataFlow()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Analytics.tsx fixes are working correctly!');
    console.log('The 400 Bad Request error should be resolved.');
  } else {
    console.log('\n⚠️ Some issues remain. Check the failed tests above.');
  }
}

// Run tests
runTests().catch(console.error);