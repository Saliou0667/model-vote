# apps/web

Frontend React (Vite + TypeScript + MUI) du projet `model-vote`.

## Commandes

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Variables d'environnement

Copier `.env.example` vers `.env.local` puis ajuster si besoin:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_USE_EMULATORS=true` en local
