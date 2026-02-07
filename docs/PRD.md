# PRD — Product Requirements Document

## Application de Vote Fédéral à Distance

**Organisation :** MODEL (Mouvement Démocratique Libéral)

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

---

## 1. Objectif produit

Permettre à une fédération d'organiser des élections à distance avec :

- **Vote simple** (1 clic), accessible sur téléphone et PC
- **Confidentialité garantie** : aucun membre ni admin ne peut voir "qui a voté pour qui"
- **Audit possible** par SuperAdmin en cas de contestation, avec traces (logs)
- **Règles d'éligibilité paramétrables** (droit de voter / droit de se présenter)
- **Date limite stricte** : impossible de voter après la clôture

---

## 2. Périmètre MVP

### Inclus dans le MVP

- Inscription / authentification (email + mot de passe)
- Vérification email
- Profil membre avec section/ville
- Gestion des sections
- Gestion des conditions d'éligibilité (checklist paramétrable)
- Cotisations manuelles (saisie par admin)
- Élection simple 1 tour, 1 choix
- Candidats + fiches candidat
- Vote confidentiel avec système de jetons
- Deadline ferme (contrôle serveur)
- Résultats agrégés + exports (CSV/PDF)
- Logs d'audit pour toutes actions sensibles
- Audit break-glass (SuperAdmin)
- UI responsive (mobile + desktop)

### Hors périmètre MVP (V2)

- Vote classé / ranked-choice
- Second tour automatique
- Double validation audit (2 SuperAdmins)
- Anti-coercition avancée (re-vote, seul le dernier compte)
- Mode hors-ligne
- Multi-élections simultanées par section
- Paiement en ligne (Stripe, etc.)
- Notifications push PWA
- Import CSV de membres

---

## 3. Rôles utilisateur

### 3.1 Membre

| Action                        | Description                           |
| ----------------------------- | ------------------------------------- |
| S'inscrire / se connecter     | Email + mot de passe                  |
| Compléter son profil          | Nom, prénom, section/ville, contact   |
| Voir son statut d'éligibilité | Checklist des conditions avec raisons |
| Voter                         | Si éligible + période ouverte         |
| Voir confirmation de vote     | "Votre vote est enregistré"           |
| Voir les résultats            | Quand l'élection est publiée          |

### 3.2 Admin (Global — peut être multiple)

| Action                     | Description                         |
| -------------------------- | ----------------------------------- |
| Gérer les membres          | Tous les membres, toutes sections   |
| Valider les conditions     | Cotisation, ancienneté, etc.        |
| Gérer les sections         | CRUD sections                       |
| Configurer l'élection      | Dates, candidats, règles            |
| Proposer/valider candidats | Selon règles d'éligibilité candidat |
| Suivre l'avancement        | Participation SANS voir les votes   |
| Consulter résultats        | Agrégés uniquement, après clôture   |
| Enregistrer les paiements  | Saisie manuelle des cotisations     |

### 3.3 SuperAdmin

| Action                         | Description                           |
| ------------------------------ | ------------------------------------- |
| Tout ce que fait Admin         | + gestion des admins                  |
| Gérer les admins               | Promouvoir/révoquer des admins        |
| Superviser le catalogue des conditions | Catalogue géré par admin/superadmin |
| Définir politiques de sécurité | Audit, exports, verrouillages         |
| Accès audit (break-glass)      | Avec motif obligatoire + log          |
| Voir les logs complets         | Actions, sécurité, audit              |
| Export contrôlé                | CSV/PDF des données                   |

---

## 4. Modules fonctionnels

### A) Authentification & Inscription

- Firebase Auth (email + mot de passe)
- Vérification email obligatoire
- Profil obligatoire : nom, prénom, section/ville, contact
- Cycle de vie du statut (valeurs techniques) : `pending` → `active` → `suspended`
- Être inscrit ≠ avoir le droit de voter

### B) Gestion des conditions (paramétrables)

**Catalogue de conditions** (géré par admin/superadmin) :

