// Netlify Function to scrape Google Place rating and review count
// Uses multiple methods for reliability:
// 1. JSON-LD structured data parsing (most reliable)
// 2. Enhanced HTML pattern matching
// 3. Multiple fallback patterns
// Uses built-in fetch (Node.js 18+)

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const placeId = event.queryStringParameters?.place_id;
    
    if (!placeId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          status: 'ERROR',
          error: 'place_id parameter is required' 
        }),
      };
    }

    console.log('Fetching Google Place details for:', placeId);

    // Method 1: Try Google Maps place URL
    const googleUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    
    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/',
      }
    });

    if (!response.ok) {
      throw new Error(`Google returned ${response.status}`);
    }

    const html = await response.text();
    
    let rating = null;
    let totalReviews = null;
    let placeName = null;
    
    // METHOD 1: Parse JSON-LD structured data (most reliable)
    try {
      // Extract all JSON-LD script tags
      const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
      
      if (jsonLdMatches) {
        for (const jsonLdContent of jsonLdMatches) {
          try {
            // Extract JSON content
            const jsonMatch = jsonLdContent.match(/<script[^>]*>(.*?)<\/script>/is);
            if (jsonMatch && jsonMatch[1]) {
              const jsonData = JSON.parse(jsonMatch[1]);
              
              // Handle both single objects and arrays
              const items = Array.isArray(jsonData) ? jsonData : [jsonData];
              
              for (const item of items) {
                // Check for LocalBusiness, Restaurant, Store, etc.
                if (item['@type'] && (
                  item['@type'].includes('LocalBusiness') ||
                  item['@type'].includes('Restaurant') ||
                  item['@type'].includes('Store') ||
                  item['@type'].includes('Place')
                )) {
                  // Extract rating
                  if (item.aggregateRating) {
                    if (item.aggregateRating.ratingValue) {
                      rating = parseFloat(item.aggregateRating.ratingValue);
                    }
                    if (item.aggregateRating.reviewCount) {
                      totalReviews = parseInt(item.aggregateRating.reviewCount, 10);
                    }
                  }
                  
                  // Extract name
                  if (item.name && !placeName) {
                    placeName = item.name;
                  }
                  
                  if (rating !== null || totalReviews !== null) {
                    console.log('✅ Found data via JSON-LD:', { rating, totalReviews, placeName });
                    break;
                  }
                }
              }
            }
          } catch (e) {
            // Continue to next JSON-LD block if parsing fails
            continue;
          }
        }
      }
    } catch (e) {
      console.log('JSON-LD parsing failed, trying other methods:', e.message);
    }
    
    // METHOD 2: Extract from window.__INITIAL_STATE__ or similar JavaScript variables
    if (rating === null || totalReviews === null) {
      try {
        // Google Maps stores data in window variables
        const stateMatches = [
          /window\.__INITIAL_STATE__\s*=\s*({.+?});/s,
          /window\["__INITIAL_STATE__"\]\s*=\s*({.+?});/s,
          /var\s+INITIAL_STATE\s*=\s*({.+?});/s,
        ];
        
        for (const pattern of stateMatches) {
          const match = html.match(pattern);
          if (match && match[1]) {
            try {
              const state = JSON.parse(match[1]);
              // Navigate through the state object to find rating/reviews
              // This structure varies, so we search recursively
              const findRatingInObject = (obj, depth = 0) => {
                if (depth > 5) return null; // Prevent infinite recursion
                
                if (typeof obj !== 'object' || obj === null) return null;
                
                // Check common property names
                if (obj.rating !== undefined && typeof obj.rating === 'number') {
                  rating = obj.rating;
                }
                if (obj.userRatingCount !== undefined && typeof obj.userRatingCount === 'number') {
                  totalReviews = obj.userRatingCount;
                }
                if (obj.reviewCount !== undefined && typeof obj.reviewCount === 'number') {
                  totalReviews = obj.reviewCount;
                }
                if (obj.totalReviews !== undefined && typeof obj.totalReviews === 'number') {
                  totalReviews = obj.totalReviews;
                }
                
                // Recursively search nested objects
                for (const key in obj) {
                  if (obj.hasOwnProperty(key)) {
                    findRatingInObject(obj[key], depth + 1);
                    if (rating !== null && totalReviews !== null) break;
                  }
                }
              };
              
              findRatingInObject(state);
              if (rating !== null || totalReviews !== null) {
                console.log('✅ Found data via window state:', { rating, totalReviews });
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
      } catch (e) {
        console.log('State extraction failed:', e.message);
      }
    }
    
    // METHOD 3: Enhanced HTML pattern matching (fallback)
    if (rating === null || totalReviews === null) {
      // Rating patterns - more comprehensive
      const ratingPatterns = [
        // JSON-LD in script tags
        /"ratingValue"\s*:\s*"?([\d.,]+)"?/i,
        /"rating"\s*:\s*"?([\d.,]+)"?/i,
        /rating["']?\s*[:=]\s*["']?([\d.,]+)/i,
        // HTML attributes
        /aria-label=["'][^"']*?(\d+[.,]\d+)[^"']*?(?:étoiles?|stars?)/i,
        /data-rating=["']?([\d.,]+)/i,
        // Text patterns
        /(\d+[.,]\d+)\s*(?:étoiles?|stars?)\s*(?:sur|out of)?\s*\d+/i,
        /(\d+[.,]\d+)\s*\/\s*\d+\s*(?:étoiles?|stars?)/i,
        // Meta tags
        /<meta[^>]*property=["']og:rating:value["'][^>]*content=["']([\d.,]+)/i,
      ];
      
      for (const pattern of ratingPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const parsed = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
            rating = parsed;
            console.log('✅ Rating found via pattern:', rating, pattern);
            break;
          }
        }
      }
      
      // Review count patterns
      const reviewPatterns = [
        // JSON-LD
        /"reviewCount"\s*:\s*"?(\d+)"?/i,
        /"userRatingCount"\s*:\s*"?(\d+)"?/i,
        /"totalReviews"\s*:\s*"?(\d+)"?/i,
        // HTML attributes
        /aria-label=["'][^"']*?(\d[\d\s]*)\s*(?:avis|reviews?)/i,
        /data-review-count=["']?(\d+)/i,
        // Text patterns (French and English)
        /(\d[\d\s]*)\s*avis/i,
        /(\d[\d\s]*)\s*reviews?/i,
        /(\d[\d\s]*)\s*commentaires?/i,
        // Meta tags
        /<meta[^>]*property=["']og:rating:count["'][^>]*content=["'](\d+)/i,
      ];
      
      for (const pattern of reviewPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const parsed = parseInt(match[1].replace(/\s/g, ''), 10);
          if (!isNaN(parsed) && parsed >= 0) {
            totalReviews = parsed;
            console.log('✅ Reviews found via pattern:', totalReviews, pattern);
            break;
          }
        }
      }
    }
    
    // Extract place name if not found
    if (!placeName) {
      const namePatterns = [
        /<title>([^<]+)\s*-\s*Google\s+Maps<\/title>/i,
        /"name"\s*:\s*"([^"]+)"/,
        /property=["']og:title["'][^>]*content=["']([^"]+)/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
      ];
      
      for (const pattern of namePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          placeName = match[1].trim();
          // Clean up common suffixes
          placeName = placeName.replace(/\s*-\s*Google\s+Maps$/i, '');
          console.log('✅ Name found:', placeName);
          break;
        }
      }
    }
    
    // Return results
    if (rating !== null || totalReviews !== null) {
      console.log('✅ Successfully scraped:', { rating, totalReviews, placeName });
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
        body: JSON.stringify({
          status: 'OK',
          result: {
            name: placeName,
            rating: rating,
            user_ratings_total: totalReviews,
            place_id: placeId,
          }
        }),
      };
    }
    
    // If no data found, return empty but valid response
    console.warn('⚠️ Could not extract rating/reviews from HTML');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'ZERO_RESULTS',
        error: 'Could not extract rating and review data from Google Maps page',
        place_id: placeId,
      }),
    };
    
  } catch (error) {
    console.error('❌ Error fetching place details:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'ERROR',
        error: error.message,
      }),
    };
  }
};
