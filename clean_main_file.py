import pandas as pd

columns_name = ['Email',
                'Username',
                'Sent emails',
                'Email last use',
                'Edited files',
                'Viewed files',
                'Drive last use',
                'Added files',
                'Other added files',
                ]

class CleanMainFile:

    def __init__(self, path: str, year: int, month: int, emails_to_delete: list[str]):
        self.input_name = path + "Productividad_Google.xlsx"
        self.year = year
        self.month = month
        self.clean_data_file = path + "data_cleaned.xlsx"
        self.emails_to_delete = emails_to_delete
        
    def clear_data(self) -> str:

        excel_file = pd.ExcelFile(self.input_name)
        last_sheet = excel_file.sheet_names[-1]

        #Reference of last day of the month because the list of could vary throughout the current month
        df_reference_last_day_of_month = pd.read_excel(self.input_name, sheet_name=last_sheet)
        df_reference_last_day_of_month = df_reference_last_day_of_month.filter(['Usuario'])
        df_reference_last_day_of_month.columns = ["Email"]

        # Create a Pandas Excel writer using xlsxwriter as the engine
        with pd.ExcelWriter(self.clean_data_file, engine='xlsxwriter') as writer:
            
            # Loop through each sheet name
            for sheet_name in excel_file.sheet_names:
                # Read in the sheet as a DataFrame
                df = pd.read_excel(self.input_name, sheet_name=sheet_name, usecols=[0, 12, 15] + list(range(19, 25)))
                df.columns = columns_name
                print(sheet_name)

                # Filter out rows that contain any of the strings in 'emails_to_delete'
                df_reference_last_day_of_month = df_reference_last_day_of_month[~df_reference_last_day_of_month['Email'].isin(self.emails_to_delete)]

                #Aggregates all data columns to the day of reference
                df = pd.merge(df_reference_last_day_of_month, df, on='Email', how='left')

                df.dropna(subset=["Username"], inplace=True)

                df.to_excel(writer, sheet_name=sheet_name, index=False)

        return self.clean_data_file