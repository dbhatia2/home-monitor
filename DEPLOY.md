# Quick Deployment Execution Guide

This is a streamlined, copy-paste-friendly guide to deploy your app in ~30 minutes.

---

## Prerequisites Check

```bash
# Verify you have these installed
node --version    # Should be v18+
npm --version     # Should be v9+
docker --version  # Should be v20+

# If missing, install from:
# - Node/npm: https://nodejs.org
# - Docker: https://docker.com
```

---

## Phase 1: PlanetScale Setup (10 minutes)

### Step 1: Install CLI

```bash
# macOS
brew install planetscale/tap/pscale

# Other OS
curl -fsSL https://raw.githubusercontent.com/planetscale/cli/main/installer.sh | sh
```

### Step 2: Create Database

```bash
# Login (will open browser)
pscale auth login

# Create database
pscale database create home-monitor --region us-east

# Create dev branch
pscale branch create home-monitor dev
```

### Step 3: Export Local Data

```bash
# Make sure your local MySQL is running
docker compose up -d mysql

# Export data
docker exec home_db mysqldump -u monitor -pmonitor123 \
  --no-tablespaces \
  --no-create-info \
  --skip-add-drop-table \
  home_monitor > /tmp/migration_data.sql

# Export schema (will need to remove FOREIGN KEY constraints)
docker exec home_db mysqldump -u monitor -pmonitor123 \
  --no-tablespaces \
  --no-data \
  home_monitor > /tmp/migration_schema.sql
```

### Step 4: Clean Schema for PlanetScale

```bash
# Remove FOREIGN KEY constraints (PlanetScale doesn't support them)
sed -i.bak '/CONSTRAINT/d' /tmp/migration_schema.sql
sed -i.bak '/FOREIGN KEY/d' /tmp/migration_schema.sql
```

### Step 5: Import to PlanetScale

```bash
# Connect to dev branch
pscale shell home-monitor dev

# In PlanetScale shell, run:
# 1. Copy/paste contents of /tmp/migration_schema.sql
# 2. Copy/paste contents of /tmp/migration_data.sql
# 3. Type 'exit' when done

# Verify import
pscale shell home-monitor dev
# Run: SELECT COUNT(*) FROM homes;
# Run: SELECT COUNT(*) FROM builders;
# Type 'exit'
```

### Step 6: Promote to Production

```bash
# Create deploy request
pscale deploy-request create home-monitor dev

# Note the request number from output, then deploy
pscale deploy-request deploy home-monitor 1  # Replace 1 with your request number

# Create production password
pscale password create home-monitor main prod-password

# IMPORTANT: Save the output! You'll see:
# Host: xxxxxxxx.us-east-1.psdb.cloud
# Username: xxxxxxxxxxxx
# Password: pscale_pw_xxxxxxxxxxxx
```

### Step 7: Update Configuration

```bash
# Generate API key
export API_KEY=$(openssl rand -hex 32)
echo "Your API key: $API_KEY"

# Update ui/.env.production with PlanetScale credentials
cat > ui/.env.production << EOF
# PlanetScale Database Configuration
DB_HOST=<paste-host-from-step-6>
DB_PORT=3306
DB_USER=<paste-username-from-step-6>
DB_PASS=<paste-password-from-step-6>
DB_NAME=home_monitor

# API Security Key
API_KEY=$API_KEY
EOF

# Verify
cat ui/.env.production
```

---

## Phase 2: Deploy to Vercel (5 minutes)

### Step 1: Install & Login

```bash
npm install -g vercel
vercel login  # Will open browser
```

### Step 2: Deploy

```bash
cd ui
vercel --prod
```

**Answer prompts:**
- "Set up and deploy?" → `y`
- "Which scope?" → Select your account
- "Link to existing project?" → `n`
- "What's your project's name?" → `home-monitor` (or your choice)
- "In which directory is your code located?" → `./` (press Enter)
- "Want to override settings?" → `n`

### Step 3: Add Environment Variables

The CLI will ask if you want to add environment variables. Type `y` and add:

```
DB_HOST=<from-ui/.env.production>
DB_PORT=3306
DB_USER=<from-ui/.env.production>
DB_PASS=<from-ui/.env.production>
DB_NAME=home_monitor
API_KEY=<from-ui/.env.production>
```

**Or add via dashboard:**
1. Go to https://vercel.com/dashboard
2. Click your project → Settings → Environment Variables
3. Add all variables from `ui/.env.production`
4. Redeploy: `vercel --prod`

### Step 4: Test Deployment

