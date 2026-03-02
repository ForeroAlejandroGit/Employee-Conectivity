import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import datetime

# 1. Authenticate with your JSON key
SCOPES = ['https://www.googleapis.com/auth/admin.reports.usage.readonly']
KEY_FILE_LOCATION = 'employees-connectivity-9ad941b70bd0.json' # Update this path!
ADMIN_EMAIL = 'alejandroforero@ingetec.com.co' # Must be a Workspace Super Admin

credentials = service_account.Credentials.from_service_account_file(
    KEY_FILE_LOCATION, scopes=SCOPES)
# Delegate as the admin
delegated_credentials = credentials.with_subject(ADMIN_EMAIL)

# 2. Connect to the Admin SDK Reports API
service = build('admin', 'reports_v1', credentials=delegated_credentials)

# 3. Calculate the date — Reports API has a 2-3 day delay, so start 3 days back
#    and automatically try older dates if data is not yet available.
PARAMETERS = 'gmail:num_emails_sent,accounts:last_login_time,drive:num_items_edited,drive:num_items_viewed,drive:num_items_created'

results = None
for days_back in range(3, 8):  # Try from 3 to 7 days ago
    target_date = (datetime.datetime.now() - datetime.timedelta(days=days_back)).strftime('%Y-%m-%d')
    print(f"Trying to fetch report for {target_date}...")
    try:
        results = service.userUsageReport().get(
            userKey='all',
            date=target_date,
            parameters=PARAMETERS
        ).execute()
        print(f"✓ Successfully fetched report for {target_date}")
        break  # Data found, stop trying older dates
    except HttpError as e:
        if e.resp.status == 400 and 'not yet available' in str(e):
            print(f"  ✗ Data for {target_date} is not yet available, trying an older date...")
        else:
            raise  # Re-raise unexpected errors

if results is None:
    print("ERROR: Could not find available data for the last 7 days.")
    exit(1)

warnings = results.get('warnings', [])
if warnings:
    print("Warnings (data might not be fully ready yet):", warnings)

usage_data = results.get('usageReports', [])

# 5. Parse the data into a list of dictionaries
rows = []
for report in usage_data:
    email = report.get('entity', {}).get('userEmail')
    
    # helper to safely extract metrics
    def get_metric(report_dict, key):
        metrics = report_dict.get('parameters', [])
        for p in metrics:
            if p.get('name') == key:
                if 'intValue' in p:
                    return int(p['intValue'])
                elif 'datetimeValue' in p:
                    return p['datetimeValue']
        return 0

    rows.append({
        'Email': email,
        'Username': email.split('@')[0],  # Basic assumption
        'Sent emails': get_metric(report, 'gmail:num_emails_sent'),
        'Last login': get_metric(report, 'accounts:last_login_time'),
        'Edited files': get_metric(report, 'drive:num_items_edited'),
        'Viewed files': get_metric(report, 'drive:num_items_viewed'),
        'Added files': get_metric(report, 'drive:num_items_created'),
    })

# 6. Append to Excel file as a new day-sheet
df = pd.DataFrame(rows)

print(df.head())

# # Create a Pandas Excel writer using openpyxl in append mode
# file_path = "c:\\Code\\Employees Connectivity\\Productividad_Google2.xlsx"
# with pd.ExcelWriter(file_path, mode='a', engine='openpyxl') as writer:  
#     df.to_excel(writer, sheet_name=target_date, index=False)

# print(f"Successfully generated and appended sheet {target_date}")
