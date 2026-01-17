#!/usr/bin/env python3
"""
Simple HTTP server with redirect support for local development
Usage: python3 server.py
"""

import http.server
import socketserver
from urllib.parse import urlparse, parse_qs
from urllib import error as urllib_error
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
        
        # Handle /pages/bienvenue - serve the welcome page directly
        # This page explains the configuration steps before redirecting to configuration
        if path in ['/pages/bienvenue', '/pages/bienvenue/']:
            # Serve the index.html file directly with query parameters preserved
            welcome_path = '/pages/bienvenue/index.html'
            if query:
                welcome_path += '?' + query
            # Use 200 status to serve the file (not redirect)
            # The SimpleHTTPRequestHandler will serve the file automatically
            self.path = welcome_path
            return super().do_GET()
        
        # Handle /pages/configuration - serve the configuration page directly
        # The page will handle the webhook call and redirect based on webhook response
        if path in ['/pages/configuration', '/pages/configuration/']:
            # Serve the index.html file directly with query parameters preserved
            config_path = '/pages/configuration/index.html'
            if query:
                config_path += '?' + query
            # Use 200 status to serve the file (not redirect)
            # The SimpleHTTPRequestHandler will serve the file automatically
            self.path = config_path
            return super().do_GET()
        
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
            # Utiliser l'URL Google Maps pour la page d'avis
            google_url = f'https://www.google.com/maps/place/?q=place_id:{place_id}'
            
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
                    # Mais garder les ressources statiques Google (gstatic.com) pointant directement vers Google
                    def rewrite_url(match):
                        attr = match.group(1)
                        path = match.group(2)
                        # Ne pas réécrire si c'est déjà gstatic ou googleusercontent
                        if 'gstatic' in path or 'googleusercontent' in path:
                            return match.group(0)  # Garder l'original
                        return f'{attr}="https://www.google.com{path}"'
                    
                    html_content = re.sub(
                        r'(src|href|action)=["\'](/[^"\']+)["\']',
                        rewrite_url,
                        html_content
                    )
                    
                    # Remplacer les URLs relatives sans slash initial
                    def rewrite_url_no_slash(match):
                        attr = match.group(1)
                        path = match.group(3)
                        # Ne pas réécrire si c'est déjà gstatic ou googleusercontent
                        if 'gstatic' in path or 'googleusercontent' in path:
                            return match.group(0)  # Garder l'original
                        return f'{attr}="https://www.google.com/{path}"'
                    
                    html_content = re.sub(
                        r'(src|href|action)=["\'](?!https?://|//|data:|javascript:)([^"\']+)["\']',
                        rewrite_url_no_slash,
                        html_content
                    )
                    
                    # S'assurer que toutes les URLs gstatic.com et googleusercontent.com sont absolues
                    html_content = re.sub(
                        r'(src|href|action)=["\'](https?://[^"\']*gstatic[^"\']*)["\']',
                        lambda m: m.group(0) if m.group(2).startswith('http') else f'{m.group(1)}="https://{m.group(2)}"',
                        html_content,
                        flags=re.IGNORECASE
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
                        let redirectCount = 0;
                        const MAX_REDIRECT_ATTEMPTS = 2; // Limiter à 2 tentatives pour éviter la boucle infinie
                        
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
                        
                        // Détecter si on est en localhost ou en production
                        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                        const proxyPath = isLocalhost 
                            ? '/api/google-review-proxy?place_id=' + encodeURIComponent(placeId)
                            : '/.netlify/functions/google-review-proxy?place_id=' + encodeURIComponent(placeId);
                        
                        // Fonction pour vérifier si on est déjà sur l'URL du proxy
                        function isOnProxyUrl() {{
                            const currentUrl = window.location.href;
                            return currentUrl.includes('/api/google-review-proxy') || currentUrl.includes('/.netlify/functions/google-review-proxy');
                        }}
                        
                        // Fonction pour rediriger vers la page de review Google Maps via le proxy
                        function redirectToReview() {{
                            if (redirectAttempted || redirectCount >= MAX_REDIRECT_ATTEMPTS) {{
                                console.log('[AUTO-REDIRECT] Redirect already attempted or max attempts reached. Stopping.');
                                return;
                            }}
                            
                            // Si on est déjà sur le proxy, ne pas rediriger à nouveau (éviter la boucle)
                            if (isOnProxyUrl()) {{
                                console.log('[AUTO-REDIRECT] Already on proxy URL. Not redirecting to avoid loop.');
                                redirectAttempted = true;
                                return;
                            }}
                            
                            redirectCount++;
                            const reviewUrl = window.location.origin + proxyPath;
                            console.log('[AUTO-REDIRECT] Redirect attempt', redirectCount, 'of', MAX_REDIRECT_ATTEMPTS, 'to:', reviewUrl);
                            redirectAttempted = true;
                            
                            try {{
                                window.location.replace(reviewUrl);
                            }} catch(e) {{
                                console.log('[AUTO-REDIRECT] window.location.replace failed, trying href:', e);
                                try {{
                                    window.location.href = reviewUrl;
                                }} catch(e2) {{
                                    console.log('[AUTO-REDIRECT] window.location.href also failed:', e2);
                                    redirectAttempted = false; // Réessayer plus tard
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
                                
                                return (isAccountsGoogle || (hasEmailInput && !hasPasswordInput) || isLoginTitle) && !url.includes('/maps/place/');
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
                                
                                // Si on est déjà sur la page de review (Google Maps), ne rien faire
                                if (currentUrl.includes('/maps/place/') && currentUrl.includes('place_id')) {{
                                    console.log('[AUTO-REDIRECT] Already on review page, no redirect needed');
                                    return;
                                }}
                                
                                // Si on est sur une page de login ET qu'on n'est pas déjà sur le proxy
                                if (isLoginPage() && !isOnProxyUrl()) {{
                                    console.log('[AUTO-REDIRECT] Login page detected, redirecting to proxy...');
                                    redirectToReview();
                                    return;
                                }}
                                
                                // Si on est sur le proxy ET que c'est une page de login, ne pas rediriger (éviter la boucle)
                                if (isLoginPage() && isOnProxyUrl()) {{
                                    console.log('[AUTO-REDIRECT] Login page detected on proxy URL. Waiting for user to login manually or Google to redirect.');
                                    redirectAttempted = true; // Ne plus essayer de rediriger
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
                        
                        // Vérifier périodiquement (toutes les 3 secondes pendant 15 secondes)
                        let checkCount = 0;
                        const maxChecks = 5;
                        const checkInterval = setInterval(function() {{
                            if (redirectCount >= MAX_REDIRECT_ATTEMPTS) {{
                                clearInterval(checkInterval);
                                console.log('[AUTO-REDIRECT] Stopped periodic checks - max redirect attempts reached');
                                return;
                            }}
                            checkCount++;
                            console.log('[AUTO-REDIRECT] Periodic check', checkCount);
                            checkAndRedirect();
                            
                            if (checkCount >= maxChecks) {{
                                clearInterval(checkInterval);
                                console.log('[AUTO-REDIRECT] Stopped periodic checks after', maxChecks, 'attempts');
                            }}
                        }}, 3000);
                        
                        // Observer les changements de l'URL (si l'iframe change d'URL)
                        let lastUrl = window.location.href;
                        const urlObserver = setInterval(function() {{
                            try {{
                                if (window.location.href !== lastUrl) {{
                                    lastUrl = window.location.href;
                                    console.log('[AUTO-REDIRECT] URL changed to:', lastUrl);
                                    // Si l'URL a changé et qu'on est sur la page Google Maps d'avis, arrêter la redirection
                                    if (!isLoginPage() && lastUrl.includes('/maps/place/') && lastUrl.includes('place_id')) {{
                                        clearInterval(urlObserver);
                                        console.log('[AUTO-REDIRECT] Reached review page, stopping URL observer');
                                        // Notifier le parent que la page d'avis est chargée
                                        notifyParent('REVIEW_PAGE_LOADED', {{ url: lastUrl }});
                                        // Démarrer le tracking du dépôt d'avis
                                        startReviewTracking();
                                    }}
                                    checkAndRedirect();
                                }}
                            }} catch(e) {{
                                // Ignorer les erreurs cross-origin
                            }}
                        }}, 1000);
                        
                        // Fonction pour notifier le parent via postMessage
                        function notifyParent(type, data) {{
                            try {{
                                if (window.parent && window.parent !== window) {{
                                    window.parent.postMessage({{
                                        type: type,
                                        data: data,
                                        timestamp: Date.now()
                                    }}, '*');
                                    console.log('[REVIEW-TRACKING] Sent message to parent:', type, data);
                                }}
                            }} catch(e) {{
                                console.log('[REVIEW-TRACKING] Error sending message to parent:', e);
                            }}
                        }}
                        
                        // Fonction pour détecter si on est sur la page d'avis Google Maps
                        function isReviewPage() {{
                            try {{
                                const url = window.location.href.toLowerCase();
                                return url.includes('/maps/place/') && url.includes('place_id');
                            }} catch(e) {{
                                return false;
                            }}
                        }}
                        
                        // Fonction pour démarrer le tracking du dépôt d'avis
                        function startReviewTracking() {{
                            console.log('[REVIEW-TRACKING] Starting review submission tracking...');
                            
                            // Vérifier si on est sur la page d'avis
                            if (!isReviewPage()) {{
                                console.log('[REVIEW-TRACKING] Not on review page yet');
                                return;
                            }}
                            
                            // Notifier que la page d'avis est chargée
                            notifyParent('REVIEW_PAGE_LOADED', {{
                                url: window.location.href
                            }});
                            
                            let reviewPageUrl = window.location.href;
                            
                            // Méthode 1: Observer les changements du DOM pour détecter la soumission
                            const observer = new MutationObserver(function(mutations) {{
                                mutations.forEach(function(mutation) {{
                                    // Chercher des indicateurs de soumission d'avis
                                    const successIndicators = [
                                        document.querySelector('[data-review-success]'),
                                        document.querySelector('.review-success'),
                                        document.querySelector('[aria-label*="avis"]')
                                    ];
                                    
                                    // Vérifier si l'URL a changé après soumission (Google redirige souvent)
                                    const currentUrl = window.location.href;
                                    if (currentUrl !== reviewPageUrl && !currentUrl.includes('/maps/place/')) {{
                                        console.log('[REVIEW-TRACKING] URL changed after review, likely submitted');
                                        notifyParent('REVIEW_SUBMITTED', {{
                                            url: currentUrl,
                                            method: 'url_change'
                                        }});
                                        observer.disconnect();
                                    }}
                                }});
                            }});
                            
                            // Observer les changements du document
                            observer.observe(document.body, {{
                                childList: true,
                                subtree: true,
                                attributes: true,
                                attributeFilter: ['class', 'data-review-success']
                            }});
                            
                            // Méthode 2: Écouter les événements de soumission de formulaire
                            document.addEventListener('submit', function(e) {{
                                console.log('[REVIEW-TRACKING] Form submitted detected');
                                const form = e.target;
                                if (form && (form.action.includes('review') || form.action.includes('maps') || form.action.includes('place'))) {{
                                    setTimeout(function() {{
                                        notifyParent('REVIEW_SUBMITTED', {{
                                            url: window.location.href,
                                            method: 'form_submit'
                                        }});
                                    }}, 1000);
                                }}
                            }}, true);
                            
                            // Méthode 3: Observer les clics sur les boutons de soumission
                            document.addEventListener('click', function(e) {{
                                const target = e.target;
                                if (target && (
                                    target.textContent.includes('Publier') ||
                                    target.textContent.includes('Publish') ||
                                    target.textContent.includes('Envoyer') ||
                                    target.textContent.includes('Submit') ||
                                    target.getAttribute('aria-label')?.includes('Publier') ||
                                    target.getAttribute('aria-label')?.includes('Publish')
                                )) {{
                                    console.log('[REVIEW-TRACKING] Submit button clicked');
                                    setTimeout(function() {{
                                        notifyParent('REVIEW_SUBMITTED', {{
                                            url: window.location.href,
                                            method: 'button_click'
                                        }});
                                    }}, 2000);
                                }}
                            }}, true);
                            
                            // Méthode 4: Vérifier périodiquement si l'URL a changé (indicateur de redirection après soumission)
                            const urlCheckInterval = setInterval(function() {{
                                const currentUrl = window.location.href;
                                if (currentUrl !== reviewPageUrl && !currentUrl.includes('/maps/place/') && !currentUrl.includes('/signin')) {{
                                    console.log('[REVIEW-TRACKING] URL changed to non-review page, likely submitted');
                                    notifyParent('REVIEW_SUBMITTED', {{
                                        url: currentUrl,
                                        method: 'periodic_check'
                                    }});
                                    clearInterval(urlCheckInterval);
                                }}
                            }}, 3000);
                            
                            // Arrêter la vérification après 5 minutes
                            setTimeout(function() {{
                                clearInterval(urlCheckInterval);
                                observer.disconnect();
                            }}, 300000);
                        }}
                        
                        // Vérifier si on est déjà sur la page d'avis au chargement
                        if (isReviewPage()) {{
                            console.log('[REVIEW-TRACKING] Already on review page, starting tracking...');
                            setTimeout(startReviewTracking, 1000);
                        }}
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
            print(f"👋 Bienvenue: http://localhost:{PORT}/pages/bienvenue?id=test123")
            print(f"🔧 Configuration: http://localhost:{PORT}/pages/configuration?id=test123")
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

