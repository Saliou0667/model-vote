# DEPLOYMENT.md — Guide de déploiement

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

---

## 1. Infrastructure Firebase

Projet actuel provisionné : `model-vote-fr-2026`

### Services utilisés

| Service                 | Usage                                           |
| ----------------------- | ----------------------------------------------- |
| Firebase Authentication | Inscription / connexion (email + mot de passe)  |
| Cloud Firestore         | Base de données (toutes les collections)        |
| Cloud Functions         | Logique métier, vote, audit                     |
| Firebase Hosting        | Hébergement frontend React                      |
| Firebase Storage        | Photos candidats, justificatifs (optionnel MVP) |

### Projet Firebase

- Créer un projet Firebase via [console.firebase.google.com](https://console.firebase.google.com)
- Plan **Blaze** (pay-as-you-go) requis pour Cloud Functions
- Activer : Authentication, Firestore, Functions, Hosting

---

## 1.1 Actions manuelles initiales (console Firebase)

Ces actions restent à faire dans la console avant implémentation complète :

- Activer Firestore (création de la base `(default)` en région Europe, recommandé `eur3`)
- Activer Authentication > méthode `Email/Password`
- Vérifier le plan de facturation (Blaze requis pour Cloud Functions en production)

---

## 2. Environnements

| Environnement | Usage                     | Projet Firebase                   |
| ------------- | ------------------------- | --------------------------------- |
| `development` | Dev locale avec emulators | N/A (émulé)                       |
| `staging`     | Tests avant production    | Projet Firebase dédié (optionnel) |
| `production`  | Environnement live        | Projet Firebase principal         |

---

## 2.1 Pré-requis locaux

- Node.js 20+
- pnpm
- Firebase CLI (`firebase-tools`)

Vérification :

```bash
node -v
pnpm -v
firebase -V
```

---

## 3. Variables d'environnement

### Frontend (`.env`)

```bash
# .env.development
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=model-vote-dev
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_USE_EMULATORS=true

# .env.production
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=model-vote-prod
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_USE_EMULATORS=false
```

### Cloud Functions (Firebase Config)

```bash
firebase functions:config:set app.environment="production"
```

> **IMPORTANT :** Ne jamais committer `.env.production` dans le dépôt git. Utiliser `.env.example` comme template.

---

## 4. Commandes de déploiement

Scripts racine attendus (workspace) :

- `pnpm dev` : lance `apps/web` en dev + Firebase emulators
- `pnpm build` : build frontend + build functions
- `pnpm deploy` : déploiement hosting + functions + règles/indexes

### Installation initiale

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Installer pnpm (si nécessaire)
npm install -g pnpm

# Se connecter
firebase login

# Initialiser le projet (si pas déjà fait)
firebase init
# Sélectionner : Firestore, Functions, Hosting, Emulators
```

### Développement local

```bash
# Installer les dépendances workspace
pnpm install

# Démarrer web + emulators (commande racine)
pnpm dev
```

### Déploiement production

```bash
# 1. Build frontend
pnpm build

# 2. Déployer tout
pnpm deploy

# Ou déployer individuellement :
firebase deploy --only hosting          # Frontend
firebase deploy --only functions        # Cloud Functions
firebase deploy --only firestore:rules  # Règles Firestore
firebase deploy --only firestore:indexes # Index Firestore
```

### Rollback

```bash
# Voir l'historique des déploiements hosting
firebase hosting:channel:list

# Rollback vers une version précédente
firebase hosting:clone SOURCE_SITE:SOURCE_CHANNEL TARGET_SITE:live

# Pour les functions, redéployer une version précédente via git
git checkout <commit-hash>
firebase deploy --only functions
```

---

## 5. Déploiement des règles Firestore

Les règles sont dans `firestore.rules` à la racine :

```bash
firebase deploy --only firestore:rules
```

> **CRITIQUE :** Toujours tester les règles avec l'emulator AVANT de déployer. Un mauvais déploiement de règles peut exposer des données.

Les index sont dans `firestore.indexes.json` :

```bash
firebase deploy --only firestore:indexes
```

---

## 6. Initialisation du premier SuperAdmin

Après le premier déploiement, le premier SuperAdmin doit être créé manuellement :

1. Créer un compte via l'interface d'inscription
2. Dans la console Firebase > Firestore, modifier le document `members/{uid}` :
   - `role` : `"superadmin"`
   - `status` : `"active"`
3. (Optionnel) Définir un custom claim via la console Functions :
   ```bash
   firebase functions:shell
   > admin.auth().setCustomUserClaims("UID", { role: "superadmin" })
   ```

---

## 7. Monitoring en production

### Logs

- **Cloud Functions logs** : `firebase functions:log`
- **Console Firebase** : `console.firebase.google.com` > Functions > Logs
- **Audit logs** (applicatifs) : collection `auditLogs/` dans Firestore

### Alertes recommandées

- Erreurs Cloud Functions > seuil
- Quota Firestore proche de la limite
- Tentatives de connexion échouées répétées

### Performance

- Firebase Performance Monitoring (optionnel)
- Vérifier la taille des lectures Firestore (coûts)

---

## 8. Sécurité pré-déploiement (checklist)

Avant chaque déploiement en production :

- [ ] Règles Firestore testées avec l'emulator
- [ ] Aucun `console.log` avec données sensibles
- [ ] Variables d'environnement de production configurées
- [ ] `VITE_USE_EMULATORS=false` en production
- [ ] Cloud Functions : vérification des rôles dans chaque fonction
- [ ] Pas de clés d'API hardcodées dans le code
- [ ] `.env.production` absent du git
- [ ] Tests unitaires + E2E passent
- [ ] Build sans erreur TypeScript

---

## 9. Sauvegarde des données

### Firestore Export (recommandé régulièrement)

```bash
# Export vers Google Cloud Storage
gcloud firestore export gs://YOUR_BUCKET/backups/$(date +%Y%m%d)

# Import (restauration)
gcloud firestore import gs://YOUR_BUCKET/backups/20260207
```

### Fréquence recommandée

- **Avant chaque élection** : export complet
- **Après chaque élection** : export complet
- **Hebdomadaire** : export automatisé (Cloud Scheduler)

---

## 10. Structure des fichiers de configuration

```
model-vote/
├── apps/
│   └── web/                  # Frontend React (Vite)
├── firebase.json           # Configuration Firebase (hosting, functions, emulators)
├── firestore.rules         # Règles de sécurité Firestore
├── firestore.indexes.json  # Index composites
├── .firebaserc             # Alias de projets (dev/staging/prod)
├── .env.example            # Template variables d'environnement
├── .env.development        # Config dev (commitable)
├── .env.production         # Config prod (NE PAS COMMITTER)
└── functions/
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts
```
