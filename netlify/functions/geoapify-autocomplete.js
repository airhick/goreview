// Netlify Function to proxy Geoapify Autocomplete API requests
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

    // Map country codes to lowercase for Geoapify
    const countryMap = {
      'FR': 'fr',
      'CH': 'ch'
    };
    const countryCode = countryMap[country] || 'fr';
    
    // Set bias location based on country for better relevance
    const biasLocations = {
      'FR': '48.8566,2.3522', // Paris
      'CH': '46.9480,7.4474'  // Bern
    };
    const bias = biasLocations[country] || biasLocations['FR'];

    // Call Geoapify Autocomplete API
    const GEOAPIFY_API_KEY = '920d6022a9414d50911f0dd93d864876';
    const geoapifyUrl = 'https://api.geoapify.com/v1/geocode/autocomplete';
    
    const params = new URLSearchParams({
      text: input.trim(),
      apiKey: GEOAPIFY_API_KEY,
      lang: 'fr',
      filter: `countrycode:${countryCode}`, // Restrict to selected country
      type: 'street', // Only return street addresses
      format: 'json', // Explicitly request JSON format
      bias: `proximity:${bias}`, // Bias results near capital city
      limit: '5' // Limit to 5 results for faster response
    });

    const response = await fetch(`${geoapifyUrl}?${params.toString()}`);
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

