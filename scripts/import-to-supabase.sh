#!/bin/bash

# Import data to Supabase PostgreSQL
# Usage: ./import-to-supabase.sh

SUPABASE_HOST="db.jddbiytluavjidmpkzxq.supabase.co"
SUPABASE_USER="postgres"
SUPABASE_PASS="Poiuqwer#1983"
SUPABASE_DB="postgres"

echo "Importing data to Supabase..."
PGPASSWORD="$SUPABASE_PASS" psql -h "$SUPABASE_HOST" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -f /tmp/postgres_data.sql

echo "✅ Data import complete!"
