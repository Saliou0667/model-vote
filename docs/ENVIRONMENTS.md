# ENVIRONMENTS.md — Contrat d'environnements

**Version :** 1.0  
**Dernière mise à jour :** 2026-02-07

---

## 1) Environnements

### `development`

- Firebase Emulator Suite (Auth, Firestore, Functions, Hosting)
- Seed data locale

### `staging`

- Firebase project id: `TODO_FIREBASE_PROJECT_STAGING`
- Usage: validation interne avant prod

### `production`

- Firebase project id: `model-vote-fr-2026`
- Usage: élections réelles

---

## 2) Variables Web (Vite)

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_USE_EMULATORS`
- `VITE_ENV=dev|staging|prod`

---

## 3) Variables Functions (runtime config)

- `app.timezone = Europe/Paris`
- `app.locale = fr-FR`
- `auth.superadmin_emails = "emrysdiallo@gmail.com"` (CSV, extensible avec virgules)
- `bootstrap.locked = false` (puis `true` après bootstrap)

---

## 4) Firebase aliases (`.firebaserc`)

- `prod -> model-vote-fr-2026`
- `staging -> TODO_FIREBASE_PROJECT_STAGING`
