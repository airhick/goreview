#!/usr/bin/env python3
"""
Local development proxy for fetching Google Place details
Scrapes Google Maps page to get rating and review count without API key
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import urllib.request
import re
import json

class GooglePlaceDetailsProxy(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET request"""
        parsed_path = urlparse(self.path)
        
        print(f'Received request for path: {parsed_path.path}')
        
        # Only handle /api/google-place-details
        if not parsed_path.path.startswith('/api/google-place-details'):
            self.send_response(404)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body><h1>404 Not Found</h1><p>Use /api/google-place-details?place_id=YOUR_PLACE_ID</p></body></html>')
            return
        
        # Get place_id from query parameters
        query_params = parse_qs(parsed_path.query)
        place_id = query_params.get('place_id', [None])[0]
        
        if not place_id:
            self.send_json_response(400, {
                'status': 'ERROR',
                'error': 'place_id parameter is required'
            })
            return
        
        try:
            print(f'Fetching Google Place details for: {place_id}')
            
            # Fetch Google Maps page
            google_url = f'https://www.google.com/maps/place/?q=place_id:{place_id}'
            
            req = urllib.request.Request(
                google_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                }
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8', errors='ignore')
            
            # Extract rating and reviews
            rating = self.extract_rating(html)
            total_reviews = self.extract_reviews(html)
            place_name = self.extract_name(html)
            
            if rating is not None or total_reviews is not None:
                print(f'Successfully scraped: rating={rating}, reviews={total_reviews}, name={place_name}')
                
                self.send_json_response(200, {
                    'status': 'OK',
                    'result': {
                        'name': place_name,
                        'rating': rating,
                        'user_ratings_total': total_reviews,
                        'place_id': place_id
                    }
                })
            else:
                print('Could not extract rating/reviews from HTML')
                self.send_json_response(200, {
                    'status': 'ZERO_RESULTS',
                    'error': 'Could not extract rating and review data',
                    'place_id': place_id
                })
                
        except Exception as e:
            print(f'Error: {str(e)}')
            self.send_json_response(500, {
                'status': 'ERROR',
                'error': str(e)
            })
    
    def extract_rating(self, html):
        """Extract rating from HTML"""
        patterns = [
            r'"ratingValue":"([\d.,]+)"',
            r'(\d+[.,]\d+)\s*étoiles?',
            r'(\d+[.,]\d+)\s*stars?',
            r'aria-label="[^"]*(\d+[.,]\d+)[^"]*étoiles?[^"]*"',
            r'aria-label="[^"]*(\d+[.,]\d+)[^"]*stars?[^"]*"',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                rating_str = match.group(1).replace(',', '.')
                return float(rating_str)
        return None
    
    def extract_reviews(self, html):
        """Extract review count from HTML"""
        patterns = [
            r'"reviewCount":"(\d+)"',
            r'(\d[\d\s]*)\s*avis',
            r'(\d[\d\s]*)\s*reviews?',
            r'aria-label="[^"]*(\d[\d\s]+)\s*avis[^"]*"',
            r'aria-label="[^"]*(\d[\d\s]+)\s*reviews?[^"]*"',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                count_str = match.group(1).replace(' ', '')
                return int(count_str)
        return None
    
    def extract_name(self, html):
        """Extract place name from HTML"""
        patterns = [
            r'<title>([^<]+)\s*-\s*Google Maps</title>',
            r'"name":"([^"]+)"',
            r'property="og:title"\s+content="([^"]+)"',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None
    
    def send_json_response(self, status_code, data):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        if status_code == 200:
            self.send_header('Cache-Control', 'public, max-age=300')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"[Google Place Details Proxy] {format % args}")

def run_server(port=8001):
    """Run the proxy server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, GooglePlaceDetailsProxy)
    print(f'Google Place Details Proxy running on port {port}')
    print(f'Test: http://localhost:{port}/api/google-place-details?place_id=ChIJL7XR1aQ0-UcRZC9100qQiqk')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()

