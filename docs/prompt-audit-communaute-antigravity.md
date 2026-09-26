# Prompt — Audit et test de la Communauté sur la vraie base (Antigravity)

> À coller tel quel dans Antigravity, à la racine du dépôt EduCom SaaS.
> Rédigé le 26 sept. 2026. Périmètre : Communauté (canaux, messages directs, sondages, formulaires, résultats, notifications) et distribution des bulletins aux familles.

---

## Ta mission

Tu audites et tu testes, **sur la base de développement réelle**, tout ce qui a été construit le 26 sept. 2026 dans la Communauté d'EduCom. Le code n'a été vérifié que hors base : compilation, lint, et des scripts de règles sans base. **Rien n'a encore tourné sur des données réelles.** Ton rôle est de le prouver ou de trouver ce qui casse.

Tu rends un **rapport** dans `docs/rapport-audit-communaute-<date>.md`. Pour chaque point : OK ou KO, la preuve (commande et sortie, capture, comptage), et pour chaque KO le fichier, la ligne et la correction proposée.

## Règles non négociables (lis `AGENTS.md` et `context.md` avant tout)

1. **Aucun `git commit`, aucun `git push`.** Kory approuve chaque push lui-même.
2. **Ne lance jamais `next build`** si `next dev` tourne. Pour compiler : `npx tsc --noEmit` et le journal `.next/dev/logs/next-development.log`.
3. **Aucune opération destructive sans les trois étapes** : comptage, sauvegarde, puis essai à blanc (`APPLY=1` pour écrire). Interdit : `prisma db push --accept-data-loss`, `prisma migrate reset`, `DROP`, `TRUNCATE`, et tout `DELETE` sans `WHERE` vérifié.
4. **Ne jamais afficher un secret** : ni `.env.local`, ni une URL de base avec son mot de passe, ni une clé. L'IA est **désactivée** volontairement (pas de `ANTHROPIC_API_KEY`) : ne la configure pas.
5. **Données de test identifiables** : tout ce que tu crées commence par `[TEST AG]` (titre de sondage, de formulaire, de canal, texte de publication). Tu les supprimes à la fin, avec comptage et essai à blanc.
6. **Corrige seulement** les bugs certains, petits et sans risque, et liste chaque correction dans le rapport. Pour le reste, propose sans modifier.
7. Réponses courtes, pas d'excuses, rien d'annoncé comme corrigé sans preuve.

---

## Étape 1 — État du dépôt (lecture seule)

```bash
git status --short
npx prisma validate
npx tsc --noEmit
npx eslint src/components/community src/lib/community.ts src/lib/formulaires.ts src/lib/interpretation.ts src/lib/sondages.ts src/lib/resultats.ts src/lib/bulletinsParents.ts
npx tsx scripts/verify-interpretation.ts
npx tsx scripts/verify-community-access.ts
npx tsx scripts/verify-messagerie-access.ts
npx tsx scripts/verify-formulaires.ts
```

Attendu : 0 erreur TypeScript, 0 erreur de lint, et chaque script qui affiche « Tout est bon » ou « 0 échec ».

## Étape 2 — La base est-elle à jour ? (lecture seule d'abord)

Les tables et colonnes de la Communauté s'ajoutent **sans CLI**, par le bouton « Mettre à jour la base ». Ce bouton se trouve sur la page Communauté ou sur la page Distribution des bulletins, pour le propriétaire ou l'admin, en développement seulement. Il exécute les instructions SQL additives et idempotentes de `src/lib/communauteSchema.ts`.

1. Compare la base au schéma **sans rien écrire**. Prisma 7 est installé, avec `prisma.config.ts` : vérifie les options exactes par `npx prisma migrate diff --help`, puis produis le script SQL d'écart entre la base et `prisma/schema.prisma`.
2. Classe chaque écart :
   - **attendu** : les tables Community* et BulletinDistribution, la colonne `CommunityPoll.resultsNotifiedAt`, la colonne `CommunityFormRecipient.seenAt` ;
   - **inattendu** : tout le reste. Tu le signales et tu n'y touches pas.
3. S'il manque des éléments attendus, fais cliquer Kory sur « Mettre à jour la base », ou exécute exactement les instructions de `communauteSchema.ts`, **deux fois de suite** : la deuxième passe doit réussir sans rien changer.
4. Vérifie que la sécurité par ligne (RLS) est activée sur chaque table Community* et sur BulletinDistribution (`pg_class.relrowsecurity`).

## Étape 3 — Comptages de départ

