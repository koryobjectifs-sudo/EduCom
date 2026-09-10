# PLAN: Emploi du temps (Lot 5)

## 1. Audit de l'existant
- `School.periods` : champ JSON utilisé par `contextEngine.ts` pour stocker les bornes du calendrier scolaire (trimestres, semestres, vacances). Il ne gère pas les créneaux horaires de la journée.
- `ClassSubject` : associe déjà une classe à une matière (avec coefficient).
- `TeachingAssignment` : associe déjà un enseignant à une classe (et optionnellement une matière).
- Salles : aucune entité `Room` n'existe, ce qui confirme l'instruction (texte libre).
**Conclusion de l'audit :** Aucune contradiction. L'emploi du temps est orthogonal au calendrier d'évaluation.

## 2. Modèle de données proposé
- `TimeSlot` : Les créneaux horaires configurables par l'établissement (ex: "M1" 08:00 - 08:55).
- `Lesson` : L'association d'une classe, d'un `TimeSlot`, d'un jour (`DayOfWeek`), d'une matière, d'un enseignant (optionnel) et d'une salle (texte).

### Contraintes
- `@@unique([classId, dayOfWeek, slotId])` : Une classe ne peut avoir qu'un cours sur un créneau.
- `@@unique([teacherId, dayOfWeek, slotId])` : Un enseignant ne peut être qu'à un seul endroit à la fois (gestion des conflits incluse au niveau de la base).
- L'enum `DayOfWeek` sera créé de manière idempotente pour éviter les problèmes de schéma.

## 3. Plan d'implémentation
1. **Schéma Prisma** : Ajouter `TimeSlot`, `Lesson`, `DayOfWeek`. Ajouter les relations inverses sur `School`, `Class`, `Subject`, `User`.
2. **Migration** : Générer la migration Prisma et la rendre idempotente.
3. **Actions Serveur** :
   - `slots.actions.ts` : CRUD pour les créneaux de l'école.
   - `timetable.actions.ts` : Fetch/Upsert des cours avec vérification des conflits.
4. **Interface d'administration (`/dashboard/settings/timetable`)** :
   - Configuration des créneaux de l'école.
5. **Vues de l'Emploi du temps (`/dashboard/classes/[id]/timetable`)** :
   - Grille hebdomadaire (Desktop).
   - Vue par jour (Mobile).
6. **Espace Enseignant (`/dashboard`)** : Affichage des cours du jour de l'enseignant.
7. **Espace Parent** : Vue de la grille de la classe de l'enfant.
