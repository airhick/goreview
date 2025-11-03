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
        
        # Handle Google Places API proxy (to avoid CORS)
        if path == '/api/google-place-details':
            import urllib.request
            GOOGLE_MAPS_API_KEY = 'AIzaSyC1zqymSXocGXuCEVvpzXERWYwIzimV0Oo'
            query_params = parse_qs(query)
            place_id = query_params.get('place_id', [None])[0]
            
            if not place_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "place_id parameter is required"}')
                return
            
            google_url = f'https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=rating,user_ratings_total&key={GOOGLE_MAPS_API_KEY}'
            
            try:
                with urllib.request.urlopen(google_url, timeout=15) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode())
                return
        
        # Handle Google review page proxy (to bypass X-Frame-Options)
        if path == '/api/google-review-proxy':
            import urllib.request
            import re
            from urllib.parse import urlencode
            
            print(f"[PROXY] Received request for Google review proxy: {path}?{query}")
            
            query_params = parse_qs(query)
            place_id = query_params.get('place_id', [None])[0]
            
            if not place_id:
                print("[PROXY] Error: place_id parameter is missing")
                self.send_response(400)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'<html><body>Error: place_id parameter is required</body></html>')
                return
            
            print(f"[PROXY] Fetching Google review page for place_id: {place_id}")
            
            # URL de la page Google review
            google_url = f'https://search.google.com/local/writereview?placeid={place_id}'
            
            try:
                print(f"[PROXY] Requesting: {google_url}")
                
                # Récupérer les cookies du navigateur si disponibles
                cookie_header = self.headers.get('Cookie', '')
                print(f"[PROXY] Received cookies: {cookie_header[:100]}...")  # Log partiel pour debug
                
                # Créer une requête avec des en-têtes pour simuler un navigateur
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://www.google.com/',
                    'Origin': 'https://www.google.com'
                }
                
                # Ajouter les cookies si disponibles
                if cookie_header:
                    headers['Cookie'] = cookie_header
                
                req = urllib.request.Request(google_url, headers=headers)
                
                with urllib.request.urlopen(req, timeout=30) as response:
                    print(f"[PROXY] Google responded with status: {response.status}")
                    html_content = response.read().decode('utf-8', errors='ignore')
                    print(f"[PROXY] Received HTML content length: {len(html_content)}")
                    
                    # Modifier le HTML pour réécrire les URLs relatives en absolues
                    # Remplacer les URLs relatives par des URLs absolues vers Google
                    html_content = re.sub(
                        r'(src|href|action)=["\'](/[^"\']+)["\']',
                        lambda m: f'{m.group(1)}="https://search.google.com{m.group(2)}"',
                        html_content
                    )
                    
                    # Remplacer les URLs relatives sans slash initial
                    html_content = re.sub(
                        r'(src|href|action)=["\'](?!https?://|//|data:|javascript:)([^"\']+)["\']',
                        lambda m: f'{m.group(1)}="https://search.google.com/{m.group(2)}"',
                        html_content
                    )
                    
                    # Modifier les meta tags X-Frame-Options et Content-Security-Policy
                    html_content = re.sub(
                        r'<meta[^>]*http-equiv=["\']X-Frame-Options["\'][^>]*>',
                        '',
                        html_content,
                        flags=re.IGNORECASE
                    )
                    html_content = re.sub(
                        r'X-Frame-Options:\s*[^;]+',
                        '',
                        html_content,
                        flags=re.IGNORECASE
                    )
                    
                    # Modifier CSP pour permettre l'affichage dans un iframe
                    html_content = re.sub(
                        r'Content-Security-Policy[^"]*frame-ancestors[^"]*',
                        'Content-Security-Policy: frame-ancestors *',
                        html_content,
                        flags=re.IGNORECASE
                    )
                    
                    # Ajouter un script pour tenter de rediriger automatiquement vers la page de review si on est sur une page de login
                    # Cela fonctionne si l'utilisateur est déjà connecté à Google dans le navigateur
                    redirect_script = f"""
                    <script>
                    (function() {{
                        'use strict';
                        let redirectAttempted = false;
                        
                        // Récupérer le place_id depuis l'URL ou depuis le parent
                        let placeId = '{place_id}';
                        if (!placeId) {{
                            try {{
                                placeId = new URLSearchParams(window.location.search).get('placeid');
                            }} catch(e) {{ console.log('Error getting placeid from URL:', e); }}
                            if (!placeId) {{
                                try {{
                                    placeId = new URLSearchParams(window.parent.location.search).get('place_id');
                                }} catch(e) {{ console.log('Error getting place_id from parent:', e); }}
                            }}
                        }}
                        
                        if (!placeId) {{
                            console.log('[AUTO-REDIRECT] No place_id found for redirect');
                            return;
                        }}
                        
                        console.log('[AUTO-REDIRECT] Place ID:', placeId);
                        
                        // Fonction pour rediriger vers la page de review
                        function redirectToReview() {{
                            if (redirectAttempted) {{
                                return;
                            }}
                            const reviewUrl = 'https://search.google.com/local/writereview?placeid=' + encodeURIComponent(placeId);
                            console.log('[AUTO-REDIRECT] Redirecting to review page:', reviewUrl);
                            redirectAttempted = true;
                            try {{
                                window.location.replace(reviewUrl);
                            }} catch(e) {{
                                console.log('[AUTO-REDIRECT] window.location.replace failed, trying href:', e);
                                try {{
                                    window.location.href = reviewUrl;
                                }} catch(e2) {{
                                    console.log('[AUTO-REDIRECT] window.location.href also failed:', e2);
                                }}
                            }}
                        }}
                        
                        // Fonction pour vérifier si on est sur une page de login
                        function isLoginPage() {{
                            try {{
                                const url = window.location.href.toLowerCase();
                                const title = document.title.toLowerCase();
                                const hasEmailInput = !!document.querySelector('input[type="email"]') || !!document.querySelector('input[name="identifier"]');
                                const hasPasswordInput = !!document.querySelector('input[type="password"]');
                                const isAccountsGoogle = url.includes('/accounts.google.com') || url.includes('/signin') || url.includes('/servicelogin');
                                const isLoginTitle = title.includes('connexion') || title.includes('sign in') || title.includes('login');
                                
                                return (isAccountsGoogle || (hasEmailInput && !hasPasswordInput) || isLoginTitle) && !url.includes('/local/writereview');
                            }} catch(e) {{
                                console.log('[AUTO-REDIRECT] Error checking login page:', e);
                                return false;
                            }}
                        }}
                        
                        // Fonction principale de vérification et redirection
                        function checkAndRedirect() {{
                            try {{
                                const currentUrl = window.location.href;
                                console.log('[AUTO-REDIRECT] Checking page. URL:', currentUrl);
                                
                                // Si on est déjà sur la page de review, ne rien faire
                                if (currentUrl.includes('/local/writereview')) {{
                                    console.log('[AUTO-REDIRECT] Already on review page, no redirect needed');
                                    return;
                                }}
                                
                                // Si on est sur une page de login, rediriger
                                if (isLoginPage()) {{
                                    console.log('[AUTO-REDIRECT] Login page detected, redirecting...');
                                    redirectToReview();
                                    return;
                                }}
                                
                                // Sinon, vérifier périodiquement
                                console.log('[AUTO-REDIRECT] Not on login or review page, will check again');
                            }} catch(e) {{
                                console.log('[AUTO-REDIRECT] Error in checkAndRedirect:', e);
                            }}
                        }}
                        
                        // Exécuter immédiatement
                        checkAndRedirect();
                        
                        // Exécuter après le chargement du DOM
                        if (document.readyState === 'loading') {{
                            document.addEventListener('DOMContentLoaded', checkAndRedirect);
                        }} else {{
                            // DOM déjà chargé
                            setTimeout(checkAndRedirect, 100);
                        }}
                        
                        // Exécuter après le chargement complet de la page
                        window.addEventListener('load', function() {{
                            setTimeout(checkAndRedirect, 500);
                        }});
                        
                        // Vérifier périodiquement (toutes les 2 secondes pendant 10 secondes)
                        let checkCount = 0;
                        const maxChecks = 5;
                        const checkInterval = setInterval(function() {{
                            checkCount++;
                            console.log('[AUTO-REDIRECT] Periodic check', checkCount);
                            checkAndRedirect();
                            
                            if (checkCount >= maxChecks) {{
                                clearInterval(checkInterval);
                                console.log('[AUTO-REDIRECT] Stopped periodic checks after', maxChecks, 'attempts');
                            }}
                        }}, 2000);
                        
                        // Observer les changements de l'URL (si l'iframe change d'URL)
                        let lastUrl = window.location.href;
                        setInterval(function() {{
                            try {{
                                if (window.location.href !== lastUrl) {{
                                    lastUrl = window.location.href;
                                    console.log('[AUTO-REDIRECT] URL changed to:', lastUrl);
                                    checkAndRedirect();
                                }}
                            }} catch(e) {{
                                // Ignorer les erreurs cross-origin
                            }}
                        }}, 1000);
                    }})();
                    </script>
                    """
                    
                    # Insérer le script juste après l'ouverture du <head>
                    html_content = re.sub(
                        r'(<head[^>]*>)',
                        r'\1' + redirect_script,
                        html_content,
                        flags=re.IGNORECASE,
                        count=1
                    )
                    
                    # Envoyer la réponse sans X-Frame-Options
                    print(f"[PROXY] Sending modified HTML (length: {len(html_content)})")
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    # Ne PAS envoyer X-Frame-Options
                    self.send_header('Content-Security-Policy', "frame-ancestors *")
                    # Transmettre les cookies de réponse de Google si disponibles
                    if response.getheader('Set-Cookie'):
                        # Ne pas transmettre tous les cookies pour des raisons de sécurité
                        # Mais permettre les cookies de session nécessaires
                        pass
                    self.end_headers()
                    self.wfile.write(html_content.encode('utf-8'))
                    print("[PROXY] Response sent successfully")
                    return
            except Exception as e:
                print(f"[PROXY] Error: {str(e)}")
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(f'<html><body>Error loading Google page: {str(e)}</body></html>'.encode())
                return
        
        # Default: serve files normally
        return super().do_GET()
    
    def do_POST(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Handle dashboard login webhook proxy (to avoid CORS)
        if path == '/api/dashboard-login':
            import urllib.request
            import json
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            webhook_url = 'https://n8n.goreview.fr/webhook/dashboard_login'
            
            try:
                # Create request
                req = urllib.request.Request(
                    webhook_url,
                    data=post_data,
                    headers={
                        'Content-Type': 'application/json',
                        'Content-Length': len(post_data)
                    },
                    method='POST'
                )
                
                with urllib.request.urlopen(req, timeout=15) as response:
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode())
                return
        
        # Default: return 404 for POST requests
        self.send_response(404)
        self.end_headers()
    
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

