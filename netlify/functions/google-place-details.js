// Netlify Function to scrape Google Place rating and review count
// WITHOUT needing Google Maps API key

const fetch = require('node-fetch');

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

    // Fetch the Google Maps page HTML
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
    
    // Extract rating using multiple patterns
    let rating = null;
    let totalReviews = null;
    let placeName = null;
    
    // Pattern 1: Look for rating in common formats
    // Google uses patterns like: "4.5" or "4,5" followed by star icon and review count
    const ratingPatterns = [
      /"ratingValue":"([\d.,]+)"/,                          // JSON-LD format
      /(\d+[.,]\d+)\s*étoiles?/i,                          // French format
      /(\d+[.,]\d+)\s*stars?/i,                            // English format
      /aria-label="[^"]*(\d+[.,]\d+)[^"]*étoiles?[^"]*"/i, // ARIA label French
      /aria-label="[^"]*(\d+[.,]\d+)[^"]*stars?[^"]*"/i,   // ARIA label English
    ];
    
    for (const pattern of ratingPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        rating = parseFloat(match[1].replace(',', '.'));
        console.log('Rating found:', rating, 'using pattern:', pattern);
        break;
      }
    }
    
    // Pattern 2: Look for review count
    const reviewPatterns = [
      /"reviewCount":"(\d+)"/,                              // JSON-LD format
      /(\d[\d\s]*)\s*avis/i,                               // French: "123 avis"
      /(\d[\d\s]*)\s*reviews?/i,                           // English: "123 reviews"
      /aria-label="[^"]*(\d[\d\s]+)\s*avis[^"]*"/i,       // ARIA label French
      /aria-label="[^"]*(\d[\d\s]+)\s*reviews?[^"]*"/i,   // ARIA label English
    ];
    
    for (const pattern of reviewPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Remove spaces and parse
        totalReviews = parseInt(match[1].replace(/\s/g, ''), 10);
        console.log('Reviews found:', totalReviews, 'using pattern:', pattern);
        break;
      }
    }
    
    // Pattern 3: Try to extract place name
    const namePatterns = [
      /<title>([^<]+)\s*-\s*Google Maps<\/title>/i,
      /"name":"([^"]+)"/,
      /property="og:title"\s+content="([^"]+)"/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        placeName = match[1].trim();
        console.log('Name found:', placeName);
        break;
      }
    }
    
    // If we found data, return it
    if (rating !== null || totalReviews !== null) {
      console.log('Successfully scraped:', { rating, totalReviews, placeName });
      
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
    console.warn('Could not extract rating/reviews from HTML');
    
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
    console.error('Error fetching place details:', error);
    
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

