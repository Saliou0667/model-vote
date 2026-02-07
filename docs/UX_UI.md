# UX_UI.md — Design System & Spécifications Interface

**Version :** 1.0 (MVP)
**Dernière mise à jour :** 2026-02-07

---

## 1. Design System

### Branding

- Nom affiché : **MODEL Vote**
- Signature : _Mouvement Démocratique Libéral_
- Présence du branding dans l'AppBar, l'écran d'auth et la page d'accueil membre

### Framework UI

- **Material UI (MUI) v5+** — composants prêts à l'emploi, thème personnalisable
- **Mode sombre** : non prévu en MVP (V2)

### Palette de couleurs

| Token        | Couleur              | Usage                                 |
| ------------ | -------------------- | ------------------------------------- |
| `primary`    | Bleu foncé `#1565C0` | Boutons principaux, liens, navigation |
| `secondary`  | Orange `#FF8F00`     | Accents, badges, alertes douces       |
| `success`    | Vert `#2E7D32`       | Validations, statut "à jour"          |
| `error`      | Rouge `#C62828`      | Erreurs, statut "en retard"           |
| `warning`    | Jaune `#F9A825`      | Avertissements, statut "en attente"   |
| `background` | Gris clair `#F5F5F5` | Fond de page                          |
| `surface`    | Blanc `#FFFFFF`      | Cartes, modales                       |

### Typographie

- Police principale : `Roboto` (par défaut MUI)
- Titres : `fontWeight: 600`
- Corps : `14px`, `fontWeight: 400`
- Labels : `12px`, `textTransform: uppercase`, `fontWeight: 500`

### Spacing & Layout

- Grille : `8px` base (MUI default)
- Padding conteneurs : `24px` desktop, `16px` mobile
- Border radius : `8px` (cartes), `4px` (inputs)
- Ombres : `elevation={1}` pour cartes, `elevation={4}` pour modales

---

## 2. Navigation

### Espace Membre (mobile-first)

```
Bottom Navigation (mobile) / Sidebar (desktop)
├── Accueil (élections actives + statut)
├── Mon Profil
├── Mon Éligibilité
└── Résultats
```

### Espace Admin / SuperAdmin

```
Sidebar permanente (desktop) / Drawer (mobile)
├── Dashboard
├── Membres
│   └── Fiche membre (drill-down)
├── Sections
├── Cotisations
│   ├── Politique
│   └── Paiements
├── Élections
│   ├── Créer/Modifier
│   ├── Candidats
│   └── Résultats
├── Logs
└── Paramètres (SuperAdmin)
    ├── Conditions
    ├── Admins
    └── Audit
```

### Séparation visuelle

- **Membre** : navigation épurée, peu d'éléments, focus sur l'action
- **Admin** : sidebar riche avec icônes + labels, fil d'Ariane en haut de page
- Le rôle détermine la navigation affichée (pas de liens cachés)
- Deux layouts distincts et explicites : `MemberLayout` et `AdminLayout`

---

## 3. Écrans détaillés

### 3.1 Écrans Membre

#### Connexion / Inscription

- Formulaire centré, logo en haut
- Champs : email, mot de passe
- Bouton "Créer un compte" / "Se connecter" (toggle)
- Indication vérification email
- Gestion erreurs inline (email déjà utilisé, mot de passe faible)

#### Accueil Membre

- **Carte "Mon statut"** : éligible / non éligible (avec raison)
- **Carte(s) "Élection en cours"** : titre, date limite, bouton "Voter" (si éligible)
- **Carte "Résultats"** : lien vers résultats publiés (si applicable)

#### Mon Profil

- Formulaire : prénom, nom, téléphone, section (select)
- Bouton "Enregistrer"
- Badge statut (labels UI) : `actif` / `en attente` / `suspendu` (valeurs techniques: `active` / `pending` / `suspended`)

#### Mon Éligibilité

- **Checklist visuelle** avec icônes :
  - ✅ Condition validée
  - ⏳ En attente de validation
  - ❌ Non remplie (avec explication)
- Message clair si pas éligible : "Pour devenir éligible, il vous faut…"
- CTA si applicable : "Contacter l'admin"

