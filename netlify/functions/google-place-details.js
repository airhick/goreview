// Netlify Function to proxy Google Places API requests
// This avoids CORS issues when calling Google Maps API from the browser

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
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'place_id parameter is required' }),
      };
    }

    // Call Google Places API
    const GOOGLE_MAPS_API_KEY = 'AIzaSyC1zqymSXocGXuCEVvpzXERWYwIzimV0Oo';
    const googleUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'rating,user_ratings_total',
      key: GOOGLE_MAPS_API_KEY,
    });

    const response = await fetch(`${googleUrl}?${params.toString()}`);
    const data = await response.json();

    // Return the response with CORS headers
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

