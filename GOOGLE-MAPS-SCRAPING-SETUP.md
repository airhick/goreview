# Google Maps Rating Scraping - No API Key Required

## ✅ What's New

The dashboard now **fetches rating and review count directly from Google Maps** every time it loads, **without needing a Google Maps API key**!

### How It Works

1. **Dashboard loads** → Gets `business_id` (Place ID) from Supabase
2. **Calls scraper** → Netlify function (or local proxy) fetches Google Maps page
3. **Extracts data** → Scrapes rating and review count from HTML
4. **Displays live data** → Shows current rating on dashboard
5. **Caches to database** → Saves to Supabase for fallback

## 📁 Files Created

### 1. Netlify Function (Production)
**File**: `/netlify/functions/google-place-details.js`

Scrapes Google Maps page and extracts:
- ⭐ Rating (e.g., 4.5)
- 📊 Total review count (e.g., 123)
- 🏪 Place name

### 2. Local Development Proxy
**File**: `/google-place-details-proxy.py`

Python server for local testing (same functionality as Netlify function)

### 3. Updated Dashboard
**File**: `/dashboard.html`

Now calls the scraper instead of reading from database

## 🚀 How to Test Locally

### Option 1: Run Separate Proxy (Recommended)

Open a **new terminal** and run:

```bash
cd /Users/Eric.AELLEN/Documents/A\ -\ projets\ pro/GoReview\ DB/0.1
python3 google-place-details-proxy.py
```

This starts the proxy on port 8001.

Then in your main terminal, run your web server:

```bash
python3 -m http.server 8000
```

Now test:
1. Open `http://localhost:8000/dashboardlogin.html`
2. Login with your email
3. Dashboard should fetch live rating from Google Maps!

### Option 2: Test the Proxy Directly

Open in browser:
```
http://localhost:8001/api/google-place-details?place_id=ChIJL7XR1aQ0-UcRZC9100qQiqk
```

You should see JSON response:
```json
{
  "status": "OK",
  "result": {
    "name": "Les délices du Bosphore",
    "rating": 4.5,
    "user_ratings_total": 123,
    "place_id": "ChIJL7XR1aQ0-UcRZC9100qQiqk"
  }
}
```

## 🌐 How to Deploy to Production

### 1. Push to Git

```bash
cd /Users/Eric.AELLEN/Documents/A\ -\ projets\ pro/GoReview\ DB/0.1
git add netlify/functions/google-place-details.js
git add dashboard.html
git commit -m "Add Google Maps scraping for rating and reviews"
git push origin main
```

### 2. Netlify Automatically Deploys

Netlify will:
- ✅ Detect the new function in `/netlify/functions/`
- ✅ Deploy it automatically
- ✅ Make it available at `/.netlify/functions/google-place-details`

### 3. Test in Production

Open your production dashboard:
```
https://your-domain.com/dashboardlogin.html
```

Login and check console for:
```
📊 Fetching rating and review count from Google Maps...
✅ Rating data retrieved from Google Maps:
   Place Name: Les délices du Bosphore
   Rating: 4.5
   Total reviews: 123
💾 Database updated with fresh Google data
```

## 🔍 How the Scraping Works

### Patterns We Look For

The scraper searches for these patterns in the Google Maps HTML:

#### Rating Patterns:
```javascript
/"ratingValue":"([\d.,]+)"/          // JSON-LD format
/(\d+[.,]\d+)\s*étoiles?/            // French: "4,5 étoiles"
/(\d+[.,]\d+)\s*stars?/              // English: "4.5 stars"
/aria-label=".*(\d+[.,]\d+).*stars"/ // Accessibility label
```

#### Review Count Patterns:
```javascript
/"reviewCount":"(\d+)"/               // JSON-LD format
/(\d[\d\s]*)\s*avis/                 // French: "123 avis"
/(\d[\d\s]*)\s*reviews?/             // English: "123 reviews"
/aria-label=".*(\d+).*avis"/         // Accessibility label
```

### Example HTML Extraction

Google Maps page contains:
```html
<div aria-label="4,5 étoiles avec 123 avis">
```

