// Supabase Edge Function to proxy Google Places API requests
// This avoids CORS issues when calling Google Maps API from the browser

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GOOGLE_MAPS_API_KEY = 'AIzaSyC1zqymSXocGXuCEVvpzXERWYwIzimV0Oo';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const placeId = url.searchParams.get('place_id');
    
    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'place_id parameter is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Call Google Places API
    const googleUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'rating,user_ratings_total',
      key: GOOGLE_MAPS_API_KEY,
    });

    const response = await fetch(`${googleUrl}?${params.toString()}`);
    const data = await response.json();

    // Return the response with CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

