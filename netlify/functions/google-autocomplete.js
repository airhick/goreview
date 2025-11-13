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
    const country = event.queryStringParameters?.country || 'FR';
    
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

    // Map country codes to full names for components parameter
    const countryMap = {
      'FR': 'fr',
      'CH': 'ch'
    };
    const countryCode = countryMap[country] || 'fr';
    
    // Set origin based on country for better relevance
    const origins = {
      'FR': '48.8566,2.3522', // Paris
      'CH': '46.9480,7.4474'  // Bern
    };
    const origin = origins[country] || origins['FR'];

    // Call Google Places Autocomplete API
    const GOOGLE_MAPS_API_KEY = 'AIzaSyC1zqymSXocGXuCEVvpzXERWYwIzimV0Oo';
    const googleUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const params = new URLSearchParams({
      input: input.trim(),
      key: GOOGLE_MAPS_API_KEY,
      language: 'fr',
      components: `country:${countryCode}`, // Restrict to selected country only
      types: 'address', // Only return full addresses
      // Optimize for speed and relevance
      strictbounds: 'false',
      origin: origin,
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

