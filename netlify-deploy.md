# Guide de déploiement Netlify pour GoReview

## Prérequis

1. Compte Netlify (gratuit) : [https://app.netlify.com](https://app.netlify.com)
2. Repository Git (GitHub, GitLab, ou Bitbucket) avec votre code
3. Projet Supabase configuré

## Étapes de déploiement

### 1. Préparer le repository Git

Assurez-vous que tous les fichiers sont commités et poussés sur votre repository :

```bash
git add .
git commit -m "Ready for Netlify deployment"
git push
```

### 2. Déployer sur Netlify

#### Option A : Via l'interface Netlify (Recommandé)

1. Connectez-vous à [Netlify](https://app.netlify.com)
2. Cliquez sur **"Add new site"** → **"Import an existing project"**
3. Connectez votre repository Git
4. Configurez les paramètres :
   - **Build command** : (laisser vide, site statique)
   - **Publish directory** : `.` (racine)
5. Cliquez sur **"Deploy site"**

#### Option B : Via Netlify CLI

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Initialiser le projet
netlify init

# Déployer
netlify deploy --prod
```

### 3. Configurer les variables d'environnement

Dans le Netlify Dashboard → Site settings → Environment variables, ajoutez :

```
SUPABASE_URL=https://vigutqmfosxbpncussie.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZ3V0cW1mb3N4YnBuY3Vzc2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODQ3NTIsImV4cCI6MjA3NzE2MDc1Mn0.0dL13sBjbCiLrgZe15y4JOL2QXKGkz56PtifpSPJq-E
```

### 4. Configurer Supabase pour les redirects

Dans le Supabase Dashboard → Authentication → URL Configuration :

1. **Site URL** : `https://votre-site.netlify.app`
2. **Redirect URLs** : Ajoutez :
   - `https://votre-site.netlify.app/dashboard`
   - `https://votre-site.netlify.app/dashboard.html`
   - Si vous avez un domaine personnalisé : `https://goreview.fr/dashboard`

### 5. Configurer un domaine personnalisé (Optionnel)

Si vous avez le domaine `goreview.fr` :

1. Netlify Dashboard → Domain settings
2. Ajoutez votre domaine
3. Suivez les instructions pour configurer les DNS
4. Mettez à jour les Redirect URLs dans Supabase avec votre domaine

### 6. Tester le déploiement

- Landing page : `https://votre-site.netlify.app`
- Dashboard : `https://votre-site.netlify.app/dashboard`
- Vérifiez que l'authentification fonctionne

## Fichiers de configuration

- `netlify.toml` : Configuration principale (redirects, headers, etc.)
- `_redirects` : Fichier de backup pour les redirects
- `.gitignore` : Fichiers à ignorer par Git

## Fonctionnalités Netlify activées

✅ **Auto-deploy** : Déploiement automatique à chaque push
✅ **HTTPS** : Certificat SSL automatique
✅ **Redirects** : Route `/dashboard` → `/dashboard.html`
✅ **Security Headers** : Headers de sécurité configurés
✅ **Cache Control** : Optimisation du cache pour les assets statiques

## Problèmes courants

### Le dashboard ne charge pas
- Vérifiez que les variables d'environnement sont configurées
- Vérifiez que les Redirect URLs sont correctes dans Supabase
- Vérifiez les logs dans Netlify Dashboard → Functions → Logs

### Les redirects ne fonctionnent pas
- Vérifiez `netlify.toml` est présent à la racine
- Redéployez le site après modification de `netlify.toml`

### L'authentification Supabase ne fonctionne pas
- Vérifiez que le domaine est dans la liste des Redirect URLs de Supabase
- Vérifiez que `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont corrects

## Support

Pour plus d'aide :
- Documentation Netlify : [https://docs.netlify.com](https://docs.netlify.com)
- Documentation Supabase : [https://supabase.com/docs](https://supabase.com/docs)