```bash
# Save your Vercel URL (from deployment output)
export VERCEL_URL="https://home-monitor-xyz.vercel.app"  # Replace with yours

# Test public endpoint
curl $VERCEL_URL/api/filters | jq .

# Test authenticated endpoint
curl -H "x-api-key: $API_KEY" \
  "$VERCEL_URL/api/homes?city=Dublin&limit=3" | jq .
```

**Expected**: Both should return JSON data. If not, check:
- Environment variables in Vercel dashboard
- PlanetScale database is accessible: `pscale shell home-monitor main`

---

## Phase 3: Mobile App Setup (10 minutes)

### Step 1: Update Mobile Config

```bash
# Update mobile app with your Vercel URL
cat > mobile/.env.production << EOF
EXPO_PUBLIC_API_URL=$VERCEL_URL
EXPO_PUBLIC_API_KEY=$API_KEY
EOF

# Update eas.json with your actual Vercel URL
sed -i.bak "s|https://home-monitor-xyz.vercel.app|$VERCEL_URL|g" mobile/eas.json
```

### Step 2: Install & Configure EAS

```bash
npm install -g eas-cli
eas login  # Create account if needed

cd mobile
eas build:configure
```

This will:
- Create an Expo project ID
- Update `app.json`
- Link to Expo servers

### Step 3: Build Web Version (Optional, Free)

```bash
cd mobile
npx expo export:web

# Deploy web build to Vercel
cd web-build
vercel --prod
# Save the URL, e.g., https://home-monitor-mobile.vercel.app
```

---

## Phase 4: Native App Builds (15-30 minutes build time)

### Android Build (Free)

```bash
cd mobile
eas build --platform android --profile preview
```

**Build takes ~15-20 minutes.** After completion:
1. Link to download APK will be in terminal output
2. Or go to https://expo.dev → Your project → Builds
3. Download APK and share link or install on your device

### iOS Build (Requires Apple Developer Account)

**If you have Apple Developer account ($99/year):**

```bash
cd mobile
eas build --platform ios --profile preview
```

**Build takes ~20-30 minutes.** After completion:
1. Download from Expo dashboard
2. Distribute via TestFlight (free, up to 100 testers)

**Don't have Apple account?**
- Users can use the web version on iPhone
- Or use Safari → Share → "Add to Home Screen" for app-like experience

---

## Phase 5: Scraper Migration (5 minutes)

Choose **ONE** of these options:

### Option A: Local Scraper with Cloud DB (Recommended)

**Pros**: Simple, works immediately
**Cons**: Requires your machine to be on daily

```bash
# Update root .env with PlanetScale credentials
cat > .env << EOF
# PlanetScale Database
DB_HOST=<from-ui/.env.production>
DB_PORT=3306
DB_USER=<from-ui/.env.production>
DB_PASS=<from-ui/.env.production>
DB_NAME=home_monitor
DB_WRITE=true

# Email Configuration (keep your existing values)
EMAIL_FROM=deepeshbhatia21@gmail.com
EMAIL_PASS=<your-gmail-app-password>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EOF

# Run scraper with cloud database
docker compose -f docker-compose.cloud.yml up -d scraper

# Check logs
docker logs -f home_scraper
```

### Option B: GitHub Actions (Fully Automated)

**Pros**: No local machine needed, runs automatically
**Cons**: Requires setting up GitHub secrets

1. **Push your code to GitHub** (if not already)

```bash
# If not yet pushed
git add .
git commit -m "Add deployment configuration"
git push origin main
```

2. **Add secrets to GitHub:**
   - Go to: https://github.com/YOUR_USERNAME/home-monitor/settings/secrets/actions
   - Click "New repository secret" and add each:

| Secret Name | Value |
|-------------|-------|
| `DB_HOST` | From ui/.env.production |
| `DB_PORT` | `3306` |
| `DB_USER` | From ui/.env.production |
| `DB_PASS` | From ui/.env.production |
| `DB_NAME` | `home_monitor` |
| `EMAIL_FROM` | Your email |
| `EMAIL_PASS` | Your Gmail app password |

3. **Test the workflow:**
   - Go to: https://github.com/YOUR_USERNAME/home-monitor/actions
   - Click "Daily Home Scraper"
   - Click "Run workflow" → "Run workflow"
   - Monitor the run (should take ~5-10 minutes)

The scraper will now run automatically at 7am UTC daily.

---

## Verification Checklist

### ✅ Database
```bash
pscale shell home-monitor main
# Run: SELECT COUNT(*) FROM homes;
# Should show your migrated data
exit
```

### ✅ API
```bash
curl $VERCEL_URL/api/filters
# Should return: {"cities":[...],"builders":[...],...}
```

### ✅ Mobile Config
```bash
cat mobile/.env.production
# Should show your Vercel URL and API key
```

