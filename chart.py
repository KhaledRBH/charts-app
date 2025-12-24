import os
import csv
import psycopg2

# 🔧 CONFIG — change these
DB_NAME = "hichem"
DB_USER = "postgres"
DB_PASS = "rebouh123"
DB_HOST = "localhost"
DB_PORT = "5432"
CSV_FOLDER = "D:\CSV"

# 🧩 Connect to PostgreSQL
conn = psycopg2.connect(
    dbname=DB_NAME, user=DB_USER, password=DB_PASS,
    host=DB_HOST, port=DB_PORT
)
cur = conn.cursor()

# Loop over all CSV files
for filename in os.listdir(CSV_FOLDER):
    if filename.endswith(".csv"):
        table_name = os.path.splitext(filename)[0].lower()
        csv_path = os.path.join(CSV_FOLDER, filename)

        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            headers = next(reader)

            # Create table
            columns = ", ".join([f'"{col}" TEXT' for col in headers])
            create_query = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({columns});'
            cur.execute(create_query)

            # Insert data
            for row in reader:
                placeholders = ", ".join(["%s"] * len(row))
                insert_query = f'INSERT INTO "{table_name}" VALUES ({placeholders});'
                cur.execute(insert_query, row)

        conn.commit()
        print(f"✅ Imported {filename} into table '{table_name}'")

cur.close()
conn.close()
print("All CSV files imported successfully!")
