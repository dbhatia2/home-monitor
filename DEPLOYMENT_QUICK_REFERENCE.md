# Deployment Quick Reference

Quick commands for common deployment tasks.

## Database (PlanetScale)

```bash
# View databases
pscale database list

# Connect to production
pscale shell home-monitor main

# View connection strings
pscale password list home-monitor main

# Create new password (if needed)
pscale password create home-monitor main new-password-name
```

## API (Vercel)

```bash
# Deploy to production
cd ui && vercel --prod

# View logs
vercel logs

# List deployments
vercel list

# View environment variables
vercel env ls
```

## Mobile (Expo EAS)

```bash
# Build Android preview
cd mobile && eas build --platform android --profile preview

# Build iOS preview
cd mobile && eas build --platform ios --profile preview

# Build both platforms
cd mobile && eas build --platform all --profile preview

# View build status
eas build:list

# Push OTA update (after initial build)
eas update --branch preview
```

## Scraper

```bash
# Local with cloud DB
docker compose -f docker-compose.cloud.yml up -d scraper
docker logs -f home_scraper

# GitHub Actions
# Trigger from: https://github.com/YOUR_USERNAME/home-monitor/actions
# Or via CLI:
gh workflow run "Daily Home Scraper"
```

## Testing

```bash
# Test API (replace with your URL and key)
export API_URL="https://your-app.vercel.app"
export API_KEY="your-api-key"

# Public endpoint
curl $API_URL/api/filters | jq .

# Authenticated endpoint
curl -H "x-api-key: $API_KEY" "$API_URL/api/homes?city=Dublin&limit=5" | jq .

# Test mobile API from app
# Just open the app - it will use EXPO_PUBLIC_API_URL from .env.production
```

## Monitoring

```bash
# PlanetScale database size
pscale database show home-monitor

# Vercel bandwidth usage
vercel --scope YOUR_USERNAME

# EAS build minutes
eas build:list --limit 30

# GitHub Actions minutes
# View at: https://github.com/YOUR_USERNAME/home-monitor/settings/billing
```

## Common Issues

### Issue: "Invalid API key"
**Fix**: Ensure API_KEY matches between Vercel env vars and mobile .env.production

### Issue: "Connection timeout" from Vercel
**Fix**: PlanetScale may be sleeping. Make a query to wake it up:
```bash
pscale shell home-monitor main
SELECT 1;
```

### Issue: Mobile app won't build
**Fix**: Ensure you're logged in to EAS:
```bash
eas whoami
eas login  # if not logged in
```

### Issue: Scraper not running on GitHub Actions
**Fix**: Check secrets are set:
```bash
gh secret list
```

## Environment Variables Reference

### Vercel (ui/.env.production)
- `DB_HOST` - PlanetScale host
- `DB_PORT` - 3306
- `DB_USER` - PlanetScale user
- `DB_PASS` - PlanetScale password
- `DB_NAME` - home_monitor
- `API_KEY` - Random 32-byte hex string

### Mobile (mobile/.env.production)
- `EXPO_PUBLIC_API_URL` - Your Vercel URL
- `EXPO_PUBLIC_API_KEY` - Same as Vercel API_KEY

### GitHub Actions Secrets
- `DB_HOST` - PlanetScale host
- `DB_PORT` - 3306
- `DB_USER` - PlanetScale user
- `DB_PASS` - PlanetScale password
- `DB_NAME` - home_monitor
- `EMAIL_FROM` - Your email
- `EMAIL_PASS` - Your email app password

## URLs to Bookmark

- **PlanetScale Dashboard**: https://app.planetscale.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Expo Dashboard**: https://expo.dev/accounts/[your-username]/projects
- **GitHub Actions**: https://github.com/YOUR_USERNAME/home-monitor/actions

## Useful Commands

```bash
# Generate new API key
openssl rand -hex 32

# Check if API is up
curl -I https://your-app.vercel.app/api/filters

# Export PlanetScale data
pscale database dump home-monitor main --output /tmp/backup.sql

# View recent builds
eas build:list --limit 10

# Cancel running build
eas build:cancel

# View Vercel deployment logs
vercel logs --follow
```
