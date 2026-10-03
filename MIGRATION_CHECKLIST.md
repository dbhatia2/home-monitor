# PlanetScale + Vercel Migration Checklist

**Goal**: Move database to PlanetScale, API to Vercel

---

## **Pre-Migration Setup (30 minutes)**

### ☐ 1. Create Accounts

**PlanetScale:**
- [ ] Go to https://planetscale.com/sign-up
- [ ] Sign up (can use GitHub login)
- [ ] Verify email

**Vercel:**
- [ ] Go to https://vercel.com/signup
- [ ] Sign up (use GitHub login - recommended)
- [ ] Connect your GitHub account

### ☐ 2. Install CLIs

```bash
# Install PlanetScale CLI
brew install planetscale/tap/pscale

# Install Vercel CLI
npm install -g vercel

# Verify installations
pscale version
vercel --version
```

### ☐ 3. Login to Services

```bash
# Login to PlanetScale (opens browser)
pscale auth login

# Login to Vercel (opens browser)
vercel login
```

---

## **Phase 1: Migrate Database to PlanetScale (45 minutes)**

### ☐ 4. Create PlanetScale Database

```bash
# Create database
pscale database create home-monitor --region us-east

# Create dev branch for safe migration
pscale branch create home-monitor dev
```

### ☐ 5. Export Current Database

```bash
# Export from local MySQL
docker exec home_db mysqldump -u monitor -pmonitor123 \
  --no-tablespaces \
  --skip-add-locks \
  --no-create-info \
  home_monitor > /tmp/data_only.sql

# Export just the schema
docker exec home_db mysqldump -u monitor -pmonitor123 \
  --no-tablespaces \
  --no-data \
  home_monitor > /tmp/schema_only.sql
```

### ☐ 6. Prepare Schema for PlanetScale

**Note**: PlanetScale doesn't support foreign keys. You need to remove them.

```bash
# Option A: Manual (recommended for first time)
# 1. Open /tmp/schema_only.sql
# 2. Remove all lines containing "CONSTRAINT" or "FOREIGN KEY"
# 3. Save file

# Option B: Automated removal
sed -i '' '/CONSTRAINT/d' /tmp/schema_only.sql
sed -i '' '/FOREIGN KEY/d' /tmp/schema_only.sql
```

### ☐ 7. Import to PlanetScale

```bash
# Connect to dev branch
pscale shell home-monitor dev

# Once connected, run these SQL commands:
# 1. Copy and paste contents of /tmp/schema_only.sql (modified)
# 2. Copy and paste INSERT statements from /tmp/data_only.sql
# 3. Verify: SELECT COUNT(*) FROM homes;

# Exit shell
exit
```

### ☐ 8. Promote to Production

```bash
# Create deploy request
pscale deploy-request create home-monitor dev

# List deploy requests to get number
pscale deploy-request list home-monitor

# Deploy (replace <NUMBER> with actual number)
pscale deploy-request deploy home-monitor <NUMBER>

# Create production credentials
pscale password create home-monitor main vercel-prod
```

**CRITICAL**: Save these credentials somewhere safe:
```
Host: ___________________________
Username: ________________________
Password: ________________________
```

### ☐ 9. Test Connection

```bash
# Connect to main branch
pscale shell home-monitor main

# Verify data
SELECT COUNT(*) FROM homes;
SELECT COUNT(*) FROM builders;
SELECT * FROM homes LIMIT 5;

exit
```

---

## **Phase 2: Deploy API to Vercel (30 minutes)**

### ☐ 10. Create Production Environment File

```bash
cd ui

# Create .env.production (use your saved PlanetScale credentials)
cat > .env.production << 'EOF'
# PlanetScale Database
DB_HOST=<YOUR_PLANETSCALE_HOST>
DB_PORT=3306
DB_USER=<YOUR_PLANETSCALE_USER>
DB_PASS=<YOUR_PLANETSCALE_PASSWORD>
DB_NAME=home_monitor

# Generate a random API key
API_KEY=REPLACE_WITH_RANDOM_KEY
EOF

# Generate random API key
echo "API_KEY=$(openssl rand -hex 32)" >> .env.production

# View your .env.production to copy values
cat .env.production
```

### ☐ 11. Deploy to Vercel

```bash
# Still in ui/ directory
vercel --prod
```