Pour le tenant de travail, compte les lignes de : `CommunityChannel`, `CommunityChannelMember`, `CommunityPost`, `CommunityComment`, `CommunityPoll`, `CommunityPollVote`, `CommunityForm`, `CommunityFormRecipient`, `CommunityFormResponse`, `CommunityConversation`, `CommunityMessage`, `CommunitySpaceRead`, `StaffNotification`, `BulletinDistribution`, `ReportCard` (par statut). Tu consignes ce tableau dans le rapport et dans `context.md`, section « état réel de la base ».

## Étape 4 — Script d'audit d'intégrité (lecture seule)

Crée `scripts/audit-communaute-db.ts`. Ce script ne fait **que des SELECT** et affiche le nombre d'anomalies par contrôle. Il doit afficher « 0 » partout.

- **Étanchéité entre écoles**, pour chaque table :
  - un vote, une réponse de formulaire, un destinataire, un membre de canal ou une notification rattaché à un utilisateur d'**une autre école** ;
  - un canal dont l'audience vise une classe d'une autre école.
- **Élèves jamais dans la messagerie** : aucune conversation ni aucun message ne doit impliquer un compte au rôle élève.
- **Messages entre collègues** : aucune conversation `EQUIPE` ne doit contenir de parent. `userAId` doit être strictement inférieur à `userBId`, sans doublon.
- **Sondages** :
  - aucun sondage à choix unique avec plusieurs votes d'une même personne ;
  - aucun vote sur une option d'un autre sondage ;
  - aucun vote postérieur à `closesAt` ;
  - aucun sondage clos depuis plus de 24 h avec `resultsNotifiedAt` vide, puisque l'annonce est idempotente et passe à l'ouverture de la Communauté.
- **Formulaires** :
  - aucune réponse d'une personne qui n'est pas destinataire ;
  - aucune réponse postérieure à la clôture ;
  - aucune réponse invalide au regard des questions (réutilise `reponsesValides` de `src/lib/formulaires.ts`).
- **Bulletins** :
  - aucune `BulletinDistribution` pour une classe et un trimestre dont un bulletin n'est pas `APPROVED` ;
  - pour chaque parent, `bulletinsDistribuesEleve` ne renvoie jamais un trimestre non distribué ou dont la date n'est pas atteinte.
- **Notifications** : les `kind` `famille.*` et `communaute.*` vont aux bons rôles, et aucune notification interne (validation de bulletin, etc.) ne va à un parent.

## Étape 5 — Tests fonctionnels dans le navigateur (localhost)

Utilise le sélecteur de rôle de développement.

⚠️ **Piège connu** : le sélecteur change le rôle du **même compte**. Un formulaire envoyé par ce compte ne lui arrive donc jamais comme destinataire. Pour tester la réception :
- coche « M'envoyer une copie » ;
- ou utilise l'onglet « Aperçu destinataire » ;
- ou connecte-toi avec un deuxième compte réel (un parent rattaché à un élève).

Pour chaque scénario, note ce qui se passe, et le résultat attendu s'il diffère.

### A. Sondages (direction, puis enseignant)

1. Dans une classe, publie un sondage `[TEST AG] Jour de la réunion ?`. Clique sur une « idée de sondage » pour vérifier qu'elle remplit la question et les réponses. Deux choix au moins, avec une date de clôture.
   Attendu :
   - les parents de la classe et ses enseignants reçoivent une notification (cloche, plus Web Push si activé) ;
   - les autres parents ne reçoivent **rien**.
2. Vote en tant que parent.
   Attendu :
   - le parent voit les pourcentages seulement **après** avoir voté ;
   - il ne voit jamais les noms des votants.
3. En direction, vérifie :
   - la phrase de lecture (💡) ;
   - « Exporter » : le CSV s'ouvre dans Excel avec les accents intacts ;
   - « Relancer les non-votants » : le compteur correspond aux parents qui n'ont pas voté, et une notification est reçue.
4. Clore le sondage.
   Attendu :
   - destinataires, votants et auteur reçoivent « 📊 Résultats : … » **une seule fois**, même en cliquant ou rechargeant plusieurs fois ;
   - un vote après clôture est refusé.
5. Clôture par date : fixe `closesAt` dans le passé sur un sondage de test, avec essai à blanc puis écriture. Recharge la Communauté.
   Attendu : l'annonce part une fois et `resultsNotifiedAt` est rempli.
6. En enseignant : il ne peut ni clore ni relancer le sondage d'un autre auteur.

### B. Formulaires et modèles

