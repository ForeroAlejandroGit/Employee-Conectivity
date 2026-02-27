import pandas as pd
import datetime
import re
from calendar import monthrange

class CalculateProductivity:

    def __init__(self, path: str, year: int, month: int, coefficients: dict) -> None:
        # inputs
        self.year = year
        self.month = month
        self.input_filename = path + "data_cleaned.xlsx"
        
        # last day of the month
        self.last_day_of_month = monthrange(year, month)[1]
        self.last_day_of_month = f"{year}-{month:02d}-{self.last_day_of_month:02d}" 
        
        # outputs
        self.autodesk_filename = path + "Autodesk.xlsx"
        self.meetings_filename = path + "Meetings.xlsx"
        self.productivity_by_day_filename = path + "productivity_by_day.xlsx"
        self.chats_source_filename = path + "chats_source.csv"
        self.informe_personal_filename = path + "INFORME_PERSONAL.xlsx"
        self.final_table_with_results = path + "final_table_with_results.xlsx"
        self.vpn = path + "VPN.csv"  # Add this line for VPN data
        
        self.excel_file = pd.ExcelFile(self.input_filename)

        # Coefficients for each activity
        self.productivity_columns = list(coefficients['productivity_coefficients_modelers'].keys())
        self.productivity_coefficients_modelers = pd.Series(coefficients['productivity_coefficients_modelers'])
        self.productivity_coefficients_cat12345 = pd.Series(coefficients['productivity_coefficients_cat12345'])
        self.productivity_coefficients_others = pd.Series(coefficients['productivity_coefficients_others'])

        #create a sort and clean employee's list with Email and Cat[dd] . Consider only ingetec.com.co emails and unique values 
        self.df_employees = pd.read_excel(self.informe_personal_filename)
        self.df_employees['Email'] = self.df_employees['Email'].str.lower() 
        self.df_employees.dropna(subset=['Email', 'Cat'], inplace=True)
        self.df_employees.drop_duplicates(subset=['Email'], inplace=True, keep='first')
        self.df_employees = self.df_employees[self.df_employees['Email'].str.contains('@ingetec.com.co')]
        self.df_employees.sort_values(by=['Email'], inplace=True)
        self.df_employees = self.df_employees[[True if email.split('@')[1] == 'ingetec.com.co' else False for email in self.df_employees['Email']]]
        self.df_employees['Cat'] = self.df_employees['Cat'].apply(lambda cat: str(cat)[0:2] if bool(re.search(r'\d', str(cat))) else str(cat)[0:2])
        self.df_employees.reset_index(drop=True, inplace=True)
        
    def calculate_productivity(self) -> str:

        df_autodesk_complete = self.process_autodesk_by_day() # When I have generated data exactly of 30 days
        # df_autodesk_complete = self.process_autodesk_average() # When I just have a montly average
        df_meetings_complete = self.process_meetings()
        df_chats_complete = self.process_chats()
        df_vpn_complete = self.process_vpn()  # Process VPN data
        df_coefficients_matrix = self.estimate_productivity_matrix()

        # Create a Pandas Excel writer using XlsxWriter as the engine.
        writer = pd.ExcelWriter(self.productivity_by_day_filename, engine='xlsxwriter')

        # Loop through each sheet name
        for sheet_name in self.excel_file.sheet_names:
            # Read in the sheet as a DataFrame
            df_productivity_day = pd.read_excel(self.input_filename, sheet_name=sheet_name)

            # create a date object
            date = sheet_name.split('-')
            print(date)
            date = datetime.datetime(int(date[0]), int(date[1]), int(date[2]))

            # format the date object
            formatted_date = date.strftime("%Y-%m-%d")

            #Analyzing files behavior
            new_column = df_productivity_day['Added files'] + df_productivity_day['Other added files']
            df_productivity_day.insert(9, 'Add files', [1 if x > 0 else 0 for x in new_column])
            df_productivity_day.drop(columns=['Added files', 'Other added files'], inplace=True)
            df_productivity_day['Drive last use'] = [1 if str(datestamp).split('T')[0] == formatted_date else 0 for datestamp in df_productivity_day['Drive last use']]
            df_productivity_day['Edited files'] = [1 if x > 0 else 0 for x in df_productivity_day['Edited files']]
            df_productivity_day['Viewed files'] = [1 if x > 0 else 0 for x in df_productivity_day['Viewed files']]

            #Analyzing email behavior
            df_productivity_day['Email last use'] = [1 if str(datestamp).split('T')[0] == formatted_date else 0 for datestamp in df_productivity_day['Email last use']]
            df_productivity_day['Sent emails'] = [1 if x > 0 else 0 for x in df_productivity_day['Sent emails']]

            # Additional columns
            # CHATS
            df_chats = pd.DataFrame()
            df_chats['Email'] = df_chats_complete['Email']
            df_chats['Chat'] = [1 if x > 0 else 0 for x in df_chats_complete[formatted_date]]
            df_productivity_day = pd.merge(df_productivity_day, df_chats, on='Email', how='left')
            df_productivity_day.fillna(0, inplace=True)

            # MEETINGS
            df_meetings = pd.DataFrame()
            df_meetings['Email'] = df_meetings_complete['Email']
            df_meetings['Meetings'] = [1 if x > 0 else 0 for x in df_meetings_complete[formatted_date]]
            df_productivity_day = pd.merge(df_productivity_day, df_meetings, on='Email', how='left')
            df_productivity_day.fillna(0, inplace=True)

            # AUTODESK
            df_autodesk = pd.DataFrame()
            df_autodesk['Email'] = df_autodesk_complete['Email']
            df_autodesk['Autodesk'] = [1 if x > 0 else 0 for x in df_autodesk_complete[formatted_date]]
            df_productivity_day = pd.merge(df_productivity_day, df_autodesk, on='Email', how='left')
            df_productivity_day.fillna(0, inplace=True)

            # VPN - Add this section
            df_vpn = pd.DataFrame()
            df_vpn['Email'] = df_vpn_complete['Email']
            df_vpn['VPN'] = [1 if x > 0 else 0 for x in df_vpn_complete.get(formatted_date, [0] * len(df_vpn_complete))]
            df_productivity_day = pd.merge(df_productivity_day, df_vpn, on='Email', how='left')
            df_productivity_day.fillna(0, inplace=True)


            # delete emails that are not in both dataframes
            emails_to_delete_in_coefficient = list(df_coefficients_matrix[~df_coefficients_matrix['Email'].isin(df_productivity_day['Email'])]['Email'])
            emails_to_delete_in_productivity = list(df_productivity_day[~df_productivity_day['Email'].isin(df_coefficients_matrix['Email'])]['Email'])
            df_coefficients_matrix = df_coefficients_matrix[~df_coefficients_matrix['Email'].isin(emails_to_delete_in_coefficient)]
            df_productivity_day = df_productivity_day[~df_productivity_day['Email'].isin(emails_to_delete_in_productivity)]

            # Prepare dataframes to be multiplied
            df_coefficients_matrix.reset_index(inplace=True, drop=True)
            df_productivity_day.reset_index(inplace=True, drop=True)
            productivity = df_productivity_day.iloc[:, 2:12] * df_coefficients_matrix.iloc[:, 2:12]
            productivity['Productivity'] = productivity.sum(axis=1)
            productivity['Productivity'] = [1 if x > 1 else x for x in productivity['Productivity']]
            productivity.insert(0, 'Email', df_productivity_day['Email'])
            productivity.insert(1, 'Username', df_productivity_day['Username'])
            productivity.insert(1, 'Cat', df_coefficients_matrix['Cat'])
            productivity.to_excel(writer, sheet_name=sheet_name, index=False)

        # Save the Excel file.
        writer.close()
        return self.productivity_by_day_filename

    def process_meetings(self) -> pd.DataFrame:
        df = pd.read_excel(self.meetings_filename)

        # create a dataframe with only the columns we need
        df_meet = pd.DataFrame(data=df, columns=['Fecha', 'Actor', 'Código de reunión'])
        df_meet['Fecha'] = [day.split('T')[0] for day in df_meet['Fecha']]
        
        #Eliminates all rows that do not contain "@ingetec"
        df_meet = df_meet[df_meet['Actor'].str.contains('@ingetec') == True]

        # delete duplicates
        df_meet = df_meet.drop_duplicates(subset=['Actor', 'Código de reunión', 'Fecha'], keep='first')

        # create a pivot table with 'Actor' on rows and 'Fecha' on columns
        pivot_table = pd.pivot_table(df_meet, index='Actor', columns='Fecha', aggfunc=len, fill_value=0)
        
        # Drop the first level of the pivot table
        pivot_table.columns = pivot_table.columns.droplevel(0)
        pivot_table.columns.name = None
        
        # Drop columns that are not in the month
        columns_to_keep = list(map(lambda day: f"{self.year}-{str(self.month).zfill(2)}-{str(day).zfill(2)}", range(1, monthrange(self.year, self.month)[1]+1)))
        pivot_table.drop(columns=[col for col in pivot_table.columns if col not in columns_to_keep], inplace=True)
        
        # Reset the index of the pivot table
        pivot_table = pivot_table.rename_axis(None, axis=1)
        pivot_table.index.name = 'Email'
        pivot_table.reset_index(inplace=True)
        
        return pivot_table

    def estimate_productivity_matrix(self) -> pd.DataFrame:
        # This is the list of autodesk users that are also in the employee list
        autodesk_user_list = list(pd.read_excel(self.autodesk_filename, sheet_name='Autodesk users')['Email'].str.lower())
        autodesk_user_list = list(set(autodesk_user_list) - (set(autodesk_user_list) - set(self.df_employees['Email'])))
        autodesk_user_list.sort()
        
        # Replace NaN values with productivity_coefficients_others
        df_productivity = pd.DataFrame(data=self.df_employees, columns=['Email', 'Cat'] + self.productivity_columns)
        df_productivity.iloc[:, 2:] = df_productivity.iloc[:, 2:].fillna(self.productivity_coefficients_others)
        
        # Replace values with coefficients for rows where Email is in autodesk_user_list
        mask_modelers = [True if email in autodesk_user_list else False for email in df_productivity['Email']]
        df_productivity.iloc[mask_modelers, 2:] = df_productivity.iloc[mask_modelers, 2:].apply(lambda row: self.productivity_coefficients_modelers, axis=1)

        # Replace values with coefficients for rows where Cat is in categories
        categories = ['01', '02', '03', '04', '05']
        mask_categories12345 = [True if cat in categories else False for cat in df_productivity['Cat']]
        df_productivity.iloc[mask_categories12345, 2:] = df_productivity.iloc[mask_categories12345, 2:].apply(lambda row: self.productivity_coefficients_cat12345, axis=1)

        # df_productivity.to_excel("matriz de productividad.xlsx", index=False)
        return df_productivity

    def process_chats(self) -> pd.DataFrame:
        df = pd.read_csv(self.chats_source_filename)

        df['day'] = [str(fecha).split("T")[0] for fecha in df['Fecha']]
        df['hour'] = [str(fecha).split("T")[1][0:2] for fecha in df['Fecha']]
        df.drop(columns=['Fecha'], inplace=True)

        pivot_table = pd.pivot_table(df, index='Actor', columns='day', aggfunc='count', fill_value=0)

        pivot_table.columns = pivot_table.columns.get_level_values(1)
        pivot_table = pivot_table.reset_index()
        df_chats = pivot_table.iloc[:, 1:]
        df_chats[df_chats > 1] = 1
        df_chats.insert(0, 'Email', pivot_table.iloc[:, 0])
        df_chats = df_chats.rename_axis(None, axis=1)
        df_chats.reset_index(inplace=True, drop=True)
        
        return df_chats

    def process_autodesk_by_day(self) -> pd.DataFrame:
        df_autodesk = pd.read_excel(self.autodesk_filename, sheet_name='Uso', usecols=[4,9])
            
        df_autodesk['email'] = [str(email).lower() for email in df_autodesk['email']]
        df_autodesk.rename(columns={'email': 'Email'}, inplace=True)
        df_autodesk_table = pd.pivot_table(df_autodesk, index='Email', columns='day_used', aggfunc=len, fill_value=0)
        df_autodesk_table[df_autodesk_table > 0] = 1
        df_autodesk_table.columns = [str_date.strftime('%Y-%m-%d') for str_date in df_autodesk_table.columns]

        columns_month = set(map(lambda day: f"{self.year}-{str(self.month).zfill(2)}-{str(day).zfill(2)}", range(1, monthrange(self.year, self.month)[1] + 1)))
        set_columns = set(df_autodesk_table.columns)
        columns_to_delete = set_columns - columns_month
        df_autodesk_table.drop(columns=list(columns_to_delete), inplace=True)

        columns_to_add = list(columns_month - set_columns)
        columns_to_add.sort()

        df_mean = [1 if mean >= 0.3 else 0 for mean in df_autodesk_table.iloc[:, 1:].mean(axis=1)]
        for i in range(len(columns_to_add)):
            df_autodesk_table.insert(loc=0, column=columns_to_add.pop(-1), value=df_mean)
        
        df_autodesk_table.reset_index(inplace=True)
        
        return df_autodesk_table
    
    def process_autodesk_average(self) -> pd.DataFrame:
        df_autodesk = pd.read_excel(self.autodesk_filename, sheet_name='Detalles del usuario')
        df_autodesk = df_autodesk[['email', 'monthly_average']]
        df_autodesk['email'] = df_autodesk['email'].str.lower()
        df_autodesk = df_autodesk.groupby(['email']).sum().reset_index()
        
        df_autodesk['reference'] = [1 if average>10 else 0 for average in df_autodesk['monthly_average']]
        df_autodesk_table = pd.DataFrame()
        df_autodesk_table['Email'] = df_autodesk['email'].apply(lambda x: str(x).lower())
        columns_month = list(map(lambda day: f"{self.year}-{str(self.month).zfill(2)}-{str(day).zfill(2)}", range(1, monthrange(self.year, self.month)[1] + 1)))
        
        for day in columns_month:
            df_autodesk_table[day] = df_autodesk['reference']

        return df_autodesk_table

    def process_vpn(self) -> pd.DataFrame:
        
        df = pd.read_csv(self.vpn, encoding='utf-8')
        
        # Rename columns to match our needs
        df.columns = ['Usuario', 'IP', 'Trafico_Salida', 'Fecha']

        # Convert Usuario to Email by adding domain
        df['Email'] = df['Usuario'].str.lower() + '@ingetec.com.co'

        # Format date to YYYY-MM-DD
        df['day'] = pd.to_datetime(df['Fecha'], format='%d/%m/%Y').dt.strftime('%Y-%m-%d')

        # Convert traffic to MB (handle GB, MB, KB)
        def convert_to_mb(traffic_str):
            value = float(traffic_str.split(' ')[0])
            unit = traffic_str.split(' ')[1]
            
            if unit == 'GB':
                return value * 1024  # Convert GB to MB
            elif unit == 'MB':
                return value  # Already in MB
            elif unit == 'KB':
                return value / 1024  # Convert KB to MB
            else:
                return 0  # Unknown unit

        df['Traffic_MB'] = df['Trafico_Salida'].apply(convert_to_mb)

        # Create a pivot table summing traffic by Email and day
        pivot_table = pd.pivot_table(df, values='Traffic_MB', index='Email', 
                                        columns='day', aggfunc='sum', fill_value=0)

        # Create columns for each day in the month
        columns_month = list(map(lambda day: f"{self.year}-{str(self.month).zfill(2)}-{str(day).zfill(2)}", 
                                range(1, monthrange(self.year, self.month)[1] + 1)))

        # Add missing days with zero traffic
        for day in columns_month:
            if day not in pivot_table.columns:
                pivot_table[day] = 0

        # Keep only columns for current month
        pivot_table = pivot_table[columns_month]

        # For productivity calculation, convert to binary (1 if used VPN, 0 if not)
        # Store the original traffic data in case you need it for reporting
        pivot_table_binary = pivot_table.copy()
        pivot_table_binary[pivot_table_binary > 5] = 1 # greater than 5MB per day

        # Reset index
        pivot_table_binary = pivot_table_binary.reset_index()
        
        return pivot_table_binary

    def final_table(self) -> pd.DataFrame:
        
        # Load the Excel file into a pandas ExcelFile object
        xlsx = pd.ExcelFile(self.productivity_by_day_filename)

        # Create a dictionary to store the DataFrames, one for each sheet
        dfs = {sheet_name: xlsx.parse(sheet_name) for sheet_name in xlsx.sheet_names}
        
        results_df = pd.DataFrame(data=dfs[self.last_day_of_month][['Email', 'Username', 'Cat']])
        results_df = pd.merge(results_df, self.df_employees[['Email', 'División', 'Departamento']], on='Email', how='left')

        for day in dfs:
            employees_to_delete = list(set(dfs[day]['Email']) - set(results_df['Email']))
            df_day = dfs[day][~dfs[day]['Email'].isin(employees_to_delete)].reset_index(drop=True)
            results_df[day.split('-')[2]] = df_day['Productivity']
        
        results_df.to_excel(self.final_table_with_results, index=False)
        return results_df
