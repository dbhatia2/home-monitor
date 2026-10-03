# Home Monitor Deployment Guide

This guide walks you through deploying the Home Monitor app to production using free-tier services.

## Prerequisites

- GitHub account (for repository and GitHub Actions)
- Expo account (for EAS builds)
- Apple Developer account ($99/year, optional for iOS)

## Quick Start Checklist

- [ ] Phase 1: Setup PlanetScale database
- [ ] Phase 2: Deploy Next.js API to Vercel
- [ ] Phase 3: Configure mobile app for production
- [ ] Phase 4: Build mobile apps
- [ ] Phase 5: Migrate scraper

---

## Phase 1: PlanetScale Database Setup

### 1.1 Install PlanetScale CLI

```bash
# macOS
brew install planetscale/tap/pscale

# Or use installer script
curl -fsSL https://raw.githubusercontent.com/planetscale/cli/main/installer.sh | sh
```

### 1.2 Create Account & Database

```bash
# Login (creates account if needed)
pscale auth login

# Create database
pscale database create home-monitor --region us-east

# Create dev branch
pscale branch create home-monitor dev
```

### 1.3 Export Local Data

```bash
# Export from local MySQL
docker exec home_db mysqldump -u monitor -pmonitor123 \
  --no-tablespaces home_monitor > /tmp/migration.sql

# Optional: Remove FOREIGN KEY constraints (PlanetScale doesn't support them)
# Edit /tmp/migration.sql and remove any CONSTRAINT lines
```

### 1.4 Import to PlanetScale

```bash
# Connect to dev branch
pscale shell home-monitor dev

# Run in PlanetScale shell:
# 1. Copy schema from db/init/01_schema.sql (remove FOREIGN KEY constraints)
# 2. Copy data inserts from /tmp/migration.sql

# Exit shell
exit
```

### 1.5 Promote to Production

```bash
# Create deploy request
pscale deploy-request create home-monitor dev

# Deploy to production (note the request number from previous command)
pscale deploy-request deploy home-monitor <request-number>

# Create connection password
pscale password create home-monitor main pscale-prod-password
```

