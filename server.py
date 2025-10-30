#!/usr/bin/env python3
"""
Simple HTTP server with redirect support for local development
Usage: python3 server.py
"""

import http.server
import socketserver
from urllib.parse import urlparse, parse_qs
import os

PORT = 8000

class RedirectHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers if needed
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query = parsed_path.query
        
        # Handle /config/ redirects (with or without trailing slash)
        if path in ['/config', '/config/']:
            # Redirect to config.html with query parameters
            redirect_url = '/config.html'
            if query:
                redirect_url += '?' + query
            self.send_response(301)
            self.send_header('Location', redirect_url)
            self.end_headers()
            return
        
        # Handle /dashboard redirect
        if path == '/dashboard':
            redirect_url = '/dashboard.html'
            if query:
                redirect_url += '?' + query
            self.send_response(301)
            self.send_header('Location', redirect_url)
            self.end_headers()
            return
        
        # Handle /create redirects
        if path in ['/create', '/create/']:
            redirect_url = '/create.html'
            if query:
                redirect_url += '?' + query
            self.send_response(301)
            self.send_header('Location', redirect_url)
            self.end_headers()
            return
        
        # Handle /company redirects
        if path in ['/company', '/company/']:
            redirect_url = '/company.html'
            if query:
                redirect_url += '?' + query
            self.send_response(301)
            self.send_header('Location', redirect_url)
            self.end_headers()
            return
        
        # Default: serve files normally
        return super().do_GET()
    
    def log_message(self, format, *args):
        # Custom log format
        print(f"[{self.log_date_time_string()}] {args[0]}")

if __name__ == "__main__":
    Handler = RedirectHandler
    
    # Try to bind to the port, handle if it's already in use
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🚀 Serveur démarré sur http://localhost:{PORT}")
            print(f"📄 Landing page: http://localhost:{PORT}/")
            print(f"📊 Dashboard: http://localhost:{PORT}/dashboard")
            print(f"⚙️  Config: http://localhost:{PORT}/config/?id=100")
            print(f"📝 Create: http://localhost:{PORT}/create/?id=100")
            print(f"🏢 Company: http://localhost:{PORT}/company?id=2")
            print("\nAppuyez sur Ctrl+C pour arrêter le serveur\n")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\n⛔ Serveur arrêté")
                httpd.shutdown()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Erreur: Le port {PORT} est déjà utilisé.")
            print(f"\nPour libérer le port, exécutez:")
            print(f"   kill -9 $(lsof -ti:{PORT})")
            print(f"\nOu utilisez un autre port en modifiant PORT dans server.py")
        else:
            raise

