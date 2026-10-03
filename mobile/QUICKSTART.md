# 📱 Home Monitor Mobile App - Quick Start

## Prerequisites

1. **Install Expo Go on your phone**
   - iOS: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: Download from [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Running the App

### Option 1: Access on Phone + Laptop Web (Recommended)

1. **Start the development server:**
   ```bash
   cd mobile
   npm start
   ```

2. **On your phone:**
   - Open the **Expo Go** app
   - Scan the QR code shown in your terminal
   - The app will load automatically

3. **On your laptop (web browser):**
   - Press `w` in the terminal after starting
   - OR open: http://localhost:8081 in your browser
   - The web version will open automatically

### Option 2: Use Tunnel Mode (For Network Issues)

If you're having trouble connecting your phone:

```bash
cd mobile
npm run tunnel
```

This creates a public URL that works even if your phone and laptop are on different networks.

## Available Commands

```bash
npm start          # Start development server
npm run web        # Open directly in web browser
npm run ios        # Open iOS simulator (Mac only, requires Xcode)
npm run android    # Open Android emulator (requires Android Studio)
npm run tunnel     # Start with tunnel mode (for network issues)
```

## What You'll See

The app has 4 tabs:

1. **📊 Dashboard** - Market overview, best value homes, city statistics
2. **🏷️ Deals** - Browse all listings with filters and sorting
3. **❤️ Saved** - Your saved homes with comparison tools
4. **👤 Profile** - Preferences and settings

## Features Implemented

✅ **Dashboard Tab**
- Market overview metrics (active listings, move-in ready, drops, avg price)
- Best value spotlight (top 3 homes by score)
- City-by-city breakdown

✅ **Deals Tab**
- Enhanced listing cards with score badges
- Visual deal indicators (price drops, move-in ready, new listings)
- Quick sort tabs (Best Value, Price Drops, Best $/sqft, etc.)
- City filter pills
- Price per sqft displayed prominently

✅ **Filters Screen**
- Quick filter chips (Price Drops, Move-in Ready, New Listings, 3+ Beds)
- Saved searches functionality
- Comprehensive filters (beds, baths, price, size, builders)
- Live filter count badge

✅ **Saved Tab**
- Grouped by city
- Compare mode (select 2-4 homes for side-by-side comparison)
- Sort options (Best Value, Price, Price Drop, Newest)

✅ **Home Detail Screen**
- Price history chart
- Large score badge
- Share functionality
- School ratings
- Tracking information

✅ **Compare Screen**
- Side-by-side comparison table
- Highlights best values (lowest price, best $/sqft, largest size)
- Direct links to full details

## Troubleshooting

### Phone can't connect to laptop

**Solution 1:** Make sure both devices are on the same WiFi network

**Solution 2:** Use tunnel mode:
```bash
npm run tunnel
```

### "Metro bundler error"

**Solution:** Clear the cache and restart:
```bash
npx expo start -c
```

### App crashes on startup

**Solution:** Check that the backend API is running. The app expects the API at:
- Local: Your Vercel deployment or local Next.js server

## API Configuration

The app connects to your deployed API. Make sure:
1. The Vercel API is deployed and running
2. Update the API base URL if needed in `mobile/lib/api.ts`

## Development Tips

- **Hot Reload:** Changes to code automatically refresh the app
- **Shake Device:** Opens developer menu on phone
- **Cmd+D (iOS) / Cmd+M (Android):** Opens developer menu in simulator
- **Press 'r':** Reload the app manually
- **Press 'm':** Toggle menu

## Next Steps

1. Start the app: `npm start`
2. Scan QR code with Expo Go on your phone
3. Browse homes on the Dashboard tab
4. Filter deals on the Deals tab
5. Save your favorite homes
6. Compare multiple properties

Enjoy using the Home Monitor mobile app! 🏠
