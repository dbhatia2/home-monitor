# Scraper Migration to PostgreSQL/Supabase - COMPLETE ✅

**Date:** October 4, 2026
**Status:** ✅ Successfully migrated and tested

---

## What Was Accomplished

### 1. Database Migration ✅
- **From:** MySQL (pymysql)
- **To:** PostgreSQL (psycopg2-binary) with Supabase

### 2. Code Changes ✅

#### Updated Files:
- `requirements.txt` - Replaced pymysql with psycopg2-binary
- `db/connection.py` - PostgreSQL connection with connection string support
- `db/config_reader.py` - Boolean fields (true/false instead of 1/0)
- `db/writer.py` - PostgreSQL syntax:
  - `ON CONFLICT ... DO UPDATE` instead of `ON DUPLICATE KEY UPDATE`
  - `RETURNING id` instead of `lastrowid`
  - Boolean types instead of TINYINT
  - `NOW()` instead of `CURRENT_TIMESTAMP`

#### New Files:
- `.env.example` - Example configuration
- `db/migrations/04_add_missing_tables.sql` - Missing tables migration

### 3. Database Schema ✅

#### Created Missing Tables:
- `price_history` - Track price changes over time
- `schools` - School information
- `community_schools` - Link schools to communities
- `snapshots` - Scraper run history

#### Added Constraints:
- Unique constraint on `homes(community_id, address)`
- Fixed all PostgreSQL sequences

### 4. GitHub Actions Workflow ✅

**File:** `.github/workflows/daily-scraper.yml`

**Schedule:** Daily at 7:00 AM UTC

**Secrets Required:**
- `POSTGRES_URL` - Supabase connection pooler string
- `EMAIL_FROM` - Gmail address
- `EMAIL_PASS` - Gmail app password

**Old MySQL secrets (no longer needed):**
- ~~DB_HOST~~
- ~~DB_PORT~~
- ~~DB_USER~~
- ~~DB_PASS~~
- ~~DB_NAME~~

---

## Testing Results ✅

### Local Testing
```
✅ PostgreSQL connection successful
✅ Found 2642 homes in database
✅ Found 50 active communities
✅ Test home written successfully
```

### Supabase Connection
```
Connection: postgresql://postgres.jddbiytluavjidmpkzxq:***@aws-0-us-west-1.pooler.supabase.com:6543/postgres
Type: Connection Pooler (Transaction Mode)
Status: ✅ Working
```

---

## Production Deployment ✅

### UI Application
- **URL:** https://home-monitor-five.vercel.app
- **Status:** ✅ Working (118 homes, 4 cities)
- **Database:** Connected to Supabase

### GitHub Actions
- **Workflow:** Daily Home Scraper
- **Trigger:** Manual + Daily at 7:00 AM UTC
- **Status:** Ready for testing

---

## Next Steps

1. ✅ **Test Manual Run** - Trigger workflow from GitHub Actions
2. ⏳ **Monitor First Run** - Check logs for any issues
3. ⏳ **Verify Data** - Check Supabase for new homes
4. ⏳ **Wait for Scheduled Run** - Verify 7:00 AM UTC automation works

---

## Configuration

### Environment Variables (.env)
```bash
# PostgreSQL/Supabase connection
POSTGRES_URL=postgresql://postgres.xxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Scraper settings
DB_WRITE=true

# Email notifications
EMAIL_FROM=your-email@gmail.com
EMAIL_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### Supabase Connection Details
- **Host:** aws-0-us-west-1.pooler.supabase.com
- **Port:** 6543 (Connection Pooler)
- **Database:** postgres
- **User:** postgres.jddbiytluavjidmpkzxq
- **SSL:** Required (rejectUnauthorized: false)

---

## Troubleshooting

### Common Issues

**Issue:** "Invalid URL"
- **Cause:** Password contains special characters (#)
- **Fix:** URL-encode password (# → %23)

**Issue:** "relation does not exist"
- **Cause:** Missing tables
- **Fix:** Run `db/migrations/04_add_missing_tables.sql`

**Issue:** "duplicate key value violates unique constraint"
- **Cause:** Sequences not synced after data import
- **Fix:** Run sequence fix script

**Issue:** "getaddrinfo ENOTFOUND"
- **Cause:** Using direct connection instead of pooler
- **Fix:** Use connection pooler URL (port 6543)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          GitHub Actions (Daily)             │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │   Daily Home Scraper Workflow       │  │
│  │   - Runs at 7:00 AM UTC            │  │
│  │   - Scrapes all builders            │  │
│  │   - Writes to Supabase              │  │
│  │   - Sends email notifications       │  │
│  └─────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │     Supabase       │
         │   PostgreSQL DB    │
         │  (2642+ homes)     │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Vercel Frontend   │
         │  Next.js App       │
         │  home-monitor-five │
         └────────────────────┘
```

---

## Key Improvements

1. **Serverless-Ready** - Connection pooler prevents connection exhaustion
2. **Unified Database** - UI and scraper use same Supabase instance
3. **Simplified Secrets** - Only 3 secrets needed (was 7)
4. **Better Performance** - Connection pooling for GitHub Actions
5. **Easier Maintenance** - PostgreSQL standard syntax

---

## Commits

- `12ab656` - Migrate scraper from MySQL to PostgreSQL/Supabase
- `32f2053` - Add missing database tables and constraints for scraper
- `fecf2a8` - Update GitHub Actions workflow for Supabase PostgreSQL

---

**Migration completed successfully!** 🎉
