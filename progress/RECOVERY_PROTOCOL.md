# RECOVERY_PROTOCOL.md - Procedure anti-interruption

Objectif: permettre la reprise immediate apres redemarrage machine/session.

---

## Demarrage de session (obligatoire)

1. Lire `AGENT.md`.
2. Lire `progress/CHECKPOINT.md`.
3. Lire `progress/STATUS.md`.
4. Reprendre strictement la section "Taches immediates" du checkpoint.

---

## Pendant la session

Mettre a jour `progress/CHECKPOINT.md` quand:

- une tache immediate est terminee
- un nouveau blocage apparait
- l'ordre des prochaines actions change

Mettre a jour `progress/STATUS.md` quand:

- progression milestone change
- journal des changements doit etre complete

---

## Fin de session (obligatoire)

1. Mettre a jour "Derniere mise a jour" et "Etat de reprise" dans `progress/CHECKPOINT.md`.
2. Verifier que "Prochaine etape immediate" est actionnable sans ambiguite.
3. Ajouter une ligne dans le journal de `progress/STATUS.md`.
4. Confirmer l'etat final dans le message de sortie.

---

## Convention d'etat

- `READY`: reprise possible immediate, aucune ambiguite
- `BLOCKED`: reprise impossible sans action externe
- `IN_PROGRESS`: travail commence mais checkpoint incomplet (a eviter en fin de session)
