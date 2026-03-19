import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

function readServiceAccountKey() {
  const keyPath = path.resolve(
    process.cwd(),
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'employees-connectivity-9ad941b70bd0.json',
  );
  return JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
}

function getUsageAuthClient() {
  const key = readServiceAccountKey();
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/admin.reports.usage.readonly'],
    subject: process.env.GOOGLE_ADMIN_EMAIL || 'admin@ingetec.com.co', // Needs real admin email if possible, or we can read from .env
  });
}

async function run() {
  
  
  const auth = getUsageAuthClient();
  const service = google.admin({ version: 'reports_v1', auth });

  try {
    const today = new Date();
    today.setDate(today.getDate() - 3);
    const dateStr = today.toISOString().split('T')[0];
    
    console.log('Fetching all user parameters for date: ' + dateStr);
    
    // Fetch one page of user usage to look at all available parameters
    const response = await service.userUsageReport.get({
      userKey: 'all',
      date: dateStr,
      maxResults: 5,
    });

    if (response.data.usageReports && response.data.usageReports.length > 0) {
      const userReport = response.data.usageReports[0];
      console.log('User:', userReport.entity?.userEmail);
      const params = userReport.parameters || [];
      const paramNames = params.map(p => p.name).sort();
      console.log('Available Parameters:');
      console.log(paramNames.join('\n'));
      
      // Let's also print some generative AI related ones if they exist
      const geminiParams = params.filter(p => p.name?.toLowerCase().includes('gemini') || p.name?.toLowerCase().includes('generative') || p.name?.toLowerCase().includes('ai'));
      console.log('\nGemini/AI Parameters found:', JSON.stringify(geminiParams, null, 2));
    } else {
      console.log('No reports found for this date.');
    }
  } catch (error: any) {
    console.error('Error fetching API:', error.message);
  }
}

run();
