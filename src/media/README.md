# 📁 Dossier Media

## 🖼️ Logo

Placez votre logo dans ce dossier avec l'un de ces noms :

- `logo.png` (recommandé)
- `logo.svg` (alternative)

### Comment ajouter le logo :

1. **Téléchargez ou créez votre logo** au format PNG ou SVG
2. **Nommez-le** `logo.png` ou `logo.svg`
3. **Placez-le** dans ce dossier : `src/media/`
4. Le logo sera automatiquement accessible via `/media/logo.png` ou `/media/logo.svg`

### Exemple de structure :

```
src/
└── media/
    ├── logo.png  ← Votre logo ici
    └── README.md
```

### Formats supportés :

- ✅ PNG (recommandé pour les logos avec transparence)
- ✅ SVG (recommandé pour les logos vectoriels)
- ✅ JPG/JPEG (si nécessaire)

### Taille recommandée :

- **PNG** : 128x128px ou 256x256px
- **SVG** : Toute taille (vectoriel)

---

**Note :** Le composant login utilise automatiquement le logo depuis ce dossier. Si le fichier n'existe pas, une image par défaut sera affichée.
