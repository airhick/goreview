#!/usr/bin/env python3
"""
Simplified proxy for Google Place details
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request
import json
import re

class ProxyHandler(BaseHTTPRequestHandler):
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        print(f'\n📥 Request: {self.path}')
        print(f'Path: {parsed.path}')
        print(f'Params: {params}')
        
        # Get place_id
        place_id = params.get('place_id', [None])[0]
        
        if not place_id:
            self.send_error_response(400, 'Missing place_id parameter')
            return
        
        try:
            print(f'🔍 Fetching data for Place ID: {place_id}')
            
            # Fetch Google Maps page
            url = f'https://www.google.com/maps/place/?q=place_id:{place_id}'
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8', errors='ignore')
            
            # Extract rating
            rating = None
            patterns = [
                r'"ratingValue":"([\d.,]+)"',
                r'(\d+[.,]\d+)\s*étoiles?',
                r'(\d+[.,]\d+)\s*stars?',
            ]
            for pattern in patterns:
                match = re.search(pattern, html, re.IGNORECASE)
                if match:
                    rating = float(match.group(1).replace(',', '.'))
                    break
            
            # Extract reviews
            reviews = None
            patterns = [
                r'"reviewCount":"(\d+)"',
                r'(\d[\d\s]*)\s*avis',
                r'(\d[\d\s]*)\s*reviews?',
            ]
            for pattern in patterns:
                match = re.search(pattern, html, re.IGNORECASE)
                if match:
                    reviews = int(match.group(1).replace(' ', ''))
                    break
            
            # Extract name
            name = None
            match = re.search(r'<title>([^<]+)\s*-\s*Google Maps</title>', html)
            if match:
                name = match.group(1).strip()
            
            print(f'✅ Found: rating={rating}, reviews={reviews}, name={name}')
            
            # Send response
            result = {
                'status': 'OK',
                'result': {
                    'name': name,
                    'rating': rating,
                    'user_ratings_total': reviews,
                    'place_id': place_id
                }
            }
            
            self.send_json_response(200, result)
            
        except Exception as e:
            print(f'❌ Error: {e}')
            self.send_error_response(500, str(e))
    
    def send_json_response(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, max-age=300')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error = {'status': 'ERROR', 'error': message}
        self.wfile.write(json.dumps(error).encode())
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass

if __name__ == '__main__':
    PORT = 8005
    server = HTTPServer(('', PORT), ProxyHandler)
    print(f'🚀 Proxy running on http://localhost:{PORT}')
    print(f'📍 Test: http://localhost:{PORT}/?place_id=ChIJL7XR1aQ0-UcRZC9100qQiqk')
    print(f'⏹️  Press Ctrl+C to stop\n')
    server.serve_forever()

