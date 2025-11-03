// Netlify Function to proxy Google review page and remove X-Frame-Options
// This allows displaying Google review page in an iframe

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
        'Content-Type': 'text/html',
      },
      body: '<html><body>Method not allowed</body></html>',
    };
  }

  try {
    const placeId = event.queryStringParameters?.place_id;
    
    if (!placeId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
        body: '<html><body>Error: place_id parameter is required</body></html>',
      };
    }

    // URL de la page Google review
    const googleUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
    
    // Fetch the Google page
    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`Google returned ${response.status}`);
    }

    let htmlContent = await response.text();
    
    // Remove X-Frame-Options meta tags
    htmlContent = htmlContent.replace(
      /<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi,
      ''
    );
    
    // Remove X-Frame-Options from HTTP headers (in HTML comments or elsewhere)
    htmlContent = htmlContent.replace(
      /X-Frame-Options:\s*[^\s;]+/gi,
      ''
    );
    
    // Modify CSP to allow framing
    htmlContent = htmlContent.replace(
      /Content-Security-Policy[^"']*frame-ancestors[^"']*/gi,
      'Content-Security-Policy: frame-ancestors *'
    );
    
    // Rewrite relative URLs to absolute URLs
    // Replace src="/..." and href="/..." with absolute URLs
    htmlContent = htmlContent.replace(
      /(src|href|action)=["'](\/[^"']+)["']/g,
      (match, attr, path) => {
        return `${attr}="https://search.google.com${path}"`;
      }
    );
    
    // Replace relative URLs without leading slash
    htmlContent = htmlContent.replace(
      /(src|href|action)=["'](?!https?:\/\/|\/\/|data:|javascript:)([^"']+)["']/g,
      (match, attr, path) => {
        return `${attr}="https://search.google.com/${path}"`;
      }
    );

    // Return the modified HTML without X-Frame-Options
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': 'frame-ancestors *',
        'Access-Control-Allow-Origin': '*',
        // Explicitly do NOT include X-Frame-Options
      },
      body: htmlContent,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
      body: `<html><body>Error loading Google page: ${error.message}</body></html>`,
    };
  }
};

