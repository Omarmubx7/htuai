
import os
import psycopg2
from urllib.parse import urlparse

db_url = "postgresql://neondb_owner:npg_3OSiJqysb5gE@ep-dry-mud-aiqry0pi-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT student_id, major FROM student_progress LIMIT 10;")
    rows = cur.fetchall()
    print("--- Existing Student IDs ---")
    for row in rows:
        print(f"ID: {row[0]}, Major: {row[1]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