### ✅ Web App
Open in browser: `$VERCEL_URL`
- Should show home listings
- Filters should work
- Should load data from PlanetScale

### ✅ Mobile Web (if deployed)
Open in phone browser: `https://home-monitor-mobile.vercel.app`
- Should show mobile UI
- Should fetch data from API

### ✅ Scraper
```bash
# If local:
docker logs home_scraper
# Should show: "Scraping completed" with no errors

# If GitHub Actions:
# Check Actions tab, should see green checkmark
```

---

## What You Just Deployed

| Component | Deployed To | URL | Cost |
|-----------|-------------|-----|------|
| Database | PlanetScale | (connect via CLI/app) | Free (5GB) |
| API | Vercel | $VERCEL_URL | Free (100GB/mo) |
| Web App | Vercel | $VERCEL_URL | Free |
| Mobile Web | Vercel | (optional) | Free |
| Android App | Expo EAS | (download link) | Free |
| iOS App | Expo EAS | (TestFlight) | $99/year |
| Scraper | Local or GitHub | (automated) | Free |

**Total monthly cost**: $0 (or $8.25/month if iOS)

---

## Post-Deployment Tasks

### 1. Bookmark Your URLs

```bash
# Save these somewhere
echo "API URL: $VERCEL_URL"
echo "API Key: $API_KEY"
echo "Mobile Web: https://home-monitor-mobile.vercel.app"  # If deployed
echo "Android APK: (check Expo dashboard)"
```

### 2. Enable Monitoring

**PlanetScale:**
- Go to: https://planetscale.com → Database → home-monitor
- Enable email alerts at 80% storage

**Vercel:**
- Go to: https://vercel.com → Project → Settings → Notifications
- Enable deployment failure alerts

**Expo:**
- Go to: https://expo.dev → Project → Settings
- Enable build failure alerts

### 3. Set Up Custom Domain (Optional)

In Vercel dashboard:
1. Project → Settings → Domains
2. Add your domain (e.g., `homes.yourdomain.com`)
3. Update DNS (Vercel provides instructions)
4. Free SSL certificate included

### 4. Test End-to-End

```bash
# 1. Add a test home via scraper
# 2. Check PlanetScale to verify it was written
# 3. Open web app and verify it appears
# 4. Open mobile app and verify it appears
# 5. Apply filters and verify they work
```

---

## Troubleshooting

### "Unable to connect to PlanetScale"
```bash
# Test connection manually
pscale shell home-monitor main
# If fails: Check your credentials in ui/.env.production
```

### "API returns 500 error"
```bash
# Check Vercel logs
vercel logs

# Common issues:
# - Missing environment variables
# - Wrong database credentials
# - PlanetScale database sleeping (query to wake it)
```

### "Mobile app shows 'Network Error'"
```bash
# Verify mobile config
cat mobile/.env.production

# Test API directly
curl -H "x-api-key: $API_KEY" "$VERCEL_URL/api/homes?limit=1"

# Rebuild with correct config
cd mobile
eas build --platform android --profile preview
```

### "Scraper not writing to database"
```bash
# Check scraper logs
docker logs home_scraper

# Verify DB_WRITE=true in .env
grep DB_WRITE .env

# Test database connection from scraper
docker exec -it home_scraper python -c "
import os
import mysql.connector
conn = mysql.connector.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASS'),
    database=os.getenv('DB_NAME')
)
print('Connection successful!')
"
```

---

## Rollback Instructions

If something goes wrong and you need to revert:

### Rollback API to Local Database
```bash
# In ui/.env:
DB_HOST=127.0.0.1
DB_PORT=3310
DB_USER=monitor
DB_PASS=monitor123

# Redeploy
cd ui
vercel --prod
```

### Rollback Scraper to Local Database
```bash
# In root .env:
DB_HOST=mysql
DB_PORT=3306
DB_USER=monitor
DB_PASS=monitor123

# Use original docker-compose
docker compose up -d
```

### Rollback Vercel Deployment
1. Go to: https://vercel.com → Your project → Deployments
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"

---

## Next Steps

1. **Archive old data** (see OPTIMIZATION_GUIDE.md)
2. **Set up push notifications** for price drop alerts
3. **Add custom domain** to Vercel
4. **Enable OTA updates** with `eas update`
5. **Set up CI/CD** for auto-deployment on git push

---

## Getting Help

- **PlanetScale issues**: https://planetscale.com/docs
- **Vercel issues**: https://vercel.com/docs
- **Expo issues**: https://docs.expo.dev
- **Project issues**: Open GitHub issue

**Congratulations! Your app is now deployed and accessible from anywhere! 🎉**
