# Suivi des fruits

Application web mobile-first pour suivre les « fruits » par classe.

**Architecture** : Google Sheet (base de données) ← Google Apps Script (API, `apps-script/Code.gs`) ← React + Vite (Vercel).

```bash
npm install
npm run dev      # mode démo si VITE_API_URL est vide (codes : demo, admin, lecture)
npm run build
```

- Mise en place complète (Sheet, Apps Script, Vercel, rôles) : voir [GUIDE.md](GUIDE.md).
- Styles : `src/index.css` (variables, animations) et `src/components.css` (styles des composants). Seules les valeurs calculées à l'exécution (couleur d'un niveau, largeur d'une barre…) restent dans le JSX.
- Variable d'environnement : `VITE_API_URL` (voir `.env.local.example`).
