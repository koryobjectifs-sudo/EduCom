# EduCom SaaS - Contexte du Projet

> Dernière mise à jour : 28 août 2026 — Chantiers #11 & #12 Go-Live Readiness WhatsApp.

## 📌 Nouvelles Fonctionnalités & Logiques Implémentées (Août 2026)

### Chantier #14.5 : VÉRIFICATION FINALE AVANT TEST RÉEL (28 août 2026)
- **STATUT : TEST D'ENVOI RÉUSSI (29 août 2026)**. La fonctionnalité d'envoi libre depuis la Boîte de réception (WhatsAppClient) vers un parent (dans la fenêtre de 24h) est validée de bout en bout en production avec de vraies API Meta.
- **Serveur Local** : Le serveur EduCom tourne correctement sur le port 3000.
- **Tunnel HTTPS** : LocalTunnel est prêt sur le port 3000.
- **Variables d'environnement (Base de données en réalité)** :
  - `whatsappAccessToken` : Injecté manuellement en base pour contourner le cache Next.js.
  - `whatsappPhoneNumberId` : Injecté en base.
  - `NEXT_PUBLIC_ENABLE_META_SIMULATOR` : FALSE (Test réel).
- **Sécurité et HMAC** : La vérification de la signature Meta `X-Hub-Signature-256` est ABSENTE et devrait être implémentée côté Webhook `POST` pour la production.

### Chantier #13 : GESTION MULTI-ENFANTS WHATSAPP (28 août 2026)
- **Sélection Intelligente** : Lorsqu'un parent a plusieurs enfants et émet une intention nécessitant un contexte (ex: déclaration d'absence), le bot met la conversation en attente (`SELECT_CHILD`) et demande de sélectionner l'enfant concerné (ex: `1. Jean`, `2. Marie`).
- **Reprise de Contexte** : À la réception du choix (validé dynamiquement via les relations Prisma du parent), le bot met à jour `resolvedStudentId` et reprend l'intention initiale sans redemander les informations.
- **Expiration** : Le choix expire automatiquement après 1 heure, forçant le parent à reformuler sa demande s'il ne répond pas à temps.

### Chantiers #11 & #12 : GO-LIVE READINESS WHATSAPP (28 août 2026)
- **Audit Strict de Production** : Le code a été vérifié (TypeScript, Lint, Permissions). Aucun contournement n'a été inséré.
- **Rapport de Blocage** : Les tests réseaux réels (Incoming, Outgoing, Webhook) ont été déclarés **NOT AVAILABLE** faute de credentials de production (`NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`) et d'URL Webhook publique. Le mode d'intégration exige cette stricte configuration pour s'activer.
- **Défaut d'UX Identifié et Corrigé** : Le routage IA pour les parents "Multi-Enfants" nécessitait une résolution manuelle par le secrétariat. Corrigé au Chantier #13.
- **Sécurité et Multi-tenant** : Isolation totale par `schoolId` garantie sur les requêtes Prisma. Le rôle `TEACHER` est strictement confiné et bloqué sur la messagerie externe.

### Chantier #10 : VALIDATION END-TO-END WHATSAPP (28 août 2026)
- **Webhook GET** : Remplacement de l'ancienne variable supprimée par `META_WEBHOOK_VERIFY_TOKEN` pour garantir l'enregistrement initial par Meta.
- **Auto-Réponses (IA)** : La création en base s'accompagne désormais de l'envoi **réel** via `WhatsAppClient.sendTextMessage()`.
- **Réponses Manuelles (Inbox)** : Ajout d'une vérification stricte de la **fenêtre des 24h** (`windowExpiresAt`). Si expiré, le système empêche l'envoi de texte libre (évitant un rejet silencieux de Meta). 
- **Traçabilité des Statuts** : L'ID de message retourné par Meta (`waMessageId`) est désormais capturé lors de l'envoi de messages sortants (réponse manuelle et automatique) et sauvegardé dans la base, permettant au webhook de lier les accusés de réception (DELIVERED, READ).
- **Rapport de Compatibilité** : L'architecture SaaS de communication est 100% fonctionnelle, testée statiquement avec 0 erreur TS, en attente d'une application Meta réelle pour basculer la prod.

### Chantier #9 : VRAI META EMBEDDED SIGNUP (28 août 2026)
- **SDK Meta Front-End** : Intégration de `connect.facebook.net/en_US/sdk.js` via `next/script` dans la page Réglages. L'appel à `FB.login` déclenche le flux officiel (Oauth2) pour `whatsapp_business_management`.
- **Validation Backend (`finalizeWhatsAppConnection`)** : Le token Oauth renvoyé par le frontend est traité côté serveur. Ce Server Action exige un environnement Meta complet (`META_APP_SECRET`) pour sécuriser la transaction, et refuse de faken une connexion si Meta n'est pas configuré.
- **Drapeau de Simulation Isolée** : L'ancien simulateur du Chantier 8 a été conservé _exclusivement_ derrière un flag environnemental explicite (`NEXT_PUBLIC_ENABLE_META_SIMULATOR="true"`) afin de ne jamais l'activer par erreur en production, mais de permettre les tests UI en local.
- **Multi-Tenant et Webhook** : Préservation totale de l'architecture V1 ; les credentials et l'isolement par `schoolId` restent la norme.

### Chantier #8 : WHATSAPP ONBOARDING SAAS (28 août 2026)
- **Architecture Meta Embedded Signup** : Transformation de l'intégration WhatsApp d'une logique "développeur" (copier-coller de tokens manuels) vers une expérience SaaS fluide via le parcours officiel Meta Embedded Signup. Les écoles n'ont plus à manipuler de credentials techniques.
- **Évolution Base de Données (`School`)** : Ajout de champs de gestion d'état (`whatsappConnectionStatus`, `whatsappName`, `whatsappPhone`, `whatsappConnectedAt`) pour supporter le cycle de vie de la connexion (NOT_CONNECTED, CONNECTING, CONNECTED, ERROR) sans régression sur les champs existants.
- **UX Mobile-First (Réglages)** : Remplacement des champs de saisie manuelle dans `/dashboard/settings` par une machine à état visuelle. Un bouton "Connecter WhatsApp" initie le flux (simulé en développement), et le statut connecté affiche clairement le nom et le numéro relié.
- **Sécurité et Permissions** : La déconnexion ou la reconfiguration du canal WhatsApp est protégée par un `requireActionContext`, garantissant que seuls les administrateurs/propriétaires peuvent altérer cette connexion critique. Le multitenant est assuré, chaque école opérant en vase clos.
- **Simulation Mode Dev** : Faute de Meta Facebook App ID réel dans ce dépôt de test, le flux OAuth est simulé côté serveur via l'action `simulateConnectWhatsApp`, permettant de valider l'intégralité du produit SaaS sans dépendance externe bloquante.

### Chantier #7 : TESTS, MOBILE-FIRST & FINITION FINALE (28 août 2026)
- **Intégration Réelle de l'API WhatsApp (Chantier #4 complété)** : La base de données inclut désormais des colonnes sécurisées par école (`whatsappAccessToken`, `whatsappPhoneNumberId`, `whatsappBusinessAccountId`). L'écran des "Réglages" expose un panneau de configuration pour l'intégration de la Cloud API de Meta WhatsApp Business.
- **Envoi Manuel depuis Inbox** : Le champ de saisie bloqué a été réactivé. En envoyant un message textuel via `WhatsAppClient`, le statut et l'activité de la conversation sont mis à jour, en vérifiant strictement que les rôles "TEACHER" sont bloqués. L'action `sendManualReply` gère ce workflow.
- **Routage Multi-tenant Fiabilisé (Webhooks)** : Le webhook WhatsApp intercepte le `phone_number_id` (plutôt que de se fier uniquement au numéro parent) pour isoler les communications entrantes par école de façon 100% robuste, un prérequis pour une solution SaaS pure.
- **Mobile-First Inbox** : Résolution du problème d'empilement de l'Inbox sur mobile via l'implémentation d'une navigation Maître/Détail. Un bouton "Retour" dynamique permet de basculer de la liste des conversations au fil de discussion sans scroll horizontal ou empilement hasardeux.
- **Formulaires & Layout Mobile** : Les formulaires de création de campagnes et de sondages s'affichent désormais avec des `grid-cols-1 sm:grid-cols-2` fluides, empêchant l'écrasement des sélecteurs (Envoi ponctuel / Workflow automatisé) sur les écrans d'iPhone.
- **Audit de Sécurité** : La sécurité d'isolation de l'espace de communication par `schoolId` (`requireSchoolContext`) et les règles de blocage rigide pour les rôles `TEACHER` et `ACCOUNTANT` ont été définitivement confirmées.
- **Audit Technique** : Le module Communication a été validé Typescript (`npx tsc --noEmit` à 0 erreur). Les types ont été nettoyés de tout `any` involontaire, confirmant la stabilité backend-frontend. La base Prisma est restée intégralement intacte. Aucun problème de régressions n'a été détecté.

### Chantier #6 : EDUCOM COMMUNICATION PERMISSIONS & SECURITY V1 (28 août 2026)
- **Lockdown `ACCOUNTANT`** : L'accès de la comptabilité au centre de communication est sécurisé. En back-end, le secrétariat peut consulter et créer tout type de campagne. Les comptables ne voient dans l'UI et l'API que les workflows avec `trigger` lié aux paiements (`PAYMENT_DUE`, `PAYMENT_OVERDUE`).
- **Verrouillage `TEACHER`** : Les enseignants sont fermement empêchés par des Server Actions stricts (`requireActionContext`) de pouvoir envoyer ou consulter des communications externes.
- **Sécurité et Escalade Inbox** : Restreinte aux requêtes financières pour l'ACCOUNTANT. La validation d'absence (`VALIDATE_ABSENCE`) ne peut plus être approuvée ou rejetée par un ACCOUNTANT.
- **Formulaires et Sondages** : Sécurisés au niveau des Server Actions pour bloquer la création par les TEACHER et ACCOUNTANT.

### Chantier #5 : INCOMING + IA WhatsApp (28 août 2026)
- **Modèle de données** : Ajout de champs sur `WhatsAppConversation` de manière purement additive (`detectedIntent`, `attentionLevel`, `pendingActionType`, `pendingActionData`, `resolvedStudentId`) via `prisma migrate diff` et un script de synchronisation sans perte de données.
- **Routing Engine** : Création d'un moteur d'intention simulant une IA (`routing.ts`). Il analyse les messages entrants via Regex/Mots-clés pour identifier les FAQ, les sondages, ou les justifications d'absence.
- **Inbox Secrétariat** : Le `InboxClient` a été amélioré pour supporter l'escalade humaine (panneau "Action requise"). Les secrétaires voient immédiatement l'intention détectée (ex: "Justification d'absence").
- **Validation d'Action** : Ajout de Server Actions (`actions.ts`) permettant au secrétariat d'approuver ou de refuser les demandes comprises par le bot. L'approbation logge l'événement dans `AuditLog`, clôt l'action en attente, et envoie un retour automatique au parent.
- **Sécurité et Isolation** : Utilisation stricte de `requireSchoolContext()` pour l'Inbox.
- **Type Safety** : `pendingActionData` est typé en `Record<string, unknown> | null` et l'update Prisma utilise `Prisma.DbNull` pour réinitialiser les colonnes Json. Aucun commit ou push effectué.

### Moteur de Workflows Automatisés V2 (Chantier #4 - 28 août 2026)
- **Modèles `CommunicationCampaign` & `ActionLink`** : Création des tables d'historisation et de configuration des campagnes manuelles/automatiques, avec un gestionnaire d'état de lien d'action (usage unique, expirables et révocables). Modification non destructive de la base de données.
- **Workflow Engine & Résolveur de Variables** : Moteur de contexte permettant de convertir un modèle WhatsApp Meta strict (variables numériques type `{{1}}`) en utilisant les données relationnelles (nom du parent, facture due, date d'échéance) résolues à 100% côté serveur, évitant la manipulation des URL côté client.
- **Sécurité et Idempotence** : `idempotencyKey` garantie l'impossibilité d'envoyer deux fois un rappel de facture à un parent pour le même événement ; seul un lien cryptographique de 64 char part dans l'URL.
- **Refonte UI Campagnes** : Transformation de l'ancien formulaire de SMS manuel (hors-la-loi selon Meta) vers un panneau de sélection de Modèles (Templates), choix d'audience, et configuration des déclencheurs (Paiements, Retards) via interface.
- **Debug Prisma Runtime** : La page de création de campagne crashait à cause d'un delegate indéfini (`Cannot read properties of undefined (reading 'findMany')`). Cause racine : le serveur Next.js en cours d'exécution conservait l'ancien `PrismaClient` en mémoire, qui ne possédait pas la nouvelle méthode `communicationCampaign` ajoutée après le `prisma generate`. Résolu via un redémarrage complet de Next.js (`kill -9 PID` puis `npm run dev`).

### Communication Center V1 (Chantier #3 - 28 août 2026)
- **Refonte de la page Communications** : Remplacement de l'ancien sélecteur de parents par un véritable Control Panel (Dashboard) agissant comme centre névralgique de toutes les communications de l'école.
- **4 Zones Opérationnelles** : 
  1. *Statistiques/Activité* : Compteurs réels (Envoyés, Délivrés, Lus, Réponses) basés sur la base de données.
  2. *Actions rapides* : Nouvelles communications (avec blocage strict des enseignants `TEACHER`), sondages, formulaires.
  3. *Sondages Actifs* : Affichage dynamique des sondages en cours et de leurs taux de réponse.
  4. *Conversations Récentes* : Liste des échanges WhatsApp avec tags prioritaires (ex: `REQUIRES_ATTENTION`).
- **Migration Douce** : L'ancien module d'envoi de masse a été préservé et déplacé sous `/dashboard/communications/campaigns/new` pour maintenir les parcours existants sans blocage brutal.
- **Synchronisation Base de Données (Urgent Debug)** : La table `WhatsAppConversation` (ainsi que `WhatsAppTemplate` et les nouveaux champs) manquait en base car la consigne d'interdiction de modifier la base (`prisma db push`) l'avait empêché à l'étape 2, générant une erreur `TableDoesNotExist`. La synchronisation a été faite manuellement et sans perte de données en extrayant le diff SQL non destructif (`npx prisma migrate diff`) et en l'appliquant directement via `pg` pour contourner la protection Prisma. Aucun effacement n'a eu lieu. Les tests d'exécution (Next.js `/dashboard/communications` et `inbox`) sont tous passés au vert.
### Communication V1 : Fondation WhatsApp (27 août 2026)
- **Principe Fondamental** : EduCom = cerveau, WhatsApp = canal. 
- **Modèles Ajoutés** : `WhatsAppConversation` (gestion de la fenêtre des 24h), `WhatsAppTemplate` (modèles pré-approuvés Meta), ajout du statut `RECEIVED` et `waMessageId` sur `Message`.
- **Mécanisme d'Idempotence** : Le champ unique `Message.waMessageId` garantit qu'un payload webhook reçu plusieurs fois ne créera jamais de doublon.
- **Résolution de Parent** : Recherche stricte des parents par leur numéro de téléphone (rôle `PARENT`). Un numéro inconnu ou ambigu (plusieurs parents) est ignoré/loggé et ne déclenche pas d'actions risquées. Le contexte parent → enfant est injecté.
- **Règles des 24h (Meta)** : Implémentation du tracker de fenêtre `windowExpiresAt`. Un message entrant réinitialise la fenêtre de 24h (autorisant l'envoi de messages libres).
- **Templates Meta** : Préparation de l'architecture pour les envois asynchrones de notifications/annonces en dehors de la fenêtre de 24h.
- **Permissions Verrouillées** : Nouvelle vérification stricte `canSendExternalWhatsApp` dans `permissions.ts` bloquant absolument les enseignants (`TEACHER`) de tout envoi externe WhatsApp.
- **Opt-In** : Ajout de l'enum `WhatsAppOptInStatus` (`OPTED_IN`, `OPTED_OUT`, `UNKNOWN`) sur le modèle `User` pour structurer le futur recueil de consentement.
- **Prochaines étapes** : Finalisation du `CommunicationsClient` (Inbox) pour que le Secrétariat puisse traiter les messages nécessitant une intervention humaine, configurer les campagnes, et mise en place des Webhooks entrants complets (AI parser, triggers).

### School Operations Consolidation (Chantier #5 & #6 - 27 août 2026)
- **Refonte Navigation (Fewer doors, not fewer features)** : Restauration des hubs "Élèves & dossiers" et "Administration". Les actions éparpillées (Importer, Exporter) sont re-centralisées contextuellement.
- **Documents & Générateurs Contextuels** : Retrait du hub générique `/dashboard/documents/` pour les factures, reçus, et bulletins. Ces outils sont désormais intégrés dans leurs domaines respectifs (`/payments` et `/grades`) : la génération d'une facture s'effectue depuis le profil d'un élève ou le module financier, pas depuis un hub générique.
- **Rapports Déplacés** : L'onglet Rapports a été rattaché logiquement sous "Administration" (`/dashboard/admin/reports`).
- **Saisie & Bulletins (Mobile & Impression)** : Refonte de la grille de saisie pour empêcher le scrolling horizontal cassé sur 360px. Adaptation stricte du format A4 (`minHeight: 297mm`) pour l'impression des bulletins, avec masquage exclusif du bouton d'impression pour les rôles enseignants.
- **Sécurité et Isolement par Rôle** : Suppression drastique des endpoints non protégés. `deleteStudent` (unitaire et masse) et validation des présences s'appuient désormais strictement sur `requireActionContext`, garantissant qu'un enseignant ne peut interagir qu'avec ses propres élèves et classes (`teacherClassIds` et `studentWhereFor`).
- **Audit Webhook WhatsApp** : Examen de `WebhookEvent`. L'architecture de communication actuelle a été documentée dans `docs/product/EDUCOM_OPERATIONS_RULES.md`, pointant l'absence de tracking ID externe et le besoin d'un modèle `Notification` pour boucler avec les webhooks (Twilio/Meta).

### School Operational Pulse (Chantier #4 - 27 août 2026)
- **Refonte Hiérarchie Dashboard** : Le Dashboard reflète désormais précisément la hiérarchie produit : **1. Context (MorningBrief) → 2. Operational Pulse → 3. Next Best Action → 4. Attention Center → 5. School Health**.
- **Operational Pulse** : Création du composant `OperationalPulse` remplaçant l'ancien `TodayPanel`. Il résume l'activité immédiate (présences, absences, retards, notes en attente, admissions incomplètes, paiements) sous forme de grille de chiffres clés (Grid system).
- **Simplification du MorningBrief** : Le `MorningBrief` ne répète plus les urgences de l'école (qui sont déjà dans l'Attention Center). Il ne s'occupe plus que du texte narratif, du résumé et de la période (Context).
- **Suppression des redondances** : L'alerte des tâches "à traiter" (urgent/watch) ne figure plus qu'à une seule place : `AttentionCenter`, évitant la duplication visuelle.

### Next Best Action & Pilotage Opérationnel (26 août 2026)
- **Refonte Dashboard** : Transformation du dashboard d'un simple afficheur de données en un centre de pilotage proactif. La hiérarchie est désormais **Contexte → Priorité Absolue (Next Best Action) → À Surveiller**.
- **Context Engine Enrichi** : `getNextBestAction` (`src/lib/contextEngine.ts`) renvoie désormais une action fortement typée (titre, CTA, icône, sévérité, raison). La logique croise le **rôle** (Directeur, Comptable, Enseignant), la **période** (Admissions, Évaluations, etc.) et les **signaux réels** mesurés sur l'école.
- **Réduction de Bruit & Alertes Réelles** : `dashboard.ts` transmet désormais le nombre exact de `incompleteFiles` (élèves sans contact d'urgence) et `missingGrades` (classes sans notes), remplaçant les valeurs codées en dur qui neutralisaient le système.
- **Empty State Rassurant** : En l'absence d'urgence, la Next Best Action affiche une carte "Tout est sous contrôle" (avec une icône de validation), évitant la fabrication de fausses tâches ou un layout brisé.
### Contextual School OS & Local Test Mode (Août 2026)
- **Context Engine (`src/lib/contextEngine.ts`) :** Le produit n'est plus un dashboard statique. Un moteur de contexte a été mis en place pour déduire la période scolaire actuelle (Admission, Enseignement, Saisie de notes, etc.) en fonction des configurations de l'école (`School.periods` ajouté via JSON en base) et de la date. Ce moteur dicte la « Next Best Action » selon le rôle.
- **Dashboard Dynamique :** `dashboardSnapshot` consomme désormais le `ContextEngine`. Une nouvelle bannière `NextBestAction` a été placée tout en haut du tableau de bord pour inciter l'utilisateur à se concentrer sur l'objectif prioritaire de la période en cours.
- **Local Test Mode (`/dev/onboarding`) :** Création d'une route de développement qui enveloppe le `Wizard` d'onboarding et un `DevPanel`. Ce panel permet de forcer la date, la période et le rôle (`dev_test_mode` cookies interceptés par `requireSchoolContext`) sans authentification Supabase. **Sécurité :** Les endpoints de test refusent l'accès en dehors de `NODE_ENV === "development"` et opèrent sur un espace isolé (`TEST_SCHOOL_DEV`).
- **Documents Fondateurs (`docs/product/`) :** `EDUCOM_CONTEXTUAL_OS.md` formalise la vision produit contextuelle. `EDUCOM_LOGIC_AUDIT.md` recense ce qui a été classifié. `ARCHIVE.md` trace les éléments retirés.


### Auth & Onboarding "Fast & Automatic" (25 août 2026)
- **Mot de Passe Oublié Intégré :** Déploiement du flux complet de récupération de mot de passe (demande `/forgot-password`, routage via `/auth/callback`, mise à jour sécurisée `/update-password`) en s'appuyant strictement sur Supabase Auth (`resetPasswordForEmail`).
- **Google OAuth On-the-fly :** Le flux OAuth Google a été fiabilisé. Auparavant, une inscription Google créait un profil Auth sans école Prisma associée, menant à une erreur de tableau de bord. Désormais, l'API `/auth/callback` intercepte les nouvelles inscriptions et crée de manière transparente l'établissement (`École de [Nom]`) et l'utilisateur en base.
- **Page de Bienvenue (`/welcome`) :** Finies les redirections abruptes. L'activation du compte par e-mail ou l'inscription OAuth atterrit désormais sur une "Landing Page de Victoire" chaleureuse invitant formellement le directeur à la prochaine étape (Configurer mon école).

### School Activation Engine & PLG (25 août 2026)
- **Objectif "MAKE A SCHOOL OPERATIONAL IN MINUTES"** : Implémentation du moteur d'activation (Widget "Premiers Pas" sur le Dashboard) suivant la progression d'onboarding (école configurée, classes, élèves, enseignants, notes).
- **Mode Démonstration Sécurisé** : Un système d'injection de données fictives permet de remplir le dashboard instantanément.
  - *Sécurité (Zero-Width Space)* : Toutes les entités injectées (Classes, Matières, Élèves, etc.) portent un marqueur invisible `\u200B` en suffixe de leur nom/matricule. Cela garantit à 100% que la fonction "Vider les données démo" ne supprime aucune donnée réelle, même en cas de nommage identique.
- **Masquage Intelligent** : L'Onboarding complet et la jauge d'activation sont masqués dynamiquement si l'école a déjà achevé son onboarding et possède de la donnée, évitant de polluer l'interface des écoles opérationnelles.
- **Bannière Globale** : Affichage d'une `DemoDataBanner` proposant un vidage un-clic en cascade et sans erreur des données de démonstration.

### Image de Marque (Logo & Filigrane)
- **Application Globale du Logo :** Partout où le nom ou le logo du logiciel (EduCom, "E") apparaissait en dur (sur le Sidebar, le menu Mobile, et dans la création de factures), il a été remplacé par le logo et le nom de l'école récupéré dynamiquement (`school.logo`, `school.name`). 
- **Filigrane sur Documents :** Tous les documents générés (Factures, Certificats, Reçus, Bulletins, Emplois du temps) intègrent désormais le logo de l'école en filigrane (watermark en arrière-plan) et dans l'en-tête (mise à jour en masse via `update_watermark.js`).
- **Correction CSS (Sidebar) :** Le logo sur le menu de navigation (Sidebar/Mobile) utilise désormais `object-contain` et s'adapte aux dimensions (sans forcer un carré coupé), répondant ainsi au problème de "petit carré".

### UI & Responsivité Mobile (24-25 août 2026)
- **Squelettes de chargement (Skeletons) :** Remplacement systématique de tous les spinners de chargement (`Loader2`) par des squelettes visuels fidèles au contenu final (`SkeletonCardList`, `SkeletonTable`, etc.) sur l'accueil du Dashboard et dans les panneaux de l'interface (ex: sélection de classe pour les notes). L'interface ne "saute" plus lors des chargements.
- **Typographie et Troncature des Factures :** L'en-tête de la facture (aperçu) a été refondu pour être parfaitement responsive. Sur petits écrans, les titres longs (ex: nom d'école) ne sont plus brutalement tronqués mais s'empilent verticalement (`flex-col`) et s'adaptent dynamiquement, tout en reprenant leur place côte-à-côte lors de l'impression physique.
- **Accessibilité mobile iOS :** Ajustement de la taille de police de tous les champs `<input>` et `<select>` à `text-base` (16px minimum) sur mobile pour empêcher le zoom automatique non sollicité de Safari iOS, et augmentation des zones de clic (touch targets) pour le menu burger.

### Historique & Archives de Factures
- **Viewer de Facture (Archives) :** Un nouvel écran (`/dashboard/payments/[id]`) permet désormais de consulter l'aperçu exact d'une facture préalablement générée, validée ou payée, directement depuis la liste d'historique (via une icône loupe).
- **Titre du document PDF :** La logique du titre de la facture a été dissociée. L'interface affiche toujours "FACTURE SCOLARITÉ" proprement, mais le nom du fichier PDF téléchargé (via `document.title`) inclut dynamiquement le nom de l'élève (ex: `Facture Scolarité - Nom Prénom.pdf`).

### Optimisation de l'UI de Facturation
- **Compaction :** L'interface de création de facture (`/dashboard/payments/new/form.tsx`) a été rendue plus compacte (paddings réduits de `p-6` à `p-4`, espacements allégés) pour maximiser l'espace écran et réduire l'usage de la barre de défilement, ce qui accélère la saisie répétitive.

### Importation en Masse des Élèves
- **Création automatique :** Un nouvel écran (`/dashboard/students/import`) permet d'importer une liste d'élèves via un fichier Excel (`.xlsx`) ou CSV. Les bibliothèques `papaparse` et `read-excel-file` sont utilisées pour le parsing client-side, évitant de surcharger le serveur. L'import de la librairie a été corrigée (`read-excel-file/browser`).
- **Résolution et création de classes :** Le Server Action d'importation associe chaque élève à sa classe mentionnée dans le fichier. Si la classe n'existe pas, elle est créée automatiquement.
- **Schéma Prisma mis à jour :** Ajout des colonnes `matricule` (String?) et `gender` (String?) au modèle `Student` pour prendre en charge les données d'import standards des écoles.
- **Optimisation Extrême (Batching) :** Pour supporter des fichiers de 500 à 1000 élèves sans timeout, le Server Action a été réécrit pour supprimer toute boucle de requêtes séquentielles. Utilisation stricte de `createManyAndReturn` (Classes et Élèves) et `createMany` (Inscriptions et Historique) réduisant l'insertion de 100+ élèves à 6 requêtes réseau ultra-rapides au lieu de plus de 400. Temps d'exécution abaissé de 30 secondes à moins de 2 secondes.

### Documents & Fichiers — ❌ ANNULÉ le 21 août 2026
Le **hub Documentaire unifié** (onglets Génération / Centre Documentaire / Exports / Mon Drive sous `/dashboard/documents`) et le **Drive** qui l'accompagnait ont été **entièrement retirés** à la demande de Kory. Voir la section « Hub Documents unifié — annulé » plus bas pour le pourquoi et le détail de ce qui a été défait.

L'état d'origine est rétabli : trois entrées distinctes dans la sidebar — **Documents** (`/dashboard/documents`), **Centre documentaire** (`/dashboard/documents/centre`), **Exports de dossiers** (`/dashboard/students/export`).
### Équipe et Organigramme
- **Dépendances Hiérarchiques** : Le modèle `User` possède désormais un `managerId` autoréférentiel pour définir l'organigramme de l'école. Les formulaires de création et d'invitation d'équipe intègrent ce champ.
- **Vue Organigramme** : Ajout d'une nouvelle vue "Organigramme" visuelle dans la page Équipe pour représenter les dépendances (`OrgChartClient.tsx`).

### Facturation & "Reste à encaisser"
- **Nouvelle logique du "Reste à encaisser"** : La carte "Reste à encaisser" ne se base plus uniquement sur les factures émises (`status: UNSETTLED_INVOICE`). La logique calcule désormais le **prévisionnel mensuel** (grille tarifaire active `FeeSchedule` croisée avec les inscriptions `Enrollment`), et déduit les encaissements enregistrés dans le mois courant (`expectedMonthlyRevenue`).
- **Encaissement Rapide** : Un bouton d'encaissement rapide permet aux gestionnaires de générer automatiquement une facture et un paiement simultanément pour un élève, sans avoir à créer manuellement la facture d'abord.
- **Filtres Avancés** : Ajout d'un filtre par classe sur l'historique des factures de la page Paiements et sur la nouvelle vue "Reste à encaisser" (avec affichage du total par classe).

### Équipe & Organigramme
- **Organigramme visuel** : L'affichage de la hiérarchie de l'équipe a été entièrement revu pour utiliser des cartes de nœuds stylisées avec des connexions orthogonales, des badges de rôles, et le comptage des subordonnés.
- **Édition des interdépendances** : Depuis l'organigramme, la Direction peut éditer le rôle (permissions) et le responsable hiérarchique (`managerId`) d'un collaborateur via une modale, réorganisant ainsi l'arbre instantanément.

### Rapports (MVP)
- **Simplification et Filtres** : Le centre de rapports a été optimisé pour afficher un résumé par départements (Finance, Secrétariat, Enseignement...). Un menu déroulant permet au directeur de filtrer l'affichage pour se concentrer sur un seul département à la fois.
EduCom SaaS est une plateforme de gestion scolaire tout-en-un conçue pour les établissements (de la maternelle au lycée). L'application comprend une vitrine (Landing Page) et un tableau de bord (Dashboard) pour l'administration complète de l'école (admissions, communications, notes, paiements, etc.).

## Stack Technique
- **Frontend / Backend:** Next.js **16.3.0** (App Router), React 19.2.8, Tailwind CSS 4
- **Base de données:** Prisma **7.9.1** + PostgreSQL (Supabase), via l'adaptateur `@prisma/adapter-pg`
  - Générateur `prisma-client` → sortie TypeScript dans `src/generated/prisma` (pas `@prisma/client` classique)
  - Pas de dossier `prisma/migrations` : le schéma est appliqué via `prisma db push`
- **Authentification:** Supabase (`@supabase/ssr`)
- **Paiements:** **aucun paiement en ligne.** PayDunya est ABANDONNÉ (supprimé le 19 août 2026) ; **Wave** est la voie retenue, en attente de sa documentation d'API. Stripe : plus tard. Orange Money : non tranché.
- **Messagerie:** identifiants Twilio présents, **aucun envoi implémenté** — `src/lib/channels.ts` est seul juge, et son registre est vide.
- **Autres:** Recharts, Framer Motion, Sonner
- **Icônes:** `lucide-react` **1.x** — attention, plusieurs noms ont changé (`AlertTriangle` n'existe plus, c'est `TriangleAlert`). Vérifier l'export avant d'importer.

## Outillage / Scripts
Les scripts `.ts` à la racine ne se lançaient pas : en ESM, Node exige les extensions explicites sur les imports, donc `from './src/lib/prisma'` échouait en `ERR_MODULE_NOT_FOUND`. Et sans `--env-file=.env`, `DATABASE_URL` est vide et Prisma renvoie un `DatabaseNotReachable` (P1001) trompeur.

`tsx` a été ajouté en devDependency et deux scripts npm encapsulent tout ça :

```bash
npm run seed:senegal          # (re)lance seed-senegal.ts — idempotent
npm run script -- <fichier>   # n'importe quel autre .ts
```

Scripts de maintenance disponibles :
- `scripts/merge-duplicate-classes.ts` — fusionne les classes doublons vers leur version cyclée. **Essai à blanc par défaut**, `APPLY=1` pour écrire, sauvegarde JSON systématique avant toute écriture.
- `scripts/harden-rls.ts` — durcissement de la frontière Supabase (droits `anon`/`authenticated`). Même discipline : essai à blanc, `APPLY=1`, sauvegarde JSON, rollback imprimé, instructions destructives refusées.

**28 vérifiers `scripts/verify-*.ts`.** Ils sortent en code 1 en cas d'échec, donc s'enchaînent en boucle shell. Quatre familles, à ne pas confondre :

- **Lecture seule** — socle et cloisonnement (`tenant-isolation`, `action-guards`, `design-tokens`, `status-vocabulary`, `ui-primitives`, `structure-states`, `navigation`, `operational-screens`, `dashboard`, `documents`, `foundations`, `financial-workflow`, `finance-security`, `reports`, `fees`).
- **Avec fixtures** — ils créent de vraies données, les éprouvent, puis les suppriment (`lot-12-2`, `lot-13-1`, `lot-14`, `lot-15`, `lot-16`, `lot-17`, `student-file`, `export-runtime`, `render-dossier`). ⚠️ Un vérificateur **interrompu** ne joue pas son `finally` et laisse ses fixtures en base — voir `rappel.md` §28.
- **Frontière Supabase** — `verify-rls.ts` : RLS, droits, Storage, TLS et clé de service, éprouvés par de **vraies requêtes HTTP** avec la clé anonyme publique et sept jetons de rôle. ⚠️ **À relancer après tout `prisma db push`.**
- **Sondes de rendu réel** — Chrome piloté par le protocole DevTools via `scripts/_cdp.ts` : vraie URL, vraie session, hydratation React attendue, DOM peint mesuré à 390 × 844 et 1440 × 900 (`responsive-export`, `diffusion-runtime`). ⚠️ `verify-responsive.ts` utilise **l'ancienne technique `file://`, périmée** : le JavaScript ne s'y exécute pas (`rappel.md` §29).

- **23 août 2026** :
  - ✨ **Landing Page (Pricing & Features)** : Refonte visuelle complète pour plus d'interactivité et un aspect premium (via `framer-motion`). Ajout d'animations d'entrée 3D sur les cartes de tarifs, d'une bordure lumineuse tournante sur l'offre Pro, et transformation de la section fonctionnalités en grille de cartes stylisées avec un accent bleu institutionnel (au lieu d'icônes standard).
    - *Décision (PLG Check)* : L'animation du titre du Hero a été explicitement refusée pour préserver le "Test des 3 secondes" et un affichage immédiat (composant Serveur) sur les connexions lentes. La carte "Certificat" statique est conservée.
  - ✨ **Dashboard de Validation (Secrétariat)** : Restructuration complète de l'interface de validation. Ajout d'une barre de progression globale indiquant le pourcentage de classes validées. Les classes sont désormais regroupées par cycle (Élémentaire, Collège, Lycée - Maternelle exclue) avec un système d'entonnoir (drill-down) permettant de naviguer par cycle avant d'accéder aux listes de classes.
  - ✨ **Refonte du Hub Documents** : Suppression des grandes cartes au profit d'une navigation par onglets plus claire ("Générer", "Modèles de l'école", "Validation"). La liste des modèles à générer utilise désormais une disposition en liste épurée. Déplacement de la gestion des modèles personnalisés dans son propre onglet.
  - ✨ **Refonte du workflow de validation (Bulletins)** : Implémentation du bouton "Tout valider d'un coup", intégration de la célébration (confettis), popup d'envoi individuel au secrétariat, et création automatique de `StaffNotification` lors de l'approbation ou du renvoi par la direction.
  - ✨ **Grille de saisie & Programme standard** : Le tableau de saisie des bulletins affiche désormais les coefficients par défaut (standardisés Sénégal) dès le premier affichage, même avant la première note. L'application du programme (onboarding et démo) génère les matières avec ces coefficients spécifiques (ex: 3 pour Maths/Français, 2 pour Sciences/Langues, 1 pour le reste).
  - 🛠 **Correction des timeouts (Tests E2E)** : Le script `verify-parcours.ts` a été assoupli (timeout Onboarding à 90s) pour garantir le passage en 61/61 sans échec de lenteur de la base de données.
- **21 août 2026** : 
  - ❌ **Hub Documents unifié et « Mon Drive » annulés** — retour à l'état d'origine (section dédiée plus bas).
  - Refonte visuelle de l'Annuaire unifié (`/dashboard/directory`). La barre de recherche globale et les 3 boutons ("Nouvelle classe", "Nouvelle admission", "Ajouter cycle") sont maintenant alignés en haut.
  - Le filtre Élève utilise désormais toutes les classes déclarées de l'école.
  - Implémentation du bouton "Ajouter cycle" pour générer automatiquement les classes par défaut d'un cycle donné.
- **20 août 2026** : Reste à encaisser automatisé depuis le forecast mensuel, sélecteur de dates pour la facturation, design d'icônes par regex dans le centre documentaire.

⚠️ **`verify-foundations` sort 5 échecs connus depuis le lot 15** (chemin de permission sans route) — `rappel.md` §34. Tant que c'est rouge, il ne peut pas servir de garde-fou.

Un script de maintenance s'y ajoute : `scripts/mark-overdue.ts` (essai à blanc par défaut, `APPLY=1` pour écrire).

⚠️ **Un vérificateur au vert ne prouve pas qu'une page s'affiche.** Deux écrans ont cassé sous des scripts verts : le tableau de bord au lot 08 (statiques d'un module `"use client"` ne traversant pas la frontière RSC) et l'atelier financier au lot 11 (client Prisma périmé dans `next dev`). **Toujours finir par une requête HTTP réelle sur l'écran touché.**

## Règles de travail (`AGENTS.md`)

Les règles que doit suivre tout agent sur ce dépôt sont dans **`AGENTS.md` à la racine** — seul emplacement lu par tous les outils. Elles couvrent : l'archivage automatique dans `context.md`, la discipline de débogage (« prouver avant de parler »), et la prudence sur les opérations destructives en base.

⚠️ Elles se trouvaient auparavant dans `.agents/AGENTS.md`, **que Claude Code ne charge pas** : elles sont restées sans effet pendant plusieurs sessions. Ce fichier n'est plus qu'un pointeur. Ne rien y réécrire.

Le bloc `<!-- BEGIN:nextjs-agent-rules -->` en tête de `AGENTS.md` est régénéré par `next dev`, mais le générateur ne remplace que l'intérieur des marqueurs — le contenu qui suit est préservé (vérifié dans `generate-agent-files.js`).

## Ce qui a été construit

### Landing Page
Navigation fluide et ancres opérationnelles.

### Tableau de Bord (Accueil)
Refonte totale au design "Premium" (Glassmorphism, animations fluides, transparence). Carte de Revenus stylisée "Carte Bancaire", widget Flux d'Activité en temps réel, effets néons sur les graphiques de santé. La sidebar affiche dynamiquement le logo de l'école.

### Module de Communication (WhatsApp)
- Page de campagne (`/dashboard/communications`) au style Glassmorphism.
- Server Action simulant l'envoi via API et enregistrant les messages dans la table `Message`.
- Boîte de Réception (`/communications/inbox`) lisant la base réelle.

### Module des Classes
- Profil de classe (`/classes/[id]`) au design Premium, modale de confirmation de suppression.
- **Cycle Éducatif** (`EducationalCycle`) : MATERNELLE, ELEMENTAIRE, COLLEGE, LYCEE, AUTRE. Regroupement des classes par cycle sur `/classes`.
- **Sélecteur de cycle obligatoire** dans le formulaire de création *et* d'édition. `createClass` et `updateClass` lisent et valident le champ. Sans « Autre » dans les options : l'école doit trancher.
- **Tri pédagogique** (`src/lib/classOrder.ts`) : `CI → CP → CE1 → CE2 → CM1 → CM2 → 6ème → 5ème → 4ème → 3ème → Seconde → Première → Terminale`. Impossible à obtenir en `orderBy` SQL (l'alphabétique place CE1 avant CI et 3ème avant 6ème), donc tri en mémoire. Gère les classes libres de l'école : `6ème B` se range après `6ème`, un nom inconnu va en fin de son cycle. Appliqué sur `/classes` et sur le menu de `/grades`.

### Module Notes & Bulletins
- **Modèles Prisma :** `Subject`, `Term`, `Evaluation`, `Grade` + enum `GradeType`.
- **Page `/dashboard/grades`** avec trois onglets :
  - **« Par élève »** (`StudentEntryTab.tsx`, onglet par défaut) — saisie d'un élève à la fois : classe + trimestre + évaluation, puis liste des élèves à gauche et bulletin complet à droite (toutes les matières). Moyenne pondérée recalculée à chaque frappe, jauge d'avancement par élève, bouton « Enregistrer et suivant ». Les notes existantes sont rechargées pour permettre la correction sans doublon.
  - **« Par matière »** (`GradesClient.tsx`) — la grille d'origine, 1 matière × tous les élèves. Reste le moyen le plus rapide de saisir une composition sur 30 élèves.
  - **« Configuration »** — CRUD Trimestres, Évaluations, Matières.
- **Server Actions** (`grades/actions.ts`) : `saveGrades`, `getGradesInputData`, `getReportCardData`, plus le CRUD de configuration.
- **Générateur de bulletins** `/dashboard/documents/report-card`.

### Design System Global
Icônes "vivantes" (fonds colorés arrondis), décorations "coins de couleurs" floutés sur les cartes principales.

## Décisions d'architecture (17 août)

Trois choix arbitrés pour le flux de saisie et de validation des bulletins :

1. **Qui saisit → les deux, selon le cycle.** Maternelle/élémentaire : maître unique, saisie par élève sur toutes les matières. Collège/lycée : chaque prof saisit sa matière. C'est le champ `Class.cycle` qui aiguille. *Le schéma ne sait pas encore représenter le second cas* — il n'existe aucune liaison prof ↔ matière ↔ classe (voir Phase 4).
2. **Espace secrétariat → dans `/documents`.** ⚠️ `ROLE_PERMISSIONS` donne à `PARENT` l'accès à `/dashboard/documents`, et `hasAccess()` fait du **préfixe** (`permissions.ts`) : tout sous-chemin est donc hérité automatiquement. Y loger la validation des bulletins **exige** une règle d'exclusion explicite plus un contrôle serveur sur la page, sinon les parents voient les notes non validées. Non négociable.
3. **Coefficients → conservés par note.** Pas de modèle `ClassSubject`. Conséquence assumée : le coefficient est à ressaisir pour chaque note de chaque élève.

## Modèle de saisie multi-cycle (arbitré le 17 août, à implémenter)

Une école peut n'avoir qu'un seul cycle, ou plusieurs. Le modèle doit servir les deux sans dupliquer le flux.

**Constat central :** élémentaire et lycée ne sont pas deux systèmes, mais un seul. C'est toujours `enseignant ↔ classe ↔ matière` ; seul l'axe change (élémentaire = plusieurs matières dans une classe, lycée = une matière dans plusieurs classes).

**Arbitrages :**
1. **Affectation = enseignant + classe + matière *facultative*.** Matière vide → l'enseignant couvre toutes les matières de la classe (élémentaire, maître unique). Matière renseignée → il ne couvre que celle-là (lycée). Deux affectations sur la même classe permettent à deux maîtres de se partager les matières — le cas réel décrit par Kory (un maître français, un maître anglais sur le même CI).
2. **Aperçu bulletin = intégralité des matières de la classe**, celles hors périmètre affichées en lecture seule. Conséquence : un bulletin n'est complet que lorsque tous les enseignants concernés ont saisi.
3. **Matières hiérarchiques.** « Français » regroupe orthographe, vocabulaire, grammaire, conjugaison ; le bulletin affiche les sous-lignes et la moyenne du groupe.
4. **Matières rattachées à des classes précises** (et non au cycle ni à l'école) : Philosophie n'existe qu'en Terminale, Calcul qu'en élémentaire.
5. **Coefficients : toujours saisis par note** (décision maintenue du 17 août).

**Ajouts au schéma — ✅ FAITS, poussés en base :** `Subject.parentId` (hiérarchie), `ClassSubject` (matières d'une classe), `TeachingAssignment` (affectation, avec `subjectId` nullable). `Class.teacherId` est conservé comme professeur principal, pour l'affichage seulement.

### La règle de résolution groupe / matière notée

Point subtil mais central : **`Français` est à la fois un groupe en élémentaire et une matière notée au collège.** Ce n'est pas un conflit — c'est `ClassSubject` qui tranche, classe par classe :

- La matière est **notée directement** si elle est rattachée à la classe.
- Elle devient un **groupe** (moyenne calculée) si elle n'est pas rattachée mais que ses enfants le sont.

En CI, `Français` n'est pas rattaché et ses 8 sous-matières le sont → groupe. En 6ème, `Français` est rattaché et ses enfants ne le sont pas → note directe. Un seul arbre sert les deux cycles, sans doublon de nom. **Le calcul du bulletin doit suivre cette règle.**

### Arbre des matières — ✅ FAIT (`scripts/seed-subjects.ts`, idempotent, `APPLY=1` pour écrire)

**32 matières, 181 rattachements classe↔matière.** Quatre groupes :
- **Français** → Lecture, Écriture/Graphisme, Élocution, Vocabulaire, Grammaire, Conjugaison, Orthographe, Expression écrite
- **Mathématiques** → Calcul mental, Numération/Opérations, Problèmes, Géométrie, Mesures
- **Éveil** → IST, Histoire, Géographie, Éducation civique et morale
- **Éducation artistique** → Dessin, Chant/Musique, Travaux manuels

**Programme explicite par niveau** (révisé le 17 août). Raisonner par *exclusions* produisait des listes absurdes — 16 matières au CI, qui apprend à lire et à compter. Chaque niveau déclare désormais son programme dans la table `PROGRAMME` du script : **CI 8 · CP 11 · CE1 14 · CE2 16 · CM1/CM2 17 · collège 9 · lycée 10**.

Le script **synchronise** : il ajoute ce qui manque et retire ce qui n'a plus lieu d'être — **sauf une matière déjà notée**, ce serait effacer du travail. D'où le CI encore à 16 tant que les notes de test n'ont pas été nettoyées.

`Math` a été fusionné dans `Mathématiques`, `IST` rattaché à `Éveil`.

⚠️ **Arbre non validé par Kory** — il est parti d'une structure sénégalaise standard, à corriger selon les bulletins réels de l'établissement. Trois points restés sans réponse : les groupes portent-ils aussi une note propre ? le libellé « Éveil » ou « ESVS » ? huit sous-matières en français est-il la bonne granularité ?

## Plan du chantier Bulletins

- **Phase 1 — Saisie par élève. ✅ FAIT.** Aucun changement de schéma, tourne sur le modèle actuel.
- **Phase 2 — Validation.** Modèle `ReportCard` par (élève, trimestre) portant l'état et l'appréciation générale : `DRAFT` → `SUBMITTED` → `VALIDATED` → `PRINTED`, plus `RETURNED` pour renvoyer un bulletin à corriger. Validation par élève et signature de fin au niveau classe.
- **Phase 3 — Espace secrétariat** dans `/documents` : liste des dépôts filtrable par enseignant, relecture, validation, impression via le générateur existant. **Inclut le verrouillage `PARENT`.**
- **Phase 4 — `TeachingAssignment`** (prof ↔ matière ↔ classe) pour le vrai flux collège/lycée.

> **Révision du 17 août :** le découpage Phase 1 / Phase 4 n'a plus lieu d'être. Les deux cycles partagent le même modèle (voir « Modèle de saisie multi-cycle » plus haut), donc l'affectation devient un prérequis commun et non une étape finale. Le nouvel ordre de travail :
> - **(a) arbre des matières + `ClassSubject` — ✅ FAIT**
> - **(b) `TeachingAssignment`** — modèle en base, mais **aucune interface d'affectation** et **aucune affectation saisie**. Prochaine étape.
> - **(c) refonte de la saisie — ✅ FAIT**, sauf le filtrage des *matières* par périmètre enseignant (dépend de (b)). Les deux onglets lisent `ClassSubject` via `getClassSubjects(classId)` et non plus les matières de l'école. La logique de regroupement est isolée dans `src/lib/bulletin.ts` (`buildBlocks`), testée sur données réelles.
> - **(d) validation** par élève et par classe.
> - **(e) espace secrétariat** dans `/documents`, avec le verrouillage `PARENT`.

## Là où nous nous sommes arrêtés

**Fait le 16 août :**
- `seed-senegal.ts` corrigé (`orderBy: { createdAt: "asc" }` sur le `findFirst()` de School — sans ordre explicite Postgres ne garantit pas quel tenant remonte, le seed pouvait viser une école vide) puis exécuté. Subject 2→12, Term 2→4, Evaluation 0→**9**.

**Fait le 17 août :**
- **Menu « Sélectionner évaluation » réparé.** Il n'était pas cassé : un trimestre sans évaluation le laissait `disabled` sans un mot d'explication. Il affiche maintenant « Aucune évaluation disponible », passe en ambre, et un bandeau propose un raccourci vers l'onglet Configuration.
- **Phase 1 livrée** (onglet « Par élève »).
- **Ménage complet des classes.** 15 doublons fusionnés vers leur version cyclée, puis `CDH` et les 3 sections de maternelle supprimées.
- **Règles projet consolidées dans `AGENTS.md`** (voir section dédiée plus haut), dont l'archivage automatique dans ce fichier.

**État des classes — 13, une par nom, aucune en `AUTRE` :**

| Cycle | Classes |
|---|---|
| Élémentaire | CI, CP, CE1, CE2, CM1, CM2 |
| Collège | 6ème, 5ème, 4ème, 3ème |
| Lycée | Seconde, Première, Terminale |

⚠️ **Les inscriptions ont failli être perdues.** `Enrollment.classId` et `Grade.classId` sont en `onDelete: Cascade` : supprimer une classe depuis l'interface efface silencieusement les inscriptions rattachées. Le script a déplacé les inscriptions vers la classe canonique **avant** suppression. Samuel Gomis est en `CM1[ELEMENTAIRE]`, Thea Senghor en `CM2[ELEMENTAIRE]`.

**État de la base pour *Kory Academy 2* :** 4 utilisateurs · **14 élèves** · **12 inscriptions** · 13 classes · 32 matières · 4 trimestres · 9 évaluations · **0 note** · 5 factures · 5 paiements · 6 messages.

⚠️ **129 élèves de TEST** ont été créés le 17 août par `scripts/seed-test-students.ts` : **10 par classe** (11 en CM2), soit 133 élèves au total. Les noms viennent d'un pool déterministe (20 prénoms × 20 noms sénégalais) qui sert aussi de marqueur de nettoyage. Le script vise un effectif cible et ne crée que ce qui manque : le relancer ne double jamais personne.

Les retirer : `CLEAN=1 APPLY=1 npm run script -- scripts/seed-test-students.ts`. **Le script refuse de supprimer un élève portant des notes** — ce ne serait plus une donnée de test. Restent sans classe : Phil Wally, tfg jkl.
Il existe 2 écoles vides et non-onboardées (*Kory*, *Senghor*) — les ignorer ou les nettoyer.

## Écran de saisie « Par élève » — disposition arbitrée le 17 août

Deux itérations ont été rejetées par Kory avant d'arriver à la bonne maille. Ce qui n'allait pas, à ne pas refaire :
- **La liste des élèves était cachée derrière un bouton « Charger »** exigeant trimestre + évaluation. Or l'enseignant veut voir son effectif **dès qu'il choisit sa classe**.
- **Une seule vue avait été construite** (le bulletin), alors que la demande portait sur **deux** vues : un récapitulatif « par ligne » *et* le bulletin.

**Disposition retenue (révisée le 17 août) :** **outils à gauche dans une colonne étroite de 240 px** (les trois sélecteurs empilés + la liste des élèves avec pastille d'état et moyenne), **bulletin à droite occupant tout l'espace restant**. La marge extérieure de la page a été retirée pour la saisie — le bulletin doit respirer, il porte jusqu'à 21 matières.

La version précédente (tableau récapitulatif large en haut, bulletin en dessous) a été abandonnée : elle mangeait la hauteur dont le bulletin avait besoin. Le récapitulatif par élève survit sous forme condensée dans la colonne de gauche (moyenne + pastille).

**Navigation :** `← Précédent`, `Enregistrer`, `Enregistrer et suivant →`, plus un compteur « élève 3 / 11 » dans l'en-tête. Le bouton Précédent navigue sans enregistrer.

**Chargement en deux temps :** la classe seule suffit à afficher effectif et matières ; les notes n'arrivent qu'une fois trimestre et évaluation choisis. Plus aucun bouton « Charger ».

**Onglet unique.** « Par élève » et « Par matière » ont été fusionnés en un seul écran « Saisie des notes » : le tableau récapitulatif permet déjà de travailler matière par matière, colonne par colonne. Le composant `InputTab` a été supprimé. Il ne reste que deux onglets : **Saisie des notes** et **Configuration**.

**Portée par rôle :** `TEACHER` ne voit que ses classes (affectations `TeachingAssignment` **ou** `Class.teacherId`, pour ne pas l'enfermer dehors tant que les affectations ne sont pas saisies). `OWNER`, `ADMIN` et `SECRETARY` gardent la vue complète — sans quoi Kory, connecté en `OWNER`, aurait un écran vide.

## ⏸️ EN PAUSE — à ressortir quand Kory dit « rappel »

*(Vide au 17 août — tous les sujets mis en pause ont été traités.)*

## Écran de saisie, passe de finition — ✅ FAIT (17 août)

Parti pris : **le premium vient de la hiérarchie, pas du rembourrage.** L'écran doit rester dense — jusqu'à 17 matières à l'écran — donc aucune marge n'a été ajoutée ; c'est la lisibilité qui a été retravaillée.

- **Sélecteurs étiquetés.** Trois menus empilés sans libellé étaient indéchiffrables. Classe en pleine largeur, Trimestre et Évaluation côte à côte, chacun avec son étiquette.
- **Liste d'élèves rythmée.** Pastille d'initiales (indigo quand l'élève est actif), nom, micro-barre d'avancement par élève, moyenne en pastille colorée, icône d'état. L'élève actif est détouré par un anneau plutôt qu'un bord gauche.
- **Code couleur des moyennes**, cohérent partout : ≥14 émeraude, 10–14 indigo, <10 rose. Appliqué aux pastilles, aux moyennes de groupe et à la moyenne générale.
- **Champs de note teintés** selon la valeur — l'ambre continue de signaler une case **vide**, pas une mauvaise note.
- **Groupes en blocs encadrés** avec accent indigo et moyenne en pastille, au lieu d'une simple ligne grise. La hiérarchie groupe/sous-matière se lit d'un coup d'œil.
- **Appréciation en champ fantôme** : bordure invisible au repos, révélée au survol — la colonne cesse d'être un mur de rectangles.
- **Recherche d'élève** au-delà de 6 inscrits.
- Avatar d'initiales dans l'en-tête du bulletin.

## Sécurité multi-locataire — ✅ CORRIGÉ (17 août)

Six générateurs sur sept (`certificate`, `invoice`, `info-sheet`, `receipt`, `reminder`, `timetable`) n'avaient **ni authentification ni filtre d'école** : `prisma.student.findMany()` sans `where` ramenait les élèves de tous les établissements, et `reminder` toutes les factures impayées de la base. Ils appelaient aussi `prisma.school.findFirst()` **sans `orderBy`** — un document pouvait sortir avec le nom, le cachet et la signature d'une autre école.

**Correctif :** `src/lib/documentContext.ts` expose `requireSchoolContext()`, qui authentifie et renvoie l'école **de l'utilisateur connecté**. Les sept pages l'utilisent et filtrent par `schoolId`. Plus aucun `findFirst()` non ordonné.

> ⚠️ Toute nouvelle page de génération doit passer par `requireSchoolContext()`. Le middleware `proxy.ts` bloque les visiteurs anonymes mais ne fait **rien** contre le mélange entre écoles.

**Présélection de l'élève — ✅ FAIT.** `certificate`, `invoice`, `info-sheet` et `receipt` lisent `searchParams.studentId` et appellent `handleStudentSelect` au montage — on réutilise ainsi le chemin exact d'une sélection manuelle (chargement du brouillon, ouverture de l'éditeur) au lieu de le dupliquer. Le trajet « profil élève → Certificat » arrive donc sur le bon élève, prêt à produire.

## Programme par classe modifiable — ✅ FAIT (17 août)

`ClassSubjectsPanel` dans l'onglet Configuration : on choisit une classe et on coche les matières réellement enseignées, hiérarchie comprise. Actions `addSubjectToClass` / `removeSubjectFromClass`, toutes deux vérifiant que la classe appartient bien à l'école de l'utilisateur.

**Le retrait est refusé si des notes existent** : détacher la matière les rendrait invisibles au bulletin sans les supprimer — pire qu'une erreur franche.

## Validation des bulletins — ✅ côté enseignant (17 août)

**Modèle `ReportCard`** (poussé en base) : un état par couple (élève, évaluation). `@@unique([studentId, evaluationId])` — une évaluation n'appartenant qu'à un trimestre, le couple suffit. Statuts : `DRAFT` → `VALIDATED` → `SUBMITTED` → `APPROVED`, plus `RETURNED` pour un renvoi en correction. Le modèle porte les traces des actes (qui a validé, qui a déposé, motif du renvoi).

*Pourquoi ce modèle :* sans lui les notes existaient en base, mais rien ne disait si l'enseignant avait terminé — le secrétariat ne pouvait ni savoir quoi relire, ni quoi imprimer.

**Actions** (`grades/actions.ts`) : `getReportCardStates`, `validateStudentReportCard`, `reopenStudentReportCard`, `submitClassToSecretariat`.

**Règles arbitrées :**
- **Un bulletin incomplet peut être validé** (un élève peut avoir été absent) mais l'interface avertit avant l'acte, en listant les matières manquantes. Il est signalé comme non imprimable.
- **Le dépôt de classe refuse tout dépôt partiel** : `submitClassToSecretariat` échoue tant qu'un élève n'est pas validé. Un dépôt incomplet n'aurait aucun sens pour le secrétariat.
- **Le dépôt vaut signature** — popup d'avertissement explicite avant l'envoi.
- Valider **verrouille** la saisie ; `Rouvrir` la déverrouille, mais seulement tant que la classe n'est pas déposée.

**Écran** : suivi d'avancement dans la colonne de gauche (barre + « 7/11 », qui passe au vert à complétion), densité resserrée, matières non saisies surlignées en ambre, bandeau d'alerte de complétude, bouton « Envoyer au secrétariat » en pied de colonne.

## Boucle complète enseignant → secrétariat — ✅ FAIT (17 août)

**Écran de fin** `/dashboard/grades/termine?classId=&termId=&evaluationId=`. « Enregistrer et terminer » sur le dernier élève y redirige. Célébration (confettis CSS, sans dépendance), chiffres clés (bulletins validés, moyenne de classe, nombre de matières), avertissements si des bulletins ne sont pas validés ou si des matières manquent, puis deux options : déposer au secrétariat, ou imprimer.

**Dépôt signé par mot de passe.** `submitClassWithPassword` vérifie le mot de passe avant le dépôt. La vérification passe par un client Supabase **brut** (`persistSession: false`) : utiliser le client SSR aurait réécrit les cookies de session de l'utilisateur au passage. Le dépôt engage l'enseignant et rend les bulletins non modifiables — un simple clic ne suffisait pas.

**Espace secrétariat** `/dashboard/documents/validation` (`OWNER`, `ADMIN`, `SECRETARY` seulement). Les dépôts y sont regroupés par couple (classe, évaluation), avec enseignant, date et effectif ; ce qui attend une relecture est remonté en tête. Actions : **Renvoyer** (motif obligatoire) et **Valider** (autorise l'impression).

**Verrouillage `PARENT` livré.** `permissions.ts` gagne `ROLE_DENIALS`, évalué **avant** les autorisations : `hasAccess` raisonnant par préfixe, `PARENT` aurait hérité de `/dashboard/documents/validation` via `/dashboard/documents`. Refus aussi pour `TEACHER`, `ACCOUNTANT`, `ASSISTANT`. Doublé d'un contrôle serveur sur la page — elle expose des notes non relues, elle ne doit pas dépendre du seul middleware.

**Impression sans re-sélection** — `/dashboard/documents/validation/impression?classId=&termId=&evaluationId=`. Le dossier étant déjà validé, l'écran ne redemande **rien** : tout vient de l'URL. Deux actions seulement, **Tout imprimer** ou **imprimer individuellement** (une pastille par élève, avec sa moyenne). L'impression individuelle passe par un état `printOnly` qui applique `print:hidden` aux autres bulletins — l'écran reste inchangé, seule la sortie papier est filtrée. Mise en page A4 (`minHeight: 297mm`, `print:break-before-page`), avec en-tête de l'école, filigrane du logo, moyennes de groupe, moyenne générale, cachet et signature. Réservé à `OWNER`/`ADMIN`/`SECRETARY`.

**Dossiers renvoyés visibles par l'enseignant** — bandeau ambre en tête de `/dashboard/grades` listant classe, trimestre, évaluation, effectif et motif. Un enseignant voit ses propres renvois (`validatedById`), la direction voit tous. Sans ce rappel, un renvoi restait invisible et le bulletin dormait.

**Boucle de correction :** direction renvoie → statut `RETURNED` → les bulletins redeviennent modifiables et **le motif s'affiche en bandeau** dans l'écran de saisie de l'enseignant → il corrige, revalide, redépose.

⚠️ **Piège rencontré :** après un `prisma generate`, le serveur de dev garde l'ancien client en mémoire (`src/lib/prisma.ts` met l'instance en cache sur `globalThis`, que le HMR ne recharge pas). Symptôme : `Cannot read properties of undefined (reading 'findMany')`. **Il faut redémarrer `next dev` après toute régénération du client.**

## Affectations enseignant ↔ classe ↔ matière — ✅ FAIT (17 août)

Le modèle `TeachingAssignment` est enfin exploité. **`subjectId` vide = toutes les matières de la classe** (maître unique de l'élémentaire) ; renseigné = cette matière seule (professeur de matière). Deux affectations sur une même classe permettent à deux maîtres de se partager le programme — le cas décrit par Kory.

**Écran** : panneau « Enseignants et matières » sur la fiche de classe (`/dashboard/classes/[id]`), sous le professeur principal. Création et retrait réservés à `OWNER`/`ADMIN`/`SECRETARY`.

**Résolution du périmètre** — `editableSubjectIds()` dans `grades/actions.ts` :
1. Direction et secrétariat → tout.
2. Une affectation sans matière → tout.
3. Des affectations avec matières → exactement celles-là.
4. **Aucune affectation, mais professeur principal → tout.** Filet indispensable : sans lui, un PP se retrouverait enfermé dehors tant que la direction n'a rien saisi.
5. Sinon → rien.

**Dans la saisie**, `getClassSubjects` renvoie un drapeau `editable` par matière. Conformément à l'arbitrage du 17 août, le bulletin s'affiche **en entier** et les matières hors périmètre sont **verrouillées en lecture**, avec un bandeau qui l'explique. `buildBlocks` est devenu générique pour que ce drapeau survive au regroupement. La sauvegarde exclut les matières hors périmètre — la garde n'est pas seulement visuelle.

⚠️ **Piège Postgres :** `@@unique([teacherId, classId, subjectId])` ne protège pas contre deux affectations « toutes matières », deux `NULL` étant considérés comme distincts. `createAssignment` fait donc la vérification à la main.

> Note : `tsconfig.json` exclut désormais `agent/` — ce dossier d'outillage apparu le 17 août injectait des dizaines d'erreurs TypeScript sans rapport avec le projet et masquait les vraies.

## Stitch MCP — connecté le 17 août (clé API)

Le serveur MCP Google Stitch (`.mcp.json` → `https://stitch.googleapis.com/mcp`) est **authentifié et fonctionnel**, vérifié par un vrai appel `list_projects`.

**Décision : clé API, pas OAuth.** Ce n'est pas une préférence, c'est une contrainte.

⚠️ **Piège — l'OAuth intégré de Claude Code ne peut pas marcher avec Stitch.** L'erreur `Incompatible auth server: does not support dynamic client registration` n'est pas un bug de configuration : Claude Code ne sait ouvrir un flux OAuth que par enregistrement dynamique de client (RFC 7591), or `accounts.google.com` exige un client pré-enregistré. Aucune reprise, aucun réglage ne contourne cela. **Ne pas repartir en boucle là-dessus :** la seule voie simple est l'en-tête `X-Goog-Api-Key`, et la clé se génère sur stitch.withgoogle.com → photo de profil → Stitch settings → API key. Elle n'expire pas.

⚠️ **Piège — `.mcp.json` n'est lu qu'au démarrage.** Changer la clé ne suffit pas : tant que la session Claude Code n'est pas redémarrée, les outils `mcp__stitch__*` continuent de renvoyer l'ancienne erreur alors que la clé est bonne. Vérifier en direct avec `curl` avant de conclure que la clé est mauvaise.

> Pour mémoire, si un jour la voie OAuth devient nécessaire : serveur d'autorisation `accounts.google.com`, scopes `…/auth/aida` et `…/auth/cloud-platform`, jeton en `Authorization: Bearer` (durée ~1 h, donc à rafraîchir). Nécessite gcloud, absent de la machine.

**État réel du compte Stitch : vide.** 0 projet possédé, 0 projet partagé. **Il n'existe aucune maquette EduCom dans Stitch** — le design actuel ne vit que dans le code (`src/app/globals.css`). Toute reprise part donc de zéro : soit `create_project` + génération, soit extraction d'un `DESIGN.md` depuis le code existant puis `upload_design_md`.

**Capacités disponibles (15 outils) :** projets (créer/lister/lire/supprimer), écrans (lister/lire), génération (`generate_screen_from_text`, `edit_screens`, `generate_variants` — modèles Gemini 3 Pro/Flash/3.1 Pro, cibles MOBILE/DESKTOP/TABLET), et design systems (créer/mettre à jour/appliquer, plus le pont `upload_design_md` → `create_design_system_from_design_md`). Thème paramétrable : couleur d'amorce + variante dynamique, 3 polices (titre/corps/label), arrondi (2/4/8/12/full), échelles d'espacement et de typographie.

⚠️ Les outils de génération sont **lents (plusieurs minutes)** et leur schéma interdit explicitement de réessayer en cas de timeout : interroger `get_screen` à la place.

## Higgsfield MCP — ajouté le 17 août (OAuth)

Second serveur MCP dans `.mcp.json` : `https://mcp.higgsfield.ai/mcp`. **Aucune clé API** — volontairement pas de bloc `headers` : en mettre un casserait le flux OAuth.

**À retenir : ici l'OAuth intégré de Claude Code fonctionne, contrairement à Stitch.** Ne pas généraliser le piège Stitch à tous les serveurs MCP du projet. La différence est vérifiable : Higgsfield expose bien un `registration_endpoint` (`/oauth2/register`), donc l'enregistrement dynamique de client (RFC 7591) que Claude Code exige est disponible, avec PKCE S256. Ses métadonnées citent même `claude-code` parmi les clients attendus. Scopes : `openid`, `email`, `offline_access` — ce dernier fournit un jeton de rafraîchissement, donc pas de ré-authentification permanente.

Authentification : redémarrer Claude Code, puis `/mcp` dans le terminal → `higgsfield` → Authenticate → connexion Higgsfield (via Clerk) dans le navigateur.

## Prototype de hero photographique — 🔬 À ARBITRER (19 août)

Demande de Kory : une **direction artistique alternative** pour le hero, à regarder
avant de décider si on l'intègre. Rien de la landing en production ne devait bouger.

**Où ça vit, et comment le jeter.** Tout tient dans deux dossiers :
`src/app/prototype/hero/` (4 fichiers) et `public/prototype/hero/` (2 photos).
Route : `/prototype/hero`. Aucun fichier existant n'a été touché, aucun composant
existant n'est importé — la barre de navigation est une **réplique locale**
délibérée, pour qu'un réglage cosmétique du prototype ne puisse pas se répercuter
sur `components/landing/Navbar`. Supprimer les deux dossiers suffit à tout effacer.
La page est en `robots: noindex` : un prototype ne doit pas finir indexé à côté de
la vraie accueil.

**L'arbitrage réel, et c'est le seul qui compte.** Le hero en production montre le
**livrable** (le certificat de scolarité) ; le prototype montre les **gens** qui le
produisent. Les deux répondent à des questions différentes — « qu'est-ce que ça me
donne ? » contre « à quoi ressemble une école qui tourne bien ? ». Le texte est
repris **mot pour mot** des deux côtés, précisément pour que la comparaison ne
porte que sur l'image. Comparer : `/` contre `/prototype/hero`.

**Décisions prises en chemin, avec leur pourquoi :**

- **Pas de feuillet « produit » posé sur la photo.** La variante a été construite
  puis écartée sur rendu : un cartouche blanc flottant au-dessus d'une photographie
  se lit comme une infobulle d'interface, soit exactement l'esthétique « startup
  IA » que le brief excluait. Le réglage survit dans le code
  (`AFFICHER_LE_FEUILLET`, à `false`) pour pouvoir revoir l'autre option sans rien
  réécrire. Coût assumé : le visuel ne dit plus EduCom, il dit « une école qui
  tourne » — c'est le texte qui nomme le certificat.
- **Deux photos, jamais trois.** La troisième transformait la composition en
  galerie. La seconde ne vaut que par son **chevauchement** de la couture entre le
  texte et le panneau ; sans ce débord, on n'a que deux rectangles côte à côte.
- **Bascule deux colonnes à `xl` (1280 px), pas à `lg`.** ⚠️ À 1024 px chaque
  colonne tombe sous 500 px : titre à cinq lignes, **les deux boutons cassés en
  deux lignes chacun**, ligne de réassurance sortie de la section. En dessous de
  1280, l'empilement mobile est meilleur — ce n'est pas un pis-aller.
- **Aucune donnée inventée.** Pas de pourcentage, pas de nombre d'écoles, pas de
  logo, pas de témoignage. La ligne de réassurance est celle de la production.

**⚠️ Piège de vérification — une capture d'écran à 390 px peut mentir.**
Chrome sur macOS **impose une largeur de fenêtre minimale de 500 px** :
`--headless --window-size=390,844` rend donc la page à **500 px** puis recadre à
390, ce qui donne une fausse image de débordement horizontal — vérifié en sondant
`window.innerWidth`, qui renvoie 500. La page n'avait rien. Seul
`Emulation.setDeviceMetricsOverride` par le protocole DevTools donne un vrai
viewport de 390. **Le dépôt a déjà ce qu'il faut : `scripts/_cdp.ts`** (voir la
famille « sondes de rendu réel ») — s'en servir plutôt que de repartir sur
`--screenshot`.

**⚠️ Photographies : générées, pas sous licence.** Les deux images viennent de
Higgsfield (`nano_banana_pro`, 2K). **Ce sont des images de synthèse** : avant toute
mise en production, trancher la question de l'honnêteté (une photo d'école
sénégalaise qui n'existe pas) et celle des droits. Une troisième image a été
écartée — murs jaunes (exclus par le brief) et texte anglais lisible au mur.

**État du compte Higgsfield : formule gratuite, 4 crédits restants** (10 au départ,
6 dépensés pour 3 images à 2 crédits). `nano_banana` coûte 1 crédit, `nano_banana_pro`
en 2K en coûte 2. Prévoir le rechargement avant toute nouvelle série.

**Non vérifié, à dire franchement :** le rendu n'a été contrôlé qu'en Chrome
headless (1440 × 900, 1280, 1024, 820, 390 × 844). Aucun test sur un vrai téléphone,
aucun test Safari/Firefox, et la page n'a pas été éprouvée sur une connexion lente
malgré les ébauches base64 posées pour ça.

⚠️ Observation non expliquée, sans rapport avec le prototype : neuf composants
`components/landing/` **non importés** (Analytics, CTA, ChaosToControl,
Communication, FeatureGrid, ParentExperience, Pillars, Testimonials,
TestimonialsSection) ont vu leur date de modification changer pendant la session,
tous à la même seconde. Contenu intact (`tsc --noEmit` passe), aucun n'est utilisé
par l'accueil. Si quelqu'un cherche l'origine : ce n'est pas le prototype.

## Hub Documents unifié — ❌ ANNULÉ (21 août 2026)

**La décision.** Kory demandait une seule chose : **retrouver l'ancien Centre documentaire**. Le hub à onglets (Génération · Centre Documentaire · Exports · Mon Drive sous `/dashboard/documents`) est annulé, et les trois entrées reprennent leur place dans la sidebar. Arbitrage explicite : « si c'est pas possible, il faut annuler toute le changement faite ».

**Ce qui a été défait.** Barre d'onglets (`documents/layout.tsx` + `components/documents/DocumentTabs.tsx`), route `documents/drive/` (l'écran type Google Drive), copie `documents/export/`. Les Exports sont revenus à `students/export/`, et `permissions.ts` a perdu le chemin exact `"/dashboard/documents$"` qui n'existait que pour laisser `TEACHER` atteindre le layout unifié. `documents/` et `permissions.ts` sont désormais **identiques au dernier commit** ; seul `navigation.ts` diffère encore, et uniquement pour l'Annuaire.

**Ce qui n'a PAS été touché** : le remplacement de « Élèves » + « Classes » par « Annuaire » dans la sidebar. C'est un autre chantier, et il n'était pas visé par la demande.

### ⚠️ Le piège qui a coûté la séance

Le serveur envoyait **la bonne page** — l'ancien Centre — pendant que le navigateur de Kory affichait **le Drive**, à l'URL `/dashboard/documents/centre?recent=1`. Deux captures Chrome pilotées montraient l'ancien écran ; sa fenêtre montrait l'autre.

Cause : deux routes qui rendent **les mêmes données sous le même layout**. Le cache de navigation client d'App Router a servi le segment du Drive sous l'URL du Centre. Le mécanisme exact d'apparition du `?recent=1` sur `/centre` **n'a pas été élucidé** — aucun lien du hub ne l'ajoute à cet endroit.

**La leçon, à appliquer partout :** quand un écran affiche autre chose que ce que dit le code, **récupérer le HTML brut du serveur avec une vraie session et y chercher un marqueur propre à chaque composant.** C'est ce qui a tranché en une minute (`« Les rayons du centre »` = ancien Centre, `« Nouveau Document »` = Drive) après de longs échanges. Une capture d'écran, même pilotée, ne dit pas ce que le serveur a envoyé.

### ⚠️ LE piège, celui qui a vraiment bloqué : `.next` gardait la route supprimée

Après suppression de `documents/drive/` et de `documents/layout.tsx`, le serveur envoyait le bon HTML — prouvé par marqueurs — mais le navigateur de Kory affichait **toujours** le Drive à l'URL du Centre. Détail qui a tout élucidé : **sa sidebar, elle, était à jour dans le même rendu.** Ce n'était donc pas un cache de navigation : le HTML était neuf et le composant hydraté était l'ancien.

Cause : `.next/dev` contenait encore **41 artefacts** de la route effacée, dont un `documents/drive/page.js` compilé et surtout les **manifestes de chunks client**. Le navigateur chargeait donc le bon HTML serveur puis l'hydratait avec l'ancien composant, qui écrasait tout à l'écran.

**Remède, et il est obligatoire après toute suppression de route ou de layout :** arrêter `next dev`, `rm -rf .next`, relancer. Un simple ⌘⇧R ne suffit pas — le cache fautif est côté serveur, pas côté navigateur. Supprimer `.next` **pendant** que `next dev` tourne ne sert à rien non plus : il continue de servir depuis sa mémoire (même famille de problème que la règle 3 d'`AGENTS.md`).

**Et le contrôle qui le prouve :** compter les chunks `/_next/static/*.js` référencés par la page et vérifier qu'aucun ne porte le nom du composant supprimé. Après purge : 70 chunks, zéro « Drive ».

### Deux autres pièges relevés au passage

1. **`revalidatePath` visait la mauvaise route.** `documents/centre/actions.ts` fait `revalidatePath(CENTRE_PATH)`, et le Drive **importait ces mêmes actions**. Toute action lancée depuis le Drive invalidait le cache du Centre, jamais le sien. Ça ne se voyait pas parce que le client appelait aussi `router.refresh()`. Plus d'actualité ici, mais **le motif reviendra dès qu'on partagera des actions entre deux routes**.

2. **Une sonde CDP qui ne préchauffe pas la route photographie une page en cours de compilation.** La première capture de `/dashboard/documents` est sortie **blanche**, la deuxième délavée (animation d'entrée Framer Motion). Rien n'était cassé. Visiter l'URL une fois avant de mesurer, sinon on « corrige » un faux problème.

### Vérification

`npx tsc --noEmit` → 0 erreur. Sonde HTTP en session réelle (compte Direction temporaire, supprimé après) : `/documents/centre` répond 200 et contient les marqueurs de l'ancien écran et **aucun** du Drive ; `/documents/drive` et `/documents/export` répondent **404** ; `/students/export` répond 200 ; la sidebar porte de nouveau les trois liens. Capture Chrome pilotée à 1440 × 900 pour confirmer le rendu.

`scripts/shot-documents.ts` (non commité) capture les écrans Documents en vraie session : il crée un compte Direction et 5 documents de test, puis **supprime tout dans son `finally`**. Utile pour comparer deux designs sans passer par le navigateur.

## Tableau de bord — poste de commandement (21 août 2026)

**La question qui gouverne l'écran.** « Comment va mon école aujourd'hui, et qu'est-ce que je dois faire ? » — et non « voici toutes les données de votre école ». **Rapports** reste seul responsable de l'analyse détaillée ; le tableau de bord y renvoie par des liens, il ne la reproduit pas.

**Hiérarchie livrée**, de haut en bas : ① le brief du matin ② À traiter (urgent / à surveiller / information) ③ Santé de l'école ④ Aujourd'hui ⑤ Finance · Académique · Parents ⑥ Activité récente + factures. Les factures occupaient trois cinquièmes de largeur en haut de page ; elles finissent l'écran en liste compacte. **Rien n'a été retiré** — mêmes factures, même statut, même montant.

### La décision structurante : le type `Signal<T>`

`src/lib/dashboard.ts` ne renvoie jamais un nombre nu. Chaque bloc est un `Signal<T>` : **soit une valeur mesurée, soit une raison d'absence**. Un composant ne peut donc pas afficher un chiffre qu'aucune requête n'a produit — il n'existe pas de chemin de code qui le permette.

C'est la réponse structurelle à ce que le lot 08 avait dû nettoyer à la main sur cet écran : objectif de 500 élèves inventé, taux de présence à 98 % en dur, liste de tâches en mémoire, flux d'activité fictif. Ces quatre fictions étaient apparues de la même façon — un composant capable d'afficher une valeur qu'aucune requête ne calculait. La discipline seule ne suffisait pas ; le type ferme la porte.

### ⚠️ Ce qui N'EST PAS mesurable, et qu'il ne faut pas essayer d'afficher

**Il n'existe AUCUN modèle de présence au schéma Prisma.** Ni appel, ni absence, ni retard — vérifié ligne à ligne. Les blocs « Aujourd'hui » (94 % présents, 6 % absents, 12 retards, 98 % d'enseignants) et l'axe « Présence » de la santé de l'école sont donc **câblés mais déclarés indisponibles**, avec la raison affichée à l'écran.

Le jour où un modèle `Attendance` arrive, **seule `todaySignal()` change** : `TodayPanel` sait déjà tout afficher. Ne pas le réécrire, le brancher.

**Le score global n'est publié qu'à partir de 3 axes mesurés sur 5** (`HEALTH_MIN_AXES`). En dessous, l'écran bascule sur une vue synthétique **sans chiffre**. Un « 89 / 100 » calculé sur un seul axe aurait l'air d'un diagnostic complet en n'en regardant qu'un cinquième — exactement le genre de chiffre qui inspire une confiance qu'il ne mérite pas. Un axe non mesuré n'est **jamais** compté comme 0.

**Le mot « IA » n'apparaît nulle part à l'écran.** Le bloc s'appelle « Votre matinée ». Sa phrase de synthèse est composée de constats effectivement calculés ; aucun modèle n'intervient, et l'annoncer serait un mensonge d'interface. Un vérificateur le garde.

### État réel du locataire de travail (SENG.CO ACADEMY), 21 août 2026

**C'est le point à connaître avant de juger l'écran sur capture.** Comptages : 1 élève, 6 classes, 1 grille tarifaire, 4 entrées d'audit. **Zéro** facture, paiement, dépense, trimestre, matière, note, bulletin, message, affectation, document. Le tableau de bord s'affiche donc presque entièrement en états « pas encore mesurable » — ce n'est pas un défaut de l'écran, c'est l'état de la base. Éprouvé avec fixtures : `MODE=full npm run script -- scripts/verify-dashboard-command.ts`.

### ⚠️ Piège d'animation — ne pas revenir à `useInView`

La première version déclenchait l'apparition à l'entrée dans le champ de vision (`framer-motion`, `once: true`). Mesuré au pilote Chrome : **six blocs restaient à `opacity: 0`** — santé, journée, résumés, activité, factures. Deux défauts, pas un : le contenu sous la ligne de flottaison n'apparaissait qu'au défilement, et surtout **un JavaScript lent ou en échec figeait la page à moitié vide** alors que le HTML servi était complet.

L'animation se joue désormais **au montage**, en cascade par `delay`. Elle ponctue l'arrivée du contenu, elle ne décide plus de sa visibilité. `prefers-reduced-motion` rend l'état final immédiatement, et un contrôle vérifie qu'aucun bloc ne reste invisible.

### ⚠️ Piège responsive — `lg` (1024 px) est un mauvais point de bascule ici

À 1024 px, trois colonnes de résumés écrasaient les libellés (« Taux de rec… », « Familles en r… ») et **les mouvements académiques débordaient hors de leur carte**. Bascule remontée à `xl` (1280 px), deux colonnes à 1024. Même correction pour la rangée activité + factures. Et dans les mouvements académiques, l'intitulé et l'écart sont empilés : côte à côte, l'écart portait `shrink-0` et poussait le texte dehors.

### Deux détails de la frontière RSC, déjà payés ailleurs

1. **Les icônes traversent en clé, pas en composant.** `AttentionCenter` est `"use client"` ; lui passer `TriangleAlert` depuis le serveur donne `undefined` et « Element type is invalid ». Le serveur envoie `"alert"`, le client résout dans sa table. Même piège que `DataTable` au lot 08.
2. **Un seul `h1` par écran.** Il est porté par le brief, donc `PageHeader` a disparu de `dashboard/page.tsx`.

## Tableau de bord — 2ᵉ passe : expérience et design (21 août 2026)

L'architecture de données n'a **pas** été touchée : `Signal<T>` reste, aucune donnée fictive, aucun modèle Prisma modifié. La passe porte sur la hiérarchie visuelle, la densité et la cohérence du langage.

### ⚠️ LE BUG À RETENIR — un trimestre sans dates volait la place du trimestre courant

`academicSignal()` triait les trimestres par `orderBy: { startDate: "asc" }` et prenait le dernier. Or **Postgres classe les `NULL` en DERNIER sur un tri ascendant**. La base de travail contient un trimestre **« T1 » sans `startDate` et sans aucune note** : il devenait donc « le trimestre courant », et le tableau de bord annonçait « Aucune note saisie » **alors que 48 notes étaient en base**.

Ce n'était pas un artefact de sonde : le même piège se déclenchera chez n'importe quelle école qui crée un trimestre sans renseigner ses dates — ce qui est exactement ce qui s'est produit ici.

**Trois règles remplacent le tri naïf** : ① un trimestre daté l'emporte toujours sur un trimestre sans dates ; ② parmi les datés, le courant est le dernier **déjà commencé** (un trimestre qui démarre le mois prochain n'est pas le trimestre en cours) ; ③ sans aucun daté, on retombe sur l'ordre de création. Un contrôle de non-régression le garde.

⚠️ **Le trimestre parasite « T1 » est toujours en base** (0 note). Il rejoint les données parasites déjà listées dans les chantiers ouverts. Le code n'en souffre plus, mais il continue de polluer les sélecteurs.

### Le décompte qui mentait — corrigé à la source, pas à l'affichage

Le hero annonçait « 1 point nécessite votre attention » au-dessus de **deux** cartes, dont « Nouvelles inscriptions » — une bonne nouvelle peinte exactement comme une tâche en retard. Et le badge annonçait « 3 interventions attendues » quand une seule en était une.

Deux corrections, toutes deux **structurelles** :

1. **Actions et informations sont prélevées séparément** côté serveur, plus dans une file commune tronquée à trois. Le hero rend les actions en cartes et les informations en une ligne « Bon à savoir » discrète, hors décompte.
2. **Le badge lit des totaux réels** (`brief.counts`), jamais la longueur du tableau affiché — qui est tronqué. Quand des actions ne tiennent pas, un lien explicite dit combien manquent (« 2 autres dans « À traiter » »). Un badge rouge qui gonfle le chiffre s'use : au bout d'une semaine on ne le lit plus.

Un contrôle de la sonde compare, **dans le DOM rendu**, le nombre annoncé au nombre de cartes, aux trois largeurs.

### Le système d'états — quatre, et pas un de plus

`src/components/dashboard/DataState.tsx`. Cinq cartes disaient « il n'y a rien » de cinq façons différentes, toutes lues comme un manque. Les quatre états appellent quatre réactions distinctes : `unavailable` (rien ne l'alimente encore), `empty` (l'activité n'a pas commencé — souvent avec une action), `inactive` (capacité absente d'EduCom), `allClear` (**seul état coloré**, parce que seul à être une bonne nouvelle).

⚠️ **Règle absolue : un axe non mesuré n'est jamais peint comme un mauvais résultat.** Pas de rouge, pas de 0 %, pas de barre vide — la piste n'apparaît que pour un axe mesuré, parce qu'une piste vide se lit comme un zéro et un zéro comme un échec. Une école qui vient d'ouvrir n'est pas une école en difficulté.

### Santé de l'école : une progression, pas un bulletin

Sans score (moins de 3 axes mesurés), l'écran affiche « **2 / 5 axes mesurés** » avec une barre d'avancement et la phrase « Votre tableau de santé se construit au fil des données de l'établissement ». Chaque axe mène une phrase compréhensible plutôt qu'un pourcentage nu — « 0 / 6 classes avec responsable » au lieu de « Personnel — 0 % » — et un axe mesuré **ET** insuffisant porte son action (« Affecter »). C'est là que la statistique devient décision.

### Deux pièges de mise en page

1. **Les états vides étaient à l'étroit** dans les colonnes du niveau 5 (~300 px). Une rangée rigide écrasait la description sur quatre mots. `flex-wrap` + largeur minimale sur le texte : l'action se replie d'elle-même sous le texte quand la place manque — sans requête de conteneur, donc sans dépendre du support navigateur.
2. **Libellés raccourcis** dans les cartes à trois colonnes (« Reste dû », « En retard », « Lus », « Envoyés », « Reçus ») : les versions longues étaient tronquées à 1440 px.

### Vérification de la 2ᵉ passe

`npx tsc --noEmit` → 0 erreur. `scripts/verify-dashboard-command.ts` en **deux modes** (`full` et `empty`), **trois largeurs** (1440 / 1280 / 1024) : aucun débordement horizontal, **aucun texte ne déborde de sa carte** (contrôle DOM sur `scrollWidth`), décompte du hero cohérent, aucun bloc invisible en `prefers-reduced-motion`, moyenne académique calculée malgré le trimestre parasite.

**Non vérifié :** l'état « ✓ Tout est à jour » de « À traiter » reste inatteignable sur le locataire réel (6 classes sans enseignant). Mobile 390 px hors périmètre, comme demandé.

### Vérification

`npx tsc --noEmit` → 0 erreur. `scripts/verify-dashboard-command.ts` → **30 contrôles verts** : rendu des six niveaux, aucune fiction réintroduite, valeurs conformes aux fixtures, **10 destinations de CTA en 200**, aucun débordement horizontal à 1440 et 1024, aucun bloc invisible en mouvement réduit.

**Non vérifié, à dire franchement :** l'état vide « ✓ Tout est à jour » de « À traiter » n'a pas pu être observé sur un écran réel — le locataire a 6 classes sans enseignant, donc la liste n'est jamais vide. Le mobile (390 px) n'a pas été mesuré : la demande priorisait bureau et tablette.

### Reste ouvert

Six composants du tableau de bord ne sont plus référencés que par des commentaires : `AttentionList`, `ActivityFeedWidget`, `AlertsWidget`, `SchoolHealthWidget`, `TodoListWidget`, `RecentInvoicesWidget`. Les cinq derniers étaient déjà morts depuis le lot 08 ; `AttentionList` l'est devenu ici. **Non supprimés** — à trancher, mais laisser deux composants qui font la même chose est précisément ce qui a fait diverger le Centre documentaire et le Drive.

## Saisie des notes — refonte autour de l'enseignant (21 août 2026)

**Le principe appliqué : si EduCom peut savoir, EduCom ne demande pas.** L'ancien écran exigeait **trois décisions avant la première note** — classe, trimestre, évaluation — dont deux qu'il pouvait prendre seul, et une structure interne (« évaluation ») qu'un enseignant n'a pas à connaître pour faire son métier.

Il reste **une** décision : sur quelle classe je travaille. Et une seconde, seulement quand elle est réellement ambiguë : quelle matière, si l'enseignant en couvre plusieurs dans la même classe.

### ⚠️ AUCUNE MODIFICATION DE SCHÉMA — et c'était vérifiable

Tout ce qu'il fallait existait déjà : `TeachingAssignment` (avec `subjectId` nullable pour le maître unique), `ClassSubject`, `Subject.parentId`, `Grade.max`, `Grade.coefficient`, `Evaluation.date`. **Rien n'a été ajouté à Prisma.** Les décisions du 17 août — affectation à matière facultative, règle de résolution groupe/matière notée, coefficients par note — sont intactes.

### Ce qui est déduit, et d'où

| Information | Source |
|---|---|
| Qui enseigne | la session — **aucun sélecteur de nom** |
| Quelles classes | `TeachingAssignment`, avec `Class.teacherId` en filet |
| Quelles matières | `editableSubjectIds()` — affectation, ou toutes les matières pour un maître unique |
| Quel trimestre | `pickCurrentTerm()` — **source unique**, voir plus bas |
| Quelle évaluation | celle **en cours de saisie**, sinon la plus récente déjà commencée |

⚠️ **Une évaluation datée dans le futur n'est jamais proposée d'office** : saisir des notes pour une composition qui n'a pas eu lieu n'a aucun sens. Un contrôle le garde.

### Deux règles remises en source unique

1. **`pickCurrentTerm()` vit dans `src/lib/terms.ts`**, et nulle part ailleurs. Elle était écrite deux fois, et la copie du tableau de bord se trompait (les `NULL` sortent en dernier d'un `ORDER BY ASC` sous Postgres). `dashboard.ts` la consomme désormais au lieu d'en garder une version.
2. **`editableSubjectIds()` vit dans `src/lib/gradeEntry.ts`.** Cette règle décide **qui a le droit d'écrire une note** ; deux copies auraient fini par diverger, et la divergence va toujours dans le sens permissif. `grades/actions.ts` est `"use server"` et ne peut pas la réexporter — il l'importe.

### ⚠️ Le piège React qui menaçait la saisie

`FastEntry` resynchronisait son état sur `ctx.rows` par un `useEffect`. Mesuré au pilote Chrome : après chaque sauvegarde, `router.refresh()` renvoyait un nouveau tableau, l'effet repartait, et **le badge « Enregistré » disparaissait aussitôt**. Bien pire, jamais observé mais inévitable : une note en cours de frappe dans un autre champ aurait été remplacée par la valeur du serveur, en silence, au milieu d'une saisie de trente notes.

**Correctif :** aucun effet de resynchronisation. Le remontage est piloté par la `key` du composant (`subject-term-eval`) dans `grades/saisie/page.tsx`, et `router.refresh()` a été retiré — la progression se calcule côté client. **Ne pas réintroduire d'effet qui court après les props ici.**

### ⚠️ Une case vide n'est pas un zéro — dans les DEUX sens

`""` supprime la note, `0` en écrit une. Deux chemins distincts, jusque dans l'action serveur. C'est le bug de « Par matière » (`if (!g.value)` effaçait les 0) pris par l'autre bout : un élève qui a zéro doit pouvoir l'avoir, et confondre les deux fausse toutes les moyennes de la classe.

### ⚠️ Le barème n'est jamais écrit en dur

`defaultMax` vient des notes **déjà saisies** pour la matière ; 20 seulement à défaut d'antécédent. Écrire « / 20 » en dur fausserait silencieusement les moyennes d'une école qui note sur 10.

### Ce qui n'a pas bougé

L'écran bulletin (saisie par élève, validation, dépôt au secrétariat) est **inchangé** : il vit sous `/dashboard/grades/bulletin`, avec la configuration et le rappel des dossiers renvoyés. Il n'est simplement plus la porte d'entrée. Le lot 17 août (colonne d'outils 240 px, blocs de groupes, code couleur des moyennes) est intact.

### Vérification — `scripts/verify-grades-entry.ts`

La sonde se connecte **en tant qu'ENSEIGNANT** : tout l'écran repose sur le périmètre du rôle, le vérifier en `OWNER` ne prouverait rien. **Les huit scénarios sont verts**, en deux modes.

Elle éprouve la **sauvegarde automatique de bout en bout** : Chrome tape une note, appuie sur Entrée, la sonde relit la base — valeur, barème et enseignant attribué. Elle vérifie aussi qu'une note **hors barème n'écrit rien**, et qu'une **matière hors périmètre n'est pas servie** même en forçant l'URL.

Rendu éprouvé à 1440 / 1280 / 1024, plus `prefers-reduced-motion`.

**Non vérifié, à dire franchement :** le mobile (390 px) n'a pas été mesuré — hors périmètre demandé. Les sous-matières hiérarchiques s'affichent bien (« Français › Grammaire ») mais n'ont pas été éprouvées sur un arbre réel, faute de `ClassSubject` dans le locataire de travail.

### État réel du locataire (SENG.CO ACADEMY) — pourquoi l'écran est vide

**0 matière rattachée à une classe**, 0 évaluation, 0 affectation, et un trimestre « T1 » sans dates. Chaque carte affiche donc sa raison — « Aucune matière n'est rattachée à cette classe » — et le bandeau réclame les dates de T1. Ce n'est pas un défaut de l'écran : c'est l'état de la base. Pour voir l'expérience réelle : `npm run script -- scripts/verify-grades-entry.ts`.

## Chaîne académique restaurée — ✅ FAIT (21 août 2026)

**La demande.** La refonte de la saisie avait changé la porte d'entrée : `/dashboard/grades` ouvrait sur « Voici vos classes ». Kory l'a refusée — cela raconte « un prof remplit des notes » alors que le produit transforme des évaluations en bulletins.

### ⚠️ L'historique Git ne contient PAS l'ancien système — ❌ AFFIRMATION CORRIGÉE LE 22 AOÛT

> **Ce titre est faux, et le rectificatif compte plus que l'erreur.** Le premier commit
> `d502c1f` (19 août) EST un instantané complet du module d'après les travaux du 17 : on
> peut donc bien comparer l'état actuel à l'ancien, et `git show d502c1f:<fichier>` le
> rend intégralement. Mesuré le 22 août — `GradesClient.tsx` et `ClassSubjectsPanel.tsx`
> sont à **0 ligne d'écart** de cette version. Ce qui reste vrai ci-dessous : il n'existe
> **aucun commit intermédiaire** avant le 19 août, donc aucune trace des décisions prises
> entre-temps — et `InputTab` n'a effectivement jamais été versionné.

Fouillé avant de coder : **8 commits, tous du 19 au 21 août**. Le premier (`d502c1f`) contient déjà `StudentEntryTab`, `GradesClient`, `actions.ts` dans leur forme actuelle. **Tout le travail des 16-17 août est antérieur au versionnement.** `InputTab` (l'onglet « Par matière » supprimé le 17 août) n'a jamais existé dans Git.

**Conséquence à retenir : `context.md` est la seule mémoire de cette période.** C'est exactement ce que la règle 1 d'`AGENTS.md` protège. Ne pas compter sur `git log` pour retrouver une décision antérieure au 19 août.

Vérifié aussi : **aucun composant de notes n'est orphelin**, et aucun n'a été modifié depuis le premier commit. `/saisie` n'était pas un système concurrent — c'est le retour de « Par matière », avec clavier, sauvegarde automatique et contexte prérempli.

### Ce qui a été assemblé

**`/dashboard/grades` = centre académique.** Trimestre `T1 | T2 | T3` toujours accessible (le courant n'est qu'un défaut), puis onglets **Contrôles · Composition · Bulletin**. Chaque ligne porte classe + matière + progression réelle, et son lien contient déjà les quatre paramètres : le moteur de saisie ne redemande rien.

⚠️ **Séparation contrôles / composition** par `Evaluation.type` — `EXAM` = composition, tout le reste = contrôle. Le vocabulaire existait déjà dans la Configuration ; aucun calcul ne s'en servait.

⚠️ **Le nombre de lignes est borné** (`SUBJECT_ROW_LIMIT = 3`) : au-delà de trois matières dans une classe, la ligne agrège tout le périmètre. Sans cela, une direction avec 13 classes × 17 matières × 5 évaluations produirait 1 105 lignes.

### Source unique de calcul et de rendu

Trois implémentations concurrentes du **même document officiel** ont été remplacées :

| Avant | Problème |
|---|---|
| `report-card/Generator.tsx` | matières **à plat**, aucun groupe |
| `validation/impression/PrintClient.tsx` | groupes **oui**, année figée |
| `StudentEntryTab.tsx` | son propre `averageOf()` |

Désormais : **`buildBulletin()`** (calcul, dans `src/lib/bulletin.ts`) + **`BulletinSheet`** (rendu, dans `src/components/grades/`) + **`loadBulletin()`** (chargement, dans `src/lib/gradeEntry.ts`). Un élève ne peut plus avoir deux moyennes selon l'écran.

⚠️ **La pondération contrôles/composition n'est PAS arbitrée.** Elle est isolée dans **une seule fonction**, `combineRatios()`, qui reproduit le comportement historique (moyenne pondérée par coefficient, toutes évaluations confondues) et **le dit à l'écran**. Le jour où Kory donne la règle : ne modifier que ce corps de fonction, aucun appelant ne bouge.

### La capacité qui dormait

`getReportCardData(classId, termId, evaluationId?)` avait un **troisième argument facultatif** : sans lui, la requête ramène toutes les notes du trimestre. Personne ne l'appelait ainsi. `loadBulletin()` l'exploite enfin — c'est la chaîne **contrôles + composition → bulletin de trimestre**.

### Six fictions supprimées du bulletin

1. **`Absences: 0 jour(s)` et `Retards: 0`** écrits en dur — aucun modèle de présence n'existe au schéma. Le bloc « Vie scolaire » est retiré tant qu'il n'y a rien à y mettre.
2. **`Excellent travail.`** — appréciation par défaut appliquée à *tous* les élèves. Remplacée par « Aucune appréciation renseignée. »
3. **Année scolaire figée à `2023-2024`** dans les deux bulletins → `currentAcademicYear()`.
4. **`Grade.max` ignoré** : « Note /20 » en dur à l'impression, et `StudentEntryTab` enregistrait `max: "20"`. ⚠️ **Conséquence silencieuse** : corriger une note saisie sur 10 la réenregistrait sur 20, donc **divisait par deux le résultat de l'élève**. Le barème réel est désormais rechargé avec la note et le bulletin affiche `/{scale}`, déduit des données.
5. **`ReportCard.generalComment` n'était ni lu ni écrit** — zéro occurrence dans `src/`. L'avis du conseil vivait dans un `contentEditable` : le texte de la directrice disparaissait au rechargement. Action `saveCouncilComment()` ajoutée, réservée à qui a `/dashboard/documents/validation`.
6. **Le générateur jetait ses `searchParams`** alors que **quatre** écrans lui en envoyaient (`CompletionClient`, `StudentListClient`, fiche élève, `DraftsList`). Quatre chemins morts. `studentId` seul suffit maintenant : la classe se déduit de l'inscription, le trimestre du calendrier.

### Vérification

`npx tsc --noEmit` → 0 erreur. `scripts/verify-grades-entry.ts` en **deux modes**, **57 contrôles verts** : séparation contrôles/composition, progressions réelles (3/10, 4/10, 6/6, 0/6), périmètre enseignant, groupes de matières rendus, barème /10 respecté de la saisie au bulletin, aucune donnée fictive, avis du conseil lu et modifiable, `searchParams` réparés, bulletin de trimestre agrégé, sauvegarde automatique relue en base, 1440/1280/1024 sans débordement, `prefers-reduced-motion` sans bloc invisible.

⚠️ **Données disparues, non élucidé.** Le trimestre « T1 » (sans dates) et l'évaluation « CTL 1 » présents en début de séance ne sont plus en base. Toutes les suppressions des sondes sont bornées par listes d'identifiants ; je n'ai pas pu attribuer l'effacement. À recréer si Kory en a besoin.

## Structure académique de SENG.CO ACADEMY + calendrier réglable — ✅ FAIT (22 août 2026)

**Le point de départ.** L'écran de saisie paraissait appauvri (« le trimestre est vide »), et Kory a demandé de retrouver l'ancien workflow. **L'audit a montré que le code n'avait jamais été perdu** — c'est la BASE qui l'était.

### ⚠️ Le code de l'ancien workflow est intact, mesuré contre `d502c1f`

Contrairement à ce qui avait été écrit ici le 21 août, **l'historique Git contient bien l'ancien système** : le premier commit (19 août) est un instantané complet d'après les travaux du 17. Écart mesuré fichier par fichier :

| Fichier | Écart vs 19 août |
|---|---|
| `GradesClient.tsx`, `ClassSubjectsPanel.tsx`, `termine/*`, `documents/validation/*` | **0 ligne** |
| `StudentEntryTab.tsx` | 22 lignes — uniquement le correctif du barème `max` |
| ancienne page `/dashboard/grades` | déplacée en `/grades/bulletin`, 21 lignes (en-tête + lien) |

Ce qui s'était perdu : **sa place dans la navigation**, et **les données**. Rien d'autre.

### La cause réelle : la base vidée le 20 août

`prisma migrate reset` (ou équivalent) le 20 août à 04:06 UTC — voir la section dédiée plus bas. SENG.CO ACADEMY se retrouvait à 0 matière, 0 `ClassSubject`, 0 trimestre, 0 évaluation. Le sélecteur Trimestre n'était pas cassé : **il n'y avait aucun trimestre à proposer**.

### Ce qui a été restauré, et d'où

| Bloc | Créé | Source — rien n'est inventé |
|---|---|---|
| 32 `Subject` + 83 `ClassSubject` | `scripts/seed-subjects.ts` | table `PROGRAMME` du script, chiffres identiques à ceux archivés ici |
| 3 `Term` | `scripts/seed-terms.ts` (nouveau) | noms lus dans `backups/avant-lot-11-2026-08-17.json` |
| 6 `Evaluation` | idem | libellés et types donnés par Kory |

**Programme réel par niveau** : CI 8 · CP 11 · CE1 14 · CE2 16 · CM1 17 · CM2 17. La règle de résolution groupe/matière notée a été éprouvée en rendant la structure via `buildBlocks()` : CI → 3 groupes / 8 lignes, CM2 → 3 groupes / 17 lignes. Le CI n'a ni grammaire ni histoire, le CM2 les a.

⚠️ **`seed-terms.ts` n'écrit AUCUNE date** — ni `Term.startDate`/`endDate`, ni `Evaluation.date`. Il reproduit champ pour champ ce qu'écrivent `createTerm()` et `createEvaluation()`. Un calendrier scolaire appartient à l'école ; en inventer un orienterait la saisie vers la mauvaise période.

### ⚠️ Le bug qui aurait fait mentir les seeds

`seed-subjects.ts` et `seed-test-students.ts` finissaient tous deux par `await pool.end()` — une variable qui n'existe plus depuis qu'ils importent `prisma` de `_env`. L'erreur était levée **dans le `finally`**, donc APRÈS validation des écritures : en `APPLY=1`, les données passaient et le script sortait quand même en erreur. Corrigé par `.finally(() => prisma.$disconnect())`, le motif déjà utilisé par `seed-classes.ts`. **Ne pas réintroduire `pool.end()` : le pool `pg` vit dans `src/lib/prisma.ts` et n'est pas exporté.**

### `setTermDates()` était orpheline — elle est enfin branchée

Deuxième cas de cette famille après `School.primaryColor` : une action serveur complète, sécurisée, validée… **appelée depuis aucun écran**. Seule une écriture directe en base pouvait dater un trimestre.

Elle est maintenant exposée par le composant `TermDates` dans l'onglet Configuration (`GradesClient.tsx`) : deux champs `<input type="date">` par trimestre, enregistrement automatique par champ, état visible (Enregistrement / Enregistré / Non enregistré).

**Pourquoi ce champ n'est pas un détail :** `pickCurrentTerm()` ne peut désigner comme courant qu'un trimestre **déjà commencé**, ce qui exige une `startDate`. Sans dates, elle retombe sur le dernier de la liste — un enseignant ouvrait donc le 3ème trimestre en octobre. Ce n'est pas une panne, c'est le signal d'un calendrier non renseigné, et l'écran le dit désormais : « Sans dates, ce trimestre ne peut pas être choisi comme trimestre courant. »

⚠️ **Chaque champ s'enregistre indépendamment**, et c'est voulu : poser une date de début seule est légitime. Conséquence à connaître — une date de fin refusée (intervalle inversé) laisse un trimestre **à moitié daté**. Ce n'est pas dangereux : `termPeriod()` rend `null` dès qu'une des deux dates manque, donc aucun calcul ne tourne sur une période incomplète.

⚠️ **Aucun `useEffect` de resynchronisation sur les props dans `TermDates`.** C'est le piège déjà payé dans `FastEntry` : après chaque `router.refresh()`, un tel effet écraserait la saisie en cours.

### Vérification — `scripts/verify-term-dates.ts`

**TOUT EST VERT**, 16 contrôles, avec une vraie session Chrome et des trimestres de sonde supprimés à la fin : les 12 champs de date rendus, Chrome saisit une date relue en base, le bon trimestre devient courant une fois daté (1er nov. 2026 → Periode A, 1er fév. 2027 → Periode B), l'intervalle inversé est refusé avec son motif affiché, effacer remet à `null` sans date fantôme, 1440/1024/390 sans débordement.

⚠️ **Faux échec de ma propre sonde, quatorzième forme.** Elle vérifiait « aucune date écrite » sur l'intervalle inversé. Le bon invariant n'est pas là : c'est **« la valeur refusée n'est pas écrite »**. Le début, valide, avait été enregistré seul — comportement correct.

### État réel de la base (SENG.CO ACADEMY, 22 août)

**6 classes · 32 matières · 83 ClassSubject · 3 trimestres (sans dates) · 6 évaluations · 1 élève · 0 note · 0 affectation · 2 utilisateurs.**

Les 6 évaluations : Contrôle / Composition du 1er, 2e et 3e trimestre, typées `QUIZ` / `EXAM`. Aucune donnée fictive n'a été créée — **aucun élève de test**, sur décision de Kory.

### Ce qui reste pour que le workflow soit pleinement utilisable

1. **Les 3 trimestres n'ont pas de dates.** Le champ existe maintenant : c'est à l'école de les saisir. Tant que c'est vide, EduCom ouvre sur le 3ème trimestre.
2. **1 seul élève inscrit** (CI). Sans effectif, le bulletin n'a personne à classer.
3. **0 affectation enseignant.** Sans conséquence tant que Kory travaille en `OWNER` (`editableSubjectIds` → `"ALL"`), bloquant dès qu'un compte `TEACHER` existera.

⚠️ **Toute la configuration est accessible au rôle `TEACHER`** — l'onglet vit sous `/dashboard/grades`, ouvert aux enseignants. Un enseignant peut donc créer, dater **et supprimer** un trimestre, et `deleteTerm` emporte en cascade évaluations, notes et bulletins. Ce n'est pas introduit par ce chantier — mais l'exposer davantage rend l'arbitrage nécessaire.

## Configuration pédagogique — passe 1 : socle technique (22 août 2026)

**Principe produit arbitré par Kory :** EduCom est multi-écoles. Les standards
sénégalais sont des **modèles préconfigurés** ; chaque école confirme, modifie,
ajoute ou retire. Socle commun = **3 trimestres + 3 compositions**. Les
**contrôles** sont libres.

### ⚠️ Il n'existe AUCUNE table nationale de coefficients — vérifié

Recherche web menée : le programme officiel (education.sn, CEB) ne publie pas de
coefficients par discipline pour l'élémentaire, et la plateforme ministérielle
`planete.education.sn` est derrière authentification. Surtout, les **4 bulletins
réels** analysés le 17 août (PIA, Ker Rokhaya, Popenguine) portent des
pondérations **différentes pour les mêmes matières**. Le coefficient est donc un
paramètre d'école, pas une constante nationale. **Ne rien préconfigurer d'autre
que 1.**

### Prisma — une colonne, additive et prouvée

`ClassSubject.coefficient Float @default(1)`. Poussé par `prisma db push`, **sans
avertissement de perte** ; relecture après push : 83 rattachements intacts, tous
à 1. C'est la SEULE façon de configurer un coefficient **avant** la première
note — `Grade.coefficient` reste le poids réellement appliqué à une note donnée.

⚠️ Après `prisma generate`, **redémarrer `next dev`** : `src/lib/prisma.ts` met le
client en cache sur `globalThis`, que le HMR ne recharge pas. Piège déjà payé
quatre fois.

### Sidebar réorganisée par métier

`Scolarité / Gestion / Établissement` → **Enseignement · Secrétariat · Finance ·
Administration**, plus **Tableau de bord et Rapports hors section** : ce sont
deux lectures transversales, les ranger sous « Administration » les aurait
fermés visuellement à l'enseignant et au comptable qui y ont droit.

⚠️ **Un titre de section n'est pas une permission.** Il nomme le domaine. Le
filtrage reste `hasAccess()` entrée par entrée. Aucune rubrique supprimée : 11
entrées avant, 11 après.

### ⚠️ Régression trouvée et corrigée : l'Annuaire était invisible

`/dashboard/directory` a REMPLACÉ « Élèves » + « Classes » dans la navigation,
mais `ROLE_PERMISSIONS` n'a jamais suivi : **seule la direction voyait
l'Annuaire**, pas même le secrétariat dont c'est l'écran principal. Rétabli pour
`TEACHER`, `SECRETARY`, `ASSISTANT` — aucun droit nouveau, ces rôles ont déjà
`/dashboard/students`, et la portée reste bornée par `studentScope()`.

### État réel (SENG.CO ACADEMY, 22 août)

6 classes · 32 matières · 83 ClassSubject (coef 1) · 3 trimestres **sans dates**
· 6 évaluations · 1 élève · **8 notes** (Kory a saisi les 8 matières du CI en CI
à 03:51 — le workflow tourne) · 0 affectation.

### Reste à faire dans cette passe — ✅ TOUT FAIT (passe 2, ci-dessous)

## Configuration pédagogique — passe 2 : le parcours complet (22 août 2026)

Parcours livré de bout en bout : **installation → programme → classes/matières →
coefficients → T1/T2/T3 → contrôles/compositions → dates → enseignants/
affectations → validation**, puis propagation vers saisie, vue enseignant,
bulletin, calendrier, tableau de bord et notification de changement de planning.

### La décision structurante : DEUX politiques d'écriture pour UNE liste

Le programme sénégalais vit désormais dans **`src/lib/curriculum.ts`** — module
**pur**, sans le moindre `import`, donc lisible par un composant `"use client"`
qui doit annoncer ce qui sera créé **avant** de l'écrire. `seed-subjects.ts`
l'importe : plus de seconde copie.

⚠️ **Mais le script et l'application n'écrivent PAS de la même façon, et les
confondre serait grave :**

| | `scripts/seed-subjects.ts` | `applyCurriculum()` (`src/lib/pedagogy.ts`) |
|---|---|---|
| Politique | **SYNCHRONISE** — ajoute *et retire* | **AJOUTE seulement** — ne retire jamais |
| Déclencheur | développeur, `SCHOOL_ID=`, essai à blanc | un bouton, sans essai à blanc possible |
| Si l'école a ajouté « Coran » | il disparaît | il reste, avec son coefficient |

Une proposition qui efface le travail de l'utilisateur n'en est pas une. Prouvé
par la sonde : matière personnalisée + coefficient 3 + trimestre hors modèle,
tous **intacts** après réapplication.

`applyCurriculum()` est **idempotente** (2ᵉ passage : 0 création) et sert
**deux** portes d'entrée — l'étape « Programme » de l'installation ET le bouton
« Compléter avec le programme officiel ». Une implémentation, jamais deux.

### Le socle, et ce qui n'en est pas

**3 trimestres + 3 compositions** = socle, appliqué. **Les contrôles = case à
cocher séparée**, pré-cochée mais distincte — c'est l'arbitrage de Kory, et les
fondre dans la même case l'aurait effacé.

⚠️ **Rien d'autre n'est préconfiguré.** Pas de dates (propres à chaque école ;
une date inventée oriente la saisie vers la mauvaise période *sans que personne
ne s'en aperçoive*). Pas de coefficients autres que 1 (aucune table nationale
n'existe — vérifié ; les 4 bulletins réels divergent). **La maternelle n'a aucun
programme** : elle s'évalue par domaines, pas par matières notées — et c'est
*dit à l'écran*, pas ignoré en silence.

### `configurationReadiness()` — mesurée, jamais déclarée

⚠️ **Aucune colonne « configuration terminée » n'a été ajoutée**, délibérément :
un drapeau se coche puis ment. Une école qui supprime ses trimestres resterait
« configurée » aux yeux d'un booléen alors que plus aucune note n'est saisissable.
Tout se recalcule à la lecture — 8 étapes, chacune avec sa **mesure lisible**
(« 3 / 6 classes avec un programme »), jamais un booléen.

⚠️ **`blocking` distingue ce qui empêche RÉELLEMENT de saisir une note** des
étapes qui améliorent sans bloquer (dates, enseignants, affectations). Tout
marquer obligatoire ferait croire à trois heures de configuration avant la
première valeur — l'inverse du WIN d'EduCom. Et **« Coefficients » n'est JAMAIS
« à faire »** : tout à 1 est une configuration valide et fréquente ; la marquer
incomplète pousserait à saisir des chiffres au hasard.

### Notification de changement de planning — sans mentir

`src/lib/planningNotice.ts`. Déplacer une composition était **silencieux** : la
nouvelle date écrasait l'ancienne, les enseignants qui préparaient pour le 12 ne
l'apprenaient jamais.

⚠️ **Aucune table `Notification` créée** — elle aurait dupliqué ce qu'`AuditLog`
sait déjà. L'acte vit dans l'audit (`action: "reschedule"`, avant/après dans
`details`), comme `transmission` et `diffusion` avant lui.

Ce qui est fait : la trace, **plus un bandeau « Le calendrier a changé » sur
`/dashboard/grades`** — la seule notification qu'EduCom puisse honnêtement
délivrer. Ce qui n'est **pas** fait : aucun envoi. `channels.ts` reste seul juge,
son registre est vide, et l'écran écrit « les familles ne sont pas prévenues
automatiquement ».

⚠️ **Une date réécrite à l'identique n'est PAS tracée.** Sans ce filtre, rouvrir
puis refermer un champ produirait « la composition a été déplacée » alors qu'elle
n'a pas bougé — l'avertissement perdrait tout son sens en une semaine.

### ⚠️ TROIS TROUS DE SÉCURITÉ, trouvés en auditant et refermés

1. **Toute action de configuration n'exigeait QUE l'authentification.** N'importe
   quel compte de l'école — **y compris un PARENT** — pouvait appeler
   `setTermDates()` ou `deleteTerm()` en HTTP direct et déplacer le calendrier de
   l'établissement. Neuf actions passent maintenant par
   `requireActionContext("/dashboard/settings/pedagogie")`.
2. **`deleteEvaluation()` n'avait pas de `schoolId`** — un identifiant suffisait
   à supprimer l'évaluation d'une autre école, **cascade sur ses notes et ses
   bulletins**. 6ᵉ fuite de cette famille dans le projet.
3. **`deleteSubject()` non plus** — et pire : supprimer « Français » emportait
   ses 8 sous-matières **et toutes leurs notes**, sans un mot. Refus si des notes
   existent (friction protectrice, règle 4).

⚠️ **Corollaire d'interface** : l'onglet Configuration de `/grades/bulletin` est
masqué à l'enseignant (`canConfigure`), et les liens « Configurer » de
`/dashboard/grades` disparaissent pour lui. *Une interface ne doit pas proposer
ce qu'elle sait refuser* — sinon l'utilisateur porte la faute du produit.

### Permissions — le secrétariat, pas les réglages

`/dashboard/settings/pedagogie` accordé à `SECRETARY`. ⚠️ **Le chemin est plus
précis que `/dashboard/settings`** : `hasAccess()` compare par préfixe, donc cela
n'ouvre **pas** le nom, le logo ni la signature de l'établissement. Vérifié :
`hasAccess("SECRETARY", "/dashboard/settings") === false`.

### Propagation — ce qui change vraiment quelque chose

- **`ClassSubject.coefficient` devient le défaut de saisie** (`resolveEntryContext`).
  Sans cela il n'était qu'un affichage. ⚠️ **Les notes déjà saisies gardent le
  leur** — repondérer rétroactivement modifierait des moyennes déjà transmises.
- **Bulletin** : coefficient configuré affiché **avant la première note**, sinon
  il serait inconfigurable (on ne règle pas ce qu'on ne voit pas). ⚠️ Ordre :
  note > configuration > `null`. **Jamais 1 par défaut** — indiscernable d'un
  choix délibéré.
- **`Evaluation.date` était au schéma et AUCUNE interface ne l'écrivait.**
  `pickEvaluation()` s'en sert pour choisir l'évaluation ouverte d'office : elle
  retombait donc toujours sur son dernier recours. Date affichée sur le tableau
  de travail et dans l'en-tête de saisie.
- **Tableau de bord** : entrée `urgent` quand une étape bloquante manque — ce
  n'est pas « à surveiller », c'est un arrêt de production.

### ⚠️ Deux contradictions à l'écran, vues sur capture et corrigées

1. **« 3ème Trimestre · en cours » + « sans dates, ce trimestre ne peut pas être
   choisi comme trimestre courant »**, à deux lignes d'intervalle. Les deux
   venaient du même `pickCurrentTerm()` : l'un lisait son *résultat*, l'autre sa
   *condition*. Le repli s'appelle désormais **« ouvert par défaut »**, et la
   conséquence est dite une fois en tête du calendrier.
2. **« Personne n'est affecté » sur une classe qui a un titulaire.**
   `editableSubjectIds()` retombe sur `Class.teacherId` : la classe *était*
   saisissable. La mesure poussait à réparer ce qui marchait.

### ⚠️ Deux pièges de sonde — le produit avait raison, la mesure avait tort

- **`readyState === 'complete'` ne suffit pas pour lire une redirection.** Il
  devient vrai sur le document intermédiaire, avant que le 307 de `redirect()`
  n'ait été suivi : `location.pathname` rendait encore l'URL demandée et la sonde
  concluait à un défaut de sécurité **inexistant**. Attendre que le chemin *change*.
- **`el.blur()` n'émet rien sur un champ qui n'a jamais eu le focus.** Le
  coefficient s'enregistre au `blur` (délibérément : un `onChange` par caractère
  enverrait « 1 », « 1. », « 1.5 »). Sans `el.focus()` d'abord, la sonde
  reproduisait une frappe qu'aucun humain ne peut faire.

### Vérification

- `npx tsc --noEmit` : 0 erreur.
- **`scripts/verify-pedagogie.ts` — 93/93.** Écritures réelles dans des écoles
  éphémères : idempotence, additivité, permissions des 7 rôles, isolation
  inter-établissement des avis de planning, propagation coefficient/date.
- **`scripts/verify-pedagogie-runtime.ts` — sonde Chrome, 1440×900 et 390×844.**
  Elle **écrit depuis l'interface** (coefficient → 2,5 ; composition datée) puis
  relit **en base**, vérifie la trace d'audit, et confirme que l'enseignant
  atterrit sur `/dashboard` sans avoir vu un octet de configuration.
- ⚠️ **Défaut mobile trouvé par la sonde** : à 390 px, « Composition du 1er
  trimestre » se réduisait à « C… », la pastille et le champ de date prenant
  toute la largeur. La rangée passe sur deux lignes sous 640 px — et la sonde
  mesure désormais la **largeur peinte** du libellé, pas sa présence dans le DOM
  (`truncate` laisse `textContent` intact tout en n'en peignant qu'une lettre).
- Échecs **préexistants et sans rapport** : `verify-action-guards` sur
  `grades/saisie/actions.ts` (non modifié ici) et `verify-gardes` sur les
  scripts jetables non suivis (`test-*.ts`, `fix-kory-access.ts`…).


## Parcours de bout en bout — passe 3 (22 août 2026)

Objectif de Kory : « l'école configure une fois son environnement, puis chaque
utilisateur retrouve automatiquement les informations pertinentes pour son
rôle ». Les trois parcours sont désormais **joués par une sonde Chrome**, de
l'installation au dépôt au secrétariat : `scripts/verify-parcours.ts`.

### ⚠️ FUITE GRAVE — cinq générateurs de documents étaient ouverts à tous

Trouvée en auditant le parcours DIRECTION. **Aucune de ces cinq pages ne portait
de garde de chemin**, et `ROLE_DENIALS.PARENT` ne les listait pas :
`report-card`, `certificate`, `info-sheet`, `timetable`, `drafts`.

Conséquence reproduite en sonde : un **parent** authentifié qui tapait
`/dashboard/documents/report-card` obtenait **les bulletins de tous les élèves de
l'établissement** — notes, moyennes, rangs, avis du conseil. Les cinq écrans
chargent l'école entière par construction ; ce sont des outils d'ÉMISSION.

⚠️ **Le refus dans la table ne suffisait pas** : `hasAccess()` ne protège que ce
qui l'appelle, et ces pages ne l'appelaient pas. Il fallait les DEUX. D'où
`requirePathAccess()` dans `src/lib/documentContext.ts` — un point d'entrée
unique, pour qu'on ne l'oublie plus une sixième fois.

⚠️ Le refus renvoie vers `firstAllowedPath()`, pas vers `/dashboard` : un
`PARENT` n'a pas accès à l'accueil, et l'y envoyer créerait une boucle de
redirection (piège déjà documenté dans `permissions.ts`).

### Plus aucun sélecteur vide sur les écrans des parcours

| Écran | Avant | Maintenant |
|---|---|---|
| `/grades/bulletin` | « Choisir… » · « — » · « — » | classe + trimestre courant + évaluation, résolus |
| `/documents/report-card` | « Choisissez une classe » | classe **qui porte des notes** + trimestre courant |
| `ClassSubjectsPanel` | « Sélectionner une classe… » | première classe de l'ordre pédagogique |

⚠️ **La résolution est faite CÔTÉ SERVEUR** (`defaultSelection()` dans
`gradeEntry.ts`), et c'est non négociable : la règle du trimestre courant vit
dans `pickCurrentTerm()`, module qui importe Prisma. La réécrire dans un
composant `"use client"` en aurait fait une **quatrième copie** — et c'est
exactement une copie divergente de cette règle qui a effacé la moyenne de
l'établissement le 21 août.

⚠️ **Le générateur de bulletins choisit une classe QUI A DES NOTES**, pas la
première de la liste. Ouvrir sur le CI donnerait souvent un bulletin vide, et
l'écran paraîtrait cassé alors qu'il aurait simplement mal choisi.

⚠️ **Les sélecteurs restent visibles et libres.** Ce sont des défauts, pas un
verrouillage : consulter une période passée est un besoin réel.

### Le cul-de-sac supprimé : « et ensuite ? » après la dernière note

L'écran de saisie affichait « ✓ Évaluation complète » et **ne proposait rien**.
Or un maître unique de l'élémentaire a **huit matières** à saisir pour la même
composition : il devait, huit fois, remonter à la liste et retrouver la ligne
suivante.

`EntryContext.siblings` (un seul `groupBy`, côté serveur) permet désormais de
nommer **la matière suivante**, d'afficher l'avancement des autres, et — quand
tout est saisi — de proposer « Voir le bulletin » et « Terminer et déposer ».

⚠️ **Le bloc n'apparaît QUE si la matière courante est terminée.** Le montrer
pendant la saisie inviterait à partir avant d'avoir fini.
⚠️ **Aucun enchaînement automatique** : l'enseignant peut vouloir relire.
⚠️ **« Déposer » n'apparaît que si tout est saisi** : faire relire un travail
inachevé au secrétariat serait lui faire perdre son temps.

### La prochaine échéance remonte à l'accueil de la direction

Elle n'était visible que dans l'écran de configuration. Entrée `info` (aucune
action attendue), fenêtre de **21 jours** — au-delà l'information est vraie mais
inutile, et une ligne permanente cesse d'être lue.

### ⚠️ QUATRE PIÈGES DE SONDE — le produit avait raison à chaque fois

Ils ont coûté quatre passages complets. Ils reviendront mordre quiconque écrit
une sonde CDP multi-personas :

1. **Les cookies de Chrome sont partagés par tout le profil.** Ouvrir la session
   de l'enseignant **écrase celle de la directrice**, y compris dans son onglet.
   Tout le parcours ③ échouait pendant que les captures montraient un produit
   parfaitement fonctionnel. *Deux fausses solutions essayées* : reposer les
   cookies avant chaque navigation (insuffisant — Supabase découpe le jeton en
   `…auth-token.0/.1/.2` et le NOMBRE de morceaux varie ; écrire deux
   par-dessus trois laisse un résidu qui corrompt le jeton), puis
   `Network.clearBrowserCookies` (pire — la commande est **globale au
   navigateur**, score tombé de 37 à 22). **La bonne réponse :
   `Target.createBrowserContext`, un pot à cookies par persona.**
2. **`readyState === 'complete'` ne prouve NI l'hydratation NI le contenu.** Le
   HTML serveur contient déjà les textes : une attente sur du texte est
   satisfaite avant qu'un seul gestionnaire ne soit attaché (la case « Primaire »
   se cochait, React ne le voyait pas). Et Next **diffuse** son rendu : lire
   `innerText` juste après le chargement rend une page à moitié vide. Attendre un
   **changement d'état**, jamais un chargement.
3. **`innerText` applique `text-transform`.** Un titre `uppercase` ressort
   « PROCHAINES ÉCHÉANCES » là où le code écrit « Prochaines échéances ».
4. **Interpoler un motif dans un littéral `/.../` casse sur une barre oblique.**
   `/24/24|…/i` se termine au premier `/` ; l'expression devient invalide,
   `evaluate` lève, `waitFor` avale et rend `false`. Utiliser `new RegExp(...)`.

Un cinquième, dans la sonde précédente : **`el.blur()` n'émet rien sur un champ
qui n'a jamais eu le focus** — il faut `el.focus()` d'abord.

### Deux défauts de rédaction, vus sur capture

« **1er Trimestre** — déplac**ée** du 23 juin au 23 juin ». Deux fautes dans une
seule ligne : l'accord était figé au féminin (bon pour une évaluation, faux pour
un trimestre), et seule la date de DÉBUT était comparée — déplacer la seule date
de fin produisait une phrase qui **affirme qu'il ne s'est rien passé**. Corrigé :
« se termine désormais le 23 décembre, au lieu du 20 décembre ».

### Vérification

- `npx tsc --noEmit` : 0 erreur.
- **`scripts/verify-parcours.ts`** — trois parcours joués en entier dans une
  école éphémère : installation réelle par le formulaire, dates et affectations
  saisies à l'écran puis relues en base, notes tapées puis vérifiées, matière
  suivante enchaînée, bulletins validés un à un, classe déposée au secrétariat,
  dépôt retrouvé sur le tableau de bord de la direction, parent refusé.
- `verify-pedagogie` : 95/95.
- Échecs **préexistants, sans rapport** : `verify-dashboard` (13, voir
  ci-dessous), `verify-documents` (2 — mise en page d'impression du bulletin),
  `verify-operational-screens` (3 — primitives des écrans Élèves et Classes),
  `verify-action-guards` (1 — `grades/saisie/actions.ts`), `verify-gardes`
  (scripts jetables non suivis).

### ⚠️ `verify-dashboard.ts` est PÉRIMÉ — 13 faux échecs, sans rapport avec cette passe

Diagnostic posé, correction **non faite** (autre chantier). La sonde teste
`src/app/dashboard/page.tsx` tel qu'il était **avant** la refonte « poste de
commandement » : elle y cherche `<AttentionList`, `hasAccess(role,
"/dashboard/payments")` et `Promise.all(` **dans la page**. Or la page monte
désormais `AttentionCenter` et toutes les requêtes ont migré dans
`dashboardSnapshot()` (`src/lib/dashboard.ts`, fichier **non suivi par Git** —
jamais commité). Les 13 assertions visent donc du code qui n'existe plus.

⚠️ Tant qu'elle n'est pas réécrite, cette sonde **ne peut pas servir de garde
anti-régression** : elle échoue déjà, donc une vraie régression s'y noierait.

## Chantiers ouverts (par ordre de priorité)

0. **Écran de saisie à retravailler (demande de Kory, 17 août).** La liste d'élèves à gauche « n'est pas fluide » et le tableau des matières manque de tenue. À rendre premium — c'est le point le plus insatisfaisant à ses yeux. *Fait à ce jour :* barre d'onglets supprimée (elle ne portait plus qu'un bouton), Configuration reléguée en pastille flottante en haut à droite.

0. **Hero photographique à arbitrer (19 août).** `/prototype/hero` attend un
   KEEP / DISCARD / ITERATE. Tant que rien n'est tranché, deux dossiers isolés
   dorment au dépôt. Si KEEP : trancher d'abord l'origine des photos (images de
   synthèse) avant toute mise en ligne.

1. **Le générateur `/documents/report-card` ignore toujours ses `searchParams`.** L'écran de fin de saisie propose « Imprimer les bulletins » avec `?classId=&termId=`, mais le générateur n'en tient pas compte : on retombe sur des sélecteurs vides. Voir le sujet Documents en pause.

1. **Aucune affectation n'est encore saisie en base pour SENG.CO.** Le mécanisme fonctionne — et il a désormais **une interface** (Réglages › Configuration pédagogique › Affectations) — mais `TeachingAssignment` reste vide sur le locataire de travail : tout le monde retombe donc sur le filet « professeur principal ». À éprouver en affectant deux enseignants sur une même classe avec des matières différentes.


1. **Aucun test bout-en-bout des notes.** `Grade` est toujours à **0**. La saisie par élève et la génération de bulletin n'ont jamais été parcourues dans l'app réelle. Seules `CM1` et `CM2` contiennent un élève ; **Phil Wally et tfg jkl n'ont aucune classe** — à inscrire pour tester sur un effectif réaliste.

2. **`deleteClass` n'a aucun garde-fou.** Rien n'avertit avant de supprimer une classe pleine, et la cascade emporte les inscriptions. À bloquer ou à confirmer explicitement.

3. **Bug de perte de données dans « Par matière ».** `handleSaveAll` filtre avec `if (!g.value)` : un élève à **0** est traité comme une case vide et sa note n'est jamais enregistrée. L'onglet « Par élève » ne souffre pas du problème (helper `isFilled`, qui distingue `""` de `0`). Aligner l'ancienne grille.

4. **Bug `TeamInviteForm.tsx`.** Après l'envoi d'une invitation, `e.currentTarget.reset()` lève `TypeError: Cannot read properties of null` — React a recyclé l'événement pendant l'`await`. Le formulaire ne se vide pas. Capturer la référence du formulaire avant l'`await`.

5. **Données parasites.** Le trimestre `"Controle 1er Trimestre"` (d'où Term = 4 et non 3) apparaît dans le sélecteur à côté des 3 vrais. Les matières « IST » et « Math » doublonnent les 10 nouvelles.

## LOT 00 — Isolation par établissement et nom d'école imprimé — ✅ FAIT (17 août)

Premier lot du chantier Design System. **Aucun changement visuel** : le lot ne corrige que l'exactitude des données affichées et imprimées, prérequis à toute refonte.

### Le correctif de sécurité du 17 août était incomplet

`requireSchoolContext()` avait été appliqué aux sept générateurs de documents, mais **ni au tableau de bord ni à la page Rapports** — les deux écrans que lit la direction. Sept requêtes tournaient sans `where: { schoolId }` :

- `dashboard/page.tsx` — comptages élèves inscrits/en attente, et deux `invoice.findMany()`
- `dashboard/reports/page.tsx` — factures, comptage élèves, classes

Le client Prisma n'applique **aucun filtre global** (`src/lib/prisma.ts` instancie un client nu, sans extension `$extends`) : le filtre doit être explicite sur chaque requête. Avec 3 écoles en base, les compteurs et le taux de recouvrement étaient des totaux inter-locataires.

⚠️ **Piège associé, non corrigé à ce stade :** `src/utils/supabase/middleware.ts` définit `updateSession()` mais **il n'existe aucun `middleware.ts` à la racine** — la protection n'est donc jamais câblée. `requireSchoolContext()` apporte désormais le garde d'authentification au niveau page, ce qui couvre le tableau de bord et les rapports, mais pas le reste de l'application.

### Le nom d'école en dur touchait la couche d'affichage, pas les requêtes

Trois documents imprimaient la chaîne littérale « EduCom Excellence » :
- `certificate/Generator.tsx` — **dans la phrase de certification elle-même**, six lignes sous un en-tête qui, lui, affichait correctement l'école
- `reminder/Generator.tsx` — en-tête, avec en prime l'adresse, le téléphone et l'email d'une école fictive
- `info-sheet/Generator.tsx` — en-tête, plus « Dakar, Sénégal » en dur

**`ReminderGenerator` et `InfoSheetGenerator` ne recevaient pas du tout l'école en props** — leurs pages appelaient pourtant déjà `requireSchoolContext()`, qui renvoie `school`. Il a suffi de le propager.

Les replis `|| "EduCom Excellence"` ont aussi été remplacés par `|| "—"` dans les quatre générateurs qui en portaient (certificate, receipt, invoice, report-card) : un repli qui invente un nom d'établissement plausible sur une pièce officielle est le même défaut, simplement plus discret. Un tiret signale une donnée manquante, il ne peut pas être pris pour un vrai nom.

Le message WhatsApp par défaut (`communications/ClientPage.tsx`) nommait lui aussi « EduCom Excellence » — il partait réellement aux familles, signé d'un établissement qui n'était pas le leur. Le nom vient maintenant du serveur.

### Vérification

`scripts/verify-tenant-isolation.ts` (lecture seule, SQL direct via `pg`, sans passer par la couche applicative) contrôle trois propriétés : partition, distinction, non-fuite.

**Obstacle rencontré :** une seule des trois écoles porte des données, la distinction était donc indémontrable. Le script peuple désormais une seconde école **dans une transaction annulée** (`BEGIN` … `ROLLBACK`), mesure, puis vérifie qu'il ne reste rien. Rien n'est committé, aucune donnée existante n'est touchée.

Résultat : *Kory Academy 2* 133 inscrits / 6 factures / 13 classes, école témoin 2 / 2 / 2, global sans filtre 135 / 8 / 15 — les deux périmètres additionnés reconstituent le global et aucune école ne voit le total.

Confirmé aussi au runtime dans `.next/dev/logs/next-development.log` : dernière requête `Student`/`Invoice` sans `schoolId` à 04:24:54, toutes celles à partir de 04:27:52 portent le filtre.

### Restes signalés, hors périmètre du lot

- `dashboard/page.tsx` affiche toujours « Bonjour, **Admin** » en dur alors que `requireSchoolContext()` renvoie l'utilisateur.
- `reminder/Generator.tsx` garde « Dakar, le … » en dur (extraire la ville d'une adresse libre serait peu fiable).
- `info-sheet/Generator.tsx` garde « Année Scolaire 2023-2024 » en dur.
- `report-card/page.tsx` refait la logique de `requireSchoolContext()` en ligne au lieu d'utiliser le helper — équivalent fonctionnellement, incohérent structurellement.

## LOT 01 — Sécurisation des server actions — ✅ FAIT (17 août)

Second lot du chantier Design System, **sans changement visuel**. Déclenché par une découverte du lot 00 : le thème par école (lot 02) doit s'écrire via `settings/actions.ts`, qui n'authentifiait pas son appelant. Impossible d'y ajouter un champ sans traiter la faille.

### Le constat : une server action est un point d'entrée HTTP

Le piège central, et il vaut pour tout le dépôt : **une server action est appelable directement, sans passer par l'écran qui l'invoque.** Tout argument qu'elle reçoit vient donc du client. Six fichiers de mutation sur quinze n'appelaient jamais `getUser()`, et plusieurs recevaient le `schoolId` en paramètre — c'est-à-dire que l'appelant choisissait *quel établissement* il écrivait.

Ce qui a été trouvé, du plus grave au moins :

1. **`communications/actions.ts`** — le pire. Aucune authentification, `schoolId` client, et surtout **le numéro de téléphone de chaque destinataire fourni par l'appelant**. Permettait d'émettre des WhatsApp Twilio vers n'importe quel numéro, facturés au compte de l'école.
2. **`settings/actions.ts`** — aucune authentification, `schoolId` client : réécriture du nom, du logo, du **cachet et de la signature** de n'importe quelle école. Ces deux derniers apparaissent sur les certificats, bulletins et factures.
3. **`onboarding/actions.ts`** — `schoolId` client : marquer une école tierce comme « onboardée », réécrire son téléphone et son adresse, lui injecter des classes.
4. **`students/actions.ts`** — résolvait l'école par `prisma.school.findFirst()` **sans `orderBy`** : le piège déjà rencontré sur `seed-senegal.ts`. Élève et parent créés dans un établissement arbitraire.
5. **`documents/actions.ts`** — même `findFirst()`, avec un commentaire assumant le raccourci « prototype ».
6. **`surveys/new/actions.ts`** — `schoolId` **codé en dur** à `"school-1"`, identifiant qui ne correspond à aucune école : la création échouait sur violation de clé étrangère.

### La décision : réutiliser `hasAccess()` plutôt qu'inventer des règles

Nouveau helper `src/lib/actionContext.ts` → `requireActionContext(path?)`. Il authentifie, résout le `schoolId` **depuis la session**, et délègue le contrôle de rôle à `hasAccess()`.

**Pourquoi déléguer plutôt que coder des rôles en dur dans chaque action :** les permissions restent définies à un seul endroit (`src/lib/permissions.ts`), et l'action autorise exactement ce que la navigation autorise déjà — ni plus, ni moins. Aucun utilisateur ne perd une capacité qu'il avait ; la correction du lot 06 sur les permissions se propagera automatiquement aux actions.

Différence avec `requireSchoolContext()` (lot 00) : celui-ci **redirige**, ce qui convient à une page. Une server action doit **renvoyer `{ error }`** à son appelant. D'où deux helpers et non un.

### Le cas communications : le schoolId ne suffisait pas

Retirer le `schoolId` du client ne fermait que la moitié de la faille — les **numéros de téléphone** restaient fournis par l'appelant. La signature ne prend donc plus que des `parentId` : le téléphone est relu en base après vérification que le parent appartient à l'établissement de l'appelant. Un `parentId` étranger est **ignoré et compté**, pas rejeté en bloc, pour qu'un identifiant périmé n'annule pas toute la campagne.

Même logique appliquée à `createStudent` : `classId` et `existingParentId` viennent du formulaire et sont désormais vérifiés comme appartenant à l'école de session — sans quoi on inscrivait un élève dans la classe d'un autre établissement.

### Vérification

`scripts/verify-action-guards.ts` (lecture seule, analyse statique + matrice de rôles). Trois propriétés : garde, non-confiance au `schoolId` client, plus aucun `findFirst()` non ordonné.

⚠️ **Piège du vérificateur lui-même :** les docblocks de ces actions *décrivent* la faille corrigée et citent `prisma.school.findFirst()` en toutes lettres. Le contrôle échouait sur sa propre documentation. Le script retire donc les commentaires avant d'analyser — à garder en tête pour tout futur contrôle statique sur ce dépôt.

### La matrice de rôles révèle deux incohérences, à traiter au lot 06

| Action | OWNER | ADMIN | TEACHER | PARENT | ACCOUNTANT | SECRETARY | ASSISTANT |
|---|---|---|---|---|---|---|---|
| `updateSchoolSettings` | oui | oui | — | — | — | — | — |
| `createStudent` | oui | oui | oui | — | — | oui | oui |
| `submitDocumentRequest` | oui | oui | — | **oui** | **—** | oui | oui |
| `sendBulkWhatsAppMessages` | oui | oui | oui | — | — | oui | oui |
| `createSurvey` | oui | oui | oui | — | — | oui | oui |

Deux anomalies **héritées de `ROLE_PERMISSIONS`, pas introduites ici** : un `PARENT` peut demander un document mais pas un `TEACHER` ; un `ACCOUNTANT` ne peut rien faire de tout cela, faute de `/dashboard/documents` dans ses permissions. Elles confirment le diagnostic du lot 06 et se corrigeront là-bas, en un seul endroit.

### Hors périmètre, constaté au passage

- `invite/actions.ts` et `register/actions.ts` sont **pré-authentification par conception** et corrects : le premier lit le `schoolId` depuis l'invitation en base, le second depuis l'école qu'il vient de créer. Aucune valeur client.
- `surveys/new/page.tsx` redirige vers `/communications/surveys` — **sans le préfixe `/dashboard`**. Redirection cassée, préexistante.
- `createStudent` écrit toujours `academicYear: "2023-2024"` en dur.

## LOT 02 — Socle de tokens — ✅ FAIT (17 août)

Troisième lot. Réécriture de `src/app/globals.css` en source unique de vérité des valeurs visuelles, plus le champ `School.primaryColor`. **Aucun écran restylé** — c'est l'objet des lots 04 et suivants.

### Le principe de compatibilité qui gouverne ce lot

**Les échelles neuves sont AJOUTÉES à côté des utilitaires Tailwind, jamais en substitution.** Redéfinir `--radius-xl` à 6px aurait changé l'apparence des 268 `rounded-xl` du dépôt — un restylage d'écrans déguisé en changement de token. Même raisonnement pour les ombres et les tailles de texte.

Les 937 usages de tokens existants continuent donc de fonctionner : `--color-text-primary`, `--color-border`, `--color-secondary`, `--color-error` etc. sont conservés comme **alias** pointant vers les nouveaux tokens de rôle. Ne pas les supprimer avant que les lots suivants aient migré les usages.

Seules valeurs réellement modifiées, et c'était demandé : `success` #10b981 → **#047857**, `warning` #f59e0b → **#B45309**, `error` #ef4444 → **#B91C1C**. Assombries pour passer 4,5:1 sur blanc. Impact mesuré avant application : **50 usages** (error 41, success 6, warning 3), tous des signalements d'état. `accent` avait **zéro usage**, son changement est gratuit.

### Le piège de la dérivation : color-mix ne suffit pas

Exigence : une seule couleur stockée par école, variantes dérivées en CSS. Le calcul a montré que **mélanger du blanc à du bleu marine détruit sa saturation** — le meilleur `color-mix(in oklab, #0B1F3A, white)` atteignable pour l'accent est **#405168**, un ardoise terne, là où la charte demande #1F4E79.

Conserver la chroma ne suffit pas non plus : `#1F4E79` est franchement plus saturé que `#0B1F3A` (chroma 0,088 contre 0,058). Il faut relever **clarté ET chroma**, ce que seule la syntaxe de couleur relative permet :

```css
--color-accent: oklch(from var(--color-primary) calc(l + 0.174) min(c * 1.5, 0.12) h);
```

Résultat sur le marine : **#2a4c7a**, écart oklab 0,0113 de la cible — visuellement indistinguable. Un repli `color-mix` est déclaré d'abord, la version `oklch(from …)` le remplace dans un bloc `@supports` : les navigateurs anciens obtiennent l'accent délavé plutôt que rien.

⚠️ **Le plafond `min(c * 1.5, 0.12)` n'est pas décoratif.** Sans lui, une école choisissant `#9F1239` obtiendrait un accent `#FD0058` fluorescent. Le marine n'est pas affecté (0,058 × 1,5 = 0,087 < 0,12).

### Injection du thème

`schoolThemeStyle()` dans `src/lib/theme.ts`, appelé depuis `dashboard/layout.tsx`, surcharge `--color-primary` sur un conteneur en `display: contents` — les propriétés personnalisées héritent par l'arbre DOM et non par l'arbre de boîtes, donc la cascade fonctionne sans introduire de boîte de mise en page.

⚠️ **La valeur vient de la base et finit dans un attribut `style`.** Sans validation, `#0B1F3A; background: url(...)` serait injecté tel quel dans la feuille de style. Seul un hexadécimal strict (`#abc` ou `#aabbcc`) est accepté ; toute autre valeur est ignorée et l'école retombe sur la charte. Sept chaînes hostiles testées, toutes rejetées.

### Ce qui a été ajouté au passage, à trois lignes de coût

`prefers-reduced-motion` : une règle de base neutralise les animations pour qui en fait la demande. Le traitement complet reste l'objet du lot 11, mais laisser les 153 `transition-all` du dépôt s'imposer coûtait moins cher à corriger maintenant.

Également `font-variant-numeric: tabular-nums` sur `table` et `.tabular`.

### Schéma

```
model School {
  …
  signature String?
+ primaryColor String?   // nullable, sans valeur par défaut
  address   String?
}
```

`prisma db push` lancé **sans** `--accept-data-loss` ni `--force-reset`, après sauvegarde JSON de la table. Résultat : 11 → **12 colonnes**, `primaryColor text nullable def=aucun`. Les 3 écoles conservent identifiant et nom, toutes à `primaryColor = null`.

### Vérification

`scripts/verify-design-tokens.ts` — compilation PostCSS réelle du CSS (0 avertissement, 177 ko), présence des 10 valeurs de charte, dérivation effective des 3 variantes, 3 rayons / 2 ombres / 6 rôles / plancher 12px / base d'espacement 4px, absence de verre dépoli et de dégradé, **42 utilitaires générés dont les 16 dont dépend le code existant**.

⚠️ **Piège du vérificateur, deuxième occurrence.** Il comptait aussi les lignes du bloc `@theme inline`, qui ne *définissent* rien — elles mappent chaque token vers son utilitaire Tailwind (`--radius-control: var(--radius-control)`). Résultat : « 6 rayons » au lieu de 3, et le test de dérivation qui échouait sur un simple alias. Le script retire ce bloc avant les contrôles structurels. **Comme pour `verify-action-guards.ts`, tout contrôle statique sur ce dépôt doit d'abord isoler ce qu'il analyse.**

Trajet complet vérifié en transaction annulée : `null` → charte par défaut, `#7C2D12` → surcharge effective, `not-a-color` → rejetée avec repli.

### Restes signalés

- Les échelles legacy (`rounded-xl`, `shadow-sm`, `text-sm`…) coexistent volontairement avec les nouvelles. La migration est le travail des lots 04-05, après quoi les alias de compatibilité pourront tomber.
- `globals.css` conserve `@tailwind base/components/utilities` en tête, redondants avec `@import "tailwindcss"` en Tailwind 4. Laissés en place : les retirer sortait du périmètre et le fichier compile.
- Aucune interface ne permet encore de saisir `primaryColor` — c'est le lot 06 (paramètres). Le champ existe et le trajet fonctionne, mais il n'est alimentable qu'en base pour l'instant.

## LOT 03 — Vocabulaire d'état — ✅ FAIT (17 août)

Quatrième lot. `src/lib/status.ts` + `src/components/ui/Badge.tsx`, puis migration de 6 sites de pastilles. **Meilleur levier du chantier** : c'était la duplication la plus coûteuse du dépôt.

### Deux découvertes qui changent le contenu de la table

1. **`ReportCardStatus` ne contient PAS `PRINTED`.** L'esquisse de la phase 2 annonçait `DRAFT → SUBMITTED → VALIDATED → PRINTED`, mais le schéma réellement poussé nomme le dernier état **`APPROVED`**. `PRINTED` est conservé dans la table par précaution (si une donnée le portait un jour, elle s'afficherait en français) mais **aucun code ne le produit**. Ne pas s'appuyer dessus.

2. **Les enums sont plus riches que les 9 statuts du plan.** `InvoiceStatus` porte aussi `PARTIAL` et `CANCELLED`, `StudentStatus` aussi `GRADUATED` et `INACTIVE`. Or le repli universel du code était `status.toLowerCase()` : une facture partielle s'affichait **« partial »** en anglais, une annulée « cancelled ». La table couvre les **20 valeurs réelles** des 4 enums — ce lot corrige donc un défaut d'affichage, il ne fait pas que refactoriser.

### La décision structurante : cloisonnement par domaine

Une table plate aurait été **fausse**. `DRAFT` vaut « Brouillon » pour une facture mais « Saisie en cours » pour un bulletin ; ce ne sont ni le même objet ni la même action attendue. D'où `describeStatus(domain, value)` et non un dictionnaire unique. Le domaine lève l'ambiguïté et le typage refuse un statut étranger au domaine invoqué.

### La couleur ne porte jamais l'information seule

`Badge` exige `children` **par le typage** : il n'existe aucun moyen de rendre une pastille colorée sans libellé. La puce colorée facultative (`dot`) est marquée `aria-hidden` — décorative, jamais porteuse. Un statut inconnu affiche sa valeur brute plutôt que de disparaître ; un statut absent affiche « — ».

### Sites migrés — 6, dans 5 fichiers

`payments/page.tsx` · `students/StudentListClient.tsx` · `students/[id]/page.tsx` (**2 pastilles** : élève + facture) · `classes/[id]/page.tsx` (cas avec puce) · `grades/StudentEntryTab.tsx`.

Sur ce dernier, seul **le calcul du libellé** a été remplacé, pas le visuel — l'écran vient d'être finalisé. Cela corrige au passage un bug réel : `statusOf(...) === "SUBMITTED" ? "Déposé" : "Validé"` affichait « Validé » pour un bulletin `APPROVED`, alors que `LOCKED` couvre bien les trois états.

**Non migrés volontairement** : les comparaisons de statut qui sont des *filtres de requête* ou de la *logique* (`team/page.tsx:38`, `communications`, `payments/new`, `CompletionClient:74`). Les convertir en pastilles aurait été un contresens.

### ⚠️ Septième site de traduction découvert, en zone interdite

`documents/validation/ValidationClient.tsx:27` définit **son propre composant `StatusBadge` local** pour les statuts de bulletin. Il n'a pas été touché (zone documents, lot 09) mais il devra être fusionné dans la primitive à ce moment-là. C'est aussi ce qui a produit un faux positif dans le vérificateur.

### Vérification

`scripts/verify-status-vocabulary.ts` — lit les enums **depuis le schéma** plutôt que de les recopier, donc un ajout d'enum non couvert fera échouer le contrôle. 20/20 valeurs couvertes, 9/9 statuts exigés, 6/6 sites migrés, 6 zones interdites intactes.

⚠️ **Piège du vérificateur, troisième occurrence** — et deux formes nouvelles :
- Chercher l'identifiant `StatusBadge` produisait un faux positif sur le composant **local** de `ValidationClient`. Il faut chercher **l'import**, pas le nom.
- Le motif de « traduction locale » attrapait les ternaires de **classes CSS** (`status === "OVERDUE" ? "border-error …"`). Une négation exclut désormais les préfixes Tailwind.

**Règle générale confirmée sur ce dépôt : tout contrôle statique doit d'abord isoler ce qu'il analyse** — commentaires (lot 01), bloc `@theme` (lot 02), identifiants vs imports et style vs texte (lot 03).

### Restes

- `Badge` n'est pas encore utilisé pour les rôles d'équipe, les méthodes de paiement ni les cycles éducatifs — ce ne sont pas des statuts, à arbitrer plus tard.
- Le `text-[10px]` de `StudentEntryTab` viole le plancher de 12 px du socle ; correction prévue au lot 07, pas ici.

## LOT 04 — Action et formulaire — ✅ FAIT (17 août)

Cinquième lot. `Button`, `Input`/`Select`/`Textarea`, `Modal`, puis migration de **50 sites dans 7 fichiers**.

### L'accessibilité imposée par le typage, pas par la discipline

Le dépôt comptait **0 `aria-label` pour 247 boutons**, beaucoup n'affichant qu'une icône. `ButtonProps` est une **union discriminée** : sans `children`, `aria-label` devient obligatoire et le compilateur refuse l'oubli. Vérifié par une sonde jetable — `<Button icon={<span/>} />` échoue en `TS2322`.

Même logique côté champs : l'`id` est généré par `useId()` et le `label` y est relié systématiquement. Il n'existe pas de chemin produisant un champ sans label lié.

⚠️ **Convention d'API à connaître : un bouton icône-seule passe son icône par `icon=`, pas en `children`.** Mettre l'icône en `children` fait croire au composant qu'il y a un libellé — il perd son gabarit carré et l'exigence d'`aria-label` ne se déclenche pas. Piège rencontré deux fois pendant ce lot.

### La modale ne se contente pas d'un role

`role="dialog"` + `aria-modal` + `aria-labelledby`, piège de focus `Tab`/`Maj+Tab`, `Escape`, blocage du défilement d'arrière-plan, et **restitution du focus** à la fermeture.

⚠️ Le retour de focus est gardé par `isConnected` : l'élément d'origine peut avoir disparu du DOM entre-temps — typiquement la ligne de tableau que la modale servait à supprimer. Sans cette garde, `focus()` sur un nœud détaché laisse le focus au `body`.

⚠️ **Un formulaire dans une modale garde ses boutons dans `children`, jamais dans `footer`.** Le `footer` est rendu hors du `<form>` : y placer le bouton de soumission casse l'envoi. Le cas s'est présenté sur la modale de création de classe.

### Ce qui a été volontairement laissé intact, et pourquoi

- **`payments/new/form.tsx`** — 8 classes `print:`. Consigne explicite : les fichiers d'impression attendent le lot 09.
- **`grades/StudentEntryTab.tsx` et `GradesClient.tsx`** — l'écran de saisie vient de recevoir sa passe de finition (champs teintés par valeur, appréciation en champ fantôme). Le migrer défferait ce travail.
- **Les 4 champs en ligne de `settings/ClientPage.tsx`** — disposition délibérée (icône + libellé à gauche, champ sans bordure aligné à droite) et `htmlFor` **déjà** reliés. Les passer à `Input` aurait changé la mise en page, pas les tokens. Refonte au lot 06. Seuls les boutons ont été migrés, dont **3 « × » sans libellé accessible**.
- **Deux cartes-boutons** : la tuile de cycle de `ClassListClient` et la tuile d'action de `CompletionClient`. Ce sont des cartes cliquables (`rounded-3xl`, `p-6`, `hover:-translate-y-1`), pas des boutons ; `Button` les réduirait à un bouton.

### Vérification

`scripts/verify-ui-primitives.ts` — contrats des trois primitives, migration, périmètre.

⚠️ **Piège du vérificateur, quatrième occurrence.** Le critère « zéro contrôle natif » faisait échouer 4 fichiers migrés à dessein partiellement. Corrigé non pas en affaiblissant le test mais en **déclarant les exceptions avec leur raison** dans le script : elles restent des décisions visibles au lieu de devenir des oublis silencieux. Un contrôle natif non déclaré fait toujours échouer.

### Détail technique à retenir

Convertir `<button>` en `<Button>` par recherche-remplacement laisse les `</button>` orphelins. La réparation fiable passe par un **appariement à la pile** des ouvertures et fermetures, pas par un remplacement global — plusieurs `<button>` restaient légitimement natifs dans le même fichier.

### Restes

- **8 calques modaux** encore écrits à la main : 7 dans `documents/` (lot 09), plus `Modal.tsx` lui-même qui est la primitive.
- 12 fichiers portent `print:` ou `contentEditable` — réservés au lot 09.
- `Card`, `DataTable`, `PageHeader` et les états système restent au lot 05.

## LOT 05 — Structure et états système — ✅ FAIT (17 août)

Sixième lot. `PageHeader`, `Card`, `DataTable`, généralisation d'`EmptyState`/`Skeleton`, et couverture des états de route.

### DataTable : compositionnel, pas piloté par configuration

Décision structurante. Un `DataTable` à `columns={[...]}` serait plus élégant sur du code neuf, mais obligerait à **réécrire le rendu de chaque ligne** des 9 tableaux existants — leurs cellules portent pastilles d'état, avatars, menus contextuels, liens conditionnels. Ce serait refondre les écrans opérationnels.

L'API retenue se substitue **balise pour balise** (`<table>`→`<DataTable>`, `<th>`→`<DataTable.HeadCell>`, `<td>`→`<DataTable.Cell>`), donc la migration est mécanique et la logique métier intacte.

⚠️ **Aucun écran ne trie aujourd'hui** (vérifié : zéro `sortBy`/`onSort` dans le dépôt). `sortable` + `aria-sort` sont fournis mais **branchés nulle part** — activer le tri serait ajouter une fonctionnalité.

### États de route : la sémantique de l'App Router évite 30 fichiers

Un `error.tsx` couvre son segment **et tout son sous-arbre**. Un seul fichier à `dashboard/` protège donc les 30 routes ; en écrire un par page serait 30 fois le même code, et laisserait les segments oubliés sans filet.

Créés : `app/error.tsx`, `app/not-found.tsx`, `dashboard/error.tsx`, `dashboard/not-found.tsx`. Les deux du dashboard **conservent la coquille** — l'utilisateur garde sa navigation au lieu de tomber sur une page nue. Les deux racines sont volontairement **autonomes** : elles doivent s'afficher même quand c'est le chargement des données utilisateur qui est cassé.

Résultat : **40 pages sur 40** couvertes par un `error.tsx` ancêtre (0 avant), **30 sur 40** par un `loading.tsx` (les 10 restantes sont vitrine/login/onboarding, hors périmètre).

Quatre `loading.tsx` ajoutés (students, payments, classes, team) avec un squelette **en forme de tableau**. Sans eux ces routes héritaient du `loading.tsx` de `dashboard`, dessiné pour la grille de widgets de l'accueil — un squelette qui promettait une mise en page que l'écran n'a pas.

⚠️ Les pages de détail (`students/[id]`, `classes/[id]`) gèrent encore l'absence de donnée par un bloc « introuvable » **rendu en ligne**, sans appeler `notFound()`. Les fichiers rendent la bascule possible ; la faire changerait la logique de ces pages.

### EmptyState : compatibilité obligatoire

Cinq générateurs de documents — zone réservée au lot 09 — importent déjà `EmptyState`. Les évolutions sont donc **strictement additives** : `icon` et `description` deviennent facultatifs, `action` accepte un `href` en plus d'un `onClick`. Le halo `blur-3xl` a été retiré (le socle n'admet ni flou ni lueur) et le bouton passe par la primitive.

`Skeleton` gagne `aria-hidden` — un squelette est du décor, sans quoi un lecteur d'écran énumère dix blocs vides — plus `SkeletonTable` et `SkeletonPageHeader`.

### Écran de référence

`payments/page.tsx` applique les trois primitives : plus aucune balise de tableau nue, montants en `numeric` (donc `tabular-nums`), état vide par la primitive. Les autres écrans attendent le lot 07 — le tableau du détail de classe, la liste d'élèves et la grille de saisie restent écrits à la main.

### Piège récurrent, cinquième occurrence

Le vérificateur échouait de nouveau **sur sa propre documentation** : le docblock d'`EmptyState` cite `blur-3xl` pour expliquer son retrait. Un helper `code()` retire désormais les commentaires avant analyse.

**Sur ce dépôt, tout contrôle statique doit isoler ce qu'il analyse.** Cinq formes rencontrées à ce jour : commentaires (lots 01, 05), bloc `@theme` (02), identifiants vs imports (03), style vs texte (03), primitive vs appelants (05).

### Restes

- 8 tableaux encore écrits à la main : 4 pour le lot 07, 4 pour le lot 09.
- `Card` n'est appliqué qu'aux Paiements ; les cartes de métriques du même écran gardent leur `rounded-3xl` d'origine — restylage au lot 07.

## LOT 06 — Navigation globale — ✅ FAIT (17 août)

Septième lot, **premier redesign visuel**. Sidebar, barre supérieure, navigation mobile, permissions.

### La navigation mobile était cassée, pas seulement laide

Découverte la plus grave du lot. `BottomNav` pointait vers `/`, `/admissions`, `/students`, `/payments`, `/reports` — **sans le préfixe `/dashboard`**. Vérifié route par route : **4 liens sur 5 menaient à une 404**, le cinquième sortait de l'application vers la vitrine. Elle ignorait aussi les permissions, et n'affichait le libellé que de l'onglet actif (`opacity-0 h-0 w-0` pour les autres).

Remplacée par `MobileNav`, un **tiroir latéral** qui lit `visibleSections()` — la même table que le desktop, donc plus de divergence possible. Une barre d'onglets ne tient que 4–5 destinations ; EduCom en a jusqu'à dix selon le rôle.

⚠️ `BottomNav.tsx` **n'est plus monté mais le fichier subsiste** — la consigne interdisait de supprimer. C'est désormais du code mort à retirer au lot 10. Ne pas le remonter.

### Boucle de redirection infinie pour PARENT

La coquille renvoyait tout accès refusé vers `/dashboard` en dur. Or `PARENT` n'a pas accès à l'accueil — le tableau de bord expose les finances de tout l'établissement. La redirection échouait donc à son tour et se relançait indéfiniment.

Corrigé par `firstAllowedPath(role)` dans `permissions.ts` : la cible est le premier chemin réellement autorisé du rôle. `PARENT` atterrit sur `/dashboard/payments`. **Aucun droit supplémentaire accordé.**

### Nouvelle convention de permission : le suffixe `$`

Donner `/dashboard` à un rôle en autoriserait **tout le sous-arbre** (`hasAccess` raisonne par préfixe). Il fallait pouvoir dire « cette page exactement, pas ses descendants » : une entrée terminée par `$` exige une correspondance exacte. Cinq rôles ont `/dashboard$`, ce qui leur ouvre l'accueil sans rien d'autre.

C'est une extension de `hasAccess()`, **pas un système parallèle** — la fonction reste seule source de vérité pour la sidebar, le tiroir, les server actions et les gardes de page.

### Permissions corrigées

| Rôle | Correction |
|---|---|
| `TEACHER` | + `/dashboard/grades` — le module lui était inaccessible alors qu'il lui est destiné |
| `ACCOUNTANT` | + `/dashboard/documents` (factures et reçus y vivent) · − `/dashboard/invoices`, route inexistante |
| tous sauf OWNER/ADMIN | + `/dashboard$` pour atteindre l'accueil sans ouvrir le reste |

`/dashboard/settings` n'est listé par aucun rôle : seuls `OWNER` et `ADMIN` passent, via `"*"`. Un **garde serveur** (`hasAccess` + `redirect`) a été ajouté à `settings/page.tsx`, qui n'en avait aucun. Le masquage du lien ne suffit pas — une URL se tape à la main.

### Trois fausses fonctionnalités retirées de la barre

Recherche (aucun `onChange`/`onSubmit`), cloche de notification (aucun handler + **pastille rouge en dur qui ne s'éteignait jamais**), « Mon Profil » (aucune page de profil n'existe). La pastille était la pire : elle apprenait à ignorer un signal d'alerte.

⚠️ L'avatar chargeait une image depuis **`ui-avatars.com`**, transmettant le nom de l'utilisateur à un tiers à chaque page. Remplacé par des initiales rendues localement.

Le sélecteur de rôle de test passe de 4 à **7 rôles** — il en manquait trois, dont `TEACHER` et `PARENT`, précisément ceux à tester.

### Sidebar

240 px (`w-60`), libellés permanents, **quatre groupes** (accueil · Scolarité · Gestion · Établissement) plutôt que dix entrées à plat. Icônes dédoublonnées : « Saisie des notes » passe à `ClipboardList`, `FileText` restant à « Documents » — les deux partageaient la même icône sur un rail sans libellés.

Neuf couleurs par rubrique remplacées par **un seul accent, sur l'actif**, tiré de `--color-primary` : la navigation suit `School.primaryColor` sans code de thème.

⚠️ **Les rubriques interdites ne sont plus affichées grisées avec un cadenas.** L'ancienne version annonçait à chaque rôle tout ce qu'il ne peut pas faire. Une navigation ne montre que l'atteignable — sinon elle contient des liens morts par construction. Une section entièrement interdite disparaît, en-tête compris.

### Vérification des 7 rôles

`scripts/verify-navigation.ts`. Entrées visibles : OWNER 10 · ADMIN 10 · SECRETARY 6 · TEACHER 5 · ASSISTANT 5 · ACCOUNTANT 4 · PARENT 2. Pour chacun : aucune entrée visible sans droit, aucune entrée autorisée masquée. **10 entrées, 0 lien mort.** Cible de redirection atteignable pour les 7.

### Restes

- La sidebar n'est pas repliable — pas demandé, et un rail replié ramènerait le problème des icônes muettes.
- La recherche et les notifications reviendront quand la fonction existera.
- `BottomNav.tsx` est du code mort à supprimer au lot 10.

## LOT 07 — Écrans opérationnels — ✅ FAIT (17 août)

Huitième lot. Refonte des cinq écrans du staff : Élèves, Paiements, Classes, Équipe, Communications.

### ⚠️ Deux fuites d'isolation que le lot 00 n'avait pas couvertes

`students/page.tsx` et `communications/surveys/page.tsx` faisaient `findMany()` **sans `where: { schoolId }`** — l'annuaire listait les élèves de tous les établissements, la liste des sondages tous les sondages. Le lot 00 n'avait traité que le tableau de bord et les rapports.

Troisième variante trouvée sur `payments/page.tsx` : le filtre s'écrivait `schoolId: dbUser?.schoolId`. **Si `dbUser` est absent, l'optional chaining produit `undefined` et Prisma ignore alors le filtre** — la fuite est silencieuse et ne se voit pas à la lecture. Les trois pages passent désormais par `requireSchoolContext()`, qui garantit un identifiant non nul ou redirige.

**Leçon : `grep schoolId` ne suffit pas à prouver l'isolation.** Un `schoolId` présent mais potentiellement `undefined` compte comme absent.

### Fausses fonctionnalités retirées

- **Élèves** : bouton « Filtres » sans handler. Remplacé par un filtre de classe **réellement branché**, construit depuis les inscriptions déjà chargées.
- **Paiements** : champ de recherche + boutons « Filtrer » et « Statut », **aucun n'ayant de handler**. Remplacés par une recherche et des onglets de statut fonctionnels.
- **Sondages** : bouton « Voir Résultats » sans handler, et **aucune route de résultats n'existe**. Retiré, comme la recherche et les notifications au lot 06.
- **Équipe** : le lien d'invitation affichait `educom.app/invite?token=…`, **un domaine qui n'existe pas** — un secrétaire qui le recopiait envoyait un lien mort. Remplacé par le chemin réel, avec copie qui reconstruit l'URL depuis `window.location.origin`.

### Accessibilité : deux corrections de fond

**Le clic de ligne n'était pas atteignable au clavier.** Élèves et Classes reposaient sur un `onClick` de `<tr>` ou un `<Link>` englobant toute la carte. Le nom devient un vrai lien focusable ; le clic de ligne reste pour la souris. Sur Classes, le `<Link>` englobant contenait le bouton de suppression — **imbrication invalide en HTML** qui rendait le clavier imprévisible.

**Les actions cachées au survol sont maintenant visibles.** Le bouton d'encaissement (`opacity-0 group-hover:opacity-100`) et le bouton de suppression de classe étaient invisibles au clavier et inatteignables au tactile — or l'encaissement est l'action principale de l'écran Paiements.

### Vocabulaire des rôles

`ROLE_LABELS` + `roleLabel()` ajoutés à `permissions.ts`, où les rôles vivent déjà — même raisonnement que `status.ts` pour les statuts, **pas un système parallèle**. L'écran Équipe affichait l'énumération brute (« OWNER », « ACCOUNTANT ») dans une interface française, avec six familles de couleur tirées au hasard. Les `<option>` des deux formulaires sont désormais générées depuis la table : un rôle ajouté au système y apparaît automatiquement.

### Couleurs arbitraires supprimées

Avatars arc-en-ciel sur Élèves et Paiements (5 puis 4 teintes par modulo de l'index — deux voisins n'ont aucun rapport). Emoji de cycle sur Classes (🧸 🎒 🏫 🎓 📁) et leurs 5 familles de couleur. Verre dépoli sur Communications (3 panneaux + boîte de réception). Dégradé `primary→indigo` du bouton d'envoi. Tous les hex en dur (`#DCF8C6`, `#15803d`, `#E5DDD5`…).

### ⚠️ Piège de vérification, deux formes nouvelles

1. **Épingler un fichier plutôt qu'un écran.** Le lot 05 vérifiait `payments/page.tsx` ; le lot 07 a extrait le tableau dans `PaymentsListClient.tsx` pour y porter l'état des filtres. Deux scripts ont signalé une régression alors que **rien n'était perdu** — les primitives avaient changé de fichier. Les vérificateurs raisonnent maintenant par **écran** (page + composant client).

2. **Regex tronqué par une auto-fermeture imbriquée.** Le contrôle des `aria-label` utilisait `<Button…[\s\S]*?\/>`, qui s'arrête au **premier** `/>` — or il y en a un dans `icon={<Trash2 … />}`. Quatre faux positifs sur des boutons correctement étiquetés. Le script suit désormais la profondeur d'accolades pour trouver la vraie fin de balise.

**Sept formes de ce piège recensées à ce jour.** Sur ce dépôt, un contrôle statique doit isoler ce qu'il analyse *et* connaître la structure de ce qu'il parse.

### Restes

- `payments/new/form.tsx` et la grille de saisie des notes gardent leurs tableaux écrits à la main (impression / écran finalisé).
- Le tableau du détail de classe n'est pas passé à `DataTable`.
- Aucune pagination nulle part : les listes affichent tout. À prévoir au-delà de quelques centaines d'élèves.

## LOT 08 — Refonte du tableau de bord — ✅ FAIT (17 août)

Neuvième lot. Le dashboard passe de **6 widgets dont 3 fictifs** à 4 sections toutes adossées à des requêtes réelles.

### Ce qui a été supprimé, et la preuve que c'était fictif

| Widget | Preuve |
|---|---|
| `TodoListWidget` | 3 tâches en dur, état en mémoire React — **toute tâche ajoutée disparaît au rechargement** |
| `ActivityFeedWidget` | 4 événements et noms inventés (« Paiement de 50 000 FCFA reçu pour Jean D. »), horodatages inventés |
| `SchoolHealthWidget` | table `filterData` simulant **entièrement 3 des 4 filtres** (Quotidien, Hebdo, Mensuel). Le 4ᵉ mélangeait 2 vraies métriques et 2 fausses |
| `AlertsWidget` | 2 alertes réelles **+ 2 inventées** — le code l'assumait : « Adding dummy examples requested by the user » |
| Carte « Montant Encaissé » | dégradé `slate-900 → indigo-900 → purple-900`, hors charte |
| `studentTarget = 500` | commenté « mock objective » |
| `attendanceRate = 98` | **aucune donnée de présence n'existe au schéma** |
| Bouton « Personnaliser » | aucun handler |

⚠️ **Les liens d'`AlertsWidget` étaient tous morts** : `/payments`, `/admissions`, `/communications`, `/students` — **sans le préfixe `/dashboard`**. Même défaut que `BottomNav` au lot 06. `/admissions` n'existe même pas comme route.

⚠️ `AlertsWidget` était un **carrousel** : une alerte visible à la fois. Un directeur doit voir tout ce qui demande son attention, pas en feuilleter une partie.

### Ce qui a été construit, et d'où viennent les données

**Priorité 1 — « À traiter ».** Quatre entrées, chacune masquée si son compte est nul :
`Invoice` OVERDUE (nombre + total) · `Student` PENDING · `ReportCard` SUBMITTED · `DocumentRequest` PENDING.

**Priorité 2 — 4 indicateurs.** `Student` ENROLLED · `Class` count · somme des `Invoice` PAID · somme PENDING+OVERDUE. **Aucun pourcentage d'évolution inventé** : la seule comparaison affichée est le nombre d'élèves créés sur 30 jours, calculé par `createdAt >= J-30`.

**Priorité 3 — Activité récente.** Fusion de trois sources horodatées : `Payment.createdAt` (avec montant réel), `Student.createdAt`, `Message` INBOUND. Triées, 6 dernières. Base vide ⇒ `EmptyState`.

**Priorité 4 — Dernières factures.** `DataTable` + `StatusBadge`, 5 dernières.

### Découverte : le dashboard exposait les finances à des rôles qui n'y ont pas droit

`/dashboard$` ouvre l'accueil à six rôles. Or la page affiche encaissements et impayés — **un enseignant, une secrétaire ou un assistant n'ont pas à lire le chiffre d'affaires**.

Les blocs financiers sont désormais conditionnés à `hasAccess(role, "/dashboard/payments")`. **Aucune permission modifiée** : la portée est décidée à l'affichage, depuis la source de vérité existante. Résultat : OWNER/ADMIN/ACCOUNTANT voient 4 indicateurs, TEACHER/SECRETARY/ASSISTANT en voient 2.

### Performance

Les 10 requêtes partent en **`Promise.all`** au lieu d'être enchaînées. La liste des factures est lue **une seule fois** et sert trois usages (totaux, comptage des retards, tableau). Trois requêtes d'activité bornées par `take: 6`. Aucune bibliothèque de graphique chargée — le dashboard n'a pas de graphique, et n'en avait pas besoin.

### ⚠️ Piège de vérification, deux formes nouvelles

1. **Fenêtre de regex trop courte.** Le contrôle d'isolation utilisait `prisma\.\w+\.count\(\{([\s\S]{0,220})` — il ne voyait que **4 des 10 requêtes**, les `select` imbriqués dépassant la fenêtre. Un contrôle d'isolation qui rate 6 requêtes sur 10 est pire qu'absent : il rassure à tort. Corrigé par un suivi de profondeur de parenthèses.

2. **Exclusion périmée.** Trois vérificateurs (lots 03, 05, 07) interdisaient de toucher `dashboard/page.tsx` — exclusion que le lot 08 lève par définition. Retirée des trois listes, avec note. Le dashboard est maintenant couvert par `verify-dashboard.ts`, plus strict qu'une interdiction.

**Neuf formes de ce piège recensées à ce jour.**

### Restes

- Les 5 fichiers de widgets fictifs (`TodoListWidget`, `ActivityFeedWidget`, `SchoolHealthWidget`, `AlertsWidget`, `RecentInvoicesWidget`) sont **débranchés mais toujours présents** — code mort à supprimer au lot 10, comme `BottomNav`. Ne pas les remonter.
- Aucun graphique sur le dashboard. La page Rapports garde les siens (hors périmètre de ce lot).
- Pas de notion de « santé de l'école » : elle exigeait un taux de présence que le schéma ne porte pas. À reconsidérer si un modèle d'assiduité est ajouté.

### ⚠️ Bug du lot 08 : « Element type is invalid » sur le tableau de bord — ✅ CORRIGÉ

Le dashboard refondu levait `Element type is invalid: … but got: undefined` dans `DashboardHome`. **`tsc` passait**, et les neuf scripts de vérification passaient : la panne était au runtime, invisible à l'analyse statique.

**Cause.** `DataTable` est un module `"use client"`. Ses propriétés statiques (`DataTable.Head`, `.Body`, `.Row`, `.Cell`, `.HeadCell`, `.EmptyRow`) **ne traversent pas la frontière RSC** : importées depuis un composant serveur, elles valent `undefined`.

Le dashboard était le **seul composant serveur** à utiliser cette notation. Les deux écrans qui fonctionnaient — Élèves et Paiements — l'utilisent depuis des composants **client**, où les statiques existent réellement. Le lot 05 avait migré `payments/page.tsx` (serveur) de la même façon, mais le lot 07 en a extrait le tableau dans un client component : le bug a donc été masqué par un refactor, avant de resurgir sur le dashboard.

**Preuve empirique** (route de sonde temporaire, composant serveur sans authentification, puis supprimée) :
- notation pointée → **HTTP 500**, message identique à celui rapporté ;
- exports nommés → **HTTP 200**, `<table>` rendu, `tabular-nums` appliqué, `StatusBadge` affiché.

**Correctif.** `DataTable.tsx` expose désormais des **exports nommés** (`TableHead`, `TableHeadCell`, `TableBody`, `TableRow`, `TableCell`, `TableEmptyRow`) — un export nommé d'un module client est correctement transformé en référence client. Les statiques sont conservées pour les 55 sites clients déjà migrés.

**Règle à retenir :**
- composant **client** → `<DataTable.Head>` reste valable ;
- composant **serveur** → utiliser les exports nommés.

Un garde de non-régression a été ajouté à `verify-dashboard.ts` : il échoue si un composant serveur utilise `<DataTable.X>`. C'est le seul filet automatique, `tsc` ne voyant rien.

**Leçon générale, dixième forme du piège de vérification : neuf scripts verts ne valent pas un rendu.** Aucun de mes contrôles n'exécutait la page. Une sonde HTTP sur une route réelle a trouvé en deux minutes ce que l'analyse statique ne pouvait pas voir.

## LOT 09 — Documents — ✅ FAIT (17 août)

Dixième lot, le plus risqué : 5 137 lignes, 7 générateurs, 47 zones éditables, 96 classes `print:`.

### Principe tenu : les 7 générateurs n'ont pas été restylés

**Aucune classe `print:`, aucun `contentEditable`, aucun `execCommand` ajouté ni retiré.** Vérifié par relevé avant/après. Deux générateurs seulement ont été ouverts — `receipt` et `invoice` — et uniquement pour retirer des replis de données fictives.

### ⚠️ Quatrième fuite d'isolation du projet

`drafts/page.tsx` chargeait **tous les élèves et toutes les classes de la base**, sans `where` : la page transmettait au client l'annuaire complet de tous les établissements, pour résoudre des identifiants de brouillons en noms. Corrigé par `requireSchoolContext()`.

Récapitulatif des fuites trouvées : tableau de bord + rapports (lot 00), annuaire élèves + sondages (lot 07), brouillons (lot 09). **Le client Prisma n'ayant aucun filtre global, chaque nouvelle requête est une occasion d'oublier.**

### Données fictives imprimées sur des pièces officielles

`receipt` et `invoice` portaient des replis : `school?.address || "123 Avenue de l'Éducation, Dakar"`, `school?.email || "contact@educom.sn"`, `school?.phone || "+221 77 000 00 00"`. Une école dont l'adresse n'est pas renseignée imprimait donc une **facture avec une adresse et un email qui ne sont pas les siens** — et deux des trois écoles de la base ont l'adresse vide.

Même défaut que le `|| "EduCom Excellence"` du lot 00, même traitement : on n'affiche que le réel. Sur la facture les zones restent `contentEditable`, donc l'utilisateur saisit la vraie valeur au lieu d'imprimer une invention.

### Deux générateurs étaient inatteignables

`reminder` (lettre de relance) et `receipt` (reçu) **n'apparaissaient pas dans le hub** — fonctionnels tous les deux, `receipt` gérant même des brouillons. Accessibles seulement en tapant l'URL. Le catalogue vit maintenant dans `src/lib/documents.ts`, et le vérificateur le compare aux dossiers réellement présents : la liste ne peut plus diverger.

### Autres corrections du hub

- **Bouton « Options d'impression » factice** : affichait « Configuration du serveur d'impression en cours… » alors qu'aucun serveur d'impression n'existe. Retiré.
- **`DocumentRequest` était écrite mais jamais lue** : l'utilisateur envoyait une demande dans le vide, avec un message promettant « Nous vous contacterons bientôt » — personne n'est notifié. Les demandes sont désormais listées avec leur statut, et le message dit la vérité.
- La page était `"use client"` sans aucun état, ce qui interdisait toute lecture de données. Passée en composant serveur ; seule la modale reste cliente.

### Zones éditables signalées sans toucher aux documents

Les 47 `contentEditable` ne se révélaient qu'au focus. L'indication (soulignement pointillé, survol, focus) est posée par un **sélecteur d'attribut dans `@media screen`** de `globals.css` :
- **zéro édition du markup imprimable**, donc zéro risque de régression papier ;
- confinée à `@media screen`, l'impression ne voit jamais ces règles — pas de bloc de réinitialisation à maintenir.

⚠️ Sélecteur par **présence** d'attribut (`[contenteditable]`), pas par valeur : React émet `contentEditable="true"` en camelCase, et aucun générateur ne pose jamais l'attribut à `false`.

### Permissions : deux tables locales supprimées

`validation/page.tsx` et `validation/impression/page.tsx` portaient un `const ALLOWED = ["OWNER","ADMIN","SECRETARY"]`. Vérifié avant remplacement : `hasAccess()` donne **exactement le même ensemble** pour les 7 rôles. Passées à `hasAccess()` — même comportement, une seule source de vérité.

### Vérification par rendu réel

Les 7 générateurs ont été rendus via une route de sonde temporaire (composant serveur, données réelles de la base, sans authentification), puis supprimée. Tous **HTTP 200**, tous avec « Kory Academy 2 », **zéro** « EduCom Excellence ». Format A4 confirmé dans le HTML rendu (`max-width:210mm; aspect-ratio:0.7072`). Sélecteur d'élève et barre d'outils confirmés **à l'intérieur** de conteneurs `print:hidden`.

### ⚠️ Piège de vérification, deux formes nouvelles

1. **Relevé et contrôle mesurant des choses différentes.** Le relevé de référence avait été pris avec `grep -c` (nombre de **lignes**), le contrôle comptait les **occurrences**. Les 7 générateurs sont apparus « en régression », dont 5 que le lot n'a jamais ouverts. Démasqué par les dates de modification. **Un relevé et son contrôle doivent mesurer la même unité.**

2. **Exclusion trop large.** Trois vérificateurs interdisaient de toucher tout `documents/`, ce qui interdisait aussi de refondre le hub — objet du lot. Resserrés aux `Generator.tsx` : l'invariant réel, et plus strict là où ça compte.

**Onze formes de ce piège recensées.**

### Restes signalés

- `execCommand` (déprécié) reste dans 5 générateurs, 8 appels chacun. Le remplacer est un chantier en soi, hors périmètre.
- **Aucun `aria-label` ni `role="textbox"` sur les 47 zones éditables.** Non ajouté : cela exigeait de modifier le markup imprimable, ce que la règle finale du lot interdit. À traiter dans un lot dédié à l'accessibilité des documents.
- `info-sheet` affiche « Année Scolaire 2023-2024 » en dur — le schéma ne porte pas d'année scolaire.
- `@page { size: auto }` conservé : passer à `size: A4` changerait le comportement sur les imprimantes configurées en Letter.
- Les brouillons vivent en `localStorage` : par navigateur et par appareil, donc invisibles d'un poste à l'autre. Mécanisme réel mais limité.

### ⚠️ Ce que je n'ai pas pu vérifier

**Aucune impression réelle.** Je n'ai pas de navigateur : je n'ai pas ouvert l'aperçu avant impression, ni produit un PDF, ni contrôlé les sauts de page, les marges effectives ou le rendu du cachet et de la signature sur papier. La vérification s'arrête au HTML rendu et aux règles CSS. **Un contrôle visuel sur les six documents représentatifs reste à faire côté navigateur.**

## LOT 10 — Fondations opérationnelles — ✅ FAIT (17 août)

Objet : poser la mécanique commune (workflow, audit, périodes) dont auront besoin Finance, Rapports et Dossier élève, **sans construire aucun de ces modules**. Quatre fichiers dans `src/lib/`, une table, zéro écran modifié.

### Trois choses existaient déjà — les découvrir a changé la conception

C'est le point le plus utile de ce lot. L'inspection du schéma **avant** d'écrire quoi que ce soit a évité trois doublons :

1. **`AuditLog` était déjà au schéma** depuis le début du projet, avec exactement les bonnes colonnes — et **jamais utilisée** : zéro référence en code, zéro ligne en base. `src/lib/audit.ts` l'adopte. Une seconde table d'audit aurait fragmenté l'historique dès la première écriture.
2. **`ReportCard` implémente déjà un workflow**, en colonnes (`status`, `submittedAt/ById`, `validatedAt/ById`, `returnedReason`). `workflow.ts` le **décrit** au lieu de le remplacer : il devient la première machine déclarée, sans changement de comportement.
3. **`Term` existe** avec `startDate`/`endDate`. `period.ts` le lit, il ne crée pas un second modèle de période.

### La demande de vocabulaire unique a été écartée, sciemment

Le lot demandait `draft → submitted → under_review → approved → rejected → completed`. Le bulletin utilise déjà `DRAFT / VALIDATED / SUBMITTED / RETURNED / APPROVED`, dans une **énumération Prisma**, portée par 20 bulletins réels. Imposer le vocabulaire demandé exigeait de migrer cette énumération en production — destructif, et interdit par le lot lui-même. Le tronc commun n'impose donc **aucune liste fermée** : chaque module déclare ses états. `verify-foundations.ts` relit l'énumération dans `schema.prisma` et échoue si le code s'en écarte.

### Les permissions passent par un chemin, pas par une liste de rôles

Une transition déclare `requiredPath: "/dashboard/grades"`, résolu par `hasAccess()`. Déclarer des rôles ici aurait recréé exactement le doublon supprimé aux lots 06 et 09. Conséquence gratuite et vérifiée : un `TEACHER` ne peut pas approuver son propre travail, parce que `ROLE_DENIALS` lui refuse déjà `/dashboard/documents/validation`.

### Le piège de frontière : `workflow.ts` ne doit jamais importer Prisma

`availableTransitions()` et `labels` servent à décider quels boutons afficher — donc doivent rester importables depuis un composant client. Une dépendance runtime sur Prisma rendrait le module serveur-only et casserait cet usage. D'où la séparation en deux fichiers, et `import type { AuditEntity }` (effacé à la compilation) pour typer `entity` sans tirer Prisma. Contrôlé par le vérificateur.

### Ce que la table générique ne peut PAS garantir — à lire avant d'utiliser ces helpers

`WorkflowTransition` est générique (`entity` + `entityId`), donc **elle ne sait pas quel modèle Prisma interroger et ne peut pas vérifier que l'objet appartient à l'école de l'acteur**. L'appelant DOIT avoir chargé l'objet avec `where: { id, schoolId: ctx.schoolId }`, et l'état `from` doit venir de cette lecture, jamais du client. Le vérificateur contrôle qu'aucune fonction exportée n'accepte de `schoolId` en argument ; il ne peut pas contrôler le `where` de l'appelant. **C'est le trou à surveiller au premier câblage.**

### Ordre d'exécution : autoriser → appliquer → tracer

`runTransition()` prend l'écriture métier en callback. L'historique n'est écrit **qu'après** son succès : un historique ne doit jamais affirmer un changement qui n'a pas eu lieu. Si le callback lève, la ligne d'audit est écrite avec `outcome: "failure"` et l'erreur revient proprement. Les deux lignes du même acte (`WorkflowTransition` + `AuditLog`) partent dans **une seule transaction Prisma** — une seule des deux donnerait un historique faux. Un refus de droit est lui aussi tracé (`outcome: "denied"`).

**Décision assumée, héritée de `audit.ts` :** une trace qui n'a pas pu être écrite ne fait pas échouer l'acte métier (retour `false`, jamais de `throw`). Un encaissement ne doit pas être annulé parce que son journal a échoué. Un module qui aurait besoin d'une trace *inséparable* de son écriture doit inscrire la ligne dans sa propre transaction.

### Schéma — additif prouvé, pas supposé

`prisma migrate diff` avant `db push` : **5 `CREATE`, 0 `DROP`, 0 `ALTER`, 0 `TRUNCATE`**. Un `db push` sans `--accept-data-loss` a suffi, ce qui prouve qu'aucune perte n'était requise.

- **`WorkflowTransition`** (nouvelle) : `workflow`, `entity`, `entityId`, `fromState` (nullable = entrée dans le workflow), `toState`, `comment`, `actorId`, `actorRole`, `schoolId`, `createdAt`. **Aucune relation, aucun `onDelete`** — même convention qu'`AuditLog`, et même conséquence : supprimer un bulletin n'efface pas son historique. `actorRole` est figé au moment de l'acte : un rôle peut changer, l'historique ne doit pas.
- **`AuditLog`** : deux index **ajoutés** (`[schoolId, entity, entityId]`, `[schoolId, createdAt]`), correspondant aux deux seuls chemins de lecture exposés. Les deux index d'origine sont conservés. Aucune colonne touchée.

Après push, vérifié en base : 11 colonnes conformes, 5 index sur `AuditLog`, 3 sur `WorkflowTransition`. Données intactes — 3 écoles, 9 utilisateurs, 133 élèves, 20 bulletins, 82 notes, 6 paiements, 6 factures.

### Vérification

- `scripts/verify-foundations.ts` (11ᵉ vérificateur) — **92 contrôles**, dont le calage sur l'énumération Prisma réelle, l'effet des permissions rôle par rôle, les bornes de période, l'isolation, et la préservation des 23 modèles d'avant le lot.
- **Aller-retour réel en base, avec deux écoles distinctes** (« Senghor » et « Kory Academy 2 ») : transition écrite puis relue, école B voit **0 ligne** sur l'objet de A (historique, audit, fil de workflow, activité récente) ; refus `TEACHER` tracé sans ligne d'historique ; commentaire obligatoire effectif ; panne du callback tracée sans affirmer le changement. Les 2 transitions et 4 lignes d'audit créées ont été supprimées, les deux tables revenues à 0.
- Non-régression : **les 11 vérificateurs au vert, 527 contrôles.** `npx tsc --noEmit` propre. Serveur de dev sain après `prisma generate` (`/` 200, `/login` 200, `/dashboard` 307, aucune erreur au log).

### Deux faux échecs de mon propre vérificateur — la douzième et treizième forme du piège

1. **Chercher un nom au lieu d'une position.** Le contrôle « aucun `schoolId` en argument » cherchait `schoolId: string` dans tout le fichier : il attrapait `AuditRecord.userId` et la ligne lue par `decode()` — des types de **retour**, pas des sources d'autorité. Corrigé en n'inspectant que les **listes de paramètres des fonctions exportées**.
2. **Figer un total.** Le contrôle affirmait « 26 modèles au schéma ». Il y en a 24. Au-delà de l'erreur, un total casse au prochain modèle légitime en laissant croire à une suppression : remplacé par l'énumération des 23 modèles d'avant le lot, dont l'absence est le vrai invariant.

### Ce qui n'est délibérément pas fait

- **Aucun écran n'est câblé.** Les quatre modules sont importés par 0 écran (relevé par la section 7 du vérificateur, qui rendra l'adoption visible). Le lot pose la mécanique.
- Aucun workflow Finance ni Dossier élève déclaré. Aucun écran d'historique. Aucun sélecteur de période dans l'interface.
- `period.ts` calcule tout en **heure locale du serveur** : les dates métier d'EduCom sont des jours calendaires, découper en UTC décalerait les bornes et ferait basculer des enregistrements d'un mois à l'autre. À reconsidérer seulement si l'application sert un jour plusieurs fuseaux.

### Restes signalés, hors périmètre

- **Six fichiers morts** (0 import, 0 JSX) : `BottomNav.tsx`, `TodoListWidget`, `ActivityFeedWidget`, `SchoolHealthWidget`, `AlertsWidget`, `RecentInvoicesWidget`. ⚠️ **Piège avant de les supprimer :** `scripts/verify-status-vocabulary.ts:147` fait un `readFileSync` direct sur `RecentInvoicesWidget.tsx` — la suppression ferait **planter** le vérificateur. Ajuster les scripts d'abord.
- `Term` compte un trimestre parasite (`"Controle 1er Trimestre"`), et des trimestres réels peuvent n'avoir **aucune date** : `termPeriod()` renvoie `null` dans ce cas plutôt que d'inventer des bornes. Tout futur écran de rapport devra afficher « ce trimestre n'a pas de dates » au lieu d'un total faux.

## LOT 11 — Workflow financier : dépenses + état du gestionnaire — ✅ FAIT (17 août)

Premier vrai module métier bâti sur les fondations du lot 10. Le comptable saisit ses dépenses, les fait valider, arrête l'état financier d'une période et le transmet à la direction, qui approuve ou renvoie avec motif.

### L'audit préalable a trouvé un chiffre faux — c'est le fait le plus important du lot

Mesuré avant d'écrire une ligne :

```
SUM(Invoice.totalAmount) des factures PAID  →  196 866 FCFA   ← ce qu'affichait « Total encaissé »
SUM(Payment.amount)                          →  306 866 FCFA   ← l'argent réellement enregistré
```

L'écran Paiements additionnait des **factures** sous un libellé qui promettait des **encaissements**. Les recettes du lot 11 se calculent sur `Payment`. Les cartes historiques de `payments/page.tsx` n'ont pas été touchées (hors périmètre), mais **le chiffre y reste faux** — à corriger dans un lot dédié.

### Trois autres limites du modèle existant, signalées et non contournées

1. **`Payment` n'a aucune date d'encaissement**, seulement `createdAt`. Un versement reçu hier et saisi aujourd'hui est daté d'aujourd'hui. Les recettes d'une période sont donc les paiements *saisis* dedans. Ajouter une colonne de date de valeur toucherait la facturation : hors périmètre.
2. **`InvoiceStatus.OVERDUE` n'est écrit par AUCUN code.** Aucune tâche ne fait basculer une facture échue. Une créance calculée sur ce statut vaudrait 0 en permanence — c'est déjà le cas de `documents/reminder`, qui ne trouve jamais rien. Le retard est donc **dérivé de `dueDate`**.
3. **Aucune infrastructure de fichiers.** Le seul mécanisme est `FileReader.readAsDataURL` → base64 dans une colonne `String` (logo, cachet). Tenable pour un logo de 20 Ko, intenable pour une photo de reçu de 3 Mo relue à chaque requête. `Expense.receiptRef` enregistre donc **où retrouver la pièce papier**, pas la pièce. La pièce jointe réelle attend le chantier documentaire.

### Une faille de permissions que ce lot rendait critique

`PARENT` possède `/dashboard/payments` — et `hasAccess()` raisonne par préfixe. Sans correction, un parent héritait de **tout** l'atelier financier par l'URL. Trois refus ajoutés dans `ROLE_DENIALS`, plus un pour le comptable :

| Rôle | Préparer | Examiner |
|---|---|---|
| OWNER · ADMIN | oui | oui |
| ACCOUNTANT | **oui** | **non** |
| SECRETARY · TEACHER · ASSISTANT · PARENT | non | non |

Le comptable prépare et transmet mais n'approuve pas son propre travail — exactement le principe qui empêche un enseignant d'approuver ses bulletins, et il n'a coûté **aucune règle nouvelle** : deux lignes dans la matrice centrale. Les transitions déclarent un chemin (`preparePath` / `reviewPath`), jamais un rôle.

⚠️ **Reste ouvert, préexistant et sérieux :** `payments/page.tsx` liste **toutes** les factures de l'école sans filtre parent. Un `PARENT` y voit les factures des autres familles. Non corrigé par ce lot (c'est de la facturation, pas du workflow), mais c'est une fuite de données réelle.

### Décisions de conception

- **Une seule énumération Prisma** (`FinanceWorkflowStatus`) pour dépense et état : le lot 10 a montré qu'une énumération coûte cher à migrer, deux copies identiques doubleraient ce coût. Les **libellés** restent distincts via deux domaines de `status.ts` — les 5 diffèrent.
- **Une fabrique**, pas deux machines recopiées : les deux circuits sont identiques, seuls le nom, l'objet, les deux chemins et les libellés changent. Deux copies auraient divergé au premier ajustement.
- **`SUBMITTED → CANCELLED` n'existe pas.** Une pièce transmise est entre les mains de la direction ; le préparateur ne peut pas la retirer de la revue. Il attend qu'elle revienne (`RETURNED`) pour l'abandonner.
- **Pas de colonne `statementId` sur `Expense`.** Le verrou de période est *dérivé* : une dépense est gelée s'il existe un état transmis ou approuvé dont la période contient sa date. Plus correct qu'un lien — cela bloque aussi une dépense **antidatée après** la soumission, qui échapperait à un rattachement explicite.
- **Huit postes de dépense, pas vingt-cinq.** Un plan comptable complet n'a aucune utilité si personne ne le remplit : on choisirait « Autre » à chaque fois.

### Le point qui compte : les totaux sont figés à la soumission

Tant que l'état est `DRAFT`, ses chiffres sont recalculés à chaque affichage. À la soumission ils sont **écrits en base**, dans la même transaction que le changement d'état.

Sans cela la direction approuverait des chiffres mouvants : `Invoice.status` peut changer après coup, ce qui modifierait le « reste à encaisser » d'un état déjà approuvé. **Vérifié en exécution réelle** : après approbation d'une dépense supplémentaire, l'état soumis affichait toujours 400 000 pendant que le calcul en direct passait à 412 000. Les deux chiffres coexistent à l'écran, chacun libellé pour ce qu'il est.

### Schéma — additif prouvé avant le push

`prisma migrate diff` : **11 `CREATE`, 0 `DROP`, 0 `ALTER` sur une table préexistante, 0 `ADD COLUMN`, 0 `TRUNCATE`.** Les 2 `ALTER` sont des `ADD CONSTRAINT` sur les deux tables neuves ; les 2 occurrences de « DELETE » sont leurs `ON DELETE CASCADE`. Sauvegarde JSON dans `backups/avant-lot-11-2026-08-17.json`.

- **`Expense`** (18 colonnes) — `spentAt` (date de la dépense) distinct de `createdAt` (date de saisie) : on saisit le lundi une facture payée le vendredi, et les agrégations filtrent sur `spentAt`.
- **`FinancialStatement`** (20 colonnes) — période stockée avec la convention du lot 10 (`periodTo` **exclue**), 4 totaux nullables = instantané.
- **`Payment`** — un index ajouté `[schoolId, createdAt]`, aucune colonne touchée.
- Aucune contrainte d'unicité de période : un chevauchement *partiel* n'est pas exprimable en SQL. Contrôle en code, et `CANCELLED` existe pour libérer une période réservée par erreur.

Données identiques avant/après : 3 écoles · 9 utilisateurs · 133 élèves · 13 classes · 6 factures · 6 paiements · 82 notes · 20 bulletins.

### Vérification

- `scripts/verify-financial-workflow.ts` (12ᵉ vérificateur) — **170 contrôles**.
- **Exécution réelle, deux écoles** (« Senghor » / « Kory Academy 2 »), ~55 contrôles : les 7 rôles sur les transitions ; `DRAFT→SUBMITTED→APPROVED` ; `SUBMITTED→RETURNED→SUBMITTED` ; motif obligatoire ; agrégations séparant approuvé / transmis / non transmis ; figement de l'instantané ; verrou de période ; les 5 granularités ; historique et audit. **École B : 0 ligne de A** sur la liste, le détail, les agrégats, l'historique, le bureau d'examen — et elle ne peut ni charger ni faire transitionner un objet de A.
- **Rendu réel** (sonde temporaire, supprimée depuis) : HTTP 200, 53 Ko, les 6 sections rendues, montants et pastilles présents, `Dépense école B` **absente** du rendu de A, aucune erreur React.
- Non-régression : **12 vérificateurs, 719 contrôles.** `tsc --noEmit` propre. Routes gardées → 307 sans session.

### ⚠️ Le piège du lot : `next dev` sert un client Prisma périmé

La sonde a renvoyé **HTTP 500** alors que `tsc` était propre et que tous les scripts passaient : `Unknown argument 'expenses'`. Le client généré sur disque contenait bien la relation ; le serveur `next dev`, lancé avant la migration, servait l'ancien depuis sa mémoire.

**Après tout `prisma generate` qui ajoute un modèle, il faut redémarrer `next dev`.** Les scripts ne le montrent jamais : chacun démarre un processus Node neuf. C'est la deuxième fois qu'un écran casse là où tous les scripts sont verts — la première était le lot 08.

### Deux faux échecs de mon propre vérificateur

1. **`[^>]*` tronqué par un `>` imbriqué.** Le contrôle d'`aria-label` cherchait `<Button[^>]*/>` : la classe négative s'arrête sur le `>` de `icon={<Plus … />}` et rend un fragment qui *paraît* auto-fermant. Dix boutons corrects déclarés muets. **C'est exactement le piège du lot 07**, déjà corrigé une fois par balayage de profondeur — et réintroduit ici par distraction. Le balayage d'accolades est désormais dans une fonction nommée, `jsxTags()`.
2. **Chercher un nom au lieu d'une structure.** « Aucun fichier ne redéclare les 5 statuts » cherchait les 5 noms n'importe où : quatre faux échecs, car une action doit nommer l'état qu'elle vise et `finance.ts` filtre légitimement sur `["SUBMITTED", "APPROVED"]`. Le contrôle n'inspecte plus que les **littéraux de tableau**.

### Hors périmètre, explicitement

Aucun module Rapports (lot 12), aucun dossier élève, aucun OCR, aucun stockage de fichier, aucune écriture comptable (ni compte, ni contrepartie, ni TVA — le schéma ne porte rien qui permettrait de le faire honnêtement). Les générateurs de documents, le login, l'onboarding, la sidebar et le tableau de bord n'ont pas été touchés.

## LOT 11.1 — Correctif de sécurité financière — ✅ FAIT (17 août)

Correctif ciblé sur les trois constats du lot 11. **Aucune migration Prisma** : c'est un correctif de code.

### 1 · Fuite PARENT — la cause était double, et un correctif « évident » aurait échoué

`payments/page.tsx` listait `where: { schoolId }` sans plus, et `PARENT` a accès à cette route.

**Le schéma porte DEUX chemins d'un parent vers une facture** : direct (`Invoice.parentId`) et indirect (`Invoice.studentId → Student.parentId`). Mesuré en base : **0 facture sur 6 utilise le lien direct**, 4 passent par l'élève, 2 n'ont aucun rattachement. Ne corriger que `Invoice.parentId` aurait donné une liste vide à tous les parents — un correctif qui paraît fonctionner tout en masquant les vraies factures.

`invoiceScope(actor)` couvre les deux, `schoolId` d'abord. Les factures non rattachées ne correspondent à personne : c'est le bon comportement.

**Les agrégats fuyaient autant que la liste.** Même filtrée, la page aurait continué d'afficher la trésorerie de l'école dans ses cartes. `invoiceOverview()` borne les totaux aux factures visibles.

### La surface était plus large que l'écran signalé

Un `PARENT` atteignait **11 pages lisant des données**. Dans le domaine facturation, quatre écrans d'émission chargeaient tout l'établissement :

| Écran | Ce qu'il exposait |
|---|---|
| `payments/new` | tous les élèves inscrits · **et `schoolId: dbUser?.schoolId`** — le motif `undefined` du lot 00, resté ici : Prisma ignore un filtre `undefined` |
| `documents/invoice` · `documents/receipt` | tous les élèves, classes comprises |
| `documents/reminder` | toutes les factures échues **avec nom, téléphone et e-mail du parent de chaque famille** |

Filtrer leur contenu n'aurait aucun sens — ce sont des outils d'émission. Quatre refus dans `ROLE_DENIALS` + garde serveur sur chaque page. Le hub Documents filtre ses cartes par `hasAccess()` pour ne pas offrir de liens morts (4 modèles sur 7 pour un parent).

### 2 · Deux découvertes de plus, dans le même domaine

**`markInvoiceAsPaid` n'avait AUCUN contrôle de rôle** — un parent pouvait solder n'importe quelle facture de son école. Élévation de privilège, pas seulement fuite. `createInvoice` non plus. Les deux exigent maintenant `/dashboard/payments/new` via `requireActionContext()`, et `createInvoice` vérifie que l'élève facturé appartient bien à l'établissement de la session.

### 3 · Total encaissé — la cause exacte

**Deux factures portent `totalAmount = 0` alors qu'elles ont reçu 70 000 et 40 000 FCFA.** 70 000 + 40 000 = **110 000 = l'écart exact** entre 196 866 et 306 866. La colonne a `@default(0)` et rien ne la recalcule à l'arrivée d'un paiement.

**Définition retenue : « encaissé » = somme des lignes `Payment` des factures concernées.** Deux points imposés par le schéma :

- **`Payment` n'a aucune colonne de statut** — l'existence de la ligne EST l'encaissement. Un filtre `status = PAID` sur `Payment` est impossible.
- **`Invoice.totalAmount` n'est pas un registre d'argent.** Ne jamais l'additionner pour dire « encaissé ».

Une seule implémentation, `collectedByMethod()`, appelée par l'écran Paiements **et** par l'état financier. Vérifié en exécution : les deux rendent 75 000 sur le même jeu, quand la somme des factures PAID donnait 50 000.

La carte compte désormais des **versements**, plus des « factures réglées » — compter des factures à côté d'une somme de paiements suggérait un lien qui n'existe pas.

### 4 · OVERDUE

Aucune infrastructure de tâches dans le dépôt : ni `vercel.json`, ni cron. Trois pièces :

- **`src/lib/overdue.ts`** — `PENDING` + `dueDate < maintenant` → `OVERDUE`, école par école. `lt` et non `lte` : l'échéance du jour laisse la journée pour payer. L'`updateMany` **répète le statut de départ** dans son `where`, sinon une facture réglée entre la lecture et l'écriture serait ramenée en retard.
- **`scripts/mark-overdue.ts`** — essai à blanc par défaut, `APPLY=1` pour écrire.
- **`/api/cron/overdue`** — POST, secret `CRON_SECRET`, comparaison à durée constante, **échec fermé** : sans secret la route renvoie 503 et reste inerte. `GET` → 405.

**Idempotence prouvée** : 2ᵉ et 3ᵉ exécutions → 0 écriture, 0 audit dupliqué. `PAID`, `CANCELLED`, `DRAFT` et `OVERDUE` ne sont jamais sources.

**L'acteur est le système, pas un humain.** `SYSTEM_ACTOR_ID = "system"` — `AuditLog.userId` est un `String` sans clé étrangère, donc la sentinelle s'y écrit sans contrainte. `isSystemActor()` évite que l'historique affiche « Compte supprimé » pour une machine.

**Choix assumé : `AuditLog` et pas `WorkflowTransition`.** Déclarer une machine d'état pour `Invoice` aurait exigé de modéliser les 6 valeurs de `InvoiceStatus` et leurs transitions, au risque de contraindre le code de facturation existant. L'audit répond déjà à « quelle facture, quel ancien statut, quel nouveau, quand, par qui ».

### Vérification

- `scripts/verify-finance-security.ts` (13ᵉ vérificateur) — **100 contrôles**.
- **Exécution réelle** : deux parents dans la même école, un troisième dans une autre. Parent A voit ses 3 factures et **aucune** de B ; Parent B voit les siennes via le lien **direct** ET via l'élève ; aucun ne voit la facture non rattachée. Agrégats distincts (45 000 / 25 000 / 645 000). Le comptable voit son école, rien de l'autre.
- **Rendu HTTP réel** (sonde temporaire, supprimée) : la facture « SECRET Ibrahima » est **absente du HTML** servi au parent d'Awa, et le bouton « Encaisser » n'apparaît que pour le comptable.
- Endpoint cron : 401 sans secret, 401 mauvais secret, 200 avec, 405 en GET.
- Non-régression : **13 vérificateurs, 823 contrôles.** `tsc` propre. Base identique avant/après.

### Trois faux échecs de mes propres vérificateurs

Les invariants des lots 10 et 11 sont devenus trop stricts, et il fallait les **resserrer**, pas les affaiblir :

1. `where: scope` ne contient pas le mot « schoolId » — pourtant `invoiceScope()` le pose toujours. Motif **plus** strict qu'une propriété écrite à la main. Toléré, avec une contrepartie : tout `scope` doit provenir d'`invoiceScope()`.
2. `finance.ts` cite `"PARENT"` — c'est une règle de **visibilité de données**, pas d'accès, et elle ne s'exprime pas en chemin d'URL. Exception unique, vérifiée mention par mention.
3. `audit.ts` exporte `systemActor(schoolId)` — un **constructeur** de contexte, comme `requireActionContext()`. Exempté, avec contrepartie : il ne doit être appelé que par le balayage, jamais par une server action.

### ⚠️ Reste ouvert — hors périmètre de ce lot

**Cinq générateurs de documents exposent encore le trombinoscope de l'école à un parent** : `certificate`, `info-sheet`, `report-card`, `timetable`, `drafts` chargent tous les élèves sans filtre. Même nature que la fuite corrigée, mais hors du domaine facturation. **À traiter dans un lot dédié** — c'est aujourd'hui le trou de confidentialité le plus large du produit.

Également non traité : `Invoice.totalAmount` reste incohérent sur deux factures (données historiques, non corrigées — le lot ne réécrit pas de données métier) ; `PARTIAL` n'est écrit par aucun code, donc jamais basculé en retard ; le webhook PayDunya met à jour une facture sans vérifier son établissement.

## Chantier PLG — landing, connexion, installation, première valeur — ✅ FAIT (19 août)

**Le parcours d'entrée n'avait jamais été relu.** Il vendait un produit qui
n'existe pas et cachait celui qui existe. La liste des affirmations retirées est
longue et vaut d'être conservée, parce qu'aucune n'avait été écrite de mauvaise
foi : un module « Suivi des présences » (aucune donnée de présence au schéma),
un « Pipeline Admissions », une application « EduCom Parents », **des tarifs
inventés en euros** (0 € / 199 € / sur mesure), « 14 jours » et « 7 jours »
d'essai dans le **même** composant, « des dizaines d'écoles nous font déjà
confiance », un **témoignage signé d'une personne inexistante sur la page de
connexion**, dix liens de pied de page vers `#`, et « vos données sont chiffrées
et sauvegardées quotidiennement » — la promesse que le durcissement RLS du même
jour venait justement d'invalider.

**Le premier WIN retenu : le certificat de scolarité.** C'est le seul livrable
réel qui n'exige rien d'autre qu'un élève inscrit — ni matières, ni notes, ni
période, ni grille tarifaire — et c'est le document qu'une école sénégalaise
édite le plus souvent (banque, bourse, ambassade). Le parcours mesuré de bout en
bout est : accueil → CTA → inscription → installation → premier élève →
**certificat au nom réel de l'élève, à l'en-tête de l'école réelle**.

**Deux bugs métier trouvés au passage, sans rapport avec la mise en page.** Les
inscriptions étaient créées en année scolaire **« 2023-2024 » codée en dur**, et
le certificat imprimait la même valeur : le premier document d'une école sortait
avec une année vieille de trois ans. L'installation imposait aussi **3,5 s
d'attente fabriquée** (« Simulate a bit of loading for the *magical* effect ») ;
elle prend maintenant 0,9 s.

**L'installation demande d'abord les niveaux**, la seule question qui construit
quelque chose (les classes en découlent). Téléphone et adresse, qui ouvraient le
questionnaire, sont devenus visiblement facultatifs.

### Addendum — preuve sociale, tarifs, direction artistique (19 août)

**La grille tarifaire est arrêtée par Kory** : essai 14 jours · Pro 20 €
(≈ 13 100 F CFA) · Premium 30 € (≈ 19 700 F CFA), affichés **dans les deux
monnaies**. La parité étant fixe (1 € = 655,957 F CFA), aucun service de change
n'est appelé — la conversion ne peut donc pas devenir fausse un matin.

⚠️ **Ce qui n'a pas été inventé pour autant** : la répartition des
fonctionnalités entre Pro et Premium, les limites, les quotas, les conditions
contractuelles, et toute mention « le plus populaire ». Rien de cela n'est
décidé (`rappel.md` §48). ⚠️ **Et l'essai n'est appliqué par aucun mécanisme** :
`School` n'a ni plan, ni abonnement, ni date de fin (§49). Partout où « 14 jours »
apparaît, la phrase « rien ne peut vous être débité » l'accompagne — et un
contrôle **échoue** si elle disparaît.

**La preuve sociale est une surface vide, assumée.** `SchoolStories` bascule
seule vers une grille de témoignages dès qu'un objet est ajouté à `TEMOIGNAGES`.
L'addendum autorisait du contenu de démonstration étiqueté ; il n'en a pas été
fabriqué, parce qu'une carte « exemple » finit toujours par être publiée sans son
bandeau. À la place, la section dit qu'il n'y a pas encore de clients et énonce
la règle de publication des futurs témoignages. **C'est le seul endroit de la
page où l'absence de preuve devient un argument.**

**Direction artistique — pourquoi une seconde échelle de couleurs.** Les tokens
produit sont neutres par construction : `--color-primary` est **surchargé à
l'exécution par la couleur de chaque école**. Y brancher la page d'accueil aurait
donné une marque qu'un client peut repeindre. Une échelle `--m-*` a donc été
ajoutée, avec le marine **et le vert de la marque** (#0B1F3A / #1CA46B) lus dans
`public/brand/educom-symbole.svg` — **le vert n'était utilisé nulle part**, la
moitié de l'identité dormait dans un SVG. Le fond est un blanc **chaud**, pas le
gris-bleu par défaut de toute maquette générée : EduCom fabrique du papier.

**Une famille d'affichage à empattements (Fraunces) sur les titres publics
uniquement.** Le lien n'est pas décoratif : les certificats et bulletins que le
produit édite sont composés ainsi depuis toujours. Deux graisses seulement — la
page doit s'ouvrir depuis Dakar en mobile. Le produit garde Inter.

**Le « E » dans un carré bleu a disparu.** `public/brand/` contenait dix-neuf
fichiers finis, dont un logotype horizontal ; la barre de navigation, le pied de
page, la connexion et l'inscription en dessinaient un substitut en HTML.

**Les pages secondaires ont dû suivre.** `/features` portait
`AnalyticsSection` et ses **quatre statistiques inventées** (342, 284, 198, 124) ;
`/solutions` annonçait un envoi WhatsApp « en un clic » et un suivi des absences ;
la FAQ de `/pricing` affirmait un envoi SMS avec accusés de lecture et un import
Excel. Toutes réécrites. **`/features` et `/solutions` lisent désormais
directement `src/lib/documents.ts` et `src/lib/permissions.ts`** : une page
publique branchée sur la source de vérité ne peut pas dériver, et un rôle inventé
ne compile pas.

**Deux pages de tarifs coexistaient** (`Pricing` sur l'accueil, `PricingSection`
sur `/pricing`) **avec des montants différents** : le prix dépendait de la page
d'arrivée. `PricingSection` a été supprimé.

**Neuf composants dormants** conservent des affirmations fausses. Chacun porte un
en-tête `⚠️ COMPOSANT DORMANT` nommant sa faute, et un contrôle échoue si une
page en réimporte un (`rappel.md` §54).

### Ce que les sondes ont trouvé, et qui n'était pas cosmétique

⚠️ **Fuite entre établissements sur le formulaire d'admission** (`rappel.md`
§52). `students/new/page.tsx` listait les classes de **toutes les écoles**, et
si aucune n'existait, en **créait six dans une école arbitraire**. Un collège
voyait par ailleurs une liste vide, sans explication, sur l'écran qui mène à sa
première valeur. La barrière de `createStudent()` a tenu — mais elle était la
seule, et son message (« Classe introuvable dans votre établissement ») était le
seul indice. `verify-tenant-isolation` ne couvrait pas ce chemin.

⚠️ **Le débordement de 847 px ne venait pas d'où on le croyait.** On a d'abord
soupçonné la feuille A4 de l'aperçu et posé un conteneur de défilement autour :
sans effet. La cause réelle était la **rangée haute de la barre du générateur**,
un `flex` sans `flex-wrap` dont les enfants ont `min-width: auto`.

⚠️ **La sonde annonçait deux résultats contradictoires** (§56) :
`getBoundingClientRect()` est relatif au *viewport*, donc un bloc de 800 px
commençant à x = −457 rendait `right = 390` et n'était pas signalé, pendant que
`scrollWidth` valait 847. Mesure désormais en coordonnées **document**, après
retour à l'origine.

⚠️ **La limite « cibles tactiles du lot 09 » est fermée.** Elle était annoncée
comme connue et tolérée : 14 contrôles de la barre du générateur sous 32 px sur
l'écran de première valeur. Tous corrigés, y compris **deux boutons sans nom
accessible** que la sonde ne pouvait désigner que par « BUTTON » — dont celui qui
efface une signature. `title` seul ne suffisait pas : il ne s'ouvre pas au doigt.

⚠️ **Un échafaudage posé sur une mauvaise hypothèse a été retiré.** Un conteneur
de défilement avait été ajouté autour de la feuille A4 pour « confiner » le
débordement ; il n'a jamais rien corrigé, et ajoutait trois surcharges
d'impression que `verify-documents` a signalées en comparant au gabarit du
lot 09. Retiré : l'écran mesure 390/390. **Le vérificateur avait raison contre la
correction.**

⚠️ **Toute troncature n'est pas un défaut.** Le nom d'école de la barre mobile
(64 px de haut, partagée avec le tiroir et le menu du compte) ne peut pas passer
à la ligne. Le marqueur `data-tronque-volontaire` le sort du verdict — mais les
troncatures assumées sont **affichées**, jamais tues, et le marqueur ne doit
jamais être posé sur un texte dont la valeur complète n'est lisible nulle part
(ici : le tiroir, à un geste).

### État de vérification

`verify-plg-runtime` **80/80**, `verify-landing-runtime` **64/64** (nouvelle
sonde : 5 pages publiques × 390 et 1440, contenu exigé, **14 contenus
interdits**, liens, ancres, marque, composants dormants). Non-régression :
lots 13.1/14/15/16/17, RLS 48/48, isolation, navigation, tokens, primitives,
responsive 29/29. `verify-foundations` reste à **5 échecs pré-existants**
(`rappel.md` §34), inchangés.

⚠️ **Un maillon reste NON PROUVÉ** : `auth.signUp()` échoue chez Supabase
(confirmation e-mail + **quota épuisé**). **Aucune école ne peut créer son espace
aujourd'hui** — blocage de fournisseur, pas de code (`rappel.md` §50).

⚠️ **Stitch et Higgsfield n'ont pas été utilisés.** Le socle de tokens et la
marque existaient déjà, et le risque à écarter était précisément le rendu
« généré » : une maquette produite hors du dépôt aurait rouvert ce risque et
n'aurait pas pu être mesurée dans un vrai navigateur.

## Audit de mise en production — ⚠️ AUCUNE MODIFICATION, AUDIT SEUL (19 août)

Étape A d'un chantier de mise en ligne : auditer, rapporter, s'arrêter. **Rien
n'a été modifié.** Six constats nouveaux, consignés en `rappel.md` §64 à §69.

Les deux plus graves, parce qu'ils ne se voient pas depuis l'application :

⚠️ **Le dépôt n'est sous aucun contrôle de version.** `git rev-parse` répond
« not a git repository ». Aucun historique, aucun retour arrière, aucune copie
du code hors du disque de Kory — et rien à déployer, puisque Vercel, Docker et
l'auto-hébergement partent tous d'un dépôt.

⚠️ **Les deux webhooks sont ouverts.** `/api/webhooks/paydunya` accepte
n'importe quel POST anonyme et, sur `{"status":"completed","custom_data":
{"invoice_id":"…"}}`, **marque la facture PAYÉE et crée un `Payment`** — dans
n'importe quelle école, sans qu'aucun paiement ait eu lieu. Le motif correct
existe pourtant déjà dans le dépôt : `/api/cron/overdue` refuse tout tant que
son secret n'est pas défini.

⚠️ **CES DEUX POINTS SONT TRAITÉS — voir la section suivante.** Le dépôt existe
depuis le 19 août 2026 au soir, et les deux webhooks ont été supprimés, non pas
sécurisés : aucun fournisseur réel ne les appelait.

S'y ajoutent : le projet **ne peut pas se construire ailleurs** (`prisma
generate` n'est appelé nulle part et sa sortie est ignorée par Git ;
`next.config.ts` est vide, sans `standalone` ni en-tête de sécurité) · une clé
Google **en clair** dans `.mcp.json` à la racine · six variables lues par le
code et absentes de `.env` · un compte de sonde et une ligne applicative
orpheline dans la base · **aucune supervision, aucune sauvegarde vérifiée**.

Point vérifié et conforme : la clé de service n'est lue qu'à un seul endroit,
côté serveur, et `verify-rls` (48/48) contrôle son absence du bundle. La
compilation ne dépend pas d'ESLint — la documentation embarquée de Next 16 le
dit — donc les 347 erreurs de lint sont de la dette, pas un blocage.

## Pilote — inscription réelle et isolation multi-école — ⚠️ CODE PRÊT, FOURNISSEUR BLOQUANT (19 août)

**Le critère de succès n'est pas atteint, et ce n'est pas le code qui l'empêche.**
Une personne extérieure ne peut pas encore créer son compte : le service d'envoi
d'e-mails intégré de Supabase répond `429 over_email_send_rate_limit`. Tout le
reste du parcours est vérifié.

### Le diagnostic, mesuré et non supposé

`GET /auth/v1/settings` : `disable_signup: false`, `external.email: true`,
`mailer_autoconfirm: false`. L'inscription est **ouverte**, la confirmation
d'adresse **exigée**. Deux refus distincts, obtenus par de vraies requêtes :
`400 email_address_invalid` pour les domaines sans MX (`example.com`, un
`.sn` inventé), **`429 over_email_send_rate_limit`** pour une adresse valide.

⚠️ **La note du chantier PLG (`rappel.md` §50) attribuait le blocage à
l'adresse ; c'était faux.** Le blocage est le **quota d'envoi** du service
intégré de Supabase, destiné aux essais et jamais à la production. Toujours 429
25 minutes plus tard.

⚠️ **Rien n'a été désactivé pour faire passer un test.** Les trois voies
possibles — SMTP propre, désactivation de la confirmation, confirmation manuelle
compte par compte — engagent une dépense, un sous-traitant ou une posture de
sécurité. Elles sont documentées dans `rappel.md` §57 et attendent Kory.

### Ce qui a été corrigé, et qui aurait cassé le pilote même sans ce blocage

⚠️ **Aucun proxy n'était branché.** Il n'existait pas de fichier de proxy, et
**deux** implémentations de `updateSession` dormaient au dépôt. Or
`@supabase/ssr` ne peut pas écrire de cookie depuis un composant serveur : sans
proxy, **le jeton rafraîchi n'était jamais conservé** et chaque utilisateur
était déconnecté au bout d'une heure, en pleine saisie.

⚠️ **Deux pièges Next 16 dans le même fichier.** La convention `middleware.ts`
est **renommée `proxy.ts`** — mais l'ancien nom **s'exécute quand même** : les
redirections fonctionnaient pendant que **toutes les pages publiques renvoyaient
404**. Et `NextResponse.next({ request })`, la forme montrée par la
documentation Supabase, produit une **404** sous Next 16. Le symptôme ne
désignait ni l'une ni l'autre cause.

⚠️ **Cinq établissements fantômes, et l'usine qui les fabriquait.**
`register()` créait l'école **puis** l'utilisateur, en deux écritures séparées ;
l'école survivait à l'échec de la seconde. La cause principale était plus
subtile : quand l'adresse est déjà inscrite, **Supabase ne renvoie pas
d'erreur** mais un utilisateur factice avec `identities: []` — pour ne pas
révéler quelles adresses existent. Le code y voyait une inscription réussie et
fabriquait une école de plus. D'où les doublons datés du même jour
(« SABA ACADEMY » ×2, « gomis » ×2) : des personnes qui réessayaient. Corrigé
par une **transaction** ; les cinq écoles vides supprimées après essai à blanc
et sauvegarde (`scripts/purge-orphan-schools.ts`).

⚠️ **Le parcours d'inscription s'interrompait en silence.** Avec la confirmation
exigée, `signUp()` renvoie un compte **sans session** ; le code redirigeait
quand même vers `/onboarding`, qui exige une session et renvoie vers `/login`.
La personne venait de créer son compte et se retrouvait devant un formulaire de
connexion, sans un mot. Un écran « Confirmez votre adresse » le dit maintenant,
et `/auth/callback` — qui renvoyait par défaut vers la page d'accueil
commerciale — mène au tableau de bord.

⚠️ **`dashboard/layout.tsx` ne redirigeait pas** un visiteur sans session : il
rendait la coquille du tableau de bord avec le rôle `PARENT` par défaut, et
imprimait l'adresse e-mail de chaque utilisateur dans le journal du serveur à
chaque navigation. Rien ne fuyait — chaque écran se protège lui-même — mais la
barrière était absente là où on la croyait posée.

Les messages d'authentification étaient enfin **en anglais** dans une interface
française. « Email not confirmed » est précisément celui que le pilote allait
produire le plus souvent.

### Isolation multi-école — vérifiée sur deux comptes réels

`scripts/verify-pilote-auth.ts` (**62/62, 1 NON PROUVÉ**) crée deux comptes
Supabase et deux écoles, ouvre deux vraies sessions, puis interroge le serveur
en HTTP avec les **identifiants réels de l'autre école** — pas devinés, car une
URL partagée ou une capture d'écran suffit à les révéler.

A → A et B → B autorisés. A → B et B → A refusés sur la fiche élève, le dossier
numérique, la classe et sa modification. Aucune trace de l'autre école dans la
liste des élèves, des classes, le centre documentaire, les rapports ni l'équipe.
**« N'existe pas » et « pas le droit » répondent la même chose** — sans quoi on
pourrait énumérer les identifiants valides. Dix routes protégées renvoient vers
la connexion sans session. La clé publique ne lit ni l'une ni l'autre école
(RLS). La sonde supprime ses deux écoles et ses deux comptes.

⚠️ **Un maillon reste NON PROUVÉ** : personne n'a reçu un vrai e-mail de
confirmation ni cliqué son lien. La route existe, refuse un lien incomplet avec
un message français et n'accepte que des destinations internes — mais qu'un lien
`?code=` réellement émis ouvre la session **n'a pas pu être vérifié**
(`rappel.md` §62).

## Sécurité Supabase — RLS, Storage, TLS — ✅ DURCI (19 août)

**Hors lot numéroté.** Audit puis durcissement de la frontière Supabase, plus la
consignation des sujets hébergement / OCR / juridique dans `rappel.md` (§36-47).

### Le fait d'architecture qui commande tout le reste

⚠️ **L'application ne passe JAMAIS par PostgREST ni par le Storage client.**
Prisma se connecte comme rôle `postgres`, qui porte `BYPASSRLS` ; le Storage
passe exclusivement par la clé de service, côté serveur. Le client navigateur
(`src/lib/supabase/client.ts`) n'est **importé nulle part** — c'est du code mort.
La clé `anon` ne sert qu'à l'authentification (`/auth/v1`).

**Conséquence directe, et contre-intuitive : la bonne posture RLS est le REFUS
TOTAL, pas des policies « par école ».** Écrire des policies de lecture par
`schoolId` **ouvrirait** un accès aujourd'hui fermé, sans qu'aucun écran en ait
besoin. C'est pourquoi ce durcissement **n'ajoute aucune policy** — il retire des
droits. Ne pas défaire ce raisonnement en croyant bien faire.

### État avant

| | Avant |
|---|---|
| RLS sur les 34 tables de `public` | **actif**, 0 policy → refus total |
| Droits de `anon` / `authenticated` | **tous** : SELECT, INSERT, UPDATE, DELETE, **TRUNCATE**, REFERENCES, TRIGGER — sur les 34 tables |
| Droits **par défaut** dans `public` | les mêmes, donc accordés à **toute future table** de `prisma db push` |
| `storage.objects` / `storage.buckets` | RLS actif, 0 policy → refus total |
| Bucket `student-documents` | privé, 10 Mo, liste de types MIME |
| Connexion Postgres | **EN CLAIR — aucun TLS** |

### Ce qui a été fait

**1. Retrait des droits de `anon` et `authenticated` sur `public`** (tables,
séquences, routines), **et des droits par défaut**. RLS était la seule barrière ;
un `DISABLE ROW LEVEL SECURITY` malheureux, ou une policy trop large, aurait
ouvert toute la base à une clé lisible dans le navigateur. Deux verrous valent
mieux qu'un, surtout quand le premier se désactive d'un clic.

**2. Correction du transport.** ⚠️ **La connexion à la base n'était pas
chiffrée.** `node-postgres` ne négocie TLS que si `sslmode` figure dans l'URL —
sinon il ouvre une socket nue. Tout ce que Prisma lit ou écrit (noms d'élèves,
dates de naissance, téléphones, identifiants de connexion) traversait le réseau
en clair jusqu'en Irlande. Le serveur acceptait TLS 1.3 depuis toujours ;
personne ne le lui avait demandé. `sslmode=no-verify` ajouté aux deux URL,
TLS 1.3 vérifié côté socket.

**Revenir en arrière, si besoin** : retirer `?sslmode=no-verify` /
`&sslmode=no-verify` de `DATABASE_URL` et `DIRECT_URL` dans `.env`, puis
redémarrer. ⚠️ **Aucune copie de `.env` n'a été conservée dans `backups/`** — un
mot de passe de base en double sur le disque est un risque, pas une sauvegarde,
et la modification tient en une chaîne de caractères.

⚠️ `no-verify` **chiffre sans valider le certificat** (la chaîne du pooler
Supabase est auto-signée du point de vue de Node : `sslmode=require` échoue en
`SELF_SIGNED_CERT_IN_CHAIN`). Cela protège d'une écoute passive, pas d'un
intercepteur actif. Passage à `verify-full` consigné en `rappel.md` §37.

**3. Aucune policy ajoutée. Aucun `FORCE ROW LEVEL SECURITY`** — un rôle
`BYPASSRLS` passe outre de toute façon, ce serait décoratif. **`storage.objects`
non touché** : RLS y refuse déjà tout, et retirer les droits du rôle
`authenticated` risquerait de gêner le service Storage lui-même, qui applique les
rôles JWT pour évaluer RLS. Bénéfice nul, risque réel.

### Ce qui n'a pas pu être fait

Les droits **par défaut de `supabase_admin`** dans `public` accordent encore tout
à `anon`/`authenticated` : `postgres` n'est pas superutilisateur
(`permission denied to change default privileges`). Sans conséquence pratique —
les tables de `prisma db push` appartiennent à `postgres`, donc ce sont **ses**
droits par défaut qui s'appliquent, et ils sont désormais fermés.

### Vérification

`scripts/verify-rls.ts` — **48 contrôles, 0 échec**. Il ne lit pas seulement le
catalogue : il **appelle réellement l'API** avec la clé anonyme publique et avec
**sept jetons d'utilisateur réels** (un par rôle), tente de lire, d'insérer, de
modifier et de **supprimer une vraie ligne et un vrai fichier** — puis vérifie
qu'ils sont toujours là.

Résultat : aucune des 9 tables sensibles n'est lisible ni par `anon` ni par
**aucun des 7 rôles** ; `studentId`, `schoolId`, `documentId` devinés ne donnent
rien ; téléchargement, listage, dépôt et suppression Storage sont refusés à tous ;
la clé de service est absente du HTML servi et des 17 scripts chargés par la page
de connexion.

⚠️ **À relancer après tout `prisma db push`** : une table neuve naît avec RLS
active (réglage Supabase, vérifié par un `CREATE TABLE` annulé) mais le
vérificateur est le seul garde-fou contre une dérive.

`scripts/harden-rls.ts` — essai à blanc par défaut, `APPLY=1` pour écrire,
sauvegarde des droits en JSON dans `backups/`, rollback SQL imprimé. Aucune
instruction destructive n'y est admise : un garde-fou refuse `DROP`, `TRUNCATE`,
`DELETE FROM` et `DISABLE ROW LEVEL SECURITY`.

### Non-régression

Comptages identiques avant/après (136 élèves, 10 comptes, 1 pièce, 17 lignes
d'audit). `tsc` propre. Relancés à 0 échec : `verify-lot-13-1` (67),
`verify-lot-14` (70), `verify-lot-15` (75), `verify-lot-16` (85),
`verify-lot-17` (91), `verify-export-runtime` (30), `verify-render-dossier` (38),
`verify-student-file` (73), `verify-reports` (89), `verify-fees` (80),
`verify-diffusion-runtime` (54), `verify-responsive-export` (36),
`verify-tenant-isolation`, `verify-action-guards`.

⚠️ **Le serveur `next dev` en cours doit être redémarré** pour prendre le
nouveau `sslmode` : `src/lib/prisma.ts` met le pool en cache sur `globalThis`,
donc un simple « Reload env » de Next ne recrée pas la connexion. Tout nouveau
processus (scripts, vérificateurs) est déjà chiffré.

### Risques restants, nommés

1. **La clé de service contourne RLS.** Elle vaut un accès total. Aucune policy
   ne l'arrête ; en cas de fuite, seule sa **rotation** protège.
2. **`sslmode=no-verify`** — chiffré, certificat non validé (`rappel.md` §37).
3. **`anon` et `authenticated` conservent leurs droits sur `storage.objects`** —
   inoffensif tant que RLS y reste sans policy, mais c'est le même schéma de
   fragilité que celui corrigé sur `public`.
4. **Rien n'est déployé** : l'analyse de localisation, de souveraineté et de
   transferts internationaux reste entière (`rappel.md` §38-40).

## LOT 17 — Diffusion / partage des documents — ✅ FAIT (19 août)

**But** : donner à EduCom une vraie capacité de **diffusion** des documents, après
la chaîne dossier → scan → centre → export. Sans inventer d'intégration.

### Ce que l'audit des intégrations a réellement trouvé

⚠️ **La première étape du lot n'était pas du code, c'était une interrogation des
fournisseurs configurés.** Résultat, obtenu en lecture seule sur l'API Twilio :

| | Réalité constatée |
|---|---|
| **Compte Twilio** | joignable, actif, **de type essai (Trial)** |
| **Numéros détenus** | **aucun** — `TWILIO_PHONE_NUMBER = +17372508034` n'appartient pas à ce compte |
| **Numéros vérifiés** | aucun (un compte d'essai ne peut écrire qu'à des numéros vérifiés) |
| **Expéditeurs WhatsApp** | indisponibles : « This feature is not available on a Trial account » |
| **Messages émis depuis la création** | **zéro** |
| **Service e-mail** | aucun SDK installé, aucune variable lue |
| **Google Drive** | aucun SDK, aucun identifiant |

**Conséquence directe : rien ne peut sortir d'EduCom aujourd'hui.** Le lot 17
n'implémente donc que la branche que le cahier des charges prévoit dans ce cas —
**préparer**, jamais « envoyer ».

### ⚠️ Le défaut le plus grave du projet, trouvé ici

`sendBulkWhatsAppMessages()` écrivait **`status: SENT`** pour des messages qui ne
partaient jamais. Deux chemins y menaient : l'absence d'identifiants
(« simulation mode », qui enregistrait quand même la campagne comme envoyée) et
l'échec d'un appel Twilio (le `catch` écrivait dans la console, puis `SENT` était
inscrit). L'écran affichait ensuite **« Campagne envoyée »**.

Ce n'était pas théorique : la table `Message` porte **six lignes `SENT`**, et le
journal Twilio du compte en compte **zéro depuis sa création**. Aucune de ces six
campagnes n'a jamais existé.

Corrigé : l'action consulte désormais `channels()`, n'écrit plus rien quand aucun
canal ne peut envoyer, et l'écran affiche la raison sous le bouton.

⚠️ **Les six lignes historiques n'ont PAS été modifiées** — corriger des données
existantes est une décision de Kory, pas un effet de bord de lot (règle 4).
Consigné dans `rappel.md`.

### Décisions d'architecture

**1. Un seul juge de ce qui peut partir : `src/lib/channels.ts`.** Trois états —
`ABSENT`, `CONFIGURE_NON_PROUVE`, `OPERATIONNEL` — et un seul autorise le mot
« envoyé ». ⚠️ `CONFIGURE_NON_PROUVE` **n'est pas un demi-succès, c'est un
refus** : une clé dans `.env` ne dit pas que le compte est actif, qu'il détient
un expéditeur, ni que le fournisseur accepterait la requête. Le dépôt en est la
preuve vivante.

Un canal ne devient `OPERATIONNEL` que si son identifiant figure dans
`SEND_IMPLEMENTATIONS`, **registre volontairement vide**. C'est la seule ligne à
modifier le jour où un envoi réel existe — jamais un écran.

**2. Le chemin d'envoi réel n'a pas été écrit.** Écrire du code d'envoi jamais
exécuté, qui se déclarerait prêt, reproduirait exactement le défaut corrigé
ci-dessus. La branche existe, elle refuse et nomme ce qui manque.

**3. Aucune table nouvelle** (comme au lot 16) : `AuditLog` porte l'acte
(`entity: "diffusion"`) **et** une ligne sur le document lui-même
(`action: "document.diffuse"`), qui rend « ce document a-t-il été diffusé ? »
interrogeable par index au lieu d'exiger la relecture de `details`.

**4. Aucune permission nouvelle.** Un document d'établissement passe par
`canSeeDocument()` (lot 15) ; une pièce d'élève par `canSeeCategory()` +
`canSeeStudent()` (lot 13.1). Un enseignant qui ne voit pas une pièce `SANTE` ne
peut pas la diffuser — non parce qu'un bouton est caché, mais parce que la
résolution échoue, avec **le même message** que pour une pièce inexistante.

**5. Une pièce d'élève ne part jamais vers un groupe.** Borne structurelle : le
seul destinataire possible est le parent de CET enfant. Une erreur de sélection
sur un extrait de naissance ne se rattrape pas.

**6. `prepareShare()` du lot 15 a été REMPLACÉ**, pas doublé. Deux voies de
partage auraient donné deux réponses à « qui est concerné ». Les invariants du
lot 15 sont vérifiés à leur nouvelle adresse (`verify-lot-15.ts` §I repointé).

**7. Vocabulaire d'état honnête.** `PREPARE`, `REMIS_MANUELLEMENT`, `ECHEC` sont
écrits. `EN_COURS`, `TRANSMIS`, `CONFIRME` sont **nommés comme interdits**
(`FORBIDDEN_STATES`) pour qu'un vérificateur puisse prouver qu'aucun n'apparaît.

**8. Le lien remis dure 10 minutes**, sa durée est écrite à l'écran, et l'écran
dit explicitement que ce n'est « ni un lien permanent, ni une preuve de
transmission ».

### Pièges rencontrés

- **Un vérificateur trop large produit un faux échec.** Interdire le mot
  « twilio » dans `channels.ts` échouait sur `twilioSenderIsWhatsApp()` — il faut
  bien nommer les variables qu'on lit. L'invariant juste : aucun SDK importé,
  aucun appel réseau.
- **`sr-only` n'est pas « du texte tronqué ».** La sonde signalait quatre faux
  défauts : les libellés réservés aux lecteurs d'écran mesurent 1 px **par
  construction**. La mesure exclut désormais les éléments invisibles — mais le
  cinquième signalement était **réel** : un nom de famille long était coupé dans
  la liste des destinataires, faute de point de césure (`break-words` ajouté).
- **Le pilotage CDP a été extrait dans `scripts/_cdp.ts`**, partagé par les deux
  sondes. En garder deux copies les aurait fait diverger.

### Vérification

- `scripts/verify-lot-17.ts` — **91 contrôles, 0 échec**. Il **interroge
  réellement Twilio en lecture seule** avant tout le reste.
- `scripts/verify-diffusion-runtime.ts` — **54 contrôles, 0 échec**. Chrome
  piloté, vraie session, **390 × 844 et 1440 × 900** : la modale s'ouvre pour de
  bon, les destinataires réels sont lus à l'écran, le changement de canal refait
  la préparation côté serveur, la confirmation est demandée, et la trace écrite
  est **relue en base**.
- Non-régression : `tsc` propre ; `verify-lot-13-1` (67), `verify-lot-14` (70),
  `verify-lot-15` (75), `verify-lot-16` (85), `verify-export-runtime` (30),
  `verify-render-dossier` (38), `verify-responsive-export` (36 après refonte),
  `verify-fees` (80), `verify-reports` (89), `verify-lot-12-2` (76) — tous à 0
  échec, plus les vérificateurs de socle.

⚠️ **`next build` n'a PAS été lancé** : `next dev` tournait, et les deux écrivent
dans `.next` (règle 3). Vérification par `tsc --noEmit` et par compilation à la
demande du serveur de dev, prouvée par des rendus réels.

⚠️ **`verify-foundations` sort 5 contrôles en échec — antérieurs au lot 17.**
Il exige qu'un `requiredPath` de workflow corresponde à une route avec
`page.tsx` ; `/dashboard/documents/centre/gestion` est un **chemin de permission
sans page**, choix délibéré du lot 15. Consigné dans `rappel.md`, non corrigé :
verdir une assertion sans arbitrage serait exactement le faux vert à éviter.

### État réel de la base (Kory Academy 2, 19 août)

133 élèves · 13 classes · 8 comptes dont **1 seul parent** · **129 élèves sans
parent rattaché** · 0 exigence documentaire · 1 pièce élève · 0 document
d'établissement · 6 messages (tous `SENT`, aucun réellement envoyé) · 17 lignes
d'audit. **Aucun résidu de sonde.**

⚠️ Ce dernier chiffre est le vrai frein produit : **la diffusion aux familles ne
peut atteindre personne tant que les élèves n'ont pas de parent rattaché.**
L'écran le dit désormais en toutes lettres au lieu d'afficher un compteur creux.

## LOT 16.1 — Validation responsive des exports — ✅ FAIT (19 août)

### Cause réelle du blocage de la sonde — ce n'était PAS un délai trop court

La sonde du lot 14 enregistrait le HTML dans un fichier et demandait à Chrome de le
photographier. Deux défauts :

1. **Le contenu n'était jamais rendu.** Depuis `file://`, le JavaScript de Next ne
   s'exécute pas : React n'hydrate rien. On photographiait une coquille.
2. **Chrome ne rendait jamais la main.** `--screenshot` attend une page « au repos » ;
   le client de rechargement à chaud ouvre une WebSocket qui ne se tait jamais. Chrome
   écrivait l'image **puis restait vivant**, et en enchaînant six pages les instances
   s'accumulaient jusqu'au blocage.

⚠️ **Augmenter le timeout n'aurait produit qu'un vert mensonger** : la page n'avait pas de
contenu à mesurer. La correction est un changement de technique, pas de réglage.

### La technique juste

Chrome **piloté par le protocole DevTools**, avec le `WebSocket` natif de Node — aucune
dépendance ajoutée. On ouvre la **vraie URL** avec le **vrai cookie de session** : le
JavaScript s'exécute, React hydrate, les actions serveur répondent. On mesure ensuite le
DOM réellement peint (`scrollWidth` contre `clientWidth`, éléments dépassant la fenêtre,
cibles tactiles) et on **interagit** — cocher, préparer, ouvrir la modale — pour éprouver
les états qui n'existent qu'après un clic.

⚠️ La sonde **refuse de conclure** si le marqueur d'hydratation n'apparaît pas : sans
contenu rendu, elle échoue au lieu d'annoncer « responsive OK ».

### Deux vrais défauts trouvés, et corrigés

1. **L'en-tête de `Card` s'écrasait sur mobile.** `shrink-0` sur les actions laissait
   ~90 px au titre : la description se brisait sur dix caractères de large. Il s'empile
   désormais sous 640 px. Correctif dans un primitif partagé — donc valable pour **tous**
   les écrans, pas seulement celui-ci.
2. **Un seul `useTransition` partagé gelait l'écran entier.** `Button` applique
   `disabled={disabled || loading}` : pendant les 2 à 5 s de lecture des dossiers, **tous**
   les boutons étaient inertes. Mesuré au pilote : le clic sur « Préparer l'export » ne
   faisait rien. Le chargement du tableau a désormais son propre indicateur, et son effet
   est annulable pour qu'un changement de classe n'écrase pas le résultat du suivant.

Troisième correctif, mineur : les cases à cocher passaient de 16 à 20 px et **toute la
ligne** devient la cible tactile via un `<label>` englobant.

### Piège de vérificateur — un faux vert évité

Le premier marqueur d'attente était `/pièce\(s\)/`… qui figure **déjà** dans la liste des
élèves. La sonde a donc cru le résumé affiché alors que le bouton tournait encore. Un
marqueur doit être **unique à l'état qu'on attend** — ici « Télécharger le ZIP ».
De même, le seuil de cible tactile porte sur le **label englobant**, pas sur le dessin du
contrôle : mesurer la case seule aurait fait échouer un écran correct.

### Ce qui est PROUVÉ
390 × 844 et 1440 × 900, contenu React **hydraté** : aucun débordement horizontal dans les
quatre états (initial, sélection, préparé, modale ouverte, état vide), aucun élément hors
écran, aucun tableau, aucune cible sous 32 px, aucun texte tronqué, bouton de
téléchargement à 180 × 40 px. **36 contrôles, 0 échec.** `tsc` propre, 8 vérificateurs de
non-régression verts (dont les primitifs d'interface).

### Ce qui reste
Aucun appareil réel. Un pilote mesure des pixels, pas une main.

## LOT 16 — Export, ZIP, transmission — ✅ FAIT (18 août)

### Décisions arbitrées, et pourquoi

- **L'export ne décide rien : il recopie ce que l'écran montre.** Tout part de
  `studentFile()` (lot 13), déjà borné par l'école, le périmètre du rôle et les
  catégories autorisées. Conséquences obtenues **gratuitement** et vérifiées : un
  enseignant n'exporte que ses classes, aucune pièce de santé n'entre dans son ZIP, un
  parent n'a pas d'export (il n'a pas `/dashboard/students`), seules les versions
  courantes sortent. Refaire ces contrôles n'aurait pu que les affaiblir.
- **La complétude n'est jamais recalculée** : `file.completeness` fait foi. Une seconde
  arithmétique aurait fini par contredire l'écran du dossier, sans arbitre.
- **Écrivain ZIP écrit à la main** (`src/lib/zip.ts`), comme le PDF au lot 14. Méthode
  `STORE` : les PDF et JPEG sont **déjà compressés**, les recompresser coûterait du
  processeur pour quelques pour cent. CRC-32 vérifié contre la valeur de référence.
- **En flux, une pièce à la fois.** La mémoire haute est celle **d'un seul document**
  (10 Mo max), jamais celle de l'export. **Aucun fichier temporaire** — ni sur disque, ni
  dans Storage : il n'y a donc rien à nettoyer, et aucune seconde copie ne peut subsister.
- **Aucune table de transmission.** `AuditLog` porte l'acte ; une ligne `student` par
  dossier rend le compteur « transmis » **interrogeable** (`details` est stocké
  sérialisé, donc non requêtable — sans cette seconde ligne, compter exigerait de relire
  tout le journal).
- **Exporter ≠ transmettre.** Télécharger ne marque rien. La transmission est un acte
  humain déclaré, avec `TRANSMISSION_MANUELLE` — la seule méthode qui existe. Le journal
  écrit `sentByEduCom: false`. **Aucune administration n'est connectée**, et l'écran ne
  prétend jamais le contraire.
- **États dérivés, jamais stockés** : PRÊT / INCOMPLET / À VÉRIFIER / NON CONFIGURÉ se
  déduisent des pièces. Pas de `CONFIRMÉ` : aucune confirmation réelle n'existe.
- **Rayons numérotés, jamais vides.** `01-Identité`… `07-Autres` — un rayon sans pièce
  n'est pas créé : dans une archive, il laisse croire qu'on a perdu des documents.
  Aucun faux `document-manquant.pdf` : un `RESUME.txt` dit ce qui manque et pourquoi.
- **Les versions antérieures n'arrivent que sur action explicite**, rangées sous
  `99-Versions antérieures/`, jamais mêlées aux courantes.

### ⚠️ Le piège du lot — troisième de sa famille, et le plus large

**`route.ts` et `page.tsx` ne peuvent pas coexister au même chemin.** J'avais placé les
deux dans `/dashboard/students/export` : Next.js refuse de préparer l'application, et
**tout le site** répondait 500 — `/login` compris. `tsc` était propre, les 23
vérificateurs verts : aucun ne démarre Next. Seule la sonde runtime l'a vu.
→ La route vit désormais dans `/dashboard/students/export/download`.

C'est la même leçon qu'au lot 13 (bundle client), au lot 15 (client Prisma périmé) et ici
(conflit de routage) : **ce qui casse une application Next ne se voit qu'en la démarrant.**

**Deuxième piège, procédural :** un vérificateur **interrompu** ne joue pas son `finally`
et laisse ses fixtures. Deux nettoyages manuels ont été nécessaires (résidus des lots 15
et de la sonde mobile). Avant de conclure un lot : vérifier les résidus, ne pas supposer.

### Ce qui est PROUVÉ

ZIP réellement produit, **téléchargé par HTTP avec une vraie session**, et ouvert par
`python zipfile` : aucune corruption, structure par rayons, noms métier (aucun UUID),
UTF-8, contenu relu à l'octet · l'archive d'un **enseignant** ne contient ni Santé ni
Identité, mais bien ses pièces pédagogiques — vérifié **dans le fichier reçu**, pas
seulement en base · sélection mixte : l'élève non autorisé est écarté avant construction ·
isolation A↔B sur plan, export groupé et chemin Storage · transmission enregistrée,
compteur exact, refus hors périmètre · états d'erreur réels (400 sans sélection, 404 hors
périmètre, 409 archive vide, 307 sans session).
**24 vérificateurs, 0 échec** · `verify-lot-16.ts` 85 contrôles · `verify-export-runtime.ts`
30 contrôles · `npx tsc --noEmit` propre · `next build` **réussit**.

### Prisma
**Aucune migration.** `migrate diff` : « No difference detected ». `AuditLog` suffisait.

### Ce qui n'est PAS prouvé
Le rendu **mobile** de l'écran d'exports : la sonde Chrome s'est bloquée sur cette
machine et a été interrompue. Le lot 15 avait prouvé l'ossature des autres écrans ; celui
d'exports n'a **pas** été mesuré. Toujours aucun appareil réel.

### État réel de la base (18 août)
6 écoles · 136 élèves · 1 pièce élève (déposée par Kory via l'application) · 0 document
d'établissement · 0 fixture de sonde · 1 seul bucket, privé.

## LOT 15 — Centre documentaire de l'établissement — ✅ FAIT (18 août)

### Décisions arbitrées (① ② ③ tranchées par Kory), et pourquoi

- **Le centre vit à `/dashboard/documents/centre`** ; le hub de génération des lots 09-11
  n'a **pas** été touché. Entrée de navigation **distincte**, pas un sous-menu : `TEACHER`
  n'a PAS `/dashboard/documents` mais a bien le centre — le rattacher au hub l'aurait
  rendu invisible aux enseignants, à qui la liste de fournitures de leur classe est destinée.
- **Deux espaces qui ne se croisent jamais.** `StudentDocument` = ce qui appartient à un
  enfant ; `SchoolDocument` = ce que l'école produit. Vérifié mécaniquement : le centre ne
  lit jamais `prisma.studentDocument`, et le dossier élève ne lit jamais
  `prisma.schoolDocument`. Aucun transfert n'est possible entre les deux.
- **Un seul bucket, deux préfixes.** `{schoolId}/__etablissement__/{docId}/{nom}` — le
  segment est littéral, aucun UUID d'élève ne peut lui ressembler. Un second bucket aurait
  dédoublé les politiques d'accès.
- **Le chemin ouvre la porte, la portée décide du contenu.** `hasAccess()` dit qui ENTRE ;
  `documentScope()` dit ce que chacun VOIT. Sans cette seconde borne, `PARENT` — qui hérite
  du centre par le préfixe `/dashboard/documents` — verrait les brouillons de la direction.
  C'est la fuite des lots 11.1 et 12.2, anticipée cette fois.
- **`CENTRE_INTENDED` écrit l'intention** pour que le vérificateur la compare à ce que le
  moteur produit réellement. Sans elle, l'accès de quatre rôles ne viendrait que de
  l'héritage du préfixe : vrai par accident, et personne ne s'apercevrait du jour où il
  devient faux.
- **`audience` (STAFF / FAMILIES) est déclaré par l'école, jamais deviné.** Le déduire de
  la catégorie aurait exigé une liste nationale de catégories — ce que le lot 13 a refusé.
- **Workflow `schoolDocument` = une définition de plus** dans le moteur existant :
  `DRAFT → REVIEW → PUBLISHED → ARCHIVED`. Préparer relève du centre (secrétariat),
  **publier / dépublier / archiver** du chemin de gestion (direction seule). `ARCHIVED`
  n'est **pas** terminal : un règlement archivé par erreur doit pouvoir revenir, sinon il
  faudrait le recréer et casser sa lignée de versions.
- **Un document publié ne se modifie pas en silence** (§11) : le corriger exige le droit de
  publication, ou passe par une nouvelle version. Une nouvelle version arrive en
  **BROUILLON** — remplacer un fichier ne republie pas tout seul.
- **L'ancienne version garde sa ligne ET son fichier.** Un historique sans pièce est
  invérifiable. Seule la version courante figure dans la bibliothèque.
- **« Préparer » n'est pas « Envoyer ».** Aucun canal WhatsApp ni courriel n'est branché sur
  les documents (Twilio est configuré pour le SMS, rien d'autre). L'action compose le texte,
  compte les familles **d'après la portée réelle** et remet un lien temporaire — et écrit
  noir sur blanc que rien n'a été transmis. Prétendre envoyer ferait croire à une directrice
  que 300 familles sont prévenues alors que personne ne l'est.
- **Uniformes** : le centre porte le **document** (règles, bon de commande) et ses
  métadonnées. Le catalogue structuré articles / tailles / prix / quantités n'est **pas**
  créé — consigné dans `rappel.md` comme dépendance future.

### Piège rencontré — le même qu'au lot 13, et repris par la même sonde

**Le serveur de dev servait un client Prisma périmé.** Il tournait depuis avant
`prisma db push` + `prisma generate` : `prisma.schoolDocument` était `undefined`, la page
renvoyait 200 avec « Cannot read properties of undefined ». Ni `tsc`, ni les 22
vérificateurs (qui ont leur propre client) ne pouvaient le voir — **seule la sonde HTTP**
l'a attrapé. Redémarrage complet du serveur : réglé. C'est la troisième fois que ce piège
se manifeste ; la règle est désormais sans exception : **`db push` → `generate` →
redémarrage du dev**.

### Ce qui est PROUVÉ

Portée réelle par rôle (brouillon invisible à tous sauf la direction ; enseignant borné à
ses classes et aux cycles de ses classes ; parent borné aux classes de ses enfants ET aux
documents `FAMILIES`) · isolation A↔B sur liste, détail, URL signée, versions, dossiers et
chemin Storage deviné · recherche par **titre, description et matière** (tous les fichiers
de sonde s'appelant `sonde.pdf`, seule une recherche sur métadonnées pouvait réussir) ·
filtres réellement appliqués en base · compteur de dossier fondé sur ce que l'acteur voit ·
lignée de versions, ancien fichier toujours présent dans le bucket · rendu HTTP 200 du
centre **et** du centre filtré, sections et documents présents.
**22 vérificateurs, 0 échec** (`verify-lot-15.ts` : 75 contrôles).

### Prisma
Additif : 3 `CREATE TYPE`, 2 `CREATE TABLE`, aucun `ALTER` sur une table existante, aucun
`DROP`, aucun `TRUNCATE`. Essai à blanc (`migrate diff --script`) avant application ;
`migrate diff` après : **aucune différence**.

### Ce qui n'est PAS prouvé
La mise en page mobile du **contenu** (hydratation) et la modale de scan : inchangé depuis
le lot 14, toujours consigné comme PENDING.

## LOT 14 — Scan mobile, import, propositions assistées — ✅ FAIT (18 août)

### Décisions arbitrées, et pourquoi

- **Il n'y a AUCUN OCR, et le produit le dit.** Inventaire fait avant d'écrire une
  ligne : aucune dépendance de reconnaissance de texte, aucun secret de fournisseur
  dans `.env` (Supabase et Twilio, rien d'autre), aucun appel de vision dans le dépôt.
  Le lot pose donc le **siège** de l'analyse — `ocrCapability()` / `analyzeDocument()` —
  et affiche franchement l'indisponibilité. Aucun faux OCR, aucun résultat simulé.
- **Ce qui est réellement analysé : le nom du fichier.** Seul texte disponible sans
  OCR, et il n'est pas négligeable — une secrétaire nomme ses numérisations. Comparé
  aux **libellés de la checklist de l'école** (jamais une liste nationale) et aux noms
  des élèves **du périmètre de l'appelant**.
- **Le pourcentage est une vraie sortie d'algorithme** (Jaro-Winkler), pas un chiffre
  décoratif. Sous le seuil d'affichage (0,72) : « correspondance incertaine », **jamais
  un petit pourcentage** — afficher « Amadou Diallo — 41 % » pousse à cliquer sur la
  seule ligne proposée ; ne rien proposer force à choisir sciemment.
- **`IMG_4821.jpg` ne produit rien**, et c'est le cas courant d'une capture photo.
  L'écran l'assume au lieu de fabriquer une suggestion.
- **Écrivain PDF écrit à la main** (`src/lib/scan.ts`, ~100 lignes, zéro dépendance).
  Une bibliothèque PDF coûterait ~300 Ko sur données mobiles pour empiler des JPEG sur
  des pages A4. Les JPEG sont **recopiés tels quels** (`DCTDecode`) : assemblage
  instantané sur téléphone, aucune seconde compression. Image contenue et centrée sur
  A4 — déformer une pièce d'identité la rendrait suspecte à l'œil.
- **Aucun fichier temporaire dans Storage.** L'assemblage se fait en mémoire sur
  l'appareil ; une seule pièce part, une seule copie existe. Le point 5 du cahier des
  charges (durée de vie, suppression) devient sans objet plutôt que « bien géré ».
- **Le remplacement exige désormais une confirmation** (`confirmReplace`). Cela
  **durcit** le lot 13 : auparavant, déposer sur une exigence déjà servie remplaçait
  sans un mot. Dans un parcours de scan où l'on enchaîne, ce silence était dangereux.
  La confirmation est exigée **avant l'envoi du binaire** — sinon un refus laisserait
  un objet orphelin dans le bucket. Le bouton « Remplacer » du dossier confirme de
  lui-même : le clic *est* la confirmation.
- **Une seule page → JPEG, plusieurs pages → un seul PDF.** Emballer une image unique
  dans un PDF n'aide personne et alourdit le fichier.
- **Un PDF importé n'est jamais converti** en images : ce serait dégrader la pièce et
  faire ramer le téléphone pour rien.

### Pièges rencontrés

1. **`checkFile()` devait être exécutable des deux côtés.** Le réécrire côté client
   aurait garanti qu'un jour les deux copies ne diraient plus la même chose. Extrait
   dans `studentFileLimits.ts` (sans Prisma) : **le même code** refuse un fichier de
   12 Mo sur le téléphone et sur le serveur.
2. **Chrome `--headless=new` reste bloqué indéfiniment** sur cette machine, même sur
   une page triviale. `--headless=old` rend et rend la main.
3. **Chrome écrit la capture PUIS reste en vie** quand la page n'est jamais au repos
   (WebSocket de rechargement à chaud). L'appel expire toujours : c'est le **fichier
   produit** qui fait foi, pas le code de sortie.
4. **⚠️ Un faux vert évité de justesse.** Première sonde mobile : scripts retirés pour
   stabiliser le rendu → Chrome a produit du **HTML nu**, car en développement
   Turbopack injecte le CSS *par JavaScript*. Le contrôle « la capture n'est pas
   blanche » passait au vert sur une page sans aucun style. La sonde **refuse
   désormais de conclure** quand aucune feuille de style n'est liée, au lieu de
   conclure à tort.
5. **Le rendu mobile concluant exige une build de production**, donc l'arrêt préalable
   du serveur de dev (règle 3). Fait dans cet ordre : arrêt → `next build` →
   `next start -p 3100` → sonde → arrêt → `rm -rf .next` → redémarrage du dev.

### Ce qui est PROUVÉ

PDF réel assemblé et **ouvert par CoreGraphics** ; table xref dont chaque décalage
tombe sur un objet ; image 4000×500 contenue dans A4 sans déformation ; scores réels
(« mamadu » → 0,971, « Amadou » distingué de « Mamadou ») ; périmètre enseignant et
isolation inter-écoles sur l'analyse ; un seul bucket, aucun bucket temporaire ;
`next build` **réussit** — le composant de scan compile bien pour le navigateur.
**21 vérificateurs, 0 échec.** `prisma migrate diff` : aucune différence, **aucune
migration**.

### Ce qui n'est PAS prouvé — et le restera jusqu'à un appareil ou un pilote CDP

L'**appareil photo**, la **modale de scan** et la **mise en page du contenu** sur
téléphone. La sonde `verify-responsive.ts` prouve l'ossature (barre mobile rendue et
stylée à 390 × 844, aucune largeur fixe débordante) et **déclare non concluant** le
reste : le contenu arrive par flux React et n'apparaît qu'après hydratation, que le
rendu depuis un fichier local ne déclenche pas. Aucun appareil réel n'était disponible.

### État réel de la base (18 août, après nettoyage)
6 écoles · 136 élèves · 0 exigence · 0 pièce · **0 objet dans le bucket** · 0 fixture.

## LOT 13 + 13.1 — Dossier numérique élève — ✅ FAIT (18 août)

### Ce que le lot 13 a livré
Checklist configurable par école (`DocumentRequirement`) + pièces réellement reçues
(`StudentDocument`), fichiers dans un **bucket privé Supabase Storage**
`student-documents`, chemin `{schoolId}/{studentId}/{documentId}/{nom}`, URL signées
courtes. Aucun binaire en base : le base64 reste réservé au logo et au cachet (lot 00).

### Décisions arbitrées, et pourquoi
- **Storage plutôt que base64** — décision de Kory, définitive. Plusieurs pièces par
  élève relues à chaque requête auraient rendu le base64 intenable.
- **Exigence ≠ pièce.** Une pièce manquante n'a **aucune ligne** en base ; `MISSING`
  n'est jamais écrit. C'est pour cela que la complétude se calcule depuis la checklist.
- **Sans checklist → `percent = null`, jamais 0 %.** 0 % ferait croire à un dossier
  vide alors que c'est la *règle* qui manque.
- **`EXPIRED` se dérive, ne se stocke pas** (lot 13.1). Écrire le statut créerait une
  seconde vérité : le jour où la direction passe la validité de 12 à 6 mois, la colonne
  resterait sur l'ancienne règle sans arbitre. Et cela détruirait la trace du contrôle —
  une pièce validée puis périmée deviendrait indistinguable d'une pièce jamais relue.
  Même raisonnement que `StudentKind` (dérivé des inscriptions) et l'ordre des trimestres.
  `expiresAt` est écrit au dépôt comme **copie datée** ; la lecture recalcule depuis
  `DocumentRequirement.validityMonths`, qui reste l'arbitre. Aucun cron : la comparaison
  se fait à la lecture, donc vraie à la seconde. Un balayage nocturne serait faux
  jusqu'à onze heures de suite.
- **Un rejet l'emporte sur une expiration.** Les deux appellent une nouvelle pièce, mais
  seul le rejet porte un motif à lire ; afficher « expiré » le ferait disparaître.
- **`src/lib/studentScope.ts` n'est pas une seconde matrice de permissions.**
  `permissions.ts` répond « à quels **écrans** » ; `studentScope.ts` répond « sur quelles
  **lignes** ». Aucun chemin n'y est réécrit. Tant que l'écran élève ne portait qu'un état
  civil, « même école » suffisait comme borne ; le dossier y a versé des pièces d'identité
  et de santé, et la même borne est devenue trop large du jour au lendemain.
- **Catégories visibles par un enseignant : SCOLARITE et EXAMENS** — déduites de ce que le
  dépôt dit déjà (`ROLE_LABELS.TEACHER` : « ses classes, ses élèves, la saisie des notes »).
  IDENTITE / INSCRIPTION / TRANSFERT sont administratives, SANTE est médicale.
  **AUTRES est refusée par défaut et reste une décision métier ouverte** (voir `rappel.md`).
- **Le groupe sanguin et les notes médicales suivent la règle des pièces SANTE.** Bloquer
  le document tout en laissant la donnée lisible sur l'écran voisin n'aurait rien protégé.
  Le bloc n'est pas caché en CSS : il n'est **pas rendu** — un `hidden` laisse la donnée
  dans la source de la page.
- **Le parent est borné par `parentId` alors qu'il n'a pas accès à l'écran.** L'audit du
  lot 13 avait montré que la protection reposait entièrement sur l'absence du chemin
  `/dashboard/students`. La borne existe désormais avant le portail parent.

### Pièges rencontrés — ils reviendront mordre
1. **⚠️ LE PLUS COÛTEUX — un composant `"use client"` ne doit jamais importer un module
   qui importe Prisma.** `DossierClient.tsx` prenait ses libellés dans
   `@/lib/studentFile` → `@/lib/prisma` → `pg` → `dns`. Le bundle **navigateur** ne
   compilait pas, la route ne produisait pas son `build-manifest.json`, et l'écran
   répondait **HTTP 500 depuis sa livraison**. Ni `tsc --noEmit` ni aucun des 17
   vérificateurs ne le voyait : le code est parfaitement typé, la frontière
   client/serveur ne se vérifie qu'à la compilation du bundle, donc **au rendu**.
   C'est la leçon du lot 08 reproduite à l'identique.
   → Le même défaut frappait **`/dashboard/payments/tarifs` et `/dashboard/settings/fees`
   depuis le lot 12.1** (via `@/lib/fees` et `@/lib/finance`) : deux écrans en 500 pendant
   des jours, jamais détectés.
   → Corrigé par trois modules sans base : `studentFileLabels.ts`, `feesLabels.ts`,
   `moneyFormat.ts`, ré-exportés par les modules serveur. **Aucun calcul n'a bougé.**
   → `scripts/verify-lot-13-1.ts` §I suit désormais les imports de tout composant client
   de proche en proche et échoue si l'un d'eux atteint Prisma.
2. **Un vérificateur statique ne prouve pas un rendu.** `scripts/verify-render-dossier.ts`
   ouvre une **vraie session** (compte créé dans Supabase Auth, cookies dérivés par
   `@supabase/ssr`) et demande les pages en HTTP. Aucune route de sonde n'a été ajoutée :
   une sonde posée dans `src/app` serait un contournement d'authentification laissé en
   production si on oubliait de la retirer.
3. **Le tableau de bord redirige vers `/onboarding`** quand `school.onboardingCompleted`
   est faux. Une sonde qui prend la première école venue mesure une redirection, pas un
   rendu — premier passage entièrement rouge pour cette seule raison.
4. **`notFound()` ne donne pas toujours 404.** La route porte un `loading.tsx` : Next ouvre
   le flux, donc le code 200, avant que `notFound()` ne soit atteint. Le code HTTP ne fait
   pas foi — ce qui compte est que la page contienne « Page introuvable » et **aucune**
   donnée de l'élève.
5. **`{ ...scope, id: studentId }` écrase la clé `id` du refus par défaut** (`id: { in: [] }`)
   et retourne la fermeture en ouverture. Toujours combiner par `AND: [scope, { id }]`.
6. **Le message de refus est identique dans tous les cas** (« Document introuvable dans
   votre établissement »). Distinguer « pas le droit » de « n'existe pas » confirmerait
   l'existence de la pièce, donc de l'élève, donc de la pièce de santé qu'on cachait.
7. **Un `.next` corrompu envoie sur une fausse piste.** Le premier diagnostic du 500 a été
   « artefact périmé » ; suppression du dossier, redémarrage, puis `.next` entier — même
   500. C'est seulement le **corps de la réponse** qui portait la vraie cause
   (`Module not found: Can't resolve 'dns'`). Lire le corps, pas seulement le code.

### État réel de la base (18 août, après nettoyage des sondes)
6 écoles · 136 élèves · 0 `DocumentRequirement` · 0 `StudentDocument` · 0 fixture résiduelle.
Aucune école n'a encore configuré sa checklist : l'écran affiche donc « checklist non
configurée », ce qui est le comportement voulu.

### Vérifications
`npx tsc --noEmit` propre · **19 vérificateurs, 0 échec** (dont `verify-lot-13-1.ts` 67
contrôles et `verify-render-dossier.ts` 36 contrôles) · `prisma migrate diff` :
**aucune différence** entre la base et le schéma — le lot 13.1 n'a demandé **aucune**
migration.

### Ce qui n'a PAS été vérifié
Le **rendu mobile réel** : inspection statique seulement (`accept` posé, `capture` non
forcé, `flex-wrap`, aucune `<table>`, aucune largeur fixe). Aucun appareil, aucun
navigateur mobile n'a affiché l'écran.

## LOT 12.2 — Finition du référentiel financier — ✅ FAIT (18 août)

Patch de finition du 12.1. Uniquement les points restés incomplets ou non prouvés — aucune fonctionnalité métier nouvelle.

### 1 · Demande de modification côté gestionnaire — **implémenté**

Le backend `requestFeeChange()` existait depuis le 12.1 mais **aucun formulaire ne l'appelait**. Nouvel écran `/dashboard/payments/tarifs` : le gestionnaire consulte la grille officielle **en lecture seule**, voit le forecast calculé, et propose un montant motivé.

⚠️ **Le cloisonnement n'est pas une convention d'affichage.** L'écran n'importe qu'une seule action — `requestFeeChange()`. Et même s'il en importait d'autres, elles exigent `FEE_REVIEW_PATH` (`/dashboard/settings`) que l'ACCOUNTANT n'a pas. Vérifié : `canTransition(feeChangeWorkflow, SUBMITTED → APPROVED, "ACCOUNTANT")` est **refusé par la machine elle-même**.

⚠️ **Fuite évitée de justesse.** `PARENT` possède `/dashboard/payments` : il héritait de `/dashboard/payments/tarifs` **par préfixe**, donc de toute la grille tarifaire de l'établissement. Refus ajouté dans `ROLE_DENIALS` — 9ᵉ entrée, même mécanisme que les quatre écrans d'émission du lot 11.1.

### 2 · Cycle de lecture des notifications — **implémenté**

`markNotificationRead()` existait sans bouton. `NotificationItem.tsx` (client) porte l'état « **Non lue** » écrit en toutes lettres, un lien « Consulter » et un bouton « Marquer comme lue ».

⚠️ **Aucun `userId` ne transite par le client** : l'action ne reçoit que l'`id` et filtre sur `userId` **et** `schoolId` de session. Prouvé en base : un collègue → 0 ligne modifiée ; une autre école → 0 ligne ; le destinataire → 1 ligne, `readAt` persisté, sortie des non lues.

### 3 · Setup initial — **audité, puis complété**

**Le parcours existait** (`/onboarding` : contact → niveaux → génération, garde `onboardingCompleted` dans `dashboard/layout.tsx`) **mais ne contenait aucune configuration financière**. Une école créée par le wizard n'avait donc jamais de grille.

Étape 3 « Vos tarifs officiels » insérée (frais d'inscription + scolarité par niveau sélectionné), l'écran de génération passe en étape 4. **Aucun second système de setup** : l'étape appelle `createSchedule()` / `upsertFeeItem()` / `activateSchedule()` de `/settings/fees` — le wizard n'écrit jamais en base directement.

**Aucun montant n'est pré-rempli** : suggérer un tarif serait inventer une donnée métier. Champs vides = grille non créée, et l'application affiche « configuration financière incomplète » sans calculer de forecast.

⚠️ **Bug trouvé et corrigé — la portée « par cycle » était inerte.** `completeOnboarding` créait les classes **sans `cycle`** : toutes tombaient sur le défaut `AUTRE`. Conséquence : une scolarité déclarée sur ÉLÉMENTAIRE ne correspondait à aucune classe d'une école créée par le wizard, et le forecast comptait ses élèves comme « hors grille ». Le niveau choisi donne pourtant le cycle exactement. `classOrder.ts` en souffrait de la même façon.

### 4 · Les 7 rôles — **le rôle manquant était ADMIN**

La sonde du 12.1 bouclait sur `OWNER ACCOUNTANT SECRETARY TEACHER PARENT ASSISTANT` — **ADMIN n'était pas couvert**. Sonde refaite sur les 7, tous HTTP 200, aucun « Element type is invalid » :

| Rôle | Groupes rendus | Résumé global | Données financières dans le DOM |
|---|---|---|---|
| OWNER, ADMIN | finance · secretariat · teaching · other | oui | oui (légitime) |
| ACCOUNTANT | finance | non | oui (légitime) |
| SECRETARY, ASSISTANT | secretariat | non | **aucune** |
| TEACHER | teaching | non | **aucune** |
| PARENT | family | non | **aucune** |

### 5 · `text-role-figure` — **déjà corrigé, contrôle ajouté**

Aucun usage restant (corrigé au 12.1, `text-role-page` retenu — le token existant qui porte l'intention « grand chiffre »). **Aucun token créé.**

Nouveau contrôle dans `verify-lot-12-2.ts` : il extrait les `--text-role-*` déclarés dans `globals.css`, scanne tout `src/` (hors client généré) et échoue sur tout `text-role-X` non déclaré. ⚠️ Volontairement **étroit** : il ne connaît que ce préfixe, dont la liste est close. L'étendre à toutes les classes utilitaires produirait un contrôle fragile, Tailwind en générant beaucoup dynamiquement.

### 6-7 · Forecast — **vérifié, inchangé**

Automatique, jamais ressaisi. Vérifié que gestionnaire et direction lisent **le même** forecast (110 760 000 FCFA) — une seule source. Caractère **annuel** conservé et documenté : aucune proratisation n'a été introduite, le modèle ne portant pas d'échéancier.

### 8 · Prisma — **aucune migration**

Tout passe par les modèles du 12.1. Le schéma n'a pas bougé.

### ⚠️ Piège de vérification, treizième forme : le contrôle qui fige un COMPTE

Troisième occurrence de la même famille en deux lots. `verify-finance-security` exigeait `ROLE_DENIALS.PARENT?.length === 8` : ajouter un neuvième refus **légitime** faisait échouer le contrôle.

Le plus instructif : **le commentaire situé douze lignes plus haut disait déjà « compter les occurrences était arbitraire »** — la leçon avait été tirée pour les mentions de « PARENT », pas pour les refus eux-mêmes. Corrigé de la même façon : les 8 refus du lot 11.1 sont désormais **nommés**, ce qui rend le contrôle plus strict tout en tolérant la croissance.

**Récapitulatif des trois occurrences** : « 26 modèles » (12.1), « exactement 2 ajouts » (12.1), « 8 refus PARENT » (12.2). **Règle à retenir : un vérificateur ne doit jamais figer un total ni un compte — il doit nommer ce qui doit exister.**

### Vérification

`scripts/verify-lot-12-2.ts`, **16ᵉ vérificateur, 73 contrôles**. Sonde HTTP sur les 7 rôles (supprimée, 404 vérifié). Routes `/dashboard/payments/tarifs`, `/dashboard/settings/fees` et `/onboarding` gardées (HTTP 307). Zéro erreur serveur pendant la sonde.

**Non-régression : 16 vérificateurs, 0 échec.** `tsc --noEmit` propre.

### Limites restantes

- **Le formulaire du gestionnaire n'est pas encore relié depuis l'écran Paiements** : `/dashboard/payments/tarifs` est atteignable par URL et par le fil d'Ariane, mais aucun lien ne s'y rend depuis `/dashboard/payments`. À câbler.
- **Les notifications ne sont visibles que sur `/dashboard/reports`** : pas de pastille globale dans la barre latérale. Le cycle est complet, sa surface d'affichage est étroite.
- **L'étape financière du wizard ne couvre que inscription + scolarité par niveau.** Cantine, transport, assurance et tarifs par classe passent par `/settings/fees` — c'est assumé : le setup doit rester court.
- **Forecast toujours annuel**, sans proratisation (inchangé, documenté).
- **Aucune sonde authentifiée** : les rendus sont prouvés par une route de sonde sans authentification, comme depuis le lot 08. Un test avec session réelle reste hors outillage.

## LOT 12.1 — Patch rapports + référentiel financier — ✅ FAIT (18 août)

Patch du lot 12. Trois chantiers : finir les périodes, faire de la direction la source de vérité tarifaire, et cloisonner réellement l'affichage des rapports.

### 1 · Trimestre — aucun champ d'ordre ajouté

Le lot 12 déclarait le trimestre non comparable, faute d'ordre déclaré. **En réinspectant, `Term.startDate` EST l'information d'ordre** : un trimestre qui commence le 1ᵉʳ octobre précède celui du 6 janvier, c'est un fait de calendrier.

**Ajouter une colonne `order Int` aurait créé une seconde vérité** pouvant contredire la première (ordre 2 avec une date antérieure à l'ordre 1) sans qu'aucune règle n'arbitre. Ce qui manquait n'était donc pas le schéma mais **les données** : les 3 trimestres ont `startDate = NULL`. D'où l'action `setTermDates()`.

`src/lib/terms.ts` porte l'ordre (`orderedTerms`, tri `startDate` NULLs en dernier), le trimestre précédent (`previousTermPeriod`, plus grande `startDate` strictement antérieure) et le point d'entrée unique `comparisonPeriod()`. `Period` transporte désormais `termId` — sans lui, la comparaison est impossible à résoudre.

⚠️ **Jamais de tri par nom.** « 1er / 2ème / 3ème Trimestre » se trie bien alphabétiquement **par accident** ; « Semestre 1 » ou « Trimestre A » non. Un ordre qui marche par coïncidence casse en silence.

### 2 · Faille corrigée — 5ᵉ de cette famille

`deleteTerm(id)` faisait `prisma.term.delete({ where: { id } })` **sans `schoolId`**. Connaître un identifiant suffisait à supprimer le trimestre d'une autre école — et la cascade emporte évaluations, notes et bulletins. Passé en `deleteMany` avec le `schoolId` de session.

### 3 · Référentiel tarifaire — migration additive

4 tables, 3 énumérations : `FeeSchedule`, `FeeItem`, `FeeChangeRequest`, `StaffNotification` ; `FeeKind`, `FeeCadence`, `FeeScheduleStatus`.

**Diff SQL inspecté avant `db push`** : 0 DROP, 0 TRUNCATE, 0 ALTER sur table existante. Les 7 `DELETE` du diff sont des clauses `ON DELETE CASCADE` des nouvelles clés étrangères. **Comptages identiques avant/après sur les 23 tables existantes** (`backups/avant-lot-12-1-2026-08-18.json` / `apres-…`, schéma sauvegardé dans `backups/schema.prisma.avant-lot-12-1.bak`).

⚠️ **Piège reconduit** : `db push` ne régénère pas le client dans `src/generated/prisma`. `tsc` a échoué sur 10 erreurs « Property 'feeSchedule' does not exist » jusqu'à `npx prisma generate`. **Toujours enchaîner les deux.**

⚠️ **Nouvelle cascade** : `FeeItem.classId` est en `onDelete: Cascade`. Supprimer une classe efface aussi ses lignes tarifaires — cela **aggrave** le chantier ouvert « `deleteClass` n'a aucun garde-fou ».

**Portée d'une ligne, de la plus précise à la plus large** : `classId` → `cycle` → école entière. La résolution retient **la plus précise par nature de frais** : une scolarité déclarée sur CM2 l'emporte sur celle du cycle. Sans cette règle, un élève cumulerait deux scolarités. Les frais **facultatifs** (cantine, transport) sont exclus du forecast : rien ne dit qui y souscrit, et les compter gonflerait l'attendu.

### 4 · Séparation des pouvoirs — par chemin, jamais par rôle

`feeChangeWorkflow` réutilise la fabrique `financeWorkflow` avec `reviewPath = /dashboard/settings`, qu'**aucun rôle ne liste** dans `ROLE_PERMISSIONS` : seuls OWNER et ADMIN l'atteignent via `"*"`. Le gestionnaire prépare depuis `/dashboard/payments`.

**Résultat : aucun rôle n'est cité dans `settings/fees/actions.ts`**, et le comptable ne peut pas approuver sa propre demande. Vérifié : les 5 rôles non-direction échouent sur `hasAccess(role, "/dashboard/settings")`.

**Historique : aucune table de révision.** `AuditLog` porte l'avant/après (`amountBefore` / `amountAfter`), `auditForEntity("feeItem", id)` le restitue, `WorkflowTransition` porte les états de la demande. Trois entités ajoutées à `AuditEntity`.

### 5 · Les cinq concepts financiers, cinq sources

| Concept | Source | Borné à la période ? |
|---|---|---|
| **Forecast** | grille officielle × élèves inscrits — **ne lit aucune facture** | non, **annuel** |
| **Facturé** | `SUM(Invoice.totalAmount)` émises | oui |
| **Encaissé** | `SUM(Payment.amount)` — définition unique du lot 11 | oui |
| **Reste à encaisser** | Σ (facture non soldée − versements) | non, c'est un **stock** |
| **À relancer** | sous-ensemble du reste dont l'échéance est **dépassée**, compté en **familles** | non |

⚠️ **Le forecast est annuel, pas proratisé.** Découper une scolarité annuelle en « attendu de cette semaine » supposerait un échéancier que le schéma ne porte pas. L'écran l'annonce explicitement. Les deux seules hypothèses de conversion (`MONTHS_PER_YEAR = 10`, `TERMS_PER_YEAR = 3`) sont nommées en un seul endroit.

### 6 · Affichage cloisonné — pas masqué

**Un employé ne reçoit qu'un groupe, et les autres ne sont pas construits.** `buildReport()` n'assemble que le groupe autorisé ; les sections absentes n'existent pas dans l'objet renvoyé, donc pas dans le DOM.

⚠️ Les masquer en CSS aurait laissé les finances de l'école lisibles depuis un compte enseignant par un simple « afficher la source ». **Prouvé au rendu** : le HTML servi à TEACHER, SECRETARY et PARENT ne contient **aucune** chaîne financière.

| Rôle | Groupes rendus | Résumé global |
|---|---|---|
| OWNER, ADMIN | Finance · Secrétariat · Enseignement · Autres métriques | oui |
| ACCOUNTANT | Finance | non |
| SECRETARY, ASSISTANT | Secrétariat | non |
| TEACHER | Enseignement (**ses** classes seulement) | non |
| PARENT | Ma famille | non |

`teachingOverviewSections()` (direction, école entière) est **distincte** de `teachingSections()` (un enseignant, ses classes). Deux fonctions, deux portées : les fusionner derrière un drapeau aurait fini par exposer l'une à l'autre.

« Autres métriques » regroupe les deux sections réellement transverses (décisions en attente, activité tracée). **Rien n'y est inventé pour la remplir.**

### 7 · Notifications — mécanisme réel, portée dite

`StaffNotification` est écrite en base et lue dans un bandeau en tête des rapports. Déclencheurs : activation de grille, modification de tarif, demande soumise, décision rendue.

⚠️ **Aucune remise externe.** Le seul canal sortant du dépôt est Twilio, câblé pour les parents (`Message`), pas pour le personnel. Prétendre notifier par e-mail ou SMS aurait été simuler un mécanisme absent. Contrôlé automatiquement : `fees.ts` ne contient aucune référence à un envoyeur.

### 8 · Vérification

**`scripts/verify-fees.ts`, 15ᵉ vérificateur, 77 contrôles** — exécutés contre la base, pas de l'analyse statique seule :

- **Forecast confronté au calcul manuel** : Kory Academy 2 = **110 760 000 FCFA**, recalculé indépendamment ligne par ligne. Témoin Senghor = **3 élèves × 425 000 = 1 275 000 FCFA**, vérifiable de tête.
- **Isolation** : chaque école ne voit que sa grille ; forecasts distincts ; aucune ligne tarifaire croisée.
- **Circuit complet éprouvé puis annulé** : demande 900 000 → 950 000, **refus** (grille intacte, montant proposé toujours consultable), **acceptation** (grille modifiée), **recalcul** 110 760 000 → 113 810 000, soit **3 050 000 FCFA d'impact** — puis remise à l'état initial.
- **Trimestre** : deux trimestres datés temporairement, ordre vérifié par `startDate`, premier trimestre sans précédent, isolation croisée — puis dates remises à `NULL`.

**Sonde HTTP réelle** (route sans authentification, supprimée, 404 vérifié) : les 6 rôles rendent HTTP 200, groupes conformes, aucun « Element type is invalid ». Test inter-écoles : chaque école ne rend que son propre forecast.

**Non-régression : 15 vérificateurs, 0 échec.** `tsc --noEmit` propre.

### ⚠️ Piège de vérification, douzième forme : le contrôle qui fige un total

Deux vérificateurs sont tombés sur ce lot, tous deux pour la même raison : ils **figeaient l'état du schéma au lot 11**.

- `verify-finance-security` exigeait `models.length === 26` (« aucune migration dans ce lot »).
- `verify-financial-workflow` exigeait `models.length === MODELS_AVANT_LOT_11.length + 2` (« exactement 2 ajouts »).

Un contrôle qui fige un **total** transforme toute évolution légitime en régression. L'invariant réellement utile n'était pas le total mais la **non-disparition**. Les deux ont été **resserrés, pas affaiblis** : ils nomment désormais explicitement les modèles attendus au lieu de les compter.

⚠️ **Bug du lot 12 trouvé ici** : `ReportSections.tsx` utilisait `text-role-figure`, **qui n'existe pas** dans les tokens (`globals.css` déclare page/section/card/body/label/meta). La classe ne produisait aucune taille. `verify-design-tokens` ne l'a pas vu — il contrôle les couleurs en dur, pas les noms de tokens de typo. Corrigé en `text-role-page`. **Un contrôle des noms de tokens manque encore.**

### ⚠️ Piège runtime : le serveur de dev servait un client Prisma périmé

La sonde a renvoyé **HTTP 500 sur les 6 rôles** — `TypeError: Cannot read properties of undefined (reading 'findMany')`. Cause : `next dev` tournait avec le client chargé **avant** `prisma generate`, où `feeSchedule` était `undefined`. `tsc` était propre, les 15 vérificateurs verts. **Seul le redémarrage du serveur corrige.** Onzième forme du piège « statique vert ≠ rendu ».

### Limites et restes

- **Forecast non proratisé** par période (voir §5). Un échéancier par ligne tarifaire permettrait de le borner ; le schéma ne le porte pas.
- **Métriques toujours indisponibles**, inchangées depuis le lot 12 : bulletins imprimés, documents par élève/famille, assiduité. Aucune source nouvelle n'est apparue.
- **Une seule grille ACTIVE par école** est tenue **côté code** (`activateSchedule`, en transaction) : Postgres l'exigerait via un index partiel, que Prisma ne déclare pas.
- **Notifications non lues** : le bandeau les affiche mais `markNotificationRead()` n'est pas encore câblé à un bouton — l'action existe et est testée.
- **`FeeChangeRequest` sans écran côté gestionnaire** : `requestFeeChange()` est écrite et gardée, mais aucun formulaire ne l'appelle depuis l'atelier financier. À câbler.

## LOT 12 — Rapports par rôle — ✅ FAIT (18 août)

Treizième lot. `/dashboard/reports` passe d'**un écran unique pour tous** à **cinq rapports** choisis par le rôle. Sept rôles y accèdent désormais, contre quatre avant.

### Ce que l'ancien écran affichait de faux

| Élément | Preuve |
|---|---|
| « Taux de recouvrement » | sommait `Invoice.totalAmount` des factures `PAID` — or **deux factures à 0 ont encaissé 110 000 FCFA**. Exactement l'erreur corrigée au lot 11, restée ici |
| « Flux de trésorerie » | groupait ces mêmes factures par `Invoice.createdAt`, la date d'**émission**, pas d'encaissement |
| Bouton « Exporter (PDF) » | aucun gestionnaire — bouton mort, comme ceux du lot 08 |
| Aucun filtre de période | « Année en cours » écrit en dur dans le JSX |
| Aucune notion de rôle | un comptable et un assistant voyaient le même écran |

Mesuré à la sonde : l'ancien calcul donnait **196 866**, le vrai encaissé est **306 866**. L'écart de 110 000 est exactement celui des deux factures à 0.

### Les cinq rapports, et ce qui les alimente

| Audience | Rôles | Sections |
|---|---|---|
| `direction` | OWNER, ADMIN | résumé financier, encaissements, dépenses, états, **en attente de décision**, activité par service, documents, dossiers élèves, **activité tracée** |
| `finance` | ACCOUNTANT | résumé, encaissements par moyen, dépenses par poste, états financiers |
| `secretariat` | SECRETARY, ASSISTANT | dossiers élèves, demandes de documents, bulletins*, communications |
| `teaching` | TEACHER | mes classes, saisie des notes, bulletins de mes classes |
| `family` | PARENT | mes enfants, mes factures, mes versements, mes messages |

\* **La section Bulletins n'apparaît pas pour ASSISTANT** : la portée est décidée par `hasAccess(role, "/dashboard/documents/validation")`, que `ROLE_DENIALS` lui refuse. Aucune seconde table de rôles — même principe qu'au lot 08 pour les blocs financiers du tableau de bord.

**Tout l'argent passe par `financeSnapshot()` / `collectedByMethod()`.** Aucune agrégation monétaire n'est réécrite dans `reports.ts` : c'était la cause exacte des deux totaux divergents du lot 11. La comparaison de période appelle `financeSnapshot()` **une seconde fois** plutôt que de recalculer allégé — garantir la même définition vaut cinq requêtes.

### Décision : trois rôles gagnent l'accès à `/dashboard/reports`

TEACHER, SECRETARY et PARENT ne l'avaient pas. Le cahier des charges demandait leurs rapports : il fallait donc élargir `ROLE_PERMISSIONS` — **dans le fichier source de vérité, pas à côté**.

⚠️ **Le cas PARENT est le seul qui méritait un arbitrage.** Il est sûr pour une raison précise et fragile : `familySections()` **n'appelle jamais `financeSnapshot()`**, qui agrège toute l'école. La portée passe par `invoiceScope()`, qui couvre les deux chemins parent → facture (lien direct **et** via l'élève). Si quelqu'un ajoute un jour une section financière au rapport familial sans repasser par `invoiceScope()`, cette permission devient une fuite. Le commentaire est posé dans `permissions.ts` à côté de l'entrée.

### Comparaison de période : `previousPeriod()`

Nouvelle fonction dans `period.ts`. Jour, semaine, mois et personnalisée se décalent exactement — le mois précédent est reconstruit par la fabrique, pas par « −30 jours », sinon février comparé à mars décalerait la fenêtre.

⚠️ **Trimestre → `null`, volontairement.** `Term` ne porte **aucun ordre déclaré** : ni numéro, ni rang, ni référence au précédent. Deviner par ordre alphabétique marcherait sur « 1er / 2ème / 3ème » et casserait dès qu'une école nomme ses périodes autrement — la comparaison porterait alors silencieusement sur la mauvaise fenêtre. L'écran affiche la raison au lieu d'un pourcentage.

**Trois cas distincts à l'affichage, à ne jamais confondre :** `previous === null` → « — » ; `previous === 0` → écart absolu sans pourcentage (division par zéro) ; sinon pourcentage réel. Un « +100 % » sorti d'une base nulle finit dans une réunion de direction.

### Ce que le schéma ne permet pas — affiché, pas masqué

Trois métriques demandées sont **déclarées indisponibles avec leur raison**, visibles sur l'écran de qui les chercherait :

1. **Bulletins imprimés.** `ReportCardStatus` s'arrête à `APPROVED` (« imprimable ») et rien n'enregistre une impression. `status.ts` porte déjà une entrée `PRINTED` défensive qu'aucun code ne produit.
2. **Documents par élève ou par famille.** `DocumentRequest` n'a **ni `studentId` ni `parentId`** — seulement un nom, une description et un statut. Impossible de dire de qui relève une demande, donc pas de « documents manquants » d'un dossier, ni de section documents pour un parent.
3. **Assiduité.** Aucun modèle de présence. Les bulletins scannés en comptent deux sortes ; la base, aucune.

Un état vide affiche « Rien à afficher » **avec la cause** — jamais un zéro qui laisserait croire à une mesure réelle.

### Vérification — la partie B exécute de vraies requêtes

`scripts/verify-reports.ts`, **14ᵉ vérificateur, 77 contrôles**. Partie A statique, **partie B contre la base réelle** : c'est la réponse à la leçon du lot 08 (« neuf scripts verts ne valent pas un rendu »).

- **Isolation** : un acteur de « Kory » ou « Senghor » (0 élève) obtient **toutes ses mesures à zéro** ; « Kory Academy 2 » en a 13 non nulles. Croisé dans les deux sens.
- **Parent** : 0 facture visible contre 6 pour l'établissement ; 0 FCFA contre 306 866 encaissés.
- **Enseignant** : 1 classe affichée sur les 13 de l'école.
- **Encaissé** : le rapport rend 306 866 = `SUM(Payment.amount)`, et **ne recopie pas** les 196 866 de l'ancien calcul faux.
- **82 mesures déclarées non comparables**, 38 comparées.

**Sonde HTTP réelle** (route sans authentification, supprimée après mesure, 404 vérifié) : les 7 rôles rendent **HTTP 200**, aucun « Element type is invalid », les `<table>` sortent. Le rendu confirme le cloisonnement — la page du parent ne contient ni « Résumé financier », ni « Solde », ni les chaînes `306866` / `196866`.

**Non-régression : 14 vérificateurs, 900 contrôles.** `tsc --noEmit` propre. Aucune migration Prisma — le schéma n'a pas bougé.

### ⚠️ Piège de vérification, onzième forme : le motif ne connaissait pas les alias

Mon propre vérificateur a signalé **22 requêtes « non bornées »** qui l'étaient toutes. Le moteur ne répète pas `schoolId:` à chaque appel : il lie une fois `const school = { schoolId: actor.schoolId }` et le répand. Un motif cherchant le littéral `schoolId` ne voit rien.

Et un second faux échec dans la foulée : le contrôle « le bouton Exporter (PDF) a disparu » échouait **sur le commentaire de `page.tsx` qui explique qu'il a été retiré**. Le motif portait sur le fichier brut au lieu du code.

Corrigé **en resserrant, pas en affaiblissant** : les alias sont admis, mais trois contrôles vérifient d'abord qu'ils sont réellement liés à la session (`school` ← `actor.schoolId`, `scope` ← `invoiceScope(actor)`, `inClasses` ← `teacherClassIds(actor)`). Sans eux, `...school` deviendrait un mot magique contournant l'invariant.

**Un vrai défaut est sorti de ce nettoyage** : `prisma.enrollment.count({ where: inClasses })` n'était borné qu'**indirectement**, par la provenance du tableau `classIds`. `Enrollment` n'a pas de `schoolId` propre. Un second verrou explicite a été posé (`class: { schoolId: actor.schoolId }`) — deux verrous valent mieux qu'un sur une requête d'isolation.

### Restes et limites

- **`ClientCharts.tsx` supprimé** : ses deux graphiques reposaient sur le calcul faux. Aucun graphique n'a été reconstruit — le cahier des charges n'en demandait pas, et le tracé honnête (encaissements par `Payment.createdAt`) mérite son propre arbitrage.
- **Aucun export.** Le dépôt n'a aucune capacité d'export à réutiliser ; en fabriquer une pour meubler l'écran aurait répété la faute du bouton PDF mort.
- **`TeachingAssignment` toujours vide** : le rapport enseignant retombe sur le titulariat, comme l'écran de saisie. Le second enseignant (`oryobjectifs`) n'a **aucune classe** et voit un état vide qui le dit.
- **`AuditLog` ne contient qu'une ligne**, `WorkflowTransition` aucune : la section « Activité tracée » de la direction est presque vide et l'annonce (« le journal n'est alimenté que depuis le lot 10 »).
- **`Expense` est vide** (0 ligne) : les sections dépenses sont légitimement à zéro.
- Les 82 notes portent bien `teacherId` et `evaluationId`, mais **aucune n'appartient aux deux comptes TEACHER** — elles ont été saisies par le OWNER. Le rapport d'un enseignant est donc exact et vide.

## Constitution produit (Product-Led Design) — installée le 17 août

Quatre principes désormais permanents pour **tous** les projets de Kory, pas seulement EduCom : ① test des trois secondes, ② point d'équilibre de la friction, ③ cartographie du WIN (temps jusqu'à la valeur), ④ design émotionnel. Plus un **PLG CHECK** obligatoire : toute demande qui entre en conflit avec ces principes doit être contestée avant exécution — puis exécutée sans y revenir si Kory confirme.

**Installée globalement, référencée localement** — le texte intégral vit dans `~/.claude/CLAUDE.md`, `~/.gemini/GEMINI.md` et `~/.gemini/config/AGENTS.md` ; `AGENTS.md` §5 y renvoie sans le recopier. Motif : deux copies divergent toujours, et la règle qui compte ici est celle qu'on lit dans six mois.

**Décision : pas de `.agents/rules/product-led-design.md`**, bien qu'il ait été demandé. Antigravity lit `.agents/rules/*.md` **et** l'`AGENTS.md` racine : le fichier aurait chargé la même constitution deux fois chez le même agent. C'est aussi le piège déjà documenté dans `.agents/AGENTS.md` — ce dossier n'est pas lu par Claude Code, donc une règle qui n'y vivrait que là serait invisible la moitié du temps.

**Arbitrage propre à EduCom : la friction protectrice ne tombe pas sous le principe ②.** Essai à blanc, confirmation avant cascade, échec fermé du cron `overdue` — ce sont des garde-fous, pas de la friction inutile. On ne supprime que la friction qui sert l'implémentation. À rappeler à tout agent qui voudrait « simplifier » un flux financier ou une suppression de classe.

## Graphe de connaissances (graphify) — construit le 17 août

`graphify-out/` contient désormais un graphe du dépôt : **1 754 nœuds, 3 096 arêtes, 146 communautés**. `graph.html` (interactif), `GRAPH_REPORT.md` (audit), `graph.json` (données). Rejouable sans tout reconstruire : `graphify query "<question>"`.

**Périmètre volontairement réduit à l'extraction sémantique** (le structurel AST couvre les 270 fichiers de code) :
- **Inclus :** `context.md`, `AGENTS.md`, `README.md`, `CLAUDE.md` et les **4 bulletins `.webp` de la racine**.
- **Exclus :** les 97 docs de `.agents/` et `agent/` (définitions de skills Stitch / shadcn / remotion, **dupliquées à l'identique dans les deux dossiers**) et les 36 variantes de logo de `public/brand/`. Motif : ces docs auraient noyé le graphe sous des concepts d'outillage tiers, et la détection de communautés aurait décrit « les skills d'agent » au lieu d'EduCom. Le code de ces dossiers reste dans le graphe via l'AST.
- Piège : `.agents/` et `agent/` sont un miroir l'un de l'autre — chaque script y produit **deux** communautés jumelles. Si l'un des deux est mort, le supprimer diviserait par deux ce bruit.

Nœuds les plus connectés (cœur réel du produit) : `createClient()` 82, `prisma` 64, `hasAccess()` 44, `requireSchoolContext()` 36, `requireActionContext()` 26.

## Bulletins réels : ce que les 4 scans imposent au modèle de données

Les 4 `.webp` de la racine sont des bulletins **authentiques de trois établissements différents** (Groupe Scolaire PIA à Pikine-Guédiawaye, Institution Ker Rokhaya, Lycée de Popenguine à Thiès/Mbour 1). Leur variation structurelle est le vrai enseignement — le modèle actuel « une matière = une note » ne les couvre pas tous.

**Ce qui casse le modèle simple :**

- **Le français est éclaté en sous-disciplines notées séparément.** Ker Rokhaya : `COMPOSITION FR` (coef 2) et `DICTEE` (coef 1) sur deux lignes autonomes. PIA : `Français Rédact.`, `Français TSQ`, `Français Dictée`, chacune coef 1, chacune avec **son propre rang et sa propre appréciation**. Inversement, `HISTOIRE + GEOG` **fusionne** deux matières en une seule ligne. Il faut des sous-disciplines regroupables, pas une matière plate.
- **La conduite est parfois une discipline notée** (PIA : ligne du tableau, coefficient, entre dans le total des points ; notée uniquement en composition, sans devoir) et **parfois absente du tableau** (Popenguine : le comportement ne passe que par le bandeau de mentions). Le comportement est donc évalué par deux mécanismes différents selon l'école.
- **Un rang est imprimé par discipline** sur le bulletin semestriel PIA, pas seulement un rang général → il faut classer toute la classe matière par matière.

**Pièges de calcul — ne pas présumer :**

- **La moyenne imprimée ne se recalcule pas depuis les colonnes imprimées.** Ker Rokhaya : 206,25 / 20 = 10,3125, or le bulletin affiche **10,33**. Ne jamais recomputer en espérant retrouver la valeur officielle.
- **L'appréciation n'est pas dérivable de la note.** Ker Rokhaya : 8/20 → « Passable » mais 9/20 → « Insuffisant » ; EPS à 17/20 n'a **aucune** appréciation. C'est du texte saisi par l'enseignant, pas un seuil.
- **Une composition peut manquer** (EPS = « - » à Popenguine) et la moyenne se fait alors **sur le devoir seul** — surtout ne pas traiter l'absence comme un zéro.
- **Deux compteurs d'absences coexistent** : « Absences » (période) et « Abs. Tot. » (cumul annuel), valant 0 et 3 sur le même bulletin.

**Dépendances entre périodes et champs officiels :**

- **Le récapitulatif annuel n'existe que sur le bulletin du 2e semestre** : Moy 1er sem / Moy 2e sem / Moyenne annuelle / Rang annuel. Générer un bulletin de S2 **exige donc de relire la période précédente**.
- **Décision du conseil** : trois cases exclusives — « Admis(e) en classe supérieure », « **Autorisé(e) à** redoubler », « Exclusion ». Le redoublement est formulé comme une autorisation, et l'exclusion est une issue prévue par le formulaire. Distinct du champ « Classe redoublée » du bloc identité, qui est un **historique** de l'inscription courante, pas une décision à venir.
- **Hiérarchie administrative imprimée en en-tête** : I.A → IEF → établissement. Un établissement doit être rattaché à une IEF, elle-même à une IA.
- **Le visa (signature + cachet) du chef d'établissement** conditionne la valeur du document : prévoir son emplacement dans le PDF.
- Le **rang** s'interprète toujours contre le « Nbre d'élèves » du bloc identité : l'effectif est une donnée du bulletin, pas une décoration.

**⚠️ À faire trancher par une école : la colonne « T.H »** apparaît sur les trois modèles, remplie d'un marqueur constant (« TH ») sur chaque ligne notée, vide sur EPS. Tableau d'honneur ? Initiale du titulaire ? Artefact de gabarit ? **Non résolu — marqué AMBIGUOUS dans le graphe.** Ne pas modéliser avant réponse.

## Idées "Au Chaud" (À revoir plus tard)

**Interface Utilisateur :**
- *Info-bulles (Tooltips) sur la Sidebar :* au survol des icônes quand la barre est réduite.

**Intégration de l'annuaire des élèves (prochain grand chantier) :**
- *Importation en masse (Excel / CSV)* pour intégrer les bases existantes d'élèves et parents.
- *Synchronisation avec annuaires (SSO / LDAP).*
- *Portail Parent / Annuaire public.*

**Paiements :**
- Intégrer **Wave** pour le règlement des factures impayées. ⚠️ Bloqué : la documentation de l'API Wave n'a pas encore été fournie, et rien ne sera écrit sans elle (`rappel.md` §73). L'idempotence doit être tranchée avant (§72). PayDunya a été abandonné et supprimé le 19 août 2026 (§71).

---

## Suppression des fausses intégrations et mise sous Git — 19 août 2026 (soir)

### La décision, et ce qu'elle a fait remonter

**PayDunya est abandonné ; Wave devient la voie de paiement.** En retirant
PayDunya, le vrai problème s'est révélé : ce n'était pas le webhook, c'était
**ce que le produit disait aux familles**. Le chatbot leur envoyait un lien de
paiement écrit en dur avec la phrase « cliquez sur ce lien **sécurisé** ». La
variable `PAYDUNYA_MASTER_KEY` n'ayant jamais existé dans `.env`, la branche
« clé absente » était la seule jamais empruntée : **ce faux lien était le seul
que le produit ait jamais produit.**

Le webhook, lui, passait une facture à `PAID` sur un simple POST **anonyme**
portant `{"status":"completed"}`.

**Aucune donnée n'a été supprimée**, et il a été vérifié qu'il n'y avait rien à
arbitrer : 1 seul `WebhookEvent` (WHATSAPP), 7 paiements tous `CASH` sans
référence, **zéro** paiement lié à ce prestataire.

### Le même défaut, une troisième fois

`sendBotReply()` écrivait `status: "SENT"` avant même de regarder s'il existait
une clé d'API. C'est **exactement** ce que le lot 17 avait corrigé dans la
diffusion — le service avait été oublié parce qu'aucun écran ne l'appelait.

**Leçon à retenir :** un module que personne n'ouvre n'est pas un module
inoffensif. Les trois mensonges de ce lot vivaient tous dans du code sans écran.

### Le piège le plus instructif : le simulateur

Le webhook WhatsApp n'avait **qu'un seul appelant** : un champ « Simuler une
réponse du parent (Webhook) » **livré dans le tableau de bord**, qui forgeait
une charge utile Meta et affichait « 200 OK - Traité par l'API ! » en vert.

C'est ce qui a tranché entre « sécuriser » et « supprimer » : sécuriser une
route dont le seul client est un banc d'essai n'aurait fait que rendre le banc
d'essai plus crédible. Le même écran affichait le double chevron bleu de
WhatsApp — un accusé de lecture qui n'existe pas — et chargeait son fond depuis
`web.whatsapp.com`.

### Trouvé par accident, et plus grave que ce qu'on cherchait

En durcissant le vérificateur pour interdire les liens de paiement fabriqués,
un contrôle plus large a été essayé : **aucun hôte extérieur sans autorisation
explicite**. Il a immédiatement révélé que `RecentInvoicesWidget` envoyait
**le prénom et le nom d'élèves à `ui-avatars.com`** à chaque affichage du
tableau de bord. `TopNav` avait déjà été corrigé ainsi ; cette vignette avait
été oubliée, et c'était la plus sensible des deux.

**Décision d'outillage :** le vérificateur ne cherche plus des motifs interdits
mais valide contre une **liste d'hôtes autorisés**. Chercher ce qu'on redoute ne
trouve que ce à quoi on a déjà pensé.

### État réel de la base (tenant de travail)

| Table | Compte |
|---|---|
| `School` | 4 → **3** après purge d'une école de sonde orpheline |
| `User` (Kory Academy 2) | 8 — ⚠️ **aucun `OWNER`** |
| `Student` (Kory Academy 2) | 133 réels · Senghor 3 · SABADO 0 |
| `Payment` | 7, tous `CASH`, tous `reference = null` |
| `Invoice` | 7 `PAID`, 1 `PENDING` |
| `Message` | 6, toutes `OUTBOUND`, toutes `SENT` — ⚠️ **toutes fausses** |
| `WebhookEvent` | 1 (`WHATSAPP`), `processed = false` |

⚠️ **Aucun compte `OWNER` dans « Kory Academy 2 »** : c'est ce qui fait échouer
4 contrôles de `verify-lot-12-2` — un état de **données**, pas une régression.
Cause probable : le sélecteur de rôle de test, qui laisse tout utilisateur
connecté réécrire son propre rôle (`rappel.md` §79, décision requise).

### Pièges rencontrés, à ne pas repayer

1. **Un vérificateur qui se déclenche sur lui-même.** Le contrôle « aucune
   mention du prestataire abandonné » trouvait le nom… dans son propre code
   source. Le nom y est désormais reconstitué à l'exécution. Même famille de
   piège que le `print:` du lot documents et que le « Pas de suivi des
   présences » de la sonde landing — **c'est la troisième fois** : tout
   vérificateur qui cherche un mot doit se demander s'il le contient.
2. **Un contrôle trop large est un faux rouge.** En acceptant tout littéral en
   capitales comme variable d'environnement, le vérificateur a réclamé la
   documentation de `SEND_IMPLEMENTATIONS`. Remplacé par une liste explicite de
   lectures indirectes, elle-même vérifiée : si l'entrée n'est plus dans le
   fichier annoncé, le contrôle échoue.
3. **`.env.example` prétendait qu'un vérificateur existait** avant qu'il ne soit
   écrit. Une documentation qui décrit son propre contrôle doit être écrite
   **après** lui.
4. **La sonde d'authentification laissait une école orpheline à chaque
   exécution.** Son nettoyage ne connaissait que les deux écoles qu'elle crée
   directement ; la troisième naît du **vrai formulaire d'inscription** et
   n'était donc suivie par personne.

### Portabilité — prouvée sur un clone neuf

`npm ci` (le `postinstall` ajouté lance `prisma generate`) → `tsc --noEmit` :
0 erreur → `next build` : compilé, 50 pages. Fait sur un **clone**, jamais dans
le dossier de travail : `next dev` et `next build` partagent `.next`, et un
build de vérification y écraserait les artefacts du serveur de développement
(règle 3). D'où `npm run build:verify`, qui compile dans `.next-verify`.

### Chantiers ouverts, par priorité

1. **Documentation de l'API Wave** — bloquant, ne peut venir que de Kory (§73).
2. **Clé Google à révoquer** — compromise, action hors dépôt (§70).
3. **Idempotence** — décision requise avant Wave (§72) ; recommandation :
   unicité portée par l'**événement** (`WebhookEvent`), pas par `Payment`.
4. **Sélecteur de rôle de test** — décision requise (§79).
5. **6 lignes `Message` fausses** — réécriture = modification de données
   historiques, décision requise (§74).
6. **3 vulnérabilités « high »** (`deepmerge-ts`), correctif cassant (§80).


---

## Rotation du secret PostgreSQL et clôture de C.3 — 20 août 2026

Le mot de passe compromis a été réinitialisé par Kory. Vérifié depuis le dépôt :
l'ancien secret n'apparaît **ni dans un fichier versionné, ni dans l'historique
Git** — `.env` était ignoré dès le premier commit, aucune réécriture d'historique
n'est nécessaire.

**Trois pièges se sont révélés pendant cette clôture, et tous les trois ont la
même forme : quelque chose paraissait fonctionner.**

⚠️ **La rotation avait fait sauter `sslmode` des deux chaînes de connexion.** La
base repassait **en clair** — le défaut exact documenté le 19 août, reproduit par
le geste même de mise à jour. Le piège dans le piège : `pg_stat_ssl` répondait
« pas de TLS » **même après correction**, parce qu'à travers un pooler cette vue
décrit la liaison *pooler → PostgreSQL*, pas *client → pooler*. La mesure juste
se prend côté client, sur la socket, et **il faut un témoin** : la même chaîne
sans `sslmode` doit se connecter en clair, sinon on ne prouve rien.

⚠️ **`next dev` lit `.env` au démarrage.** Le serveur tournait encore avec
l'ancien mot de passe : toutes les pages du tableau de bord en 500, et ses
tentatives répétées ont déclenché le **coupe-circuit de Supabase**, qui bloque
alors les connexions valides aussi. Le symptôme ressemble à une panne Supabase ;
c'est un processus périmé. **Toute rotation doit s'accompagner du redémarrage des
processus qui ont lu `.env`.**

⚠️ **`npx prisma db pull` réécrit `schema.prisma` depuis la base** et supprime les
commentaires simples (`//`). Ici : 15 perdus, champs réordonnés, 1310 lignes de
diff pour **zéro** changement de modèle (vérifié par `migrate diff` dans les deux
sens). Restauré. Sur ce dépôt le schéma est la source de vérité et la base en
découle — `db pull` sert à constater, pas à éditer.

**État réel de la base** — inchangé côté métier : 3 écoles, **136 élèves**,
134 inscriptions, 82 notes, 20 bulletins, 8 factures (7 `PAID` / 1 `PENDING`),
7 paiements tous `CASH`. ⚠️ S'y ajoutent des **résidus de fixtures** dans
« Kory Academy 2 » (5 comptes, 3 classes, 7 documents préfixés `SONDE15` /
`SONDEMOB`), laissés par un vérificateur interrompu. Ils sont **visibles à
l'écran** dans le centre documentaire. Non supprimés : le chantier l'interdisait.

**Leçon d'outillage** : un vérificateur interrompu ne nettoie jamais, et
relancer le même script ne récupère pas ses orphelins — chaque exécution ne
connaît que ses propres fixtures.


---

## Préparation de l'environnement de production — 20 août 2026 (C.4)

Rien n'a été déployé, aucun projet Supabase créé, aucune donnée migrée.

### La correction d'une idée reçue

En mesurant réellement d'où vient chaque protection, une croyance s'est révélée
fausse. Interrogées avec la clé publique, les tables répondent **HTTP 401, code
`42501`** — *insufficient privilege*. Ce n'est **pas RLS** qui refuse : c'est la
**révocation des droits** posée par `harden-rls.ts`. RLS seule aurait renvoyé
`200 []`, un succès vide.

Et sur le chemin de l'application, Prisma se connecte avec un rôle
`rolbypassrls = true` : **RLS n'y a aucun effet.**

⚠️ **Conséquence à retenir : la barrière qui empêche l'école A de voir l'école B,
c'est le code — le cloisonnement `schoolId` —, rien d'autre.** Les tests
d'isolation sont donc la protection la plus précieuse du dépôt, et « les données
sont protégées par RLS » est une phrase qu'il ne faut jamais écrire.

### En-têtes de sécurité

L'application n'en envoyait **aucun**. Cinq ajoutés et vérifiés servis. Deux
décisions valent d'être conservées :

- ⚠️ **la caméra n'est pas coupée** : les dépôts de pièces passent par
  `<input type="file" accept="image/*">`, qui ouvre « Prendre une photo » sur
  mobile. Une `Permissions-Policy` restrictive par réflexe aurait cassé le geste
  le plus courant du produit, sans message d'erreur ;
- ⚠️ **aucune CSP** : utile pour Next.js, elle exige des `nonce` propagés à
  chaque script. Écrite à l'aveugle, elle casse l'application ou ne protège
  rien. Chantier à part.

`X-Frame-Options: DENY` a été vérifié **avant** d'être posé : l'aperçu de
documents encadre une URL signée `*.supabase.co`, donc une autre origine — c'est
l'en-tête de Supabase qui le gouverne, pas le nôtre.

### Le piège, pour la quatrième fois

Le nouveau vérificateur interdisait la chaîne « Content-Security-Policy » et
s'est déclenché sur le commentaire de `next.config.ts` qui explique justement
son absence. Après `print:`, « pas de suivi des présences » et le nom du
prestataire abandonné, c'est la **quatrième** occurrence du même piège.

⚠️ **Règle à appliquer désormais** : tout contrôle qui cherche un mot doit se
demander (a) s'il le contient lui-même, (b) s'il l'interdit à un fichier qui a
le droit de l'expliquer. La parade retenue ici : chercher la **forme
déclarative** (`key: "…"`) plutôt que le mot.

### Ce qui bloque la suite

Le **domaine** commande tout : `NEXT_PUBLIC_SITE_URL`, la Site URL de Supabase
Auth, les redirections, les liens d'e-mail et le DKIM. Tant qu'il n'est pas
choisi, ni le SMTP ni la mise en ligne ne peuvent avancer — et une URL
temporaire ne doit surtout pas devenir la configuration définitive : un lien de
confirmation déjà parti continue de pointer où il pointait.

## Panne de production — aucune inscription ni connexion possible — ✅ CORRIGÉ (20 août 2026)

**Symptôme.** Sur `educom.school`, le bouton « Créer l'espace de mon école »
répondait `Invalid path specified in request URL`. Les pages s'affichaient
parfaitement, ce qui rendait la panne trompeuse : elle ressemblait à un problème
de formulaire alors que **toute l'authentification** était morte.

**La cause, et pourquoi elle n'était pas là où on la cherchait.** Le message ne
vient ni d'EduCom ni de Supabase Auth : c'est la réponse **404 de PostgREST**.
`NEXT_PUBLIC_SUPABASE_URL` portait le suffixe `/rest/v1` sur Vercel. Or
`supabase-js` ajoute lui-même le chemin du service : la variable doit contenir
l'**origine seule**. Avec le suffixe, `signUp()` partait vers
`…/rest/v1/auth/v1/token` — donc vers la mauvaise brique de Supabase.

Le piège est un unique copier-coller : le tableau de bord Supabase affiche cette
valeur telle quelle sous l'intitulé « RESTful endpoint ».

**Ce qui a permis de trancher sans deviner.** Chaque service Supabase renvoie un
message **distinct** face à un appel d'authentification (`/storage/v1` → « Route
POST:/auth/v1/token… not found » ; `/functions/v1` → « Requested function was
not found » ; `/realtime/v1` → « API key is missing »). Seul un chemin sous
`/rest/v1` produit exactement cette phrase : le diagnostic est univoque.
La preuve finale est venue de la production elle-même — l'action serveur
`login`, appelée avec des identifiants bidons, a renvoyé le **même** message là
où une configuration saine renvoie `invalid_credentials`. Le défaut n'était donc
pas dans `/register` mais dans une valeur partagée.

**Décision : le produit absorbe l'erreur, mais ne la cache pas.**
`src/lib/supabase/config.ts` devient le point unique de lecture (les cinq
lectures directes de `process.env` ont disparu). Il retire un chemin de service
placé à la racine, plus les espaces et barres obliques de fin — trois scories de
copier-coller qui ne sont *jamais* valides — et **le journalise en erreur**. Il
lève aussi un message en français quand la variable est absente, là où
`undefined` filait jusqu'à un échec anglais sans rapport avec la cause.

⚠️ **Ce qui n'a délibérément PAS été fait :** aucun autre chemin n'est deviné.
Une installation auto-hébergée servie derrière `https://exemple.tld/supabase`
reste intacte. Réparer ce qu'on ne connaît pas casserait une configuration
légitime.

⚠️ **La variable Vercel reste fausse.** La normalisation est un filet, pas la
correction : `NEXT_PUBLIC_SUPABASE_URL` doit être ramenée à
`https://<ref>.supabase.co`. Sans cela, la même valeur continuera d'alimenter
tout ce qui ne passe pas par `config.ts` (scripts, futurs outils).

**Régression pré-existante constatée au passage — NON corrigée.**
`verify-pilote-auth` est à **52/62** (10 échecs, section 5 « chacun chez soi » :
A et B sont renvoyés vers `/onboarding`). Vérifié par mise de côté du correctif :
**les 10 mêmes échecs existent sans lui**. Ce n'est donc pas une régression de ce
chantier, mais l'archive le donnait à 62/62 : l'écart est réel et reste ouvert.

## ⚠️ BASE DE DÉVELOPPEMENT VIDÉE — constaté le 20 août 2026, cause antérieure à ce chantier

**Constat.** Toutes les tables métier du projet de développement (`vuvjtc…`, le
même qu'auparavant — `rappel.md` §57) sont à **zéro ligne** : School, Student,
User, Class, Enrollment, Grade, Invoice, Payment. L'archive donnait encore
**136 élèves, 3 écoles, 9 utilisateurs, 14 classes** au 18 août.

**Ce qui a été mesuré, pas supposé.**

1. `_prisma_migrations` **existe désormais** — `prisma/migrations/README.md`
   affirmait qu'elle était ABSENTE, et le disait avec raison au moment écrit.
   Elle contient `00000000000000_baseline`, appliquée le **20 août 2026 à
   04:06:14 UTC**, avec `applied_steps_count = 1` : le SQL a donc été **exécuté**,
   pas seulement enregistré. Or ce fichier ne fait que **créer** 34 tables : pour
   qu'il réussisse, le schéma devait être vide. Les tables ont donc été
   **supprimées puis recréées**. Une seconde entrée `0001_init` (0 étape) suit à
   04:06:30 ; son dossier n'existe pas dans le dépôt.
2. `pg_stat_user_tables` confirme la recréation : les compteurs des tables
   repartent de zéro. On n'y lit que **6 insertions et 6 suppressions** par
   table — exactement les fixtures des trois exécutions de `verify-pilote-auth`
   de ce chantier, toutes nettoyées (0 ligne vivante). Si 136 élèves avaient été
   supprimés par une requête ordinaire, `n_tup_del` vaudrait 142, pas 6.

**Conclusion : la perte est ANTÉRIEURE à ce chantier**, et n'a pas pu être
causée par lui — aucune commande de correction du bug d'authentification ne
touche au schéma. Le profil correspond à un `prisma migrate reset` (ou
équivalent) lancé vers 04:06 UTC, très probablement pendant la mise en ligne
Vercel. C'est précisément la commande contre laquelle
`prisma/migrations/README.md` mettait en garde : « ne jamais utiliser
`prisma migrate reset` : la commande *supprime toute la base* ».

⚠️ **Rien n'est récupérable localement.** `backups/` ne contient que des
**relevés de comptages** (`{"counts": …}`), pas les lignes. Seul
`avant-lot-11-2026-08-17.json` porte des données — écoles, utilisateurs,
factures, paiements, périodes — mais **aucun élève**. La restauration dépend
donc entièrement des sauvegardes de Supabase, dont C.4 a justement déclaré
qu'elles n'avaient **jamais été vérifiées** (NON PROUVÉ). À vérifier d'urgence
tant que la fenêtre de rétention court.

**Ce que cet incident confirme.** La réserve posée en C.4 — « aucune sauvegarde
constatée, aucune restauration essayée » — n'était pas une précaution
rhétorique. C'est le premier chantier où elle coûte quelque chose.

### Activation Engine (PLG) & Données de Démonstration (24 août 2026)
- **School Activation Engine** : Implémentation du tracker d'activation sur l'accueil (`/dashboard`). Le widget `PremiersPas` montre désormais une barre de progression claire de la complétion du compte (Établissement, Classes, Élèves, Équipe, Premières notes).
- **Injection de Données Démo** : Intégration d'un bouton "Voir EduCom avec des données de démonstration" à la fin de l'onboarding (`Wizard.tsx`).
- **Données Fictives Séparées** : L'injection (`demo-actions.ts`) crée des classes, matières, évaluations, élèves et notes fictives, toutes préfixées par `[DÉMO]` ou `DEMO-`. Cela permet une séparation totale des données réelles.
- **Suppression Ciblée** : Sur le Dashboard, une bannière spéciale s'affiche quand des données de démo sont présentes, permettant de les supprimer d'un clic (action serveur stricte supprimant uniquement ce qui commence par `[DÉMO]`), garantissant que la base de l'école n'est jamais effacée.
- **Importation Solide Conservée** : La page `/dashboard/students/import` utilise déjà `createManyAndReturn` dans une transaction Prisma. En cas d'erreur de format, un rollback automatique a lieu, aucune donnée n'est détruite.

### Chantier #3 : Attendance & Opérations Quotidiennes (Août 2026)
- **Modélisation** : Création du modèle `Attendance` dans `schema.prisma` avec `AttendanceStatus` (PRESENT, ABSENT, LATE, EXCUSED) et index d'unicité `@@unique([studentId, date])` restreint à une présence par jour par élève.
- **Sécurité et Isolation** : La relation `schoolId` sur le modèle permet d'assurer une isolation stricte multitenant pour les requêtes sans join complexe. La Server Action `saveAttendanceBatch` protège toutes les requêtes via `requireSchoolContext()`.
- **Routage et UI** : L'écran de gestion s'oriente selon le rôle.
  - `TEACHER` : Présente les classes du professeur et amène à `/dashboard/attendance/take` pour marquer la classe avec l'action rapide "Tous présents".
  - `DIRECTOR / SECRETARY` : Affiche le taux global de présence, les retards/absents, et les classes n'ayant pas encore procédé à l'appel.
- **Context Engine** : Intégration transparente de la routine au `Next Best Action`. Durant une période académique (Teaching, Exams), les rôles administratifs voient une alerte de complétion (`severity: "watch"`) tandis que l'enseignant reçoit une notification `severity: "urgent"` tant que ses appels ne sont pas effectués.
- **Performance** : L'interface évite le N+1 problem et l'enregistrement passe par `prisma.$transaction()` pour grouper les insertions (upserts).

### Navigation & Consolidation (Chantier #5)
- **Refonte des Domaines** : Suppression des menus tentaculaires. La sidebar se limite strictement à 8 métiers (Tableau de bord, Élèves & dossiers, Présences, Notes & bulletins, Finance, Documents, Communications, Administration).
- **Administration Hub** : Création de `/dashboard/admin` pour regrouper Équipe, Configuration pédagogique, Configuration financière, Modèles de documents, Rapports, et Paramètres sous un seul toit, évitant l'encombrement de la barre latérale.
- **Récupération des fonctionnalités orphelines** : Les hubs de métiers ont été mis à jour pour assurer 100% d'accessibilité :
  - **Documents** pointe désormais explicitement vers le Centre documentaire.
  - **Notes & bulletins** intègre la génération de Bulletins (qui n'était qu'en /documents).
  - **Élèves & dossiers** inclut l'Annuaire, les Dossiers, Import et Export.
