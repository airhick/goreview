# Page de Bienvenue - Documentation

## Vue d'ensemble

La page de bienvenue (`/pages/bienvenue`) est une page intermédiaire qui s'affiche **avant** la page de configuration. Elle explique aux utilisateurs les différentes étapes de configuration de leur plaque NFC GoReview.

## URL

```
http://localhost:8000/pages/bienvenue?id=X
https://goreview.fr/pages/bienvenue?id=X
```

Où `X` est l'identifiant unique de la plaque NFC.

## Flux utilisateur

```
1. L'utilisateur scanne sa plaque NFC
   ↓
2. Redirection vers /pages/bienvenue?id=X
   ↓
3. Affichage de la page explicative
   ↓
4. L'utilisateur clique sur "Commencer la configuration"
   ↓
5. Redirection vers /pages/configuration?id=X
   ↓
6. Configuration automatique via webhook
   ↓
7. Redirection vers la destination finale
```

## Fonctionnalités

### 1. Design accueillant
- Icône de bienvenue animée (🎉)
- Design moderne et épuré
- Animations fluides au chargement

### 2. Explication des étapes
La page présente **4 étapes clés** :

1. **Vérification de votre établissement**
   - Identification de la fiche Google My Business

2. **Configuration de votre plaque**
   - Configuration automatique de la redirection

3. **Création de votre dashboard**
   - Accès à l'espace personnel

4. **Prêt à utiliser**
   - Plaque opérationnelle

### 3. Informations pratiques
- Encadré informatif sur les prérequis
- Estimation du temps de configuration (2-3 minutes)
- Bouton de retour à l'accueil

### 4. Bouton d'action
- **Bouton principal** : "Commencer la configuration"
  - Redirige vers `/pages/configuration?id=X`
  - Préserve l'ID dans l'URL
  
- **Bouton secondaire** : "Retour à l'accueil"
  - Redirige vers `/`

## Structure du fichier

```
/pages/bienvenue/
└── index.html          # Page de bienvenue complète
```

## Intégration

### Dans le serveur local (server.py)
Les redirections sont déjà configurées pour gérer `/pages/bienvenue`.

### Dans Netlify (netlify.toml)
```toml
[[redirects]]
  from = "/pages/bienvenue"
  to = "/pages/bienvenue/index.html"
  status = 200
  force = false

[[redirects]]
  from = "/pages/bienvenue/"
  to = "/pages/bienvenue/index.html"
  status = 200
  force = false

[[redirects]]
  from = "/pages/bienvenue/*"
  to = "/pages/bienvenue/index.html"
  status = 200
  force = false
```

### Dans _redirects
```
/pages/bienvenue /pages/bienvenue/index.html 200
/pages/bienvenue/ /pages/bienvenue/index.html 200
/pages/bienvenue/* /pages/bienvenue/index.html 200
```

## Personnalisation

### Modifier les étapes
Éditez la section `.steps-container` dans le HTML :

```html
<div class="step">
    <div class="step-number">1</div>
    <div class="step-content">
        <h3 class="step-title">Titre de l'étape</h3>
        <p class="step-description">Description de l'étape</p>
    </div>
</div>
```

### Modifier le temps estimé
Changez le contenu dans la section `.time-estimate` :

```html
<span>Temps estimé : 2-3 minutes</span>
```

### Modifier les couleurs
Les couleurs utilisent les variables CSS globales de `styles.css` :

- `--primary-color: #6366f1` (Bleu principal)
- `--secondary-color: #8b5cf6` (Violet secondaire)
- `--text-primary: #111827` (Texte principal)
- `--text-secondary: #6b7280` (Texte secondaire)

## JavaScript

Le JavaScript intégré gère :

1. **Récupération de l'ID**
   ```javascript
   const urlParams = new URLSearchParams(window.location.search);
   const id = urlParams.get('id');
   ```

2. **Redirection vers la configuration**
   ```javascript
   let configUrl = '/pages/configuration';
   if (id) {
       configUrl += '?id=' + encodeURIComponent(id);
   }
   window.location.href = configUrl;
   ```

3. **Logging pour le débogage**
   - Logs de chargement
   - Logs de l'ID récupéré
   - Logs de redirection

## Tests

### Test en local
1. Démarrez le serveur :
   ```bash
   python3 server.py
   ```

2. Accédez à :
   ```
   http://localhost:8000/pages/bienvenue?id=test123
   ```

3. Vérifiez :
   - ✅ La page s'affiche correctement
   - ✅ Les animations fonctionnent
   - ✅ Le bouton "Commencer" redirige vers `/pages/configuration?id=test123`
   - ✅ L'ID est préservé dans l'URL

### Test en production (Netlify)
1. Déployez sur Netlify
2. Accédez à `https://goreview.fr/pages/bienvenue?id=test123`
3. Vérifiez le même comportement qu'en local

## Responsive Design

La page est **entièrement responsive** :

### Desktop (> 640px)
- Conteneur de 800px de largeur max
- Étapes avec icônes à gauche
- Boutons côte à côte

### Mobile (≤ 640px)
- Conteneur adaptatif
- Étapes empilées verticalement
- Boutons empilés
- Tailles de police réduites

## Accessibilité

- ✅ Sémantique HTML correcte
- ✅ Contraste des couleurs conforme WCAG
- ✅ Navigation au clavier possible
- ✅ Animations respectueuses (pas d'auto-play)

## Maintenance

### Ajouter une nouvelle étape
1. Copiez une section `.step` existante
2. Modifiez le numéro dans `.step-number`
3. Mettez à jour le titre et la description

### Modifier le message d'information
Éditez la section `.info-box` :

```html
<div class="info-box">
    <svg class="info-icon">...</svg>
    <div>
        <p class="info-text">
            <strong>Votre message :</strong> Texte informatif
        </p>
    </div>
</div>
```

## Support

Pour toute question ou problème :
- Email : goreview.fr@gmail.com
- Vérifiez les logs de la console (F12)

## Version

- **Version actuelle** : 1.0
- **Date de création** : Novembre 2025
- **Dernière mise à jour** : Novembre 2025

