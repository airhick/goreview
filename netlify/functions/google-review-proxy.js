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

    // URL de la page Google Maps pour laisser un avis
    const googleUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    
    // Récupérer les cookies du navigateur si disponibles
    const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
    
    // Fetch the Google page
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.google.com/',
    };
    
    // Ajouter les cookies si disponibles
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    const response = await fetch(googleUrl, { headers });

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
    // But keep Google static resources (gstatic.com) pointing directly to Google
    htmlContent = htmlContent.replace(
      /(src|href|action)=["'](\/[^"']+)["']/g,
      (match, attr, path) => {
        // Don't rewrite if it's already pointing to gstatic or other Google domains
        if (path.includes('gstatic') || path.includes('googleusercontent')) {
          return match; // Keep original
        }
        return `${attr}="https://www.google.com${path}"`;
      }
    );
    
    // Replace relative URLs without leading slash
    htmlContent = htmlContent.replace(
      /(src|href|action)=["'](?!https?:\/\/|\/\/|data:|javascript:)([^"']+)["']/g,
      (match, attr, path) => {
        // Don't rewrite if it's already pointing to gstatic or other Google domains
        if (path.includes('gstatic') || path.includes('googleusercontent')) {
          return match; // Keep original
        }
        return `${attr}="https://www.google.com/${path}"`;
      }
    );
    
    // Ensure all gstatic.com and googleusercontent.com URLs are absolute
    htmlContent = htmlContent.replace(
      /(src|href|action)=["'](https?:\/\/[^"']*gstatic[^"']*)["']/gi,
      (match, attr, url) => {
        // Ensure it's a full URL
        if (!url.startsWith('http')) {
          return `${attr}="https://${url}"`;
        }
        return match;
      }
    );

    // Ajouter un script pour tenter de rediriger automatiquement vers la page de review si on est sur une page de login
    const redirectScript = `
    <script>
    (function() {
        'use strict';
        let redirectAttempted = false;
        let redirectCount = 0;
        const MAX_REDIRECT_ATTEMPTS = 2; // Limiter à 2 tentatives pour éviter la boucle infinie
        
        // Récupérer le place_id depuis l'URL ou depuis le parent
        let placeId = '${placeId}';
        if (!placeId) {
            try {
                placeId = new URLSearchParams(window.location.search).get('placeid');
            } catch(e) { console.log('Error getting placeid from URL:', e); }
            if (!placeId) {
                try {
                    placeId = new URLSearchParams(window.parent.location.search).get('place_id');
                } catch(e) { console.log('Error getting place_id from parent:', e); }
            }
        }
        
        if (!placeId) {
            console.log('[AUTO-REDIRECT] No place_id found for redirect');
            return;
        }
        
        console.log('[AUTO-REDIRECT] Place ID:', placeId);
        
        // Détecter si on est en localhost ou en production
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const proxyPath = isLocalhost 
            ? '/api/google-review-proxy?place_id=' + encodeURIComponent(placeId)
            : '/.netlify/functions/google-review-proxy?place_id=' + encodeURIComponent(placeId);
        
        // Fonction pour vérifier si on est déjà sur l'URL du proxy
        function isOnProxyUrl() {
            const currentUrl = window.location.href;
            return currentUrl.includes('/api/google-review-proxy') || currentUrl.includes('/.netlify/functions/google-review-proxy');
        }
        
        // Fonction pour rediriger vers la page de review via le proxy
        function redirectToReview() {
            if (redirectAttempted || redirectCount >= MAX_REDIRECT_ATTEMPTS) {
                console.log('[AUTO-REDIRECT] Redirect already attempted or max attempts reached. Stopping.');
                return;
            }
            
            // Si on est déjà sur le proxy, ne pas rediriger à nouveau (éviter la boucle)
            if (isOnProxyUrl()) {
                console.log('[AUTO-REDIRECT] Already on proxy URL. Not redirecting to avoid loop.');
                redirectAttempted = true;
                return;
            }
            
            redirectCount++;
            const reviewUrl = window.location.origin + proxyPath;
            console.log('[AUTO-REDIRECT] Redirect attempt', redirectCount, 'of', MAX_REDIRECT_ATTEMPTS, 'to:', reviewUrl);
            redirectAttempted = true;
            
            try {
                window.location.replace(reviewUrl);
            } catch(e) {
                console.log('[AUTO-REDIRECT] window.location.replace failed, trying href:', e);
                try {
                    window.location.href = reviewUrl;
                } catch(e2) {
                    console.log('[AUTO-REDIRECT] window.location.href also failed:', e2);
                    redirectAttempted = false; // Réessayer plus tard
                }
            }
        }
        
        // Fonction pour vérifier si on est sur une page de login
        function isLoginPage() {
            try {
                const url = window.location.href.toLowerCase();
                const title = document.title.toLowerCase();
                const hasEmailInput = !!document.querySelector('input[type="email"]') || !!document.querySelector('input[name="identifier"]');
                const hasPasswordInput = !!document.querySelector('input[type="password"]');
                const isAccountsGoogle = url.includes('/accounts.google.com') || url.includes('/signin') || url.includes('/servicelogin');
                const isLoginTitle = title.includes('connexion') || title.includes('sign in') || title.includes('login');
                
                return (isAccountsGoogle || (hasEmailInput && !hasPasswordInput) || isLoginTitle) && !url.includes('/maps/place/');
            } catch(e) {
                console.log('[AUTO-REDIRECT] Error checking login page:', e);
                return false;
            }
        }
        
        // Fonction principale de vérification et redirection
        function checkAndRedirect() {
            try {
                const currentUrl = window.location.href;
                console.log('[AUTO-REDIRECT] Checking page. URL:', currentUrl);
                
                // Si on est déjà sur la page de review Google Maps, ne rien faire
                if (currentUrl.includes('/maps/place/') && currentUrl.includes('place_id')) {
                    console.log('[AUTO-REDIRECT] Already on review page, no redirect needed');
                    return;
                }
                
                // Si on est sur une page de login ET qu'on n'est pas déjà sur le proxy
                if (isLoginPage() && !isOnProxyUrl()) {
                    console.log('[AUTO-REDIRECT] Login page detected, redirecting to proxy...');
                    redirectToReview();
                    return;
                }
                
                // Si on est sur le proxy ET que c'est une page de login, ne pas rediriger (éviter la boucle)
                if (isLoginPage() && isOnProxyUrl()) {
                    console.log('[AUTO-REDIRECT] Login page detected on proxy URL. Waiting for user to login manually or Google to redirect.');
                    redirectAttempted = true; // Ne plus essayer de rediriger
                    return;
                }
                
                // Sinon, vérifier périodiquement
                console.log('[AUTO-REDIRECT] Not on login or review page, will check again');
            } catch(e) {
                console.log('[AUTO-REDIRECT] Error in checkAndRedirect:', e);
            }
        }
        
        // Exécuter immédiatement
        checkAndRedirect();
        
        // Exécuter après le chargement du DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAndRedirect);
        } else {
            // DOM déjà chargé
            setTimeout(checkAndRedirect, 100);
        }
        
        // Exécuter après le chargement complet de la page
        window.addEventListener('load', function() {
            setTimeout(checkAndRedirect, 500);
        });
        
        // Vérifier périodiquement (toutes les 3 secondes pendant 15 secondes)
        let checkCount = 0;
        const maxChecks = 5;
        const checkInterval = setInterval(function() {
            if (redirectCount >= MAX_REDIRECT_ATTEMPTS) {
                clearInterval(checkInterval);
                console.log('[AUTO-REDIRECT] Stopped periodic checks - max redirect attempts reached');
                return;
            }
            checkCount++;
            console.log('[AUTO-REDIRECT] Periodic check', checkCount);
            checkAndRedirect();
            
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                console.log('[AUTO-REDIRECT] Stopped periodic checks after', maxChecks, 'attempts');
            }
        }, 3000);
        
        // Observer les changements de l'URL (si l'iframe change d'URL)
        let lastUrl = window.location.href;
        const urlObserver = setInterval(function() {
            try {
                if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    console.log('[AUTO-REDIRECT] URL changed to:', lastUrl);
                    // Si l'URL a changé et qu'on est sur la page Google Maps d'avis, arrêter la redirection
                    if (!isLoginPage() && lastUrl.includes('/maps/place/') && lastUrl.includes('place_id')) {
                        clearInterval(urlObserver);
                        console.log('[AUTO-REDIRECT] Reached review page, stopping URL observer');
                        // Notifier le parent que la page d'avis est chargée
                        notifyParent('REVIEW_PAGE_LOADED', { url: lastUrl });
                        // Démarrer le tracking du dépôt d'avis
                        startReviewTracking();
                    }
                    checkAndRedirect();
                }
            } catch(e) {
                // Ignorer les erreurs cross-origin
            }
        }, 1000);
        
        // Fonction pour notifier le parent via postMessage
        function notifyParent(type, data) {
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: type,
                        data: data,
                        timestamp: Date.now()
                    }, '*');
                    console.log('[REVIEW-TRACKING] Sent message to parent:', type, data);
                }
            } catch(e) {
                console.log('[REVIEW-TRACKING] Error sending message to parent:', e);
            }
        }
        
        // Fonction pour détecter si on est sur la page d'avis Google Maps
        function isReviewPage() {
            try {
                const url = window.location.href.toLowerCase();
                return url.includes('/maps/place/') && url.includes('place_id');
            } catch(e) {
                return false;
            }
        }
        
        // Fonction pour démarrer le tracking du dépôt d'avis
        function startReviewTracking() {
            console.log('[REVIEW-TRACKING] Starting review submission tracking...');
            
            // Vérifier si on est sur la page d'avis
            if (!isReviewPage()) {
                console.log('[REVIEW-TRACKING] Not on review page yet');
                return;
            }
            
            // Notifier que la page d'avis est chargée
            notifyParent('REVIEW_PAGE_LOADED', {
                url: window.location.href
            });
            
            let reviewPageUrl = window.location.href;
            
            // Méthode 1: Observer les changements du DOM pour détecter la soumission
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    // Chercher des indicateurs de soumission d'avis
                    const successIndicators = [
                        document.querySelector('[data-review-success]'),
                        document.querySelector('.review-success'),
                        document.querySelector('[aria-label*="avis"]')
                    ];
                    
                    // Vérifier si l'URL a changé après soumission (Google redirige souvent)
                    const currentUrl = window.location.href;
                    if (currentUrl !== reviewPageUrl && !currentUrl.includes('/maps/place/')) {
                        console.log('[REVIEW-TRACKING] URL changed after review, likely submitted');
                        notifyParent('REVIEW_SUBMITTED', {
                            url: currentUrl,
                            method: 'url_change'
                        });
                        observer.disconnect();
                    }
                });
            });
            
            // Observer les changements du document
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'data-review-success']
            });
            
            // Méthode 2: Écouter les événements de soumission de formulaire
            document.addEventListener('submit', function(e) {
                console.log('[REVIEW-TRACKING] Form submitted detected');
                const form = e.target;
                if (form && (form.action.includes('review') || form.action.includes('maps') || form.action.includes('place'))) {
                    setTimeout(function() {
                        notifyParent('REVIEW_SUBMITTED', {
                            url: window.location.href,
                            method: 'form_submit'
                        });
                    }, 1000);
                }
            }, true);
            
            // Méthode 3: Observer les clics sur les boutons de soumission
            document.addEventListener('click', function(e) {
                const target = e.target;
                if (target && (
                    target.textContent.includes('Publier') ||
                    target.textContent.includes('Publish') ||
                    target.textContent.includes('Envoyer') ||
                    target.textContent.includes('Submit') ||
                    target.getAttribute('aria-label')?.includes('Publier') ||
                    target.getAttribute('aria-label')?.includes('Publish')
                )) {
                    console.log('[REVIEW-TRACKING] Submit button clicked');
                    setTimeout(function() {
                        notifyParent('REVIEW_SUBMITTED', {
                            url: window.location.href,
                            method: 'button_click'
                        });
                    }, 2000);
                }
            }, true);
            
            // Méthode 4: Vérifier périodiquement si l'URL a changé (indicateur de redirection après soumission)
            const urlCheckInterval = setInterval(function() {
                const currentUrl = window.location.href;
                if (currentUrl !== reviewPageUrl && !currentUrl.includes('/maps/place/') && !currentUrl.includes('/signin')) {
                    console.log('[REVIEW-TRACKING] URL changed to non-review page, likely submitted');
                    notifyParent('REVIEW_SUBMITTED', {
                        url: currentUrl,
                        method: 'periodic_check'
                    });
                    clearInterval(urlCheckInterval);
                }
            }, 3000);
            
            // Arrêter la vérification après 5 minutes
            setTimeout(function() {
                clearInterval(urlCheckInterval);
                observer.disconnect();
            }, 300000);
        }
        
        // Vérifier si on est déjà sur la page d'avis au chargement
        if (isReviewPage()) {
            console.log('[REVIEW-TRACKING] Already on review page, starting tracking...');
            setTimeout(startReviewTracking, 1000);
        }
    })();
    </script>
    `;
    
    // Insérer le script juste après l'ouverture du <head>
    htmlContent = htmlContent.replace(
      /(<head[^>]*>)/i,
      `$1${redirectScript}`
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