**IMPORTANT**: Save the credentials shown (they're only displayed once):
- Host
- Username
- Password

### 1.6 Update Configuration

Edit `ui/.env.production` with your PlanetScale credentials:

```bash
DB_HOST=<planetscale-host>
DB_PORT=3306
DB_USER=<planetscale-user>
DB_PASS=<planetscale-password>
DB_NAME=home_monitor
API_KEY=$(openssl rand -hex 32)
```

### 1.7 Test Connection

```bash
# Connect to production branch
pscale shell home-monitor main

# Verify data
SELECT COUNT(*) FROM homes;
SELECT COUNT(*) FROM builders;
exit
```

---

## Phase 2: Deploy Next.js API to Vercel

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 2.2 Deploy to Vercel

```bash
cd ui
vercel --prod
```

**Follow the prompts:**
1. "Set up and deploy?" → Yes
2. "Which scope?" → Your account
3. "Link to existing project?" → No
4. "What's your project's name?" → home-monitor (or your choice)
5. "In which directory is your code located?" → `./`

### 2.3 Add Environment Variables

**Option A: Via CLI during deployment**
The CLI will prompt you to add environment variables. Copy from `ui/.env.production`.

**Option B: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from `ui/.env.production`
5. Redeploy: `vercel --prod`

### 2.4 Test Deployment

```bash
# Get your deployment URL from Vercel output (e.g., https://home-monitor-xyz.vercel.app)
VERCEL_URL="https://home-monitor-xyz.vercel.app"

# Test public endpoint
curl $VERCEL_URL/api/filters | jq .

# Test authenticated endpoint (replace YOUR_API_KEY)
curl -H "x-api-key: YOUR_API_KEY" \
  "$VERCEL_URL/api/homes?city=Dublin&limit=5" | jq .
```

If both return JSON data, your API is working!

### 2.5 Update Mobile Config

Edit `mobile/eas.json` and replace `https://home-monitor-xyz.vercel.app` with your actual Vercel URL.

Edit `mobile/.env.production`:
```env
EXPO_PUBLIC_API_URL=https://your-actual-vercel-url.vercel.app
EXPO_PUBLIC_API_KEY=<your-api-key-from-vercel>
```

---

## Phase 3: Configure Mobile App

### 3.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 3.2 Configure EAS Project

```bash
cd mobile
eas build:configure
```

This will:
- Create an Expo project ID
- Update `app.json` with the project ID
- Link your local project to Expo servers

---

## Phase 4: Build Mobile Apps

### 4.1 Web Version (Free, Instant)

```bash
cd mobile
npx expo export:web

# Deploy to Vercel
cd web-build
vercel --prod
```

You'll get a web URL that works in any browser on any device.

### 4.2 Android APK (Free)

```bash
cd mobile
eas build --platform android --profile preview
```

Build takes ~15-20 minutes. After completion:
1. Download APK from Expo dashboard (link in terminal output)
2. Share APK link with users
3. Or submit to Google Play Store ($25 one-time fee)

### 4.3 iOS Build (Requires Apple Developer Account)

**If you have Apple Developer account ($99/year):**

```bash
cd mobile
eas build --platform ios --profile preview
```

Build takes ~20-30 minutes. After completion:
1. Distribute via TestFlight (free, up to 100 testers)
2. Or submit to App Store

**Don't have Apple account?**
Users can use the web version in Safari (tap "Add to Home Screen" for app-like experience).

---

## Phase 5: Migrate Scraper

Choose one of these options:

### Option A: Keep Scraper Local (Simplest)

**Pros**: No code changes, works immediately
**Cons**: Requires your machine to be on daily

```bash
# Update root .env file with PlanetScale credentials
cat > .env << 'EOF'
# PlanetScale Database
DB_HOST=<planetscale-host>
DB_PORT=3306
DB_USER=<planetscale-user>
DB_PASS=<planetscale-password>
DB_NAME=home_monitor
DB_WRITE=true

# Email Configuration (keep existing)
EMAIL_FROM=deepeshbhatia21@gmail.com
EMAIL_PASS=<your-app-password>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EOF

# Run scraper with cloud database
docker compose -f docker-compose.cloud.yml up -d scraper

# Check logs
docker logs -f home_scraper
```

### Option B: GitHub Actions (100% Cloud)

**Pros**: Fully automated, no local machine needed
**Cons**: Requires public repo OR uses GitHub Actions minutes

The workflow file is already created at `.github/workflows/daily-scraper.yml`.

**Setup:**

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret" and add:
   - `DB_HOST` → PlanetScale host
   - `DB_PORT` → `3306`
   - `DB_USER` → PlanetScale user
   - `DB_PASS` → PlanetScale password
   - `DB_NAME` → `home_monitor`
   - `EMAIL_FROM` → Your email
   - `EMAIL_PASS` → Your email app password

4. Test the workflow:
   - Go to Actions tab
   - Select "Daily Home Scraper"
   - Click "Run workflow" → "Run workflow"

The scraper will now run automatically at 7am UTC daily.

---

## Verification Steps

### ✅ Phase 1: Database
```bash
pscale shell home-monitor main
# Run: SELECT COUNT(*) FROM homes;
# Should show your migrated data
```

### ✅ Phase 2: API
```bash
curl https://your-vercel-url.vercel.app/api/filters
# Should return JSON with cities, builders, etc.
```

### ✅ Phase 3: Mobile Config
```bash
cd mobile
cat .env.production
# Should show your Vercel URL and API key
```

### ✅ Phase 4: Builds
- **Web**: Open web URL in phone browser → should show listings
- **Android**: Install APK → should fetch data
- **iOS**: Install via TestFlight → verify data loads

### ✅ Phase 5: Scraper
```bash
# If local:
docker logs -f home_scraper

# If GitHub Actions:
# Check Actions tab, verify workflow ran successfully
```

---

## Rollback Procedures

If something goes wrong:

### Rollback Database
```bash
# Point API back to local MySQL
# In ui/.env:
DB_HOST=127.0.0.1
DB_PORT=3310
DB_USER=monitor
DB_PASS=monitor123
```

### Rollback API
- Vercel Dashboard → Deployments → Previous deployment → Promote to Production

### Rollback Mobile
- Old builds continue working
- No forced updates

### Rollback Scraper
```bash
# Point back to local MySQL
# Update root .env:
DB_HOST=mysql
DB_PORT=3306

# Use original docker-compose.yml
docker compose up -d
```

---

## Cost Summary

**100% Free (No iOS):**
- PlanetScale: $0 (5GB free tier)
- Vercel: $0 (100GB bandwidth/month)
- Expo EAS: $0 (30 builds/month)
- GitHub Actions: $0 (2000 min/month)
- Android APK: $0 (direct distribution)
- **Total: $0/month**

**With iOS:**
- Apple Developer: $99/year
- **Total: $8.25/month**

---

## Next Steps After Deployment

1. **Custom Domain**: Point your domain to Vercel (free SSL)
2. **Push Notifications**: Add expo-notifications for price drop alerts
3. **Monitoring**: Enable Vercel Analytics to track usage
4. **OTA Updates**: Use `eas update` to push JS changes without rebuilding
5. **CI/CD**: Auto-deploy on git push

---

## Troubleshooting

### "Connection refused" from Vercel
- Check environment variables are set in Vercel dashboard
- Verify PlanetScale password is correct
- Ensure PlanetScale database is not sleeping (make a query to wake it)

### Mobile app shows "Network Error"
- Verify EXPO_PUBLIC_API_URL in mobile/.env.production matches Vercel URL
- Check API_KEY matches between Vercel and mobile app
- Test API endpoint directly with curl

### Scraper not writing data
- Check DB_WRITE=true in environment
- Verify PlanetScale credentials
- Check scraper logs: `docker logs home_scraper`

### PlanetScale "Too many connections"
- Free tier limited to 1000 concurrent connections
- Check connectionLimit in db.ts (currently 5, which is safe)

---

## Support

For issues with:
- **PlanetScale**: https://planetscale.com/docs
- **Vercel**: https://vercel.com/docs
- **Expo EAS**: https://docs.expo.dev/build/introduction/
- **This project**: Open an issue on GitHub
