# Communication → Communauté — archive et nouveau module

> Créé le 25 septembre 2026 (« Product Change »). Ce fichier consigne l'ancien module
> Communication (archivé) et le nouveau module Communauté (actif). Le détail des
> décisions au fil de l'eau reste dans `context.md`.

## 1. Pourquoi le changement

L'ancien module reposait sur l'**API WhatsApp Business (Meta)** : chaque école devait
connecter son propre compte (numéro, identifiants Meta, paramétrage du webhook). En
pratique, c'était trop difficile pour les écoles, et le résultat n'était jamais fiable.
Aucun canal sortant n'a d'ailleurs jamais été prouvé (voir `src/lib/channels.ts`).

Décision de Kory : la communication devient **interne**. EduCom = Éducation + **Communauté** :
rapprocher l'école et les parents, augmenter leur engagement et suivre facilement les
enfants. L'ambition : « notre propre WhatsApp, notre propre Instagram ou TikTok ».

## 2. Ancien module — ARCHIVÉ

### Écrans retirés de la navigation
Leur code est déplacé, sans rien supprimer, dans `src/lib/communication/legacy/`
(hors de `src/app`, donc plus aucune route) :

| Ancien écran | Ancienne adresse | Fichiers archivés | Remplacé par |
|---|---|---|---|
| Centre de communication (statistiques, campagnes, widget WhatsApp) | `/dashboard/communications` | `CommunicationCenterPage.tsx`, `CommunicationCenterClient.tsx` | Fil de la communauté |
| Boîte WhatsApp (conversations entrantes, validation des demandes, réponse manuelle) | `/dashboard/communications/inbox` | `inbox/` | Discussions avec les familles |
| Campagnes WhatsApp (relances automatiques, modèles) | `/dashboard/communications/campaigns/new` | `campaigns/new/` | Publications et notifications push |

Les anciennes adresses **redirigent** vers les nouveaux écrans : aucun lien ni favori
ne tombe sur une erreur.

### Conservé tel quel, mais mis en veille
- **Sondages** (`/dashboard/communications/surveys`) : ils ne dépendent pas de WhatsApp
  et restent dans le menu Communauté.
- **Webhook WhatsApp** (`src/app/api/webhooks/whatsapp`) et bibliothèques
  `src/lib/whatsapp/` (`client.ts`, `routing.ts`) : laissés en place. Ils sont inertes sans
  `META_APP_SECRET` / `META_WEBHOOK_VERIFY_TOKEN`.
- **Connexion WhatsApp** — ARCHIVÉE le 26 sept. 2026 (accord de Kory) : le widget et ses trois
  actions (`simulateConnectWhatsApp`, `finalizeWhatsAppConnection`, `disconnectWhatsApp`) sont sortis
  de `settings/actions.ts` vers `src/lib/communication/legacy/` (`WhatsAppConnectionWidget.tsx`,
  `whatsappActions.ts`) : ils ne sont plus appelables. Les champs `School.whatsapp*` restent en base.
- **Relances de pièces** (`src/lib/parentReminder.ts`) : elles utilisent encore l'envoi WhatsApp
  quand il est configuré. À basculer vers les notifications push et les Discussions.
- `src/lib/channels.ts`, `diffusion.ts`, `campaignDispatch.ts` : inchangés.

### Données (base)
**Rien n'est supprimé.** Les tables `Message`, `WhatsAppConversation`, `WhatsAppTemplate`,
`CommunicationCampaign`, `ActionLink` et `Survey` restent intactes. Une suppression
éventuelle suivra la règle 4 d'`AGENTS.md` : comptage, sauvegarde, essai à blanc.

## 3. Nouveau module — COMMUNAUTÉ (actif)

### Écrans
| Pour qui | Écran | Adresse |
|---|---|---|
| Personnel | Fil de la communauté (école + classes) | `/dashboard/communications/communaute` |
| Personnel | Discussions avec les familles | `/dashboard/communications/discussions` |
| Parents | Communauté | `/famille/communaute` |
| Parents | Messages | `/famille/messages` |

### Fonctions
- **Fil façon Instagram** :
  - publications pour toute l'école ou pour une classe ;
  - texte, jusqu'à 10 photos, vidéos (2 min et 50 Mo au maximum), PDF ;
  - épinglage ;
  - « À lire obligatoirement », avec « J'ai lu » côté parent et « lu par X sur Y » côté école ;
  - réactions 👍 👏 🙏, commentaires (fermables) ;
  - partage sur WhatsApp par simple lien (aucune API).
- **Messagerie façon WhatsApp** :
  - un parent et un service de l'école, à propos d'un de ses enfants ;
  - services : enseignant de la classe, secrétariat, comptabilité, direction ;
  - boîtes d'équipe ;
  - messages non lus, pièces jointes, suppression (« Message supprimé ») ;
  - rafraîchissement toutes les 7 s.
- **Notifications push** : à chaque nouvelle publication ou nouveau message. Web Push,
  gratuit, sans magasin d'applications ; sur iPhone, EduCom doit d'abord être ajouté à
  l'écran d'accueil.
- **Modération** :
  - la direction masque (réversible), elle ne supprime pas en silence ;
  - chaque auteur supprime ses propres contenus ;
  - les parents peuvent signaler un contenu (notification à la direction).

