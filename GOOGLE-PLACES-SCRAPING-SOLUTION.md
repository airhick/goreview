# Reliable Google Business Information Scraping Solution

## Overview

This solution provides a **reliable, multi-layered approach** to scrape Google Business information (rating, review count, business name) using the `business_id` (Place ID) from Supabase.

## Architecture

### Two Implementation Paths

1. **Local Development (Python Server)**: `/api/google-place-details`
   - Primary: Google Places API (most reliable)
   - Fallback: HTML scraping with JSON-LD parsing

2. **Production (Netlify Function)**: `/.netlify/functions/google-place-details`
   - Primary: HTML scraping with multiple extraction methods
   - Methods: JSON-LD, window state, enhanced pattern matching

## How It Works

### Method Priority (Most Reliable First)

#### 1. **Google Places API** (Python Server Only)
- **Most reliable** method
- Returns structured JSON data
- Requires valid API key
- Falls back to HTML scraping if API fails

#### 2. **JSON-LD Structured Data Parsing**
- Extracts data from `<script type="application/ld+json">` tags
- Google Maps embeds business data in JSON-LD format
- Very reliable when available
- Works in both Python server and Netlify function

#### 3. **Window State Extraction**
- Parses JavaScript variables like `window.__INITIAL_STATE__`
- Recursively searches for rating/review data
- Netlify function only

#### 4. **Enhanced HTML Pattern Matching**
- Multiple regex patterns for rating and review count
- Supports both French and English formats
- Fallback when structured data isn't available

## Data Flow

```
Dashboard Request
    ↓
business_id from Supabase (accounts table)
    ↓
Check if localhost or production
    ↓
┌─────────────────┬──────────────────────┐
│  Localhost      │  Production          │
│  (Python)       │  (Netlify Function)  │
└─────────────────┴──────────────────────┘
    ↓                      ↓
Google Places API    HTML Scraping
    ↓                      ↓
Success?              JSON-LD Parsing
    ↓                      ↓
Return Data          Window State
    ↓                      ↓
                    Pattern Matching
    ↓                      ↓
                    Return Data
```

## Usage

### From Dashboard

The dashboard automatically fetches Google Business info when:
1. Account data is loaded from Supabase
2. `business_id` or `place_id` is found in the account record
3. `fetchGooglePlaceDetails(placeId)` is called

### Manual API Call

**Localhost:**
```javascript
const response = await fetch(`/api/google-place-details?place_id=${placeId}`);
const data = await response.json();
// data.result.rating
// data.result.user_ratings_total
// data.result.name
```

**Production:**
```javascript
const response = await fetch(`/.netlify/functions/google-place-details?place_id=${placeId}`);
const data = await response.json();
```

## Response Format

### Success Response
```json
{
  "status": "OK",
  "result": {
    "name": "Business Name",
    "rating": 4.5,
    "user_ratings_total": 123,
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4"
  }
}
```

### Error Response
```json
{
  "status": "ERROR",
  "error": "Error message here"
}
```

### No Data Found
```json
{
  "status": "ZERO_RESULTS",
  "error": "Could not extract rating and review data",
  "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4"
}
```

## Database Schema

The solution uses the `accounts` table in Supabase:

```sql
accounts
  - id (UUID)
  - business_id (TEXT) -- Google Place ID
  - place_id (TEXT) -- Alternative field name
  - current_rating (NUMERIC) -- Cached rating
  - tot_review (INTEGER) -- Cached review count
  - ...
```

The scraper automatically:
1. Fetches `business_id` or `place_id` from the account
2. Scrapes current rating and review count
3. Optionally caches results back to `current_rating` and `tot_review`

## Reliability Features

### ✅ Multiple Extraction Methods
- If one method fails, others are tried automatically
- No single point of failure

### ✅ Error Handling
- Graceful degradation
- Detailed error messages for debugging
- Fallback to cached database values

### ✅ Caching
- Results cached in database (`current_rating`, `tot_review`)
- HTTP cache headers (5 minutes)
- Reduces API calls and scraping requests

### ✅ Format Support
- French and English formats
- Multiple number formats (4.5, 4,5)
- Handles spaces in numbers (1 234 reviews)

## Troubleshooting

### 404 Error on Localhost
**Solution**: Make sure Python server is running:
```bash
npm run dev
# or
python3 server.py
```

### API Key Issues (Python Server)
- Check if Google Places API key is valid
- Verify API key has Places API enabled
- System will automatically fall back to HTML scraping

### No Data Extracted
- Check if `business_id` exists in Supabase
- Verify Place ID is valid (format: `ChIJ...`)
- Check browser console for detailed error messages
- System will use cached database values if available

### Rate Limiting
- Google Places API has rate limits
- HTML scraping is slower but unlimited
- Caching reduces need for frequent requests

## Performance

- **Google Places API**: ~200-500ms (fastest, most reliable)
- **HTML Scraping**: ~1-3 seconds (slower but works without API key)
- **Cached Results**: Instant (from database)

## Security

- CORS headers properly set
- API keys stored server-side only
- No sensitive data exposed to client
- Input validation (place_id required)

## Future Improvements

1. **Add Retry Logic**: Automatic retries with exponential backoff
2. **Batch Processing**: Scrape multiple places at once
3. **Scheduled Updates**: Periodic refresh of cached data
4. **New Google Places API**: Migrate to newer API version when stable
5. **Headless Browser**: Use Puppeteer for more complex scraping scenarios

## Files Modified

- `netlify/functions/google-place-details.js` - Enhanced Netlify function
- `server.py` - Improved Python server with API + fallback
- `dashboard.html` - Better error handling and logging

## Testing

To test the solution:

1. **Start local server:**
   ```bash
   npm run dev
   ```

2. **Access dashboard with valid account ID:**
   ```
   http://localhost:8000/dashboard?id=YOUR_ACCOUNT_ID
   ```

3. **Check browser console** for detailed logs:
   - `📊 Fetching Google Places details`
   - `✅ Google Places data received`
   - Or error messages with helpful debugging info

4. **Verify data appears** in dashboard rating/review displays

