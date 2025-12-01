# Instructions pour créer un favicon.ico

## État actuel
✅ Les balises favicon ont été ajoutées dans tous les fichiers HTML principaux
✅ Le logo.png est utilisé comme favicon (les navigateurs modernes l'acceptent)

## Pour créer un fichier favicon.ico

### Option 1 : Utiliser un convertisseur en ligne (Recommandé)
1. Allez sur https://www.favicon-generator.org/ ou https://favicon.io/
2. Uploadez votre fichier `logo.png`
3. Téléchargez le fichier `favicon.ico` généré
4. Placez-le à la racine du projet : `/favicon.ico`

### Option 2 : Utiliser ImageMagick (ligne de commande)
```bash
# Installer ImageMagick (si pas déjà installé)
# macOS: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Convertir le PNG en ICO
convert logo.png -resize 32x32 favicon.ico
```

### Option 3 : Utiliser GIMP ou Photoshop
1. Ouvrez `logo.png` dans GIMP/Photoshop
2. Redimensionnez l'image à 32x32 pixels (ou 16x16 pour un favicon classique)
3. Exportez au format ICO
4. Placez le fichier à la racine : `/favicon.ico`

## Taille recommandée
- **favicon.ico** : 32x32 pixels (ou 16x16 pixels)
- **logo.png** (pour apple-touch-icon) : 180x180 pixels minimum

## Fichiers HTML mis à jour
Les balises suivantes ont été ajoutées dans tous les fichiers HTML :
```html
<link rel="icon" type="image/png" href="/logo.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/logo.png">
```

## Fichiers modifiés
- index.html
- dashboard.html
- dashboardlogin.html
- create.html
- company.html
- config.html
- pages/bienvenue/index.html
- pages/configuration/index.html

## Note
Même sans fichier .ico, le logo.png fonctionnera comme favicon dans les navigateurs modernes. Le fichier .ico est principalement pour la compatibilité avec les anciens navigateurs et certains systèmes.