### Qui voit quoi (seule autorité : `src/lib/community.ts` et `src/lib/messagerie.ts`)
| Rôle | Fil | Publie | Discussions |
|---|---|---|---|
| Direction (OWNER, ADMIN) | tout, y compris le masqué | école et toutes les classes | toutes |
| Secrétariat, assistant | tout | école et toutes les classes (assistant : lecture) | boîte Secrétariat |
| Comptabilité | tout | — | boîte Comptabilité |
| Enseignant | école + **ses** classes | **ses** classes | parents de **ses** classes |
| Parent | école + classes de **ses** enfants | — (réagit, commente) | **ses** discussions |

Jamais de message entre parents (décision de Kory).

### Fichiers
- Règles : `src/lib/community.ts`, `src/lib/messagerie.ts`
- Médias : `src/lib/communityMedia.ts` (bucket privé `community-media`, créé
  automatiquement ; envoi direct du navigateur par URL signée)
- Notifications : `src/lib/notifications.ts`, `src/lib/webpush.ts` (Web Push natif, vérifié par le vecteur de test de la RFC 8291), `public/sw.js`, `src/app/manifest.ts`
- Actions : `src/app/dashboard/communications/{communaute,discussions}/actions.ts`
- Interface : `src/components/community/` (`FilCommunaute`, `Messagerie`,
  `ActiverNotifications`, `envoiMedia`)
- Tables : `CommunityPost`, `CommunityComment`, `CommunityReaction`, `CommunityRead`,
  `CommunityReport`, `CommunityMedia`, `CommunityConversation`, `CommunityMessage`,
  `CommunityConversationRead`, `PushSubscription`
- Vérifications : `scripts/verify-community-access.ts`, `scripts/verify-messagerie-access.ts`, `scripts/verify-webpush.ts`

### Refonte façon Slack — 26 sept. 2026
- Fil, discussions, canaux et classes réunis sur **une seule page** (`/dashboard/communications/communaute`,
  `/famille/communaute`) ; `/discussions` et `/famille/messages` redirigent.
- **Canaux créés par l'école** : Parents et école, Personnel uniquement, Sur invitation (comité, APE…).
  Tables `CommunityChannel`, `CommunityChannelMember`, `CommunitySpaceRead` (non-lus par canal).
- Interface : `Communaute.tsx` (barre + infos), `FilPublications.tsx` (cartes, réponses), `Discussion.tsx`
  (messages directs), `DialogueCanal.tsx` (création avec modèles).

### Communauté complète — 26 sept. 2026 (nuit)
- **Canaux « à la @ »** (`src/lib/audience.ts`) : @tous-les-parents, @tout-le-personnel, @enseignants,
  @secrétariat, @comptabilité, @direction, @parents-CM2, @profs-CM2, et des personnes. **Privé par défaut.**
- **Cloche de notifications** (barre du haut, espace famille) : son à l'arrivée, notification du téléphone /
  de l'ordinateur quand EduCom est fermé (Web Push). Réutilise `StaffNotification` (parents compris).
- **@mentions** dans les publications et réponses : la personne est prévenue si elle voit la publication.
- **Formulaires** façon Google Form (`CommunityForm*`, `src/lib/formulaires.ts`) : 6 types de questions,
  destinataires « @ » figés à l'envoi, remplis dans EduCom, résultats, relance, export CSV, clôture.
- **Engagement** : « Qui a vu ? » sur chaque publication (auteur, direction) ; tableau pour la direction
  (parents actifs, publications vues, parents à relancer).
- **IA** (`src/lib/ia.ts`) : rédiger / améliorer / raccourcir / corriger, résumer un sondage, analyser un
  formulaire, récap de la semaine. **Inactive tant que `ANTHROPIC_API_KEY` n'est pas dans `.env.local`.**
- **Modèles de messages** dans le composeur (rentrée, réunion, fermeture, sortie, bulletins…).
- Anciens questionnaires à lien public (`/surveys`, `/s/[id]`) : conservés, hors menu (lien discret depuis Sondages).

## 4. Tester en local

Déjà fait par Claude sur le poste :
- client Prisma régénéré (`prisma generate`) ;
- clés VAPID générées et ajoutées à `.env.local` (les notifications fonctionnent sans
  aucun paquet à installer : Web Push est implémenté nativement, `src/lib/webpush.ts`).

Reste à faire par Kory (la base n'est joignable que depuis son Mac) :
1. `npx prisma db push` (26 sept. : 3 tables et une colonne ajoutées, rien de supprimé)
2. Recharger la page Communauté

Puis :
- en direction : Communauté → publier une annonce avec une photo ;
- en parent (sélecteur de rôle de test) : Communauté → réagir, commenter, « J'ai lu » ;
  Messages → écrire à l'enseignant.

## 5. Prochaines étapes
1. Retirer la connexion WhatsApp des Paramètres et basculer `parentReminder` vers push et Discussions.
2. Droit à l'image : accord du parent par élève avant toute photo d'élève publiée.
3. Partage de bulletin dans une discussion (document officiel, en privé).
4. Tableau d'engagement pour la direction (lectures, réactions, parents actifs).
5. Temps réel, si le rafraîchissement toutes les 7 s ne suffit plus.
