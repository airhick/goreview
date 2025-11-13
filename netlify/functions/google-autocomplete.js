// Netlify Function to proxy Google Places Autocomplete API requests
// This provides fast, accurate address suggestions for France and Switzerland

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
    const input = event.queryStringParameters?.input;
    
    if (!input || input.trim().length < 2) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'input parameter is required (min 2 chars)' }),
      };
    }

    // Call Google Places Autocomplete API
    const GOOGLE_MAPS_API_KEY = 'AIzaSyC1zqymSXocGXuCEVvpzXERWYwIzimV0Oo';
    const googleUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const params = new URLSearchParams({
      input: input.trim(),
      key: GOOGLE_MAPS_API_KEY,
      language: 'fr',
      components: 'country:fr|country:ch', // Restrict to France and Switzerland
      types: 'address', // Only return full addresses
    });

    const response = await fetch(`${googleUrl}?${params.toString()}`);
    const data = await response.json();

    // Return the response with CORS headers
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
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