- Cotisation à jour
- Ancienneté minimale
- Appartenance à une section
- Pièce justificative fournie (option)

Chaque condition possède :

- Nom + description
- Type : `checkbox` | `date` | `montant` | `fichier` | `texte`
- Qui peut valider : admin uniquement
- Durée de validité (option)

**Statut par membre** :

- Checklist visible dans la fiche membre (côté admin)
- L'admin coche/valide + note + date
- Historique complet : qui a validé quoi et quand

### C) Cotisations (saisie manuelle)

- Politique configurable : montant, périodicité, tolérance de retard
- Admin enregistre le paiement (date, montant, référence)
- Calcul automatique "à jour / en retard"
- Historique des paiements (append-only, jamais de suppression)
- Toute modification de politique est loggée

### D) Gestion des élections (cycle de vie)

Chaque élection possède :

- Titre, description
- Type : fédérale / section / autre
- Dates : ouverture (`startAt`), clôture (`endAt`)
- Statut : `draft` → `open` → `closed` → `published` → `archived`

Règles par élection :

- Conditions requises pour **voter**
- Conditions requises pour **être candidat**
- Quorum (option)

Verrouillage :

- Dès passage à `open` : candidats + règles verrouillés
- Modification uniquement par SuperAdmin avec log

### E) Candidats

- Un candidat = un membre existant
- Vérification automatique des conditions "candidat"
- Admin propose / valide les candidatures
- Publication de la liste finale

Fiche candidat :

- Photo (option), nom, section
- Mini bio / programme (option)
- Ordre d'affichage aléatoire (neutralité)

### F) Vote (confidentialité + anti-triche)

**Expérience membre :**

1. Vérification éligibilité
2. Affichage des candidats (cartes)
3. Sélection + confirmation claire
4. Message : "Votre vote est enregistré"

**Mécanisme de jetons :**

- Le système génère un jeton unique par vote
- L'urne (`ballots/`) ne contient PAS l'identité du membre
- Le lien membre ↔ jeton est dans `tokenIndex/` (zone audit SuperAdmin)
- 1 jeton = 1 vote (anti double vote)
- Vote impossible après `endAt` (contrôle serveur via Cloud Function)

**Ce que voit l'admin :**

- % participation
- Nombre de votes
- Résultats agrégés UNIQUEMENT après clôture

### G) Résultats & Publication

- Calcul automatique après clôture (ou sur action SuperAdmin)
- Affichage : total votes, répartition par candidat, % participation
- Export PDF/CSV (SuperAdmin + Admin si autorisé)
- Page résultats accessible aux membres connectés

### H) Audit break-glass (SuperAdmin uniquement)

- Rechercher un membre → vérifier s'il a voté (oui/non)
- Retrouver pour qui il a voté (si politique le permet)
- Export complet (très restreint)
- Motif obligatoire pour chaque action audit
- Tout est loggé (qui/quand/quoi)

### I) Journalisation & Traçabilité

Logs obligatoires :

- Création/modification d'élection
- Ajout/retrait d'un candidat
- Validation de conditions d'un membre
- Ouverture/fermeture d'élection
- Actions audit
- Exports
- Modifications de politique de cotisation
- Enregistrement de paiements

### J) Notifications (V1 email simple)

- "Vous êtes maintenant éligible pour voter"
- "Élection ouverte"
- "Élection bientôt clôturée"
- "Vote enregistré"
- Canal : email uniquement (MVP)

---

## 5. Contraintes non-fonctionnelles

- **Performance** : temps de réponse < 2s pour les opérations courantes
- **Sécurité** : écriture des votes uniquement via Cloud Functions
- **Confidentialité** : séparation stricte données membres ↔ urne
- **Auditabilité** : toute action sensible est tracée
- **Accessibilité** : WCAG 2.1 AA minimum
- **Compatibilité** : Chrome, Safari, Firefox, Edge (dernières 2 versions)
- **Mobile** : fonctionnel sur écrans >= 320px
