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

function getAuditAuthClient() {
  const key = readServiceAccountKey();
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/admin.reports.audit.readonly'],
    subject: process.env.GOOGLE_ADMIN_EMAIL || 'admin@ingetec.com.co',
  });
}

function getUsageAuthClient() {
  const key = readServiceAccountKey();
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/admin.reports.usage.readonly'],
    subject: process.env.GOOGLE_ADMIN_EMAIL || 'admin@ingetec.com.co',
  });
}

async function run() {
  // Try to test gemini audit logs
  try {
    const auth = getAuditAuthClient();
    const service = google.admin({ version: 'reports_v1', auth });

    const today = new Date();
    const endDate = today.toISOString();
    today.setDate(today.getDate() - 7);
    const startDate = today.toISOString();
    
    console.log(`Fetching Gemini Workspace events from ${startDate} to ${endDate}...`);
    
    // Application names to try
    const appsToTry = ['gemini_in_workspace_apps', 'gemini'];
    
    for (const app of appsToTry) {
        console.log(`\n\n--- Testing applicationName: ${app} ---`);
        try {
            const response = await service.activities.list({
              userKey: 'all',
              applicationName: app,
              startTime: startDate,
              endTime: endDate,
              maxResults: 10,
            });

            if (response.data.items && response.data.items.length > 0) {
              console.log(`Found ${response.data.items.length} events for ${app}. First event:`);
              console.log(JSON.stringify(response.data.items[0], null, 2));
            } else {
              console.log(`No events found for ${app}.`);
            }
        } catch (e: any) {
             console.log(`Failed to fetch ${app}. Error: ${e.message}`);
        }
    }

  } catch (error: any) {
    console.error('API Error:', error.message);
  }
}

run();
