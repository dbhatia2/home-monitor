# EAS Build & Update Guide

Guide for managing Expo builds efficiently and avoiding unnecessary builds.

---

## TL;DR

**Free Tier**: 30 builds/month (more than enough!)
**Your Usage**: ~8-12 builds/month during active development, ~2-4 builds/month in maintenance

**Rule of Thumb**:
- 🔄 **Use EAS Update** (free, instant): JavaScript/TypeScript changes, UI tweaks, bug fixes
- 🏗️ **Use EAS Build** (limited): Native changes, version bumps, app store submissions

---

## EAS Free Tier Limits

| Service | Free Tier | Typical Usage | Risk |
|---------|-----------|---------------|------|
| **EAS Build** | 30 builds/month | 2-4/month | ✅ Very low |
| **EAS Submit** | Unlimited | 1-2/month | ✅ No risk |
| **EAS Update** (OTA) | Unlimited | Daily | ✅ No risk |

**Verdict**: You won't hit limits unless doing something very wrong.

---

## When to Use EAS Update (No Build Needed)

**Use `eas update` for** (instant, free, unlimited):

1. **JavaScript/TypeScript code changes**
   ```bash
   # Example: Fix a bug in home scoring logic
   # Edit: ui/src/lib/scoring.ts
   eas update --branch production --message "Fix scoring calculation"
   ```

2. **UI changes** (React components, styles)
   ```bash
   # Example: Update home card layout
   # Edit: mobile/src/components/HomeCard.tsx
   eas update --branch production --message "Update home card design"
   ```

3. **API endpoint changes**
   ```bash
   # Example: Change API URL
   # Edit: mobile/src/lib/api.ts
   eas update --branch production --message "Update API endpoint"
   ```

4. **Filter logic updates**
   ```bash
   # Example: Add new filter option
   # Edit: mobile/src/screens/FiltersScreen.tsx
   eas update --branch production --message "Add 55+ community filter"
   ```

5. **Asset updates** (images, icons - if using Expo assets)
   ```bash
   # Example: Update app icon in JS code
   eas update --branch production --message "Update placeholder images"
   ```

**How it works**:
- Users get update on next app restart (or immediately if forced)
- No App Store/Play Store review needed
- Takes 1-2 minutes to deploy
- Free and unlimited

---

## When to Use EAS Build (Build Required)

**Use `eas build` for** (limited to 30/month):

1. **Native module changes**
   ```bash
   # Example: Add push notifications
   npx expo install expo-notifications
   eas build --platform all --profile preview
   ```

2. **App/Play Store submissions**
   ```bash
   # Version bump in app.json
   eas build --platform all --profile production
   eas submit --platform all
   ```

3. **Config changes** (app.json, eas.json)
   ```bash
   # Example: Change bundle ID, permissions, orientation
   # Edit: mobile/app.json
   eas build --platform all --profile preview
   ```

4. **Native code changes** (rare with Expo)
   ```bash
   # Example: Custom native modules
   eas build --platform all --profile preview
   ```

5. **SDK version upgrades**
   ```bash
   # Example: Upgrade from Expo SDK 50 to 51
   npx expo install expo@latest
   eas build --platform all --profile preview
   ```

**How it works**:
- Takes 15-30 minutes for both platforms
- Counts toward 30 builds/month limit
- Required for App Store/Play Store review

---

## Build Profiles Explained

### Development Profile
```json
{
  "development": {
    "developmentClient": true,
    "distribution": "internal",
    "env": {
      "API_URL": "http://localhost:3200"
    }
  }
}
```

**Use for**: Local testing with Expo Go
**Build**: `eas build --platform all --profile development`
**Install**: Download APK/IPA and install on device

### Preview Profile
```json
{
  "preview": {
    "distribution": "internal",
    "env": {
      "API_URL": "https://home-monitor-xyz.vercel.app"
    }
  }
}
```

**Use for**: Testing production builds before App Store submission
**Build**: `eas build --platform all --profile preview`
**Install**: Download APK/IPA directly (no store needed)

### Production Profile
```json
{
  "production": {
    "env": {
      "API_URL": "https://home-monitor-xyz.vercel.app"
    }
  }
}
```

**Use for**: App Store and Play Store submissions
**Build**: `eas build --platform all --profile production`
**Submit**: `eas submit --platform all`

---

## Optimizing Build Usage

### Strategy 1: Use Preview Builds for Testing

**Don't**:
```bash
# Wasteful - uses production profile for testing
eas build --platform all --profile production
# Test, find bug, rebuild...
# Uses 2 builds for testing
```

**Do**:
```bash
# Use preview profile for testing
eas build --platform all --profile preview
# Test, iterate with EAS Update, then...
eas build --platform all --profile production  # Only when ready for store
```

### Strategy 2: Build One Platform at a Time

**Don't**:
```bash
# Always builds both platforms (uses 2 builds)
eas build --platform all --profile preview
```

**Do**:
```bash
# Build only what you need
eas build --platform android --profile preview  # Test on Android first
# If good, then...
eas build --platform ios --profile preview     # Build iOS separately
```

### Strategy 3: Use EAS Update for Iterations

**Don't**:
```bash
# Rebuild for every change (uses 3+ builds)
eas build --platform all --profile production
# Fix typo in UI...
eas build --platform all --profile production
# Adjust color...
eas build --platform all --profile production
```

**Do**:
```bash
# Build once, update many times
eas build --platform all --profile production
# Fix typo...
eas update --branch production --message "Fix typo"
# Adjust color...
eas update --branch production --message "Update colors"
# ... unlimited updates
```

---