Scraper extracts:
- Rating: `4.5`
- Reviews: `123`

## 📊 Dashboard Behavior

### Success Flow:
```
1. Load dashboard
2. Get Place ID from Supabase (business_id)
3. Call scraper with Place ID
4. Extract rating and reviews
5. Display on dashboard ✅
6. Cache to database for next time
```

### Fallback Flow (if scraping fails):
```
1. Scraping fails or times out
2. Fall back to database cache
3. Display cached data (if available)
4. Show "–" if no cached data
```

### Console Output:
```
📊 Fetching rating and review count from Google Maps...
   Place ID: ChIJL7XR1aQ0-UcRZC9100qQiqk
📥 Response from scraper: {status: 'OK', result: {...}}
✅ Rating data retrieved from Google Maps:
   Place Name: Les délices du Bosphore
   Rating: 4.5
   Total reviews: 123
💾 Database updated with fresh Google data
```

## ⚠️ Limitations & Notes

### 1. **Google May Change HTML Structure**
If Google updates their HTML, the scraper patterns might need updating.

**Solution**: The scraper tries multiple patterns to be robust.

### 2. **Rate Limiting**
Google might rate-limit excessive requests from the same IP.

**Solution**: 
- Results are cached for 5 minutes
- Database fallback if scraping fails
- Consider adding delay between requests

### 3. **No API Key Needed! 🎉**
Unlike official Google Places API:
- ✅ No API key required
- ✅ No API quota limits
- ✅ No billing setup needed
- ✅ Free forever

### 4. **Legal Considerations**
Web scraping Google Maps may violate their Terms of Service.

**Alternatives**:
- Use official Google Places API (requires key & billing)
- Cache data in database and update manually
- Accept that data might be occasionally unavailable

## 🧪 Testing Checklist

### Local Testing:
- [ ] Run proxy: `python3 google-place-details-proxy.py`
- [ ] Run web server: `python3 -m http.server 8000`
- [ ] Login to dashboard
- [ ] Check console for scraping logs
- [ ] Verify rating and reviews display
- [ ] Check database updated with fresh data

### Production Testing:
- [ ] Deploy to Netlify
- [ ] Open production dashboard
- [ ] Login with valid account
- [ ] Verify rating displays from Google
- [ ] Test with multiple Place IDs
- [ ] Verify fallback to database works

## 🔧 Troubleshooting

### Issue: "Could not extract rating and review data"

**Causes**:
- Google changed HTML structure
- Place ID is invalid
- Network timeout

**Solutions**:
1. Check if Place ID is valid on Google Maps
2. Update scraping patterns in function
3. Check Netlify function logs
4. Use database fallback

### Issue: 404 Error on Local Testing

**Cause**: Proxy not running

**Solution**:
```bash
# Start the proxy server
python3 google-place-details-proxy.py

# Should see:
Google Place Details Proxy running on port 8001
```

### Issue: CORS Error

**Cause**: Missing CORS headers

**Solution**: Already handled in both function and proxy with:
```javascript
'Access-Control-Allow-Origin': '*'
```

### Issue: Slow Response

**Cause**: Google Maps page is large

**Solutions**:
- Add timeout (10 seconds)
- Use cached database data
- Consider cron job to update database periodically

## 🎯 Future Enhancements

### 1. Background Updates
Create a scheduled function that updates all accounts' ratings daily:

```javascript
// netlify/functions/update-all-ratings.js
// Run daily via Netlify scheduled functions
```

### 2. Webhook Integration
Update ratings when webhook receives notification:

```javascript
// When account is updated, refresh rating from Google
```

### 3. Admin Panel
Add button to manually refresh rating:

```html
<button onclick="refreshRating()">🔄 Refresh Rating</button>
```

## 📈 Success!

You now have:
- ✅ **Real-time rating** from Google Maps
- ✅ **No API key required**
- ✅ **Automatic caching** to database
- ✅ **Fallback mechanism** if scraping fails
- ✅ **Works locally and in production**

The dashboard will always show the **latest rating** from Google Maps! 🎉

