# TEST_PLAN.md — Stratégie de tests

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

---

## 1. Outils

| Type        | Outil                           | Usage                                                      |
| ----------- | ------------------------------- | ---------------------------------------------------------- |
| Unitaire    | **Vitest**                      | Logique métier, calculs d'éligibilité, utilitaires         |
| Intégration | **Vitest + Firebase Emulators** | Cloud Functions, règles Firestore                          |
| E2E         | **Playwright**                  | Flux utilisateur complets (inscription → vote → résultats) |
| Émulation   | **Firebase Emulator Suite**     | Auth, Firestore, Functions en local                        |

---

## 2. Environnement de test

### Firebase Emulators

- Tous les tests tournent contre les **emulators** (jamais en production)
- Configuration dans `firebase.json` > `emulators`
- Ports : Auth (9099), Firestore (8080), Functions (5001)
- Seed data chargé avant chaque suite de tests

### Données de test (seed)

#### Membres

| ID              | Nom            | Rôle       | Section       | Statut    | Ancienneté | Cotisation     |
| --------------- | -------------- | ---------- | ------------- | --------- | ---------- | -------------- |
| `member-01`     | Jean Dupont    | member     | section-paris | active    | 2 ans      | À jour         |
| `member-02`     | Marie Martin   | member     | section-lyon  | active    | 6 mois     | En retard      |
| `member-03`     | Ahmed Diallo   | member     | section-paris | active    | 3 mois     | À jour         |
| `member-04`     | Sophie Lefèvre | member     | section-paris | suspended | 1 an       | À jour         |
| `member-05`     | Pierre Durand  | member     | section-lyon  | pending   | 1 mois     | Aucun paiement |
| `admin-01`      | Claire Bernard | admin      | section-paris | active    | 5 ans      | À jour         |
| `admin-02`      | Thomas Girard  | admin      | section-lyon  | active    | 3 ans      | À jour         |
| `superadmin-01` | Paul Martin    | superadmin | section-paris | active    | 10 ans     | À jour         |

#### Sections

| ID                  | Nom            | Ville     |
| ------------------- | -------------- | --------- |
| `section-paris`     | Paris Centre   | Paris     |
| `section-lyon`      | Lyon Métropole | Lyon      |
| `section-marseille` | Marseille Sud  | Marseille |

#### Conditions

| ID                | Nom                  | Type     |
| ----------------- | -------------------- | -------- |
| `cond-cotisation` | Cotisation à jour    | checkbox |
| `cond-anciennete` | Ancienneté 6 mois    | date     |
| `cond-section`    | Membre d'une section | checkbox |

#### Politique de cotisation

- Montant : 50€ / trimestre
- Tolérance : 30 jours

#### Élection test

| ID            | Titre                  | Statut | Conditions voter               |
| ------------- | ---------------------- | ------ | ------------------------------ |
| `election-01` | Élection Fédérale 2026 | draft  | cotisation + ancienneté 6 mois |

---

## 3. Tests unitaires (Vitest)

### 3.1 Calcul d'éligibilité

```
describe("computeEligibility")
  ✓ membre à jour + ancienneté suffisante → eligible: true
  ✓ membre en retard cotisation → eligible: false, reason: "cotisation"
  ✓ membre ancienneté < minimum → eligible: false, reason: "ancienneté"
  ✓ membre section non autorisée → eligible: false, reason: "section"
  ✓ membre suspendu → eligible: false, reason: "statut"
  ✓ membre pending → eligible: false, reason: "statut"
  ✓ membre avec toutes conditions validées → eligible: true
  ✓ membre avec condition expirée → eligible: false
```

### 3.2 Calcul cotisation "à jour"

```
describe("isContributionUpToDate")
  ✓ dernier paiement couvre la période actuelle → true
  ✓ dernier paiement expiré mais dans la tolérance → true
  ✓ dernier paiement expiré hors tolérance → false
  ✓ aucun paiement → false
  ✓ changement de politique : recalcul correct
```

### 3.3 Validation des dates d'élection

```
describe("validateElectionDates")
  ✓ clôture > ouverture > maintenant → valide
  ✓ clôture < ouverture → erreur
  ✓ ouverture dans le passé → erreur
  ✓ clôture = ouverture → erreur
```

### 3.4 Génération de jetons

```
describe("generateVoteToken")
  ✓ retourne un UUID v4 valide
  ✓ deux appels successifs retournent des jetons différents
```

### 3.5 Calcul des résultats

```
describe("computeResults")
  ✓ compte correctement les votes par candidat
  ✓ calcule les pourcentages corrects
  ✓ classe les candidats par nombre de votes DESC
  ✓ gère l'égalité (même rang)
  ✓ calcule le taux de participation
```

---

## 4. Tests d'intégration (Vitest + Firebase Emulators)

### 4.1 Cloud Functions

```
describe("castVote")
  ✓ membre éligible peut voter → succès
  ✓ membre non éligible → ERROR_NOT_ELIGIBLE
  ✓ élection fermée (endAt dépassé) → ERROR_ELECTION_CLOSED
  ✓ élection pas encore ouverte → ERROR_ELECTION_NOT_OPEN
  ✓ double vote → ERROR_ALREADY_VOTED
  ✓ candidat invalide → ERROR_CANDIDATE_NOT_FOUND
  ✓ le bulletin ne contient pas le memberId
  ✓ le log ne contient pas le candidateId
  ✓ totalVotesCast est incrémenté
```

