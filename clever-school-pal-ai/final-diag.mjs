import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const logFile = path.join(process.cwd(), 'diag-results.txt');
let output = '';

const log = (message) => {
  output += `${new Date().toISOString()} - ${message}\n`;
};

(async () => {
  try {
    log('Starting diagnostic script...');
    log(`Node.js version: ${process.version}`);
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log('ERROR: SUPABASE_URL or SUPABASE_KEY are not defined in .env file.');
      fs.writeFileSync(logFile, output);
      return;
    }

    log(`Supabase URL: ${supabaseUrl}`);
    log('Attempting to fetch the Supabase URL...');

    const response = await fetch(supabaseUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    log(`Fetch successful. Status: ${response.status}`);
    const responseText = await response.text();
    log(`Response body: ${responseText}`);

  } catch (error) {
    log(`FETCH FAILED: An error occurred.`);
    log(`Error message: ${error.message}`);
    if (error.cause) {
      log(`Error cause: ${JSON.stringify(error.cause, null, 2)}`);
    }
    log(`Error stack: ${error.stack}`);
  } finally {
    log('Diagnostic script finished.');
    fs.writeFileSync(logFile, output);
  }
})();