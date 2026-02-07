# BOOTSTRAP.md — Initialisation SuperAdmin

**Version :** 1.0  
**Dernière mise à jour :** 2026-02-07

---

## Objectif

Créer le premier compte SuperAdmin de manière sûre, sans auto-promotion côté client.

---

## Méthode retenue (MVP)

- Une Cloud Function callable `bootstrapRole` est disponible au démarrage.
- Elle vérifie:
  - utilisateur authentifié
  - email dans la liste allowlist `SUPERADMIN_EMAILS` (string CSV)
  - bootstrap non verrouillé (`BOOTSTRAP_LOCKED=false`)
- Si valide:
  - met `members/{uid}.role = "superadmin"`
  - met `members/{uid}.status = "active"` si nécessaire
  - écrit un log `member.role_change` + `audit.access` (scope bootstrap)
- Puis verrouille le bootstrap (`BOOTSTRAP_LOCKED=true`) après création du premier superadmin.

---

## Valeurs verrouillées

- Premier superadmin autorisé: `emrysdiallo@gmail.com`
- `SUPERADMIN_EMAILS`: `emrysdiallo@gmail.com`

---

## Règles de sécurité

- Aucun utilisateur ne peut modifier son rôle via client Firestore.
- Toute modification de rôle passe par Cloud Function `changeRole`.
- Les règles Firestore refusent les écritures client directes sur `members.role`.