**Follow prompts:**
- "Set up and deploy?" → **Yes**
- "Which scope?" → **Your account**
- "Link to existing project?" → **No**
- "What's your project's name?" → **home-monitor**
- "In which directory is your code located?" → **./** (just press Enter)
- "Want to modify settings?" → **No**

### ☐ 12. Add Environment Variables to Vercel

**The deployment will ask about environment variables. When prompted:**

1. Add all variables from `.env.production`:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASS`
   - `DB_NAME`
   - `API_KEY`

2. Or add them later via dashboard:
   - Go to https://vercel.com/dashboard
   - Select "home-monitor" project
   - Settings → Environment Variables
   - Add each variable
   - Redeploy: `vercel --prod`

### ☐ 13. Test Vercel Deployment

```bash
# Get your Vercel URL from deployment output
# Example: https://home-monitor-abc123.vercel.app

VERCEL_URL="<YOUR_VERCEL_URL>"

# Test public endpoint (no auth needed)
curl $VERCEL_URL/api/filters | jq .

# Test authenticated endpoint (replace <YOUR_API_KEY>)
curl -H "x-api-key: <YOUR_API_KEY>" \
  "$VERCEL_URL/api/homes?city=Dublin&limit=5" | jq .
```

**Expected results:**
- `/api/filters` → JSON with cities, builders, price ranges
- `/api/homes` → JSON array of home listings

---

## **Phase 3: Update Scraper (15 minutes)**

Choose one option:

### Option A: Local Scraper (Simplest)

```bash
# Update root .env with PlanetScale credentials
cat > .env << 'EOF'
DB_HOST=<YOUR_PLANETSCALE_HOST>
DB_PORT=3306
DB_USER=<YOUR_PLANETSCALE_USER>
DB_PASS=<YOUR_PLANETSCALE_PASSWORD>
DB_NAME=home_monitor
DB_WRITE=true

# Email Configuration (keep your existing values)
EMAIL_FROM=deepeshbhatia21@gmail.com
EMAIL_PASS=<your-gmail-app-password>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EOF

# Run scraper pointing to PlanetScale
docker compose -f docker-compose.cloud.yml up -d scraper

# Check logs
docker logs -f home_scraper
```

### Option B: GitHub Actions (Fully Cloud)

```bash
# 1. Go to your GitHub repo settings
# 2. Settings → Secrets and variables → Actions
# 3. Add these secrets:
#    - DB_HOST → PlanetScale host
#    - DB_PORT → 3306
#    - DB_USER → PlanetScale user
#    - DB_PASS → PlanetScale password
#    - DB_NAME → home_monitor
#    - EMAIL_FROM → Your email
#    - EMAIL_PASS → Your email app password

# 4. Test workflow:
#    - Go to Actions tab
#    - Select "Daily Home Scraper"
#    - Click "Run workflow"
```

---

## **Verification Checklist**

### ✅ Database Migration
- [ ] Can connect to PlanetScale: `pscale shell home-monitor main`
- [ ] Data migrated: `SELECT COUNT(*) FROM homes;` shows correct count
- [ ] All tables present: `SHOW TABLES;` shows all 13 tables

### ✅ API Deployment
- [ ] Vercel deployment successful (green ✓ in dashboard)
- [ ] `/api/filters` returns data
- [ ] `/api/homes` returns data (with API key)
- [ ] No database connection errors in logs

### ✅ Scraper
- [ ] Scraper runs without errors
- [ ] New data appears in PlanetScale database
- [ ] Email notifications work

---

## **Rollback Plan**

If anything goes wrong, you can quickly revert:

```bash
# Point API back to local MySQL
cd ui
cat > .env.local << 'EOF'
DB_HOST=127.0.0.1
DB_PORT=3310
DB_USER=monitor
DB_PASS=monitor123
DB_NAME=home_monitor
EOF

# Restart local development
npm run dev
```

Your local database remains untouched during migration!

---

## **Estimated Time**

- **Setup**: 30 minutes
- **Database Migration**: 45 minutes
- **API Deployment**: 30 minutes
- **Scraper Update**: 15 minutes
- **Total**: ~2 hours

---

## **Cost After Migration**

- PlanetScale: **$0/month** (free tier)
- Vercel: **$0/month** (free tier)
- GitHub Actions: **$0/month** (free tier)
- **Total: $0/month** 🎉

---

## **Next Steps After Migration**

1. [ ] Add custom domain to Vercel (optional)
2. [ ] Set up mobile app with new Vercel URL
3. [ ] Enable Vercel Analytics (free monitoring)
4. [ ] Set up automated backups
5. [ ] Configure CI/CD for auto-deployment

---

## **Need Help?**

- PlanetScale Docs: https://planetscale.com/docs
- Vercel Docs: https://vercel.com/docs
- This project's deployment guide: `DEPLOYMENT_GUIDE.md`
