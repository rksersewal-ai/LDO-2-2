import os

DB_NAME = os.environ.get('PGDATABASE', 'ldo_edms')
DB_USER = os.environ.get('PGUSER', 'postgres')
DB_PASSWORD = os.environ['PGPASSWORD']