1. Formulaires → Nouveau formulaire.
   Attendu : la galerie s'affiche (20 modèles, 6 catégories, recherche). Teste la recherche « cantine ».
2. Choisis « Satisfaction des familles ». Envoie-le à une classe, en anonyme, avec une copie pour toi.
   Attendu :
   - un toast confirme l'envoi ;
   - la cloche de l'auteur affiche « Formulaire envoyé » ;
   - le parent reçoit la notification et la pastille « Formulaires ».
3. Remplis le formulaire comme parent, y compris la question de 0 à 10.
   Attendu : une valeur hors bornes est refusée côté serveur. Teste-le avec un appel forgé à l'action.
4. Onglet « Résultats et suivi » → « À retenir » :
   - vérifie **à la main** chaque phrase contre les chiffres de « Par question » ;
   - aucune conclusion ne doit apparaître sous 3 réponses ;
   - en formulaire anonyme, **aucun nom** ne doit apparaître nulle part : ni dans les réponses, ni dans le CSV, ni dans la comparaison par profil.
5. En enseignant :
   - il ne peut viser que ses propres classes, même en forgeant une règle `PARENTS_CLASSE:<autre classe>` ;
   - il ne voit pas les résultats d'un formulaire dont il n'est pas l'auteur.

### C. Espace Résultats

1. Direction : l'entrée « Résultats » liste les formulaires **et** les sondages, avec les tuiles, les filtres, l'anneau de participation et l'indice de satisfaction.
2. Enseignant : il ne voit que ses propres formulaires et les sondages des publications qu'il voit déjà.
3. Parent : `/famille/communaute?espace=RESULTATS` ne montre **rien** de cet espace, et l'entrée n'apparaît pas dans sa barre.

### D. Confidentialité par rôle

Rôles à passer : direction, secrétariat, comptable, enseignant, parent.
- Une publication dans un canal privé n'est visible que de son audience.
- Les messages directs ne sont possibles qu'entre l'école et les parents, ou entre membres du personnel. Jamais entre deux parents, jamais avec un élève.
- Une conversation entre deux collègues est invisible pour la direction.
- Une mention `@` d'une personne d'une autre école est ignorée.

### E. Bulletins aux familles

1. Un parent ne voit aucun bulletin, aucune note ni aucune moyenne d'un trimestre non distribué. Vérifie `/famille/notes`, l'accueil famille et l'URL directe `/preview/report-card?...`.
2. Pédagogie → Distribution aux familles :
   - une classe ne part que si **tous** ses bulletins sont approuvés ;
   - une distribution datée dans le futur ne prévient personne avant la date ;
   - « Annuler » fonctionne tant que ce n'est pas publié.
3. Chaque famille ne reçoit « 📄 Bulletin disponible » qu'une seule fois.

### F. IA désactivée

Vérifie qu'aucun bouton IA n'apparaît nulle part : ni « Récap de la semaine », ni « Analyser les réponses », ni « Résumer avec l'IA », ni l'assistant de rédaction.

## Étape 6 — Performance

La page Communauté se rafraîchit toutes les 8 s et la cloche toutes les 15 s.

1. Mesure le temps serveur de `chargerCommunaute` à partir du journal de dev, ou avec un chronométrage temporaire que tu retires ensuite.
2. Compte les requêtes par rafraîchissement, dans le fil et dans l'espace Résultats. `destinatairesPublication` est appelé une fois par sondage ; au-delà de 20 sondages, mesure le coût.
3. Signale toute boucle de requêtes qui devrait être regroupée (règle 10 d'`AGENTS.md`).

## Étape 7 — Nettoyage

1. Liste tout ce qui commence par `[TEST AG]`, avec les comptages et les lignes rattachées.
2. Fais une sauvegarde de ces lignes (export JSON dans `_local/`).
3. Fais un essai à blanc de la suppression, puis applique avec `APPLY=1`.
4. Recompte : tu dois retrouver les comptages de l'étape 3.

## Étape 8 — Rapport

Le rapport `docs/rapport-audit-communaute-<date>.md` contient :
1. Un résumé en 5 lignes : ce qui marche, ce qui casse, ce qui est urgent.
2. Un tableau par étape : contrôle, OK ou KO, preuve.
3. Les bugs, par gravité (sécurité et confidentialité d'abord), avec fichier:ligne et la correction.
4. Ce qui n'a **pas** pu être testé, et pourquoi.
5. La mise à jour de `context.md` : comptages, pièges trouvés, chantiers ouverts.

**Ne commit rien. Ne pousse rien.** Dis à Kory que le rapport est prêt.
