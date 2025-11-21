# GoReview Landing Page

A modern, clean landing page for GoReview (goreview.fr) inspired by the Aurora design aesthetic.

## Features

- **Modern Design**: Clean, minimalist design with smooth animations and transitions
- **Responsive**: Fully responsive layout that works on all devices
- **Smooth Scrolling**: Navigate smoothly between sections
- **Pros & Cons**: Comprehensive section explaining advantages and considerations
- **Feature Showcase**: Highlights key features of the platform
- **Call to Action**: Clear CTAs to convert visitors
- **Dashboard**: Authentication system with Supabase integration
- **Netlify Ready**: Configured for easy deployment on Netlify

## File Structure

```
├── index.html          # Main landing page
├── dashboard.html      # Dashboard with authentication
├── pages/
│   ├── bienvenue/      # Welcome page before configuration
│   │   └── index.html
│   └── configuration/  # Configuration page (webhook)
│       └── index.html
├── styles.css          # All styling and responsive design
├── script.js           # Interactive functionality
├── server.py           # Local development server with redirects
├── netlify.toml        # Netlify configuration
├── _redirects          # Netlify redirects (backup)
├── .gitignore          # Git ignore rules
├── netlify-deploy.md   # Deployment guide
└── README.md           # This file
```

## Pages principales

### Landing Page (index.html)
1. **Hero Section**: Eye-catching introduction with call-to-action buttons
2. **Concept Section**: Explains the core concept of GoReview
3. **Pros & Cons Section**: Detailed advantages and considerations
4. **Features Section**: Showcases key platform features
5. **CTA Section**: Encourages users to take action
6. **Footer**: Navigation and links

### Page de bienvenue (/pages/bienvenue)
Page intermédiaire qui explique le processus de configuration avant d'accéder à la configuration réelle :
- Explication des 4 étapes de configuration
- Design accueillant avec animations
- Préserve l'ID de la plaque dans l'URL
- Redirige vers `/pages/configuration` après validation

**Flux utilisateur :**
```
Scan NFC → /pages/bienvenue?id=X → Explication → /pages/configuration?id=X → Configuration
```

### Page de configuration (/pages/configuration)
Gère la configuration automatique de la plaque via webhook n8n.

**Documentation :** Voir `BIENVENUE-PAGE.md` et `IMPLEMENTATION-BIENVENUE.md` pour plus de détails.

## Customization

### Colors
The color scheme can be customized in `styles.css` using CSS variables:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #8b5cf6;
    /* ... more variables */
}
```

### Content
Edit `index.html` to customize:
- Business name and description
- Features and benefits
- Pros and cons specific to your product
- Contact information

## Usage

### Local Development

#### Option 1: Serveur Python avec redirects (Recommandé)

Un serveur Python personnalisé est inclus pour gérer les redirects localement :

```bash
python3 server.py
```

Cela démarre un serveur sur `http://localhost:8000` qui gère :
- `/config` et `/config/?id=X` → `config.html`
- `/dashboard` → `dashboard.html`
- `/pages/bienvenue?id=X` → Page de bienvenue (nouvelle)
- `/pages/configuration?id=X` → Page de configuration

#### Option 2: Serveur Python standard

```bash
# Python 3 (sans redirects)
python3 -m http.server 8000
# Note: Les URLs /config et /dashboard ne fonctionneront pas avec ce serveur
```

#### Option 3: Node.js (avec http-server)

```bash
npx http-server -p 8000
# Note: Les URLs /config et /dashboard ne fonctionneront pas avec ce serveur
```

**Important** : Pour que les routes `/config` et `/dashboard` fonctionnent en local, utilisez `server.py`.

### Production Deployment (Netlify)

The project is configured for Netlify deployment. See `netlify-deploy.md` for detailed instructions.

Quick steps:
1. Push code to GitHub/GitLab/Bitbucket
2. Connect repository to Netlify
3. Configure environment variables in Netlify dashboard
4. Update Supabase redirect URLs with your Netlify domain
5. Deploy!

**Important**: Remember to add your Netlify domain to Supabase Authentication redirect URLs.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2025 GoReview. All rights reserved.

# goreview