## Typical Build Schedule

### Active Development (First 3 Months)

**Week 1-4**: Feature development
- 2 preview builds/week for testing
- 1 production build at end of month
- **Total**: ~9 builds/month

**Week 5-8**: Bug fixes and polish
- 1 preview build/week
- 1 production build at end of month
- **Total**: ~5 builds/month

### Maintenance Mode (After Launch)

**Normal months**:
- 1 preview build for new features
- 1 production build for App Store update
- **Total**: ~2 builds/month

**Peak months** (major updates):
- 3 preview builds for testing
- 2 production builds (one rejected, one approved)
- **Total**: ~5 builds/month

**Average**: ~3-4 builds/month (10-13% of limit)

---

## Build Time Estimates

| Platform | Build Time | Notes |
|----------|------------|-------|
| Android | 15-20 min | Slightly faster than iOS |
| iOS | 20-30 min | Requires more steps |
| Both (parallel) | 35-50 min | Builds run simultaneously |

**Tip**: Start builds before lunch or end of day to avoid waiting.

---

## Checking Build Usage

```bash
# List recent builds
eas build:list --limit 30

# Check builds in current month
eas build:list --limit 100 | grep "$(date +%Y-%m)"

# View build details
eas build:view [BUILD_ID]
```

**Monitor in web UI**:
- Visit: https://expo.dev/accounts/[account]/projects/home-monitor/builds
- Shows build count per month

---

## EAS Update Commands

### Deploy Update to Production

```bash
# Deploy to production branch
cd mobile
eas update --branch production --message "Fix home listing bug"

# Verify update deployed
eas update:list --branch production
```

### Deploy Update to Preview

```bash
# Deploy to preview branch (for testing)
eas update --branch preview --message "Test new feature"

# Install preview build on device to test
```

### View Update History

```bash
# List recent updates
eas update:list --branch production --limit 10

# View specific update
eas update:view [UPDATE_ID]
```

### Roll Back Update

```bash
# If update causes issues, roll back to previous version
eas update:republish --group [UPDATE_GROUP_ID]
```

---

## Common Scenarios

### Scenario 1: Fix a Bug in Production

**Situation**: Users report a bug in scoring logic

**Solution**:
```bash
# 1. Fix the bug locally
vim mobile/src/lib/scoring.ts

# 2. Test locally with Expo Go
npx expo start

# 3. Deploy update (no build needed!)
eas update --branch production --message "Fix scoring calculation bug"

# Users get fix on next app restart (within hours)
```

**Builds used**: 0 ✅

### Scenario 2: Add Push Notifications

**Situation**: Want to add push notifications for new listings

**Solution**:
```bash
# 1. Install native module
npx expo install expo-notifications

# 2. Update code
vim mobile/src/lib/notifications.ts

# 3. Build (native module requires rebuild)
eas build --platform all --profile preview

# 4. Test on device
# Download and install APK/IPA

# 5. If good, build for production
eas build --platform all --profile production

# 6. Submit to stores
eas submit --platform all
```

**Builds used**: 4 (2 preview + 2 production)

### Scenario 3: Monthly Update

**Situation**: End of month, ready to publish update to App Store

**Solution**:
```bash
# 1. Bump version in app.json
vim mobile/app.json
# Change: "version": "1.0.0" → "1.1.0"

# 2. Build for production
eas build --platform all --profile production

# 3. Submit to stores
eas submit --platform all

# 4. Wait for review (2-7 days)

# 5. If rejected, fix and rebuild
# ... fix issues ...
eas build --platform all --profile production
eas submit --platform all
```

**Builds used**: 2-4 (depending on rejections)

---

## Best Practices

1. **Use preview builds for testing**
   - Never submit preview builds to App/Play Store
   - Only use production profile when ready to submit

2. **Batch changes before building**
   - Don't rebuild for every small change
   - Accumulate changes, then build once

3. **Use EAS Update aggressively**
   - 90% of updates don't need a rebuild
   - Save builds for native changes only

4. **Build one platform at a time during testing**
   - Test on Android first (faster build)
   - Build iOS only when Android works

5. **Monitor your build count**
   - Check build history monthly
   - If approaching 30 builds, slow down

6. **Plan App Store submissions**
   - Aim for 1-2 submissions per month
   - Batch features into monthly releases

---

## If You Exceed 30 Builds/Month

**Unlikely**, but if it happens:

1. **Wait until next month** (free tier resets)
2. **Upgrade to paid tier**: $29/month for unlimited builds
3. **Review your workflow**: Are you building too often?

**Paid tier benefits**:
- Unlimited builds
- Priority build queue (faster builds)
- Custom build infrastructure

**Cost analysis**:
- Free tier: 30 builds/month (sufficient for most developers)
- Paid tier: $29/month
- Break-even: If you need >30 builds regularly, paid tier is worth it

---

## Summary

✅ **EAS Build limits**: Not a concern (30 builds/month is plenty)
✅ **EAS Update**: Use this for 90% of deployments (free, instant)
✅ **Strategy**: Build for native changes, update for everything else

**Your realistic usage**: 3-4 builds/month average (10-13% of limit)
**Risk level**: Very low
**Action needed**: None, just follow best practices

---

## Quick Reference

```bash
# JavaScript/UI changes (no build)
eas update --branch production --message "Description"

# Native changes (requires build)
eas build --platform android --profile preview  # Test first
eas build --platform all --profile production   # When ready

# Submit to stores
eas submit --platform all

# Check build count
eas build:list --limit 30

# Check updates
eas update:list --branch production
```

**Default to EAS Update**, only build when you must.