```
describe("recordPayment")
  ✓ admin peut enregistrer un paiement → document créé
  ✓ membre ne peut pas enregistrer → ERROR_UNAUTHORIZED
  ✓ membre inexistant → ERROR_MEMBER_NOT_FOUND
  ✓ le paiement est loggé
```

```
describe("createSection / updateSection / deleteSection")
  ✓ admin peut créer et modifier une section
  ✓ seul superadmin peut supprimer une section
  ✓ suppression refusée si la section contient encore des membres (ERROR_SECTION_NOT_EMPTY)
  ✓ les actions section sont loggées
```

```
describe("openElection")
  ✓ avec 2+ candidats validés → succès, statut = "open"
  ✓ avec 0-1 candidats → ERROR_NO_CANDIDATES
  ✓ displayOrder est randomisé
  ✓ totalEligibleVoters est calculé
```

```
describe("closeElection")
  ✓ élection ouverte → statut = "closed"
  ✓ élection déjà fermée → erreur
```

```
describe("publishResults")
  ✓ après clôture → résultats calculés et écrits
  ✓ avant clôture → erreur
```

### 4.2 Firestore Rules

```
describe("Firestore Security Rules")
  ✓ membre peut lire son propre profil
  ✓ membre ne peut PAS lire le profil d'un autre
  ✓ admin peut lire tous les profils
  ✓ membre ne peut PAS écrire dans ballots/
  ✓ admin ne peut PAS écrire dans ballots/
  ✓ admin ne peut PAS écrire directement dans sections/ (Cloud Function requise)
  ✓ admin ne peut PAS écrire directement dans elections/ (Cloud Function requise)
  ✓ admin ne peut PAS lire ballots/
  ✓ admin ne peut PAS lire tokenIndex/
  ✓ personne ne peut supprimer un paiement
  ✓ personne ne peut modifier un paiement
  ✓ personne ne peut supprimer un auditLog
  ✓ admin ne peut PAS lire auditLogs directement
  ✓ superadmin ne peut PAS lire auditLogs directement
```

```
describe("getAuditLogs")
  ✓ admin reçoit uniquement les actions non-audit
  ✓ superadmin reçoit toutes les actions, y compris audit.*
```

---

## 5. Tests E2E (Playwright)

### 5.1 Flux Membre complet

```
test("Inscription → Vérification → Profil → Vote → Résultats")
  1. Naviguer vers /register
  2. Remplir formulaire inscription
  3. Vérifier redirection vers "vérifiez votre email"
  4. (Simuler vérification email)
  5. Se connecter
  6. Compléter le profil
  7. Vérifier statut éligibilité
  8. Naviguer vers l'élection
  9. Sélectionner un candidat
  10. Confirmer le vote
  11. Vérifier message "vote enregistré"
  12. Vérifier que le bouton "Voter" n'est plus disponible
  13. (Après publication) Vérifier les résultats
```

### 5.2 Flux Admin

```
test("Création section → Ajout membre → Paiement → Condition → Élection")
  1. Se connecter en tant qu'admin
  2. Créer une section
  3. Ajouter un membre dans cette section
  4. Enregistrer un paiement pour le membre
  5. Valider une condition pour le membre
  6. Vérifier que le membre est éligible
```

```
test("Cycle de vie élection complet")
  1. Créer une élection (wizard)
  2. Ajouter des candidats
  3. Valider les candidats
  4. Ouvrir l'élection
  5. Vérifier le verrouillage
  6. Vérifier la participation en temps réel
  7. Fermer l'élection
  8. Publier les résultats
  9. Vérifier les résultats affichés
  10. Exporter en CSV
```

### 5.3 Flux Sécurité

```
test("Un membre ne peut pas accéder aux pages admin")
  1. Se connecter en tant que membre
  2. Naviguer vers /admin/members
  3. Vérifier redirection ou erreur 403

test("Vote impossible après deadline")
  1. Créer une élection avec deadline passée
  2. Tenter de voter
  3. Vérifier erreur

test("Double vote impossible")
  1. Voter une première fois → succès
  2. Voter une deuxième fois → erreur
```

### 5.4 Responsive

```
test("Navigation mobile fonctionne")
  1. Viewport 375x667 (iPhone SE)
  2. Vérifier bottom navigation (membre)
  3. Vérifier drawer (admin)
  4. Parcourir les écrans principaux
  5. Voter via mobile
```

### 5.5 Smoke M0

```
test("Initialisation M0")
  1. Lancer `pnpm dev` à la racine
  2. Vérifier que `apps/web` est accessible
  3. Vérifier que les emulators Auth/Firestore/Functions répondent
  4. Vérifier la présence visuelle du branding MODEL
```

---

## 6. Couverture cible

| Domaine                    | Couverture cible                    |
| -------------------------- | ----------------------------------- |
| Calcul éligibilité         | 100%                                |
| Calcul cotisation          | 100%                                |
| Cloud Functions (castVote) | 100%                                |
| Cloud Functions (autres)   | > 80%                               |
| Firestore Rules            | > 90%                               |
| Flux E2E critiques         | 100% (inscription, vote, résultats) |
| UI composants              | > 60%                               |

---

## 7. CI/CD (recommandé)

```
# GitHub Actions workflow
on: [push, pull_request]

jobs:
  test:
    steps:
      - Setup Node.js
      - Install dependencies
      - Start Firebase Emulators
      - Run Vitest (unit + integration)
      - Run Playwright (E2E)
      - Upload coverage report
```
