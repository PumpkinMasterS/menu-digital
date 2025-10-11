// Simple script to add grade column and update classes
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGradeColumn() {
  console.log('🚀 Adding grade column to classes...');

  try {
    // Add grade column
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE classes ADD COLUMN IF NOT EXISTS grade TEXT;'
    });

    if (addColumnError) {
      console.log('Column might already exist or using direct update...');
    }

    // Get all classes and update them
    const { data: classes, error: fetchError } = await supabase
      .from('classes')
      .select('id, name');

    if (fetchError) throw fetchError;

    console.log(`Found ${classes.length} classes to update`);

    // Update each class with grade
    for (const classItem of classes) {
      let grade = '5'; // default
      
      if (classItem.name.includes('5º')) grade = '5';
      else if (classItem.name.includes('6º')) grade = '6';
      else if (classItem.name.includes('7º')) grade = '7';
      else if (classItem.name.includes('8º')) grade = '8';

      const { error: updateError } = await supabase
        .from('classes')
        .update({ grade })
        .eq('id', classItem.id);

      if (updateError) {
        console.error(`Error updating ${classItem.name}:`, updateError);
      } else {
        console.log(`✅ Updated ${classItem.name} with grade ${grade}`);
      }
    }

    console.log('🎉 Grade column added and classes updated!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addGradeColumn();