#### Page de Vote

- Titre de l'élection + date limite (countdown)
- **Cartes candidats** (grille responsive) :
  - Photo (ou avatar par défaut)
  - Nom + section
  - Bio courte (expandable)
  - Bouton radio de sélection
- **Bouton "Confirmer mon vote"** (disabled tant que rien n'est sélectionné)
- **Modal de confirmation** : "Vous allez voter pour [Candidat]. Cette action est définitive."
  - Bouton "Confirmer" / "Annuler"
- **Page de succès** : "Votre vote a été enregistré ✓" + lien retour accueil

#### Résultats

- Titre de l'élection
- Barre horizontale ou diagramme circulaire (MUI + recharts ou similaire)
- Tableau : candidat, votes, %, classement
- Mention "Participation : X%"

---

### 3.2 Écrans Admin

#### Dashboard

- **KPIs en haut** (cards) :
  - Membres actifs
  - Membres éligibles
  - Cotisations à jour (%)
  - Élections en cours
- **Tableau "Actions récentes"** (5 dernières actions)
- **Alertes** : élections à venir, membres en attente

#### Sections (CRUD)

- Table avec colonnes : nom, ville, nombre de membres
- Bouton "Ajouter une section" → Modal formulaire
- Actions par ligne : Modifier, Supprimer (SuperAdmin)
- Filtre par région (si applicable)

#### Membres (liste)

- **Table riche** :
  - Colonnes : nom, email, section, statut, cotisation, rôle
  - Recherche textuelle (nom/email)
  - Filtres : section (select), statut (select), cotisation (à jour / en retard)
  - Pagination (25/50/100 par page)
  - Tri par colonnes
- Bouton "Ajouter un membre" (modal ou page)
- Clic sur ligne → Fiche membre

#### Fiche Membre (détail)

- **En-tête** : nom, prénom, photo/avatar, section, statut (badge couleur)
- **Onglet Profil** : infos de base, date d'inscription, ancienneté
- **Onglet Conditions** : checklist avec boutons "Valider" / "Invalider" + note
  - Historique : "Validé par [Admin] le [date]"
- **Onglet Cotisations** :
  - Statut actuel : "À jour jusqu'au [date]" ou "En retard depuis [date]"
  - Bouton "Enregistrer un paiement" → Modal (montant, période, référence, note)
  - Historique paiements (table, trié par date DESC)
- **Onglet Historique** : log des actions sur ce membre

#### Politique de Cotisations

- Formulaire :
  - Montant (input number + devise)
  - Périodicité (select : mensuel/trimestriel/annuel)
  - Tolérance de retard (input number en jours)
- Bouton "Enregistrer"
- Historique des modifications (table)

#### Élections — Liste

- Table : titre, type, statut (badge), dates, participation (%)
- Filtres : statut, type
- Bouton "Créer une élection"

#### Élections — Création / Modification (Wizard)

- **Étape 1 : Informations générales**
  - Titre, description, type
- **Étape 2 : Dates**
  - Date/heure ouverture, date/heure clôture
  - Validation : clôture > ouverture
- **Étape 3 : Règles d'éligibilité**
  - Conditions requises pour voter (multi-select depuis catalogue)
  - Conditions requises pour être candidat (multi-select)
  - Ancienneté minimum (input number en jours)
  - Sections autorisées (multi-select, optionnel — vide = toutes)
- **Étape 4 : Récapitulatif**
  - Résumé de tous les paramètres
  - Bouton "Enregistrer en brouillon" / "Ouvrir l'élection"

#### Candidats (par élection)

- Table : nom, section, statut (proposé/validé/rejeté)
- Bouton "Ajouter un candidat" → recherche membre + sélection
- Vérification automatique éligibilité candidat
- Actions : valider, rejeter, modifier fiche
- Fiche candidat : nom, bio, photo, ordre

#### Résultats (Admin)

- Même affichage que membre + données participation détaillées
- Bouton "Exporter CSV" / "Exporter PDF"
- Bouton "Publier les résultats" (si pas encore publié)

#### Logs

- Table chronologique (plus récent en premier)
- Colonnes : date/heure, acteur, action, cible, détails
- Filtres : type d'action (select), acteur (search), période (date range)
- Pagination
- Bouton "Exporter" (SuperAdmin)

---

### 3.3 Écrans SuperAdmin (en plus des écrans Admin)

#### Gestion des Admins

- Table des utilisateurs avec rôle "admin" ou "superadmin"
- Bouton "Promouvoir un membre" → recherche + sélection
- Action : révoquer rôle admin → confirmation + log

#### Catalogue de Conditions

- Table : nom, type, statut (actif/archivé), date création
- Bouton "Créer une condition" → Modal formulaire
- Actions : modifier, archiver

#### Audit

- **Formulaire de recherche** :
  - Sélectionner une élection
  - Rechercher un membre (par nom/email)
  - Motif de l'audit (champ texte obligatoire)
- **Résultat** :
  - A voté : oui/non
  - Date du vote
  - (Si politique le permet) : choix du candidat
- **Avertissement** : "Cette action est loggée dans le journal d'audit"

---

## 4. Patterns UI obligatoires

### Loading States

- **Skeleton** pour les tables et cartes (pas de spinner pleine page)
- Skeleton pendant le chargement initial
- Spinner inline pour les boutons en cours d'action

### Error States

- **Snackbar** (toast) pour les erreurs d'action (rouge, en bas à droite)
- **Alerte inline** pour les erreurs de formulaire
- **Page d'erreur** pour les 404 / erreurs fatales
- Message lisible + bouton "Réessayer"

### Empty States

- **Illustration simple** (icône MUI grande + texte)
- Message clair : "Aucun membre trouvé" / "Aucune élection créée"
- CTA si applicable : "Créer une élection" / "Ajouter un membre"

### Confirmations

- **Modal de confirmation** pour les actions destructives ou irréversibles :
  - Voter
  - Supprimer un membre
  - Ouvrir/Fermer une élection
  - Actions audit
- Texte clair : "Êtes-vous sûr de vouloir…"
- Bouton principal en couleur d'alerte pour les actions dangereuses

### Tables

- Recherche en haut à droite
- Filtres actifs affichés en chips (supprimables)
- Pagination en bas avec sélection du nombre par page
- Colonnes triables (icône flèche)
- Actions par ligne : icônes ou menu "⋮"

### Formulaires

- Validation en temps réel (Zod + React Hook Form)
- Erreurs sous chaque champ (rouge, texte explicatif)
- Bouton submit disabled si formulaire invalide
- Loading state sur le bouton pendant la soumission

---

## 5. Responsive Design

### Breakpoints (MUI defaults)

- `xs` : 0px (mobile portrait)
- `sm` : 600px (mobile landscape / petite tablette)
- `md` : 900px (tablette)
- `lg` : 1200px (desktop)
- `xl` : 1536px (grand écran)

### Adaptations par breakpoint

| Élément           | Mobile (xs-sm)                       | Desktop (md+)              |
| ----------------- | ------------------------------------ | -------------------------- |
| Navigation Membre | Bottom navigation                    | Sidebar minimale           |
| Navigation Admin  | Drawer (hamburger)                   | Sidebar permanente         |
| Tables            | Cartes empilées ou scroll horizontal | Table complète             |
| Wizard élection   | 1 étape par page                     | Stepper horizontal         |
| Cartes candidats  | 1 colonne                            | 2-3 colonnes               |
| Dashboard KPIs    | 2x2 grid                             | 4 en ligne                 |
| Modales           | Plein écran                          | Centrées (max-width 600px) |

---

## 6. Accessibilité (a11y)

- **Labels** sur tous les inputs (pas de placeholder-only)
- **aria-label** sur les boutons icônes
- **aria-live** pour les messages de statut (snackbar, loading)
- **Contraste** minimum 4.5:1 (WCAG 2.1 AA)
- **Focus visible** sur les éléments interactifs
- **Navigation clavier** fonctionnelle (tab, enter, escape)
- **Hiérarchie de headings** cohérente (h1 > h2 > h3)
