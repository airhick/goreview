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
├── styles.css          # All styling and responsive design
├── script.js           # Interactive functionality
├── netlify.toml        # Netlify configuration
├── _redirects          # Netlify redirects (backup)
├── .gitignore          # Git ignore rules
├── netlify-deploy.md   # Deployment guide
└── README.md           # This file
```

## Sections

1. **Hero Section**: Eye-catching introduction with call-to-action buttons
2. **Concept Section**: Explains the core concept of GoReview
3. **Pros & Cons Section**: Detailed advantages and considerations
4. **Features Section**: Showcases key platform features
5. **CTA Section**: Encourages users to take action
6. **Footer**: Navigation and links

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

Simply open `index.html` in a web browser or use a local server:

```bash
# Python 3
python3 -m http.server 8000

# Node.js (with http-server)
npx http-server -p 8000

# Then visit http://localhost:8000
```

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
