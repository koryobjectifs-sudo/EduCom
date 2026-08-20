# rappel.md — BACKLOG / À TRAITER PLUS TARD

> **Ce fichier ne contient AUCUNE tâche en cours.** Tout ce qui suit est du
> **backlog** : des éléments explicitement laissés hors périmètre, ou identifiés
> comme à améliorer plus tard. Rien ici ne doit être traité sans que Kory ouvre
> le lot correspondant.
>
> **Créé le 18 août 2026**, à l'issue du LOT 12.2.
>
> **Relation avec `context.md`** : `context.md` reste la mémoire du projet — ce
> qui a été fait, pourquoi, et les pièges rencontrés. `rappel.md` ne porte que le
> **futur**. Les « limites restantes » consignées en fin de chaque lot dans
> `context.md` sont reprises ici quand elles constituent un vrai sujet à
> rouvrir ; le compte rendu du lot reste la source pour le *contexte* de la
> limite, ce fichier pour la *décision de la traiter plus tard*.
>
> ⚠️ `context.md` porte aussi une section « ⏸️ EN PAUSE — à ressortir quand Kory
> dit “rappel” » et une section « Idées “Au Chaud” ». Elles n'ont **pas** été
> déplacées ici (aucune modification d'autre fichier n'était autorisée). À
> arbitrer : soit les fusionner dans ce fichier, soit acter que `rappel.md` ne
> couvre que le backlog issu des lots 12.x.

---

# LOT 12.2 — BACKLOG / FOLLOW-UP

## 1 · Lien vers la grille tarifaire

Ajouter un accès visible depuis `/dashboard/payments` vers
**`/dashboard/payments/tarifs`**.

**Objectif** : permettre au gestionnaire d'accéder facilement à la grille
tarifaire officielle **en lecture seule**, à son forecast et à la demande de
modification.

⚠️ **Ne pas donner au gestionnaire le droit de modifier directement la grille.**
L'écran existe déjà et est correctement cloisonné (il n'importe que
`requestFeeChange()`, et les actions d'écriture exigent `FEE_REVIEW_PATH`) — il
ne manque que le point d'entrée dans la navigation.

*État au LOT 12.2 : la route est atteignable par URL et par le fil d'Ariane,
aucun lien ne s'y rend depuis l'écran Paiements.*

---

## 2 · Notifications dans le workspace financier

Les notifications internes (`StaffNotification`) sont aujourd'hui visibles
**uniquement dans `/dashboard/reports`**.

**À améliorer plus tard** : permettre aux utilisateurs concernés de retrouver
leurs notifications également depuis leur **workspace de travail pertinent**,
notamment le **workspace financier** pour les gestionnaires / comptables.

⚠️ **Ne pas créer de canal externe.** Le seul canal sortant du dépôt est Twilio,
câblé pour les parents (`Message`), pas pour le personnel. Le mécanisme interne
existant suffit ; il s'agit d'élargir sa **surface d'affichage**, pas sa nature.

*État au LOT 12.2 : le cycle non lue → lecture → persistance est complet et
testé ; sa seule surface est l'écran Rapports.*

---

## 3 · Setup financier — extension des frais

Le setup initial de l'onboarding (étape 3, « Vos tarifs officiels ») permet
actuellement de configurer :

- frais d'inscription ;
- scolarité (par niveau sélectionné).

**À prévoir plus tard pour compléter le référentiel financier :**

- mensualités détaillées ;
- tarifs par cycle ;
- tarifs par classe ;
- cantine ;
- transport ;
- assurance ;
- autres frais / options ;
- périodes de facturation ;
- échéances ;
- règles de paiement.

⚠️ **Responsabilités à ne pas confondre :**

- **DIRECTRICE** = source de vérité du référentiel tarifaire ;
- **SYSTÈME** = calcule automatiquement le forecast ;
- **GESTIONNAIRE** = exploite et analyse le forecast.

*Note : `FeeItem` porte déjà `cycle`, `classId`, `cadence` (ONE_OFF / ANNUAL /
TERM / MONTHLY) et `mandatory`. Cantine, transport, assurance et tarifs par
classe sont donc déjà saisissables dans `/dashboard/settings/fees` — ce qui
manque est leur présence dans le **parcours de setup**, volontairement gardé
court. Les périodes de facturation, échéances et règles de paiement, elles,
n'existent pas encore au modèle.*

---

## 4 · Forecast — évolution future

Le forecast actuel est **annuel**.

**À étudier plus tard :**

- forecast mensuel ;
- forecast trimestriel ;
- proratisation ;
- échéanciers ;
- projections par période ;
- comparaison forecast / facturation / encaissement.

⚠️ **Ne rien implémenter maintenant.** Et surtout : **ne pas inventer une
proratisation tant que le modèle de données nécessaire n'existe pas.** Découper
une scolarité annuelle en « attendu de cette semaine » supposerait un échéancier
que le schéma ne porte pas — ce serait inventer de la précision.

*Les deux seules hypothèses de conversion actuelles (`MONTHS_PER_YEAR = 10`,
`TERMS_PER_YEAR = 3`) sont nommées en un seul endroit, dans `src/lib/fees.ts`.*

---

## 5 · Tests authentifiés / navigateur

Les tests actuels utilisent des sondes HTTP et des contrôles runtime réels, mais
**la sonde principale reste non authentifiée** (route temporaire sans session,
créée puis supprimée — pratique en place depuis le LOT 08).

**À prévoir plus tard :**

- tests avec vraie session utilisateur ;
- parcours réel des 7 rôles ;
- tests navigateur ;
- vérification visuelle responsive ;
- vérification des interactions utilisateur.

*Ce qui manque n'est pas la preuve du cloisonnement — elle est faite au niveau du
DOM servi — mais la preuve du **parcours** : connexion, navigation, clics,
rendu visuel.*

---

## 6 · Documents / dossier élève / GED

**BACKLOG FUTUR — NE PAS IMPLÉMENTER.**

Prévoir ultérieurement :

- vrai dossier numérique par élève ;
- documents obligatoires par cycle ;
- documents manquants ;
- import de documents existants ;
- scan mobile ;
- OCR ;
- classement automatique ;
- téléchargement d'un dossier complet ;
- export ZIP ;
- transmission directe d'un dossier ;
- préparation des dossiers destinés à l'inspection.

Les documents obligatoires devront être **configurables selon le cycle** :

- élémentaire ;
- secondaire ;
- lycée.

⚠️ La structure devra être adaptée aux **exigences réellement applicables au
Sénégal** et **vérifiée avant implémentation**.

*Contrainte connue à ne pas oublier : `DocumentRequest` ne porte aujourd'hui ni
`studentId` ni `parentId`. C'est précisément ce qui rend « documents par élève /
par famille » indisponible dans les rapports depuis le LOT 12. Ce chantier
suppose donc un modèle de données, pas seulement des écrans.*

---

## 7 · Documents scolaires à destination des parents

**BACKLOG FUTUR.**

Prévoir un système permettant de gérer et distribuer facilement :

- bons de commande d'uniformes ;
- listes de fournitures ;
- listes de manuels ;
- documents recto / verso ;
- documents différents selon sexe / cycle / classe lorsque nécessaire.

**Objectif** : permettre une préparation simple pour :

- téléchargement ;
- email ;
- WhatsApp ;
- impression.

⚠️ **Ne pas inventer de documents ou de contenu.**

---

## 8 · Workspaces par rôle

**BACKLOG FUTUR.**

Les **rapports** par rôle existent maintenant (LOT 12 / 12.1 / 12.2). À
approfondir plus tard : chaque rôle doit disposer d'un **workspace opérationnel**
correspondant à ses tâches réelles.

**GESTIONNAIRE / COMPTABLE**
→ forecast → facturation → encaissement → dépenses → état financier
→ soumission à la direction.

**SECRÉTAIRE**
→ dossiers élèves → documents → bulletins → impressions → documents manquants
→ transmission.

**ENSEIGNANT**
→ saisie → vérification → soumission → retours.

**DIRECTION**
→ supervision → décisions → rapports consolidés → activité des équipes.

**Principe à conserver** : chaque utilisateur voit uniquement les outils et
informations pertinents pour son travail.

*Acquis à ne pas perdre : au LOT 12.2, les sections non autorisées ne sont pas
masquées en CSS — elles ne sont pas construites, donc absentes du DOM. Tout
workspace futur doit tenir la même règle.*

---

## 9 · Source de vérité tarifaire

**Rappel explicite, à ne pas laisser dériver :**

- **DIRECTRICE** = source de vérité du **référentiel tarifaire**.
- **SYSTÈME** = **calcul automatique** du forecast.
- **GESTIONNAIRE** = responsable **opérationnel** de l'analyse et de la
  préparation de son **état financier**.

Les modifications proposées par le gestionnaire passent par une **demande**.
La directrice **accepte ou refuse**. Les personnes concernées sont ensuite
**informées**.

*Mécanisme en place depuis le LOT 12.1 : la séparation des pouvoirs est portée
par le **chemin** (`FEE_REVIEW_PATH = /dashboard/settings`, qu'aucun rôle ne
liste), jamais par une table de rôles parallèle. Toute évolution doit conserver
cette propriété.*

---

## 10 · Ne pas perdre la chaîne financière

Conserver cette logique comme **référence** :

```
RÉFÉRENTIEL TARIFAIRE OFFICIEL
        ↓
FORECAST AUTOMATIQUE
        ↓
FACTURATION
        ↓
ENCAISSEMENT
        ↓
RESTE À ENCAISSER
        ↓
RELANCES
        ↓
ÉTAT FINANCIER / RAPPORT
        ↓
DIRECTION
```

⚠️ **Cette chaîne ne signifie PAS que la directrice fait le forecast.**

- La **directrice** définit les **règles tarifaires**.
- Le **système** calcule.
- Le **gestionnaire** travaille sur les résultats.
- La **direction** supervise et décide.

*Rappel des cinq définitions, à ne jamais confondre (fixées au LOT 12.1) :*
*le **forecast** ne lit aucune facture ; le **facturé** est ce qui a été réclamé ;*
*l'**encaissé** est `SUM(Payment.amount)` ; le **reste à encaisser** est un stock ;*
*les **relances** sont le sous-ensemble du reste dont l'échéance est dépassée.*

---

---

## 11 · Rapports — structure par service / employé

**BACKLOG FUTUR — à conserver comme RÈGLE UX.**

⚠️ **Cette règle est déjà appliquée** (LOTS 12, 12.1, 12.2). Elle figure ici non
pas comme un chantier à ouvrir, mais comme un **invariant à ne pas perdre** lors
des évolutions futures des rapports et des workspaces.

### La règle

Pour les utilisateurs autorisés à accéder à `/dashboard/reports` :

**EMPLOYÉ / STAFF**
→ ne construire et n'afficher que les sections correspondant à ses
responsabilités et à son workspace.

⚠️ **Ne pas afficher les autres sections simplement pour les cacher en CSS.**
Elles doivent être **absentes du DOM**, afin d'éviter le scroll inutile et de
limiter l'exposition d'informations non pertinentes.

**DIRECTION**
→ peut voir l'ensemble des rapports autorisés, mais la page doit être organisée
**clairement par service ou domaine de travail** :

| Groupe | Contenu attendu |
|---|---|
| **FINANCE** | activité financière · forecast · facturation · encaissements · dépenses · états financiers · impayés / relances |
| **SECRÉTARIAT** | dossiers élèves · documents · bulletins · impressions · transmissions |
| **ENSEIGNEMENT** | classes · notes · bulletins · éléments restant à traiter |
| **AUTRES MÉTRIQUES** | indicateurs **transversaux** ne correspondant pas directement à un service |

**Objectif** : la directrice doit comprendre rapidement ce que fait chaque
service / employé, sans parcourir une longue liste de KPI mélangés.

⚠️ « Autres métriques » ne doit contenir **que des métriques réellement
disponibles dans le schéma**. **Ne jamais créer une métrique uniquement pour
remplir l'espace.**

### État réel à la clôture du LOT 12.2

**Acquis, vérifié :**

- les quatre groupes existent et sont ordonnés **Finance · Secrétariat ·
  Enseignement · Autres métriques** ;
- un employé ne reçoit **qu'un groupe** — les autres ne sont pas construits par
  `buildReport()`, donc absents du DOM (prouvé au rendu : le HTML servi à
  SECRETARY, ASSISTANT, TEACHER et PARENT ne contient aucune chaîne financière) ;
- « Autres métriques » ne contient que deux sections réellement transverses
  (décisions en attente, activité tracée) — rien n'y a été inventé ;
- FINANCE et ENSEIGNEMENT couvrent l'intégralité des rubriques listées ci-dessus.

**Reste ouvert dans SECRÉTARIAT — une seule rubrique :**

- **« impressions » n'est pas disponible.** `ReportCardStatus` s'arrête à
  `APPROVED` (« imprimable ») et **rien n'enregistre qu'une impression a eu
  lieu**. La métrique est déclarée indisponible avec sa raison, conformément à
  la règle ci-dessus — elle ne pourra exister qu'avec une trace d'impression au
  schéma.
- **« transmissions »** est couverte partiellement, via `submittedAt` des
  bulletins (dépôt au secrétariat). Une notion de transmission plus large
  (au parent, à l'inspection) relève du point 6.

*Voir aussi le point 8 (« Workspaces par rôle »), qui étend le même principe
au-delà des rapports : ce point 11 en est la déclinaison pour
`/dashboard/reports`.*

# FIN DU BACKLOG LOT 12.2

# LOT 13.1 — DÉCISIONS MÉTIER À RENDRE

## 12 · Catégorie « AUTRES » — arbitrage direction attendu

**Statut : DÉCISION MÉTIER, pas un chantier technique. Fermé par défaut en attendant.**

Le lot 13.1 borne l'accès de l'enseignant aux pièces **SCOLARITE** et **EXAMENS**,
déduites de ce que le dépôt dit déjà du métier d'enseignant (`ROLE_LABELS.TEACHER` :
« ses classes, ses élèves et la saisie des notes »). IDENTITE, INSCRIPTION et TRANSFERT
sont administratives ; SANTE est médicale.

**`AUTRES` n'a pas été tranchée, et ne devait pas l'être.** C'est un fourre-tout : son
contenu est inconnu **par construction**. Elle peut porter une autorisation de sortie
comme un jugement de divorce. Rien dans le dépôt ne permet de décider, donc rien n'a été
décidé : la catégorie est **refusée à l'enseignant** (fermeture par défaut).

**Question à poser à une directrice :** « Quand vous classez une pièce dans *Autres*,
est-ce que l'enseignant de la classe doit pouvoir l'ouvrir ? » Si la réponse dépend de la
pièce, alors ce n'est pas la catégorie qu'il faut ouvrir : il faut un marqueur
« consultable par l'enseignant » sur l'exigence elle-même.

→ Le jour où c'est tranché : `TEACHER_DOC_CATEGORIES` dans `src/lib/studentScope.ts`.

## 13 · Catégories visibles par un PARENT — à définir avec le portail parent

**Statut : DÉCISION MÉTIER. Aujourd'hui : aucune catégorie ouverte.**

`visibleCategories(PARENT)` renvoie une liste **vide** : le parent n'a pas
`/dashboard/students`, donc le modèle de permissions ne lui donne pas le dossier. La borne
de lignes (`parentId`) est en revanche **déjà écrite et testée** — un parent ne peut
atteindre que ses propres enfants, y compris par appel direct d'une server action.

Le jour où un portail parent existe (points 6, 7 et 8 de ce backlog), il faudra décider
**quelles pièces un parent voit de son propre enfant** : sûrement celles qu'il a lui-même
déposées, probablement pas les notes internes du secrétariat. Ne pas ouvrir la catégorie
`SANTE` par réflexe : un parent n'est pas toujours le détenteur de l'autorité médicale.

→ Un seul endroit à modifier : `visibleCategories()` dans `src/lib/studentScope.ts`.

## 14 · Enseignant : quelles données de la fiche élève ?

**Statut : ARBITRÉ AU LOT 13.1, à confirmer par Kory.**

Décision prise, faute de règle existante dans le dépôt : l'enseignant **ne voit plus** le
groupe sanguin ni les notes médicales (mêmes données que les pièces SANTE, autre
contenant), mais **continue de voir le contact d'urgence** — joindre une famille pendant
un incident fait partie du travail de tout le personnel.

Si cette ligne est mal placée (par exemple : un enseignant accompagnant une sortie doit
connaître les allergies), le point à rouvrir est `canSeeHealthData()` dans
`src/lib/studentScope.ts`, et non chaque écran.

## 15 · Rendre le vérificateur de frontière client/serveur obligatoire

**Statut : OUTIL EXISTANT, à brancher dans l'habitude de travail.**

`scripts/verify-lot-13-1.ts` §I suit les imports de **tout** composant `"use client"` et
échoue si l'un atteint Prisma. C'est ce contrôle qui aurait évité que le dossier élève
**et** deux écrans tarifaires restent en HTTP 500 pendant des jours sans que `tsc` ni
17 vérificateurs ne bronchent.

À faire : le sortir de `verify-lot-13-1.ts` vers un vérificateur générique
(`verify-client-boundary.ts`) et l'exécuter **avant chaque livraison d'écran**, au même
titre que `npx tsc --noEmit`.

## 16 · Rendu mobile réel — toujours pas vérifié

**Statut : NON VÉRIFIÉ. Signalé au lot 13 comme au lot 13.1.**

Le dossier élève n'a jamais été affiché sur un téléphone. Seule l'inspection statique a
été faite : `accept` posé, `capture` volontairement non forcé, `flex-wrap`, aucune
`<table>`, aucune largeur fixe en pixels. Cela ne prouve rien d'un rendu réel — c'est
exactement le raisonnement qui avait laissé passer le HTTP 500.

Rejoint le point 5 (« Tests authentifiés / navigateur »).

# FIN DU BACKLOG LOT 13.1

# LOT 14 — PENDING

> **Ces quatre points sont en attente, pas résolus.** Ils sont écrits ici pour ne pas
> être reperdus, et parce qu'aucun d'eux n'est un chantier de code : trois sont des
> décisions à rendre, un est une vérification à faire sur un appareil.
>
> **Aucun lot ultérieur ne doit dépendre de ces décisions.** Le parcours de scan et
> d'import fonctionne entièrement sans OCR, sans recadrage, et sans qu'un téléphone
> ait été essayé — c'est précisément ce qui permet de les laisser ouverts.

## 17 · PENDING — Architecture OCR : où la reconnaissance doit-elle s'exécuter ?

**Aucun moteur OCR n'est intégré. Rien n'est branché, rien n'est simulé.**

`ocrCapability()` lit `OCR_PROVIDER`. Tant que la variable est absente, l'écran annonce
l'indisponibilité, avec sa raison, et le parcours manuel fonctionne de bout en bout.

Trois voies possibles, **à trancher explicitement** — aucune ne doit être choisie par
défaut ni « pour essayer » :

1. **Sur l'appareil** (WebAssembly) — rien ne sort du téléphone. Mais plusieurs
   mégaoctets à télécharger, ce qui n'est pas neutre sur des données mobiles
   sénégalaises, et une reconnaissance plus faible sur une photo de travers.
2. **Infrastructure serveur auto-hébergée** — maîtrisée de bout en bout, mais à
   installer, surveiller et maintenir.
3. **Service externe** — le plus simple à brancher, le moins maîtrisé. **Uniquement
   après décision explicite**, et jamais comme solution d'attente.

Point d'accroche unique : `analyzeDocument()` dans `src/lib/documentProposals.ts`.
⚠️ Il ne reçoit aujourd'hui **que des métadonnées** — jamais le fichier. Cette propriété
est ce qui rend le produit sûr par construction : la préserver aussi longtemps que
possible, et si elle doit tomber, que ce soit une décision, pas un effet de bord.

## 18 · PENDING — Validation sur un véritable téléphone

**Jamais essayé sur un appareil réel. Non prouvé, et déclaré tel quel.**

Restent à vérifier, sur un vrai téléphone, dans cet ordre :

- l'**ouverture réelle de l'appareil photo** depuis le bouton « Scanner » ;
- le **flux de capture** : trois pages d'affilée, sans perdre les précédentes ;
- la **modale de scan** : réorganisation, suppression d'une page, aperçu, confirmation ;
- le **comportement du contenu après hydratation** — c'est exactement ce que la sonde
  ne peut pas atteindre ;
- l'**expérience complète**, debout, avec un parent en face et une connexion faible.

Ce que l'outil existant prouve déjà : `scripts/verify-responsive.ts` rend les pages dans
Chrome à 390 × 844 contre une build de production et éprouve l'ossature. Il **refuse de
conclure** sur le contenu et sur la modale, au lieu de conclure à tort.

Pour fermer : dix minutes sur un téléphone. Le pilote CDP existe désormais
(`scripts/_cdp.ts`) et mesure des pixels — mais un pilote ne juge ni un doigt, ni une
connexion faible, ni un parent qui attend en face.

**Réserve non bloquante conservée depuis le lot 16.1 :** aucun appareil physique réel n'a
encore été utilisé pour valider les exports sur téléphone. Le responsive des exports a
néanmoins été réellement rendu et testé avec Chrome à 390 × 844 et 1440 × 900, avec
hydratation React et 36 contrôles réussis. Cette réserve sera traitée lorsque nous
disposerons d'un appareil réel ou dans le cadre de l'audit pré-lancement.

**Le lot 17 s'y ajoute, dans les mêmes termes** : la diffusion a été rendue et mesurée à
390 × 844 et 1440 × 900 (54 contrôles, modale ouverte pour de bon, remise confirmée et
relue en base) — jamais sur un téléphone.

Remplace le point 16, qui ne disposait d'aucun outil.

## 19 · PENDING — Recadrage à quatre coins

**Écarté au lot 14, volontairement. À reprendre sous condition.**

Techniquement faisable (canvas). Mais un recadrage au doigt sur petit écran, mal fait,
**coupe le coin d'un tampon officiel** — et une pièce amputée est une pièce à refaire.
Aujourd'hui les pages sont réduites et prévisualisées, pas recadrées.

À rouvrir **uniquement** s'il peut être fait sans risque de couper un élément important
d'un document officiel : détection automatique des bords avec correction manuelle, marge
de sécurité, et aperçu avant/après. Sinon, ne pas le faire — une marge blanche ne gêne
personne, un cachet tronqué invalide la pièce.

## 20 · Import multiple de documents distincts

Implémenté pour les **images** (plusieurs photos deviennent les pages d'un même
document, ce qui est le besoin réel). **Pas** pour déposer d'un coup plusieurs documents
distincts : chacun exige son libellé, sa catégorie et sa confirmation de remplacement —
les enchaîner sans vérification irait contre tout le lot.

À rouvrir seulement si le volume le justifie, avec une file de vérification, jamais un
classement automatique.

## 21 · PENDING — Confidentialité : un document de mineur peut-il quitter l'établissement ?

**Décision à rendre AVANT toute intégration OCR. Elle commande le point 17.**

La question n'est pas technique : un extrait de naissance, un certificat médical ou un
jugement de garde concernant **un enfant** peuvent-ils sortir du téléphone, et peuvent-ils
sortir de l'infrastructure de l'établissement ? Si oui, lesquels, vers qui, sous quelles
garanties, et qui l'a autorisé ?

Trois règles à ne pas perdre en route :

- **Aucun envoi automatique.** Un document sensible ne part jamais vers un fournisseur
  extérieur parce qu'une clé d'API se trouve configurée. Il faut une décision, et
  probablement un consentement.
- **La catégorie compte.** Une pièce `SANTE` n'est pas une pièce `SCOLARITE`. Une règle
  uniforme pour toutes les catégories serait soit trop laxiste, soit inutilisable.
- **La trace compte.** Si une pièce sort, l'audit doit dire laquelle, vers où, quand, et
  sur décision de qui — au même titre qu'un téléchargement l'est déjà.

# FIN DU BACKLOG LOT 14

# LOT 15 — CE QUI RESTE

## 22 · PENDING — Catalogue structuré des uniformes

**Écarté du lot 15 sur décision explicite. Le document existe, le catalogue non.**

Le centre documentaire porte aujourd'hui le **document** « Uniformes » — règles, bon de
commande, tailles indiquées dans le fichier — avec ses métadonnées (portée, année, dossier).
Ce qu'il ne porte pas : un modèle métier **article / taille / prix / quantité**.

Ce serait un vrai lot : c'est un catalogue avec des stocks et des tarifs, donc du même
ordre que la grille tarifaire du lot 12.1 — et il devra sans doute s'y raccorder plutôt que
vivre à côté (un uniforme facturé est une ligne de frais). Ne pas l'inventer à moitié dans
le centre documentaire : un demi-catalogue serait plus dangereux qu'aucun.

## 23 · PENDING — Document personnalisable (§21 du cahier des charges)

**Architecture non bloquée, générateur non construit.**

Certains documents devront un jour porter le nom de l'élève, sa classe, un montant. Le
centre n'y fait pas obstacle : un document y est un fichier + des métadonnées, et rien
n'empêche d'ajouter plus tard un document « modèle ».

Mais **aucun moteur de génération personnalisée n'a été construit**, et il ne fallait pas :
les générateurs des lots 09-11 (certificat, facture, reçu, bulletin) couvrent déjà les cas
réels, et un second moteur générique aurait fait doublon. À rouvrir seulement quand un
besoin précis apparaît, en regardant d'abord si un générateur existant suffit.

## 24 · ✅ REPRIS AU LOT 17 — Envoi réel aux familles

**Le lot 15 préparait déjà ; le lot 17 a mesuré POURQUOI il ne peut pas envoyer.**
`prepareShare()` a été remplacé par `prepareDiffusion()` (`src/lib/diffusion.ts`), partagé
avec le dossier élève. Le sujet de fond reste ouvert et se lit désormais aux points 30 à
33 ci-dessous, chiffres à l'appui.

**Ce que disait ce point au lot 15, conservé :**

Aucun canal WhatsApp ni courriel n'est branché sur les documents. Twilio est configuré pour
le SMS mais n'est pas relié au centre. `prepareShare()` compose le texte, compte les
familles concernées d'après la portée réelle du document et remet un lien temporaire ;
l'écran affiche explicitement qu'aucun message n'est parti.

Le jour où un canal est branché, deux points à ne pas perdre : le lien remis est **signé et
temporaire** (dix minutes) — un envoi différé le trouverait expiré ; et les élèves **sans
parent rattaché** sont déjà comptés à part, parce qu'ils ne seront joints par personne.

# FIN DU BACKLOG LOT 15

# LOT 16 — CE QUI RESTE

## 25 · ✅ FERMÉ AU LOT 16.1 — Rendu mobile de l'écran d'exports

**Mesuré, corrigé, prouvé.** `scripts/verify-responsive-export.ts` pilote Chrome par le
protocole DevTools, ouvre la **vraie URL avec la vraie session**, attend l'hydratation de
React, puis mesure le DOM peint à 390 × 844 et 1440 × 900 : 36 contrôles, 0 échec.

La sonde a trouvé **deux vrais défauts**, tous deux corrigés :
- l'en-tête de `Card` s'écrasait sur mobile (colonne de titre à ~90 px, description brisée
  sur dix caractères) → il s'empile désormais sous 640 px ;
- un **seul `useTransition` partagé** désactivait TOUS les boutons de l'écran pendant les
  2 à 5 secondes de lecture des dossiers (`Button` applique `disabled={disabled || loading}`).

⚠️ **Ce qui reste ouvert : le point 18.** Un pilote Chrome mesure des pixels, pas une
main. La sélection à cocher et le téléchargement sur une connexion faible ne se jugent
qu'au doigt, sur un vrai téléphone.

## 26 · PENDING — Transmission réelle vers une administration

**EduCom n'est connecté à aucune administration, et ne doit pas prétendre l'être.**

Ce que le lot 16 fait : préparer, exporter, et **enregistrer une transmission manuelle**
(qui, quoi, quand, méthode `TRANSMISSION_MANUELLE`, destination saisie à la main). Le
journal porte `sentByEduCom: false`.

Le jour où une intégration existe, trois points à ne pas perdre :
- l'état `CONFIRMÉ / ACCUSÉ` n'a de sens que si un accusé **réel** revient — sinon il
  ment plus que l'absence d'état ;
- une URL signée dure deux minutes : elle ne peut pas servir de preuve de transmission,
  ni être stockée comme telle ;
- la méthode doit rester **explicite** dans le journal : une transmission automatique et
  une remise en main propre ne s'auditent pas de la même façon.

Dépend d'une décision de la direction, pas d'un choix technique.

## 27 · Export massif — limite mesurée, pas supposée

L'export fonctionne **en flux**, une pièce à la fois : la mémoire ne dépend pas du nombre
d'élèves. Ce qui n'a **pas** été éprouvé, c'est un export de plusieurs centaines
d'élèves — ni sa durée, ni le comportement du navigateur sur une connexion faible.

Deux bornes déjà posées dans le code : `multiExportPlan()` s'arrête à 200 élèves, et le
tableau de préparation à 60 (chaque ligne coûte plusieurs requêtes). Ces bornes sont
volontaires et affichées à l'écran. Les relever exigerait de mesurer d'abord.

## 29 · La technique de sonde responsive du lot 14 est périmée

`scripts/verify-responsive.ts` photographie du HTML enregistré depuis `file://` : le
JavaScript ne s'exécute pas, React n'hydrate rien, et la capture ne montre qu'une
coquille. Ses quatre « non concluants » disent la vérité, mais l'outil ne peut pas mieux.

`verify-responsive-export.ts` (lot 16.1) montre la technique juste : Chrome piloté par
DevTools, vraie URL, vrai cookie, attente d'un marqueur d'hydratation, mesure du DOM peint.

**Avancement au lot 17 :** la technique vit maintenant dans `scripts/_cdp.ts`, module
partagé — plus de copie à faire diverger. Deux sondes l'utilisent :
`verify-responsive-export.ts` (écran d'exports) et `verify-diffusion-runtime.ts` (centre
documentaire, modale de diffusion, dossier élève).

À faire : porter les écrans restants (annuaire, fiche élève, saisie des notes, atelier
financier) sur ce module, et retirer `verify-responsive.ts`. Ce n'est pas urgent — mais
tant que ce n'est pas fait, leur « ossature vérifiée » vaut moins que ce qui a été prouvé
aux lots 16.1 et 17.

## 28 · Nettoyage des fixtures après interruption

**Piège procédural, pas un bogue produit.** Un vérificateur interrompu (timeout de l'outil,
Ctrl-C) ne joue pas son `finally` et laisse ses fixtures en base. C'est arrivé deux fois
pendant les lots 15 et 16, et il a fallu nettoyer à la main.

À faire : un `scripts/clean-fixtures.ts` unique qui supprime tout ce qui commence par
`SONDE` et tous les comptes `@sonde.invalid`, à lancer avant de conclure un lot.

# FIN DU BACKLOG LOT 16





# LOT 17 — CE QUI RESTE

> Ces points ne sont pas des chantiers de code : trois sont des **dépendances
> extérieures** (un compte à faire évoluer, deux services à choisir), un est une
> **décision sur des données existantes**, un est un **vérificateur à arbitrer**.
> Aucun lot ultérieur ne doit dépendre d'eux : la diffusion fonctionne
> entièrement en mode préparation.

## 30 · DÉCISION — Six messages `SENT` qui n'ont jamais été envoyés

**Fait établi, pas une hypothèse.** La table `Message` porte six lignes
`status: SENT`. Le journal du compte Twilio, interrogé par son API le 19 août
2026, en compte **zéro depuis la création du compte**. Ces six campagnes n'ont
jamais quitté EduCom.

Le code ne peut plus produire ce mensonge (lot 17). **Les six lignes historiques,
elles, n'ont pas été touchées** : modifier des données existantes est un acte qui
relève de la règle 4 d'`AGENTS.md` — compter, sauvegarder, essai à blanc, puis
appliquer — et surtout d'une décision de Kory.

Trois options, à trancher :
1. **Les laisser telles quelles** et considérer que l'historique d'avant le lot 17
   n'est pas fiable. Simple, mais un écran d'historique continuera de les afficher.
2. **Les passer à `FAILED`** — le statut existe déjà à l'énumération. Honnête,
   irréversible sans sauvegarde.
3. **Les supprimer.** À éviter : elles portent le texte réellement composé.

→ Un script d'essai à blanc sur le modèle de `scripts/merge-duplicate-classes.ts`
le jour où le choix est fait.

## 31 · DÉPENDANCE — Ce qu'il faudrait pour un envoi WhatsApp ou SMS réel

**Mesuré, pas supposé.** Le compte Twilio configuré est **de type essai**, ne
détient **aucun numéro**, n'a **aucun numéro vérifié**, et l'API refuse l'accès aux
expéditeurs WhatsApp : « This feature is not available on a Trial account ».

Dans l'ordre, ce qu'il faudrait réellement :

1. **Faire évoluer le compte** (un compte d'essai n'écrit qu'à des numéros
   vérifiés — inutilisable pour trois cents familles).
2. **Acheter un numéro** capable d'écrire au Sénégal. `TWILIO_PHONE_NUMBER`
   pointe aujourd'hui vers `+17372508034`, **qui n'appartient pas à ce compte** :
   toute tentative d'envoi serait rejetée à la source.
3. **Pour WhatsApp précisément** : un expéditeur WhatsApp Business approuvé, et
   `TWILIO_PHONE_NUMBER` doit alors commencer par `whatsapp:`. C'est exactement ce
   que `channels.ts` vérifie — un numéro ordinaire n'est pas un expéditeur
   WhatsApp, et le confondre ferait échouer chaque envoi après l'avoir annoncé.
4. **Puis, et seulement puis** : écrire l'envoi et l'inscrire dans
   `SEND_IMPLEMENTATIONS`. ⚠️ Une seule ligne autorise le mot « envoyé » dans tout
   le produit ; ne l'ajouter qu'avec le fournisseur sous la main et un envoi
   réellement observé.

⚠️ **À ne pas perdre le jour venu** : WhatsApp impose des **gabarits approuvés**
hors fenêtre de 24 heures. Un message libre à une famille qui n'a pas écrit la
veille sera refusé — ce n'est pas un détail d'implémentation, c'est ce qui décide
de la forme des messages.

## 32 · DÉPENDANCE — Aucun service d'e-mail

Aucun SDK installé, aucune variable d'expédition lue, aucun expéditeur vérifié.
Le lot 17 prépare l'objet, le corps et le lien ; l'envoi se fait depuis la
messagerie de l'établissement.

Le jour où un service est choisi, trois points à ne pas perdre : un **domaine
vérifié** (sans quoi les messages finissent en indésirables — pire qu'un
non-envoi, car on croit avoir prévenu) ; le **lien signé dure dix minutes**, donc
un envoi différé le trouverait expiré ; et les **129 élèves sans parent rattaché**
resteront injoignables quel que soit le service.

## 33 · DÉPENDANCE — Google Drive

Aucun SDK, aucun identifiant, aucun compte connecté. Rien n'a été simulé.

⚠️ **Avant même la technique, une question de fond** : déposer sur Drive fait
**sortir des documents d'enfants** de l'infrastructure de l'établissement. Cela
rejoint le point 21 (confidentialité), qui doit être tranché **d'abord** — et la
réponse dépendra sans doute de la catégorie de pièce, pas d'un réglage global.

## 34 · `verify-foundations` sort 5 contrôles en échec depuis le lot 15

**Antérieur au lot 17, constaté pendant sa non-régression.** Le vérificateur exige
qu'un `requiredPath` de workflow corresponde à une route portant un `page.tsx`.
Les cinq transitions de `schoolDocument` exigent
`/dashboard/documents/centre/gestion`, qui est un **chemin de permission sans
page** — choix délibéré du lot 15 : il sépare « préparer » de « publier » sans
créer d'écran.

Non corrigé volontairement : verdir une assertion sans arbitrage est le faux vert
que ce projet combat. À trancher — soit le vérificateur accepte les chemins de
permission sans route, soit le lot 15 doit s'expliquer autrement.

⚠️ Tant que c'est rouge, `verify-foundations` ne peut pas servir de garde-fou :
personne ne distingue plus ses 5 échecs connus d'un 6ᵉ nouveau.

## 35 · Diffusion multiple et suivi par famille

Non fait, et volontairement. Le lot 17 diffuse **un document à la fois**, ce qui
correspond au geste réel (« j'envoie la liste de fournitures aux CM2 »).

À rouvrir seulement si le besoin apparaît : diffuser plusieurs documents d'un
coup, ou suivre par famille ce qu'elle a déjà reçu. Le second exigerait une ligne
d'audit **par destinataire** et non par acte — ce qui reste faisable sans table
nouvelle, mais coûte trois cents écritures pour une école entière. À mesurer avant
de le faire.

# FIN DU BACKLOG LOT 17

# SÉCURITÉ / HÉBERGEMENT / JURIDIQUE — CONSIGNÉ LE 19 AOÛT 2026

> ⚠️ **Un seul de ces points a donné lieu à une action technique** : le
> durcissement RLS / Storage / TLS (§36, fait). Tout le reste est **documenté et
> laissé ouvert** — hébergement, OCR, juridique. Ne pas en faire un chantier
> sans que Kory ouvre le lot correspondant.

## 36 · ✅ FAIT — Durcissement RLS / Storage / TLS

**Ce qui a été trouvé, et ce qui a été corrigé.** Détail complet dans
`context.md`. Trois faits à ne pas reperdre :

1. **L'application ne passe JAMAIS par PostgREST ni par le Storage client.** Tout
   transite par Prisma (rôle `postgres`, porteur de `BYPASSRLS`) et par la clé de
   service, côté serveur. **Conséquence directe : la bonne posture RLS est le
   refus total, pas des policies « par école ».** Écrire des policies ouvrirait
   ce qui est aujourd'hui fermé. ⚠️ Ne pas « ajouter des policies pour bien
   faire » : ce serait une régression de sécurité déguisée en progrès.
2. `anon` et `authenticated` détenaient **tous les droits** (jusqu'à `TRUNCATE`)
   sur les 34 tables. RLS les neutralisait — mais RLS était alors **la seule
   barrière**, désactivable d'un clic. Les droits ont été retirés, et les droits
   **par défaut** aussi, pour que les futures tables de `prisma db push` naissent
   fermées.
3. **La connexion Postgres se faisait EN CLAIR.** `node-postgres` ne négocie TLS
   que si `sslmode` figure dans l'URL. Corrigé (`sslmode=no-verify`, TLS 1.3
   vérifié).

**Garde-fou** : `scripts/verify-rls.ts` (48 contrôles). Le relancer **après tout
`prisma db push`** et avant toute mise en production.

## 37 · Certificat serveur non vérifié (`sslmode=no-verify`)

La connexion est **chiffrée**, mais le certificat du pooler Supabase **n'est pas
validé** : la chaîne est auto-signée du point de vue de Node
(`SELF_SIGNED_CERT_IN_CHAIN` avec `sslmode=require`).

Ce que cela protège : l'écoute passive. Ce que cela ne protège pas : un
intercepteur actif capable de se placer sur le chemin.

Pour fermer : télécharger le certificat racine Supabase, l'embarquer, et passer à
`sslmode=verify-full&sslrootcert=…`. ⚠️ À faire **avant** la mise en production
publique, et de toute façon au moment du choix de l'hébergeur (§39) — le
certificat devra voyager avec le déploiement.

## 38 · Localisation des données — à analyser avant toute mise en production

**État réel, constaté et non supposé :**

- l'application Next.js **n'est déployée sur aucun cloud** — elle tourne en
  développement sur la machine de Kory ;
- PostgreSQL, Auth et Storage sont chez **Supabase** ;
- l'infrastructure Supabase du projet est sur **AWS `eu-west-1` (Irlande)** —
  lisible dans l'hôte de connexion : `aws-1-eu-west-1.pooler.supabase.com`.

EduCom vise des établissements **sénégalais**, et plus largement africains. À
analyser avant la mise en production publique : confidentialité · données de
mineurs · données scolaires · documents d'identité · données potentiellement
médicales · exigences réglementaires · souveraineté · transferts internationaux ·
latence depuis Dakar · sauvegardes · migration éventuelle.

⚠️ **Ne pas changer de région ni de fournisseur maintenant.** Et surtout : ne
jamais transformer « données hébergées en Irlande » en « conformité garantie ».
Localisation, transferts internationaux et conformité sont **trois questions
distinctes**, à traiter séparément.

## 39 · Hébergement de l'application — décision d'architecture future

À explorer, **au minimum** : cloud de type Vercel · Docker sur infrastructure
contrôlée · auto-hébergement.

À évaluer sur : sécurité · confidentialité · localisation · **performance depuis
le Sénégal** · coût · simplicité opérationnelle · sauvegardes · supervision ·
gestion des secrets · maintenance · **compatibilité OCR**.

⚠️ **Ne pas choisir un hébergeur parce qu'il est facile à déployer.** C'est le
critère qui décide le plus souvent, et le seul qui ne figure pas dans la liste
ci-dessus.

## 40 · OCR et hébergement — à étudier ENSEMBLE

Complète le §17, qui reste ouvert. Les deux décisions se commandent l'une
l'autre : un OCR auto-hébergé impose une infrastructure, un OCR embarqué impose
une contrainte de bande passante, un OCR externe impose un transfert de données
d'enfants hors de l'établissement.

Pour chaque option (appareil · auto-hébergé · externe), documenter : **quelles
données quittent EduCom** · où elles sont traitées · combien de temps elles y
restent · sécurité des documents · coût · performance · conformité.

⚠️ **Aucun service OCR externe ne doit être branché avant cette analyse.** Le
§21 (confidentialité d'une pièce de mineur) doit être tranché **d'abord** — il
commande le §17, qui commande celui-ci.

## 41 · Politique de confidentialité et CGU — PENDING

À rédiger pour le contexte **sénégalais**, notamment la **Loi n°2008-12** sur la
protection des données personnelles et les orientations pertinentes de la **CDP**.

⚠️ **Une rédaction générée automatiquement n'est pas un avis juridique.** La
version finale devra être vérifiée, et si nécessaire validée, par un
professionnel du droit compétent au Sénégal (§46).

**À prévoir dans le document** : identification d'EduCom et de l'éditeur ·
description du service · finalités · catégories de données · responsabilités
respectives de l'établissement et d'EduCom · sous-traitants · hébergement ·
localisation · transferts internationaux · sécurité · conservation · droits des
personnes et leur exercice · gestion des comptes · sécurité des identifiants ·
incidents · cookies le cas échéant · propriété intellectuelle · résiliation ·
conditions d'utilisation · contact · droit applicable.

**Droits des personnes** : accès · rectification · suppression lorsque
applicable · opposition lorsque applicable · autres droits éventuellement
prévus. ⚠️ **Ne rien inventer** — ni délai, ni procédure, ni exception, ni
obligation. Traiter distinctement les cas : élève mineur · élève majeur ·
parent/tuteur · personnel · établissement.

**Responsabilité des comptes** : partage de mot de passe · mot de passe
communiqué à un tiers · session laissée ouverte · poste non sécurisé ·
révocation des accès d'un collaborateur. ⚠️ **Ne jamais écrire qu'EduCom est
automatiquement exonéré de toute responsabilité en cas de négligence
utilisateur** : la formulation devra respecter le droit applicable.

**Engagement produit à conserver, et à tenir** : EduCom **ne revend pas** les
données personnelles des écoles, élèves, parents ou utilisateurs à des tiers à
des fins publicitaires, et n'utilise pas les données scolaires pour constituer
ou vendre des profils publicitaires. ⚠️ Cette déclaration doit rester cohérente
avec les pratiques réelles **et futures**.

## 42 · Ce que la future politique pourra honnêtement affirmer — et ce qu'elle ne pourra pas

⚠️ **Le point le plus facile à rater.** Une politique de confidentialité qui
promet des mesures inexistantes est un mensonge contractuel — la même faute que
« Campagne envoyée » du lot 17, mais opposable.

**Vérifié, donc affirmable aujourd'hui :**
- bucket **privé**, aucune URL permanente, liens signés à durée courte ;
- taille et types de fichiers restreints **côté serveur** (10 Mo, PDF/JPEG/PNG/WebP/HEIC) ;
- RLS active sur les 34 tables, refus total pour la clé publique, prouvé par de
  vraies requêtes HTTP ;
- cloisonnement par établissement et par rôle, prouvé par les vérificateurs 13 à 17 ;
- journal d'activité (`AuditLog`) : qui, quoi, quand, avec quel résultat ;
- **connexion à la base chiffrée** (TLS 1.3) depuis le 19 août 2026.

**NON vérifié — à ne PAS affirmer sans preuve :** chiffrement au repos ·
politique de sauvegarde et sa fréquence · capacité de restauration réellement
testée · pare-feu · supervision · disponibilité · certifications · délais de
notification d'incident.

⚠️ Ne jamais transformer une bonne pratique théorique, ou une promesse
commerciale d'un fournisseur, en fonctionnalité présente.

## 43 · Services tiers — uniquement ceux réellement utilisés

Pour chacun, documenter : rôle · données transmises · finalité · localisation
connue · sécurité · conditions contractuelles à vérifier.

**Réellement utilisés aujourd'hui :** Supabase (base, authentification, stockage)
et, par son intermédiaire, **AWS** (`eu-west-1`).

**Configuré mais inopérant :** Twilio — compte d'essai, aucun numéro détenu,
**zéro message émis depuis la création** (§30, §31). Aucune donnée ne lui est
transmise aujourd'hui.

**Inexistants :** service d'e-mail (§32), Google Drive (§33), OCR (§17),
hébergeur de l'application (§39). ⚠️ **Ne pas les faire figurer dans la politique
comme s'ils existaient.**

## 44 · Conservation, suppression, restitution

À prévoir : durée de conservation · suppression des comptes · suppression des
documents · archives · obligations légales · sauvegardes · suppression
définitive lorsque techniquement applicable · **restitution des données à la fin
du contrat**.

⚠️ **Ne pas inventer de durée.** Les durées seront définies après analyse
juridique **et** métier — un bulletin scolaire et un message WhatsApp n'ont pas
la même valeur probante ni la même durée utile.

Point technique à ne pas oublier : `Enrollment.classId` et `Grade.classId` sont
en `onDelete: Cascade` (règle 4 d'`AGENTS.md`). Une « suppression » demandée par
une famille pourrait donc emporter plus que prévu. À cartographier avant de
promettre quoi que ce soit.

## 45 · Incidents et violations de données

À prévoir : détection · investigation · limitation · journalisation ·
notification lorsqu'elle est légalement requise · coopération avec
l'établissement · restauration. Les délais et obligations précis devront être
juridiquement vérifiés.

⚠️ **Un moyen de détection existe déjà et sera utile ici** : `AuditLog` trace qui
a lu, téléchargé, exporté et diffusé quoi. C'est la seule source qui permettrait
de dire *ce qui a réellement été consulté* lors d'un incident. Ne pas la purger
sans avoir arbitré ce point.

## 46 · Draft fourni par Kory, et validation juridique

Un draft de Politique / CGU a été fourni comme **source d'inspiration** :
mentions légales, finalités, non-revente publicitaire, hébergement en Irlande,
droits des personnes, sécurité, responsabilités, conservation, restitution.

⚠️ **Ne pas le copier tel quel. Ne pas le publier. Ne pas le considérer comme
juridiquement validé. Ne pas reprendre ses affirmations comme des faits.** Le
document final devra être réécrit à partir de la réalité **technique,
contractuelle, opérationnelle et réglementaire** — c'est-à-dire, pour la partie
technique, à partir du §42 ci-dessus.

**Avant toute publication publique**, faire vérifier par un juriste ou un avocat
compétent au Sénégal : Loi n°2008-12 · textes applicables · CDP · transferts
internationaux · mineurs · données de santé · sécurité · conservation · droits ·
responsabilités contractuelles.

## 47 · Décisions volontairement NON prises

Restent ouvertes, et ne doivent pas être tranchées par défaut : **hébergeur
Next.js** · **région Supabase** · **architecture OCR** · **services externes
futurs** · **politique de confidentialité** · **CGU** · **validation juridique**.

# FIN DU BACKLOG SÉCURITÉ / HÉBERGEMENT / JURIDIQUE

# CHANTIER PLG — LANDING / TARIFS / PREUVE SOCIALE — CONSIGNÉ LE 19 AOÛT 2026

> Le chantier Product-Led Growth et son addendum (preuve sociale + tarifs) sont
> **livrés**. Ce qui suit est ce qu'ils ont ouvert, buté, ou laissé en attente
> d'une décision de Kory. Le §52 est le seul point de **sécurité**.

## 48 · PENDING — Ce que contient exactement chaque formule

La grille est arrêtée : essai 14 jours · **Pro 20 € ≈ 13 100 F CFA** · **Premium
30 € ≈ 19 700 F CFA**, avec leur objectif respectif. Elle est affichée sur
l'accueil et sur `/pricing`, en euros **et** en francs CFA (parité fixe
1 € = 655,957 F CFA — aucun service de change n'est appelé).

**Ce qui n'est PAS décidé, et n'est donc écrit nulle part :** la répartition des
fonctionnalités entre Pro et Premium · les limites d'élèves, d'utilisateurs, de
stockage · les quotas · les modules inclus · ce que l'essai ouvre exactement ·
les conditions contractuelles.

⚠️ **C'est la partie qu'il est le plus tentant de « compléter » pour faire
propre.** Une case cochée à tort dans un tableau comparatif est une promesse
commerciale opposable — l'équivalent tarifaire du « Campagne envoyée » du lot 17.
La page dit aujourd'hui, en toutes lettres, que le détail arrive.

## 49 · PRÉREQUIS DE LANCEMENT — L'essai de 14 jours n'est appliqué par aucun mécanisme

Constaté au schéma, pas supposé : `School` n'a **ni plan, ni abonnement, ni date
de fin d'essai**. Aucun paiement en ligne n'existe. « 14 jours » est donc
aujourd'hui une **intention commerciale**, pas un état du produit.

La page ne peut pas laisser croire le contraire : partout où la durée est citée,
la phrase « EduCom n'a pas encore de paiement en ligne : rien ne peut vous être
débité » l'accompagne, et un contrôle de `verify-plg-runtime.ts` **échoue** si la
durée apparaît sans elle.

À trancher avant le premier euro facturé : que se passe-t-il au 15ᵉ jour ·
l'espace reste-t-il consultable · qui relance · avec quel canal (aucun n'émet,
§30-§32) · et par quel moyen de paiement.

## 50 · ⚠️ DIAGNOSTIC CORRIGÉ AU §57 — L'inscription publique est bloquée chez Supabase

> **La cause donnée ci-dessous est FAUSSE.** Elle attribuait le blocage à
> l'adresse e-mail utilisée. Le diagnostic refait le 19 août (§57) montre deux
> refus distincts : `email_address_invalid` pour un domaine sans MX, et
> **`over_email_send_rate_limit` pour une adresse valide** — c'est le quota
> d'envoi du service intégré de Supabase qui bloque, pas l'adresse. Lire le §57.

`auth.signUp()` échoue depuis le formulaire : confirmation par e-mail active et
**quota d'envoi épuisé**. Testé avec `example.com`, `gmail.com`, `.sn` et
`.invalid` — tous refusés.

Conséquence directe : **aucune école ne peut créer son espace aujourd'hui**,
quelle que soit la qualité de la page d'accueil. La sonde le déclare `NON
PROUVÉ` au lieu de le contourner, et crée son compte par
`admin.createUser` pour prouver la suite du parcours.

⚠️ C'est un blocage **de fournisseur**, pas de code. À régler avant toute
ouverture publique : SMTP propre, ou désactivation de la confirmation, ou les
deux — la décision touche aussi la §41 (politique de confidentialité).

## 51 · Preuve sociale — la surface existe, elle attend le pilote

`src/components/landing/SchoolStories.tsx` bascule seule de l'état « pilote » à
la grille de témoignages dès qu'un objet est ajouté à `TEMOIGNAGES`. **Rien
d'autre n'est à modifier, et rien n'est à supprimer.**

⚠️ **Aucun contenu de démonstration n'a été fabriqué**, alors que l'addendum
l'autorisait s'il était étiqueté. Une carte « exemple » finit toujours par être
publiée sans son bandeau. Les quatre conditions à remplir avant d'ajouter un
témoignage sont écrites dans l'en-tête du fichier : accord écrit · nom, fonction
et établissement exacts · chiffres mesurés · accord sur le nom de l'école.

## 52 · ✅ CORRIGÉ — Fuite entre établissements sur le formulaire d'admission

Trouvé par la sonde du parcours, qui échouait sur « le premier élève mène à son
certificat » avec le message serveur « Classe introuvable dans votre
établissement ». L'action avait raison de refuser ; la faute était dans la page.

`src/app/dashboard/students/new/page.tsx` appelait `prisma.class.findMany()`
**sans filtre** : la liste « Classe » proposait les classes de **toutes les
écoles de la base**. Deux conséquences aggravantes :

1. si aucune classe n'existait, la page prenait `prisma.school.findFirst()` —
   une école **arbitraire**, pas celle de l'utilisateur — et y **créait** six
   classes « CI … CM2 » : ouvrir un formulaire écrivait chez un autre locataire ;
2. la liste était ensuite filtrée sur les six classes du primaire, si bien
   qu'une école ayant choisi « Collège » à l'installation voyait une liste
   **vide**, sans explication, sur l'écran qui mène à sa première valeur.

Corrigé par `requireSchoolContext()` + filtre `schoolId` + `sortClasses()`, et
un état vide qui propose de créer une classe. ⚠️ **À retenir** : la barrière de
`createStudent()` a tenu, mais elle était la seule — et son message d'erreur,
incompréhensible pour une directrice, était le seul indice du problème.
`verify-tenant-isolation` ne couvrait pas ce chemin.

## 53 · Aucune route de réinitialisation du mot de passe

Le lien « Mot de passe oublié ? » avait été retiré de `/login` au chantier PLG
parce qu'il pointait vers `#`. Il n'existe toujours **aucune** route de
réinitialisation.

⚠️ Un directeur qui perd son mot de passe perd l'accès à son établissement. À
ouvrir avant le pilote — et la fonctionnalité dépend du même envoi d'e-mail que
la §50.

## 54 · Neuf composants dormants contiennent des affirmations fausses

Retirés des pages publiques, conservés au dépôt pour leur mise en page :
`AnalyticsSection` (quatre statistiques inventées), `CTASection`,
`ChaosToControl`, `CommunicationSection` (envoi WhatsApp « en un clic »),
`FeatureGrid` (pipeline Admissions), `ParentExperience` (suivi des absences),
`PillarsSection`, `Testimonials`, `TestimonialsSection`.

Chacun porte un en-tête `⚠️ COMPOSANT DORMANT` nommant ce qu'il affirme de faux,
et `verify-landing-runtime.ts` **échoue** si une page en réimporte un.

⚠️ Le jour où la fonctionnalité correspondante existera, c'est le **texte**
qu'il faudra réécrire en premier, pas la mise en page.

## 55 · Deux garde-fous ont dû être révisés — et pourquoi c'était légitime

Les corriger pour faire passer du code est la faute la plus facile à commettre
sur ce dépôt. Les deux cas ci-dessous sont consignés pour qu'on puisse juger.

1. **`verify-ui-primitives`** listait `login` et `onboarding/Wizard` parmi les
   « zones à ne pas toucher ». Le chantier PLG les a refondues **et branchées
   sur le socle** — ce qui était l'objet de la refonte. L'invariant a été
   *retourné* : il exige maintenant qu'elles utilisent les primitives. Le
   laisser en l'état aurait produit un échec permanent réclamant une régression.
2. **`verify-design-tokens`** interdit `linear-gradient` dans `globals.css`. Il
   se déclenchait sur un **commentaire** expliquant pourquoi un dégradé avait
   été écarté. Les commentaires sont désormais retirés avant la recherche ; la
   règle elle-même est intacte, et le surlignage du titre a été refait **sans**
   dégradé (soulignement épais), donc sans rien lui demander.

## 56 · Une sonde annonçait deux résultats contradictoires

`scripts/_cdp.ts` cherchait les éléments débordants avec
`getBoundingClientRect()`, qui est relatif au **viewport**. Si la page avait
défilé horizontalement, un bloc de 800 px commençant à x = −457 rendait
`right = 390` : il n'était pas signalé, alors que `scrollWidth` valait bien 847.
La sonde affirmait « aucun élément hors de l'écran » **et** un débordement de
457 px, sur la même page.

Corrigé : retour à l'origine avant mesure, coordonnées **document**, et
exclusion des éléments confinés dans un ancêtre qui défile.

⚠️ Le débordement réel venait de la rangée haute de la barre du générateur (un
`flex` sans `flex-wrap`, dont les enfants ont `min-width: auto`), **pas** de la
feuille A4 comme on l'avait d'abord supposé.

# FIN DU BACKLOG PLG

# PILOTE — INSCRIPTION RÉELLE / AUTH SUPABASE — CONSIGNÉ LE 19 AOÛT 2026

> Le code du parcours d'inscription est corrigé et vérifié
> (`scripts/verify-pilote-auth.ts`, 62/62). **Le pilote reste bloqué par un
> réglage de fournisseur**, décrit au §57 : c'est la seule chose qui empêche une
> personne extérieure de créer son compte aujourd'hui.

## 57 · DÉCISION REQUISE — L'envoi d'e-mails de Supabase bloque toute inscription

**Ce qui a été mesuré, pas supposé.** `GET /auth/v1/settings` du projet
`vuvjtcnnsliqzyxhbvid` renvoie `disable_signup: false`, `external.email: true`,
`mailer_autoconfirm: false`. L'inscription publique est donc **ouverte**, et la
**confirmation d'adresse exigée**.

Deux refus distincts, obtenus par de vraies requêtes :

| Adresse d'essai | Réponse |
|---|---|
| `…@example.com`, `…@educom-pilote.sn` | `400 email_address_invalid` |
| `…@gmail.com` (MX valides) | **`429 over_email_send_rate_limit`** |

⚠️ **La cause n'est donc PAS celle notée au §50.** Ce n'est pas une question
d'adresse : c'est le **service d'envoi intégré de Supabase**, dont le quota est
épuisé. Il est explicitement destiné aux essais, jamais à la production. Vérifié
à nouveau 25 minutes plus tard : toujours 429.

**Trois voies existent. Aucune ne peut être choisie depuis le code.**

1. **SMTP propre** (Resend, Brevo, Mailgun, SES…) dans Supabase → Authentication
   → SMTP Settings. C'est la réponse de production : la confirmation d'adresse
   reste exigée et les e-mails partent réellement. Coût : un compte chez un
   tiers, un domaine expéditeur, et **un nouveau sous-traitant à déclarer**
   (§41, §43).
2. **Désactiver la confirmation d'adresse** (Authentication → Providers → Email
   → « Confirm email »). `signUp()` renvoie alors une session immédiatement,
   aucun e-mail n'est envoyé, et le parcours public fonctionne tel quel.
   ⚠️ **C'est un assouplissement de sécurité** : plus personne ne prouve qu'il
   possède l'adresse saisie. Défendable pour un pilote fermé avec des personnes
   connues ; à rouvrir avant toute ouverture publique. **Réversible en un clic.**
3. **Confirmer chaque compte à la main** depuis le tableau de bord Supabase
   (Authentication → Users). Tenable pour cinq personnes, pas au-delà.

⚠️ **Aucune de ces trois options n'a été appliquée** : elles engagent une
dépense, un sous-traitant ou une posture de sécurité. Le §3 du cahier des
charges l'interdit explicitement (« NE PAS désactiver une protection de sécurité
simplement pour faire passer le test »).

⚠️ **Ce qui a été fait à la place** : le formulaire d'inscription **dit la
vérité**. Face au 429 il affiche « Le service d'envoi d'e-mails a atteint sa
limite… c'est une limite de notre fournisseur, pas une erreur de votre part »,
n'affiche **aucun** écran de succès, et **ne crée aucune école**. Vérifié dans
un vrai navigateur (`verify-pilote-auth.ts`, section 2).

## 58 · À FAIRE AVANT LE PILOTE — Déclarer l'URL du site chez Supabase

`emailRedirectTo` pointe désormais sur `/auth/callback`, mais Supabase
**n'honore que les URL déclarées** dans Authentication → URL Configuration
(« Site URL » et « Redirect URLs »). Tant que l'adresse publique du pilote n'y
figure pas, le lien de confirmation ramènera ailleurs.

`NEXT_PUBLIC_SITE_URL` est documentée dans `.env.example`. Elle dépend du choix
d'hébergement (§39), encore ouvert.

## 59 · ✅ CORRIGÉ — Aucun `middleware` n'était branché : la session expirait en une heure

**Il n'existait aucun fichier de proxy.** Deux implémentations de
`updateSession` dormaient au dépôt (`src/lib/supabase/` et `src/utils/supabase/`)
sans qu'aucune soit branchée.

Conséquence, et elle est sérieuse pour un pilote : `@supabase/ssr` **ne peut pas
écrire de cookie depuis un composant serveur** (Next l'interdit, la tentative
est avalée par un `try/catch`). Sans proxy, **le jeton rafraîchi n'était jamais
conservé** : au bout d'une heure, chaque utilisateur était renvoyé à la
connexion, au milieu de son travail.

⚠️ **PIÈGE NEXT 16.** La convention `middleware.ts` est **dépréciée et renommée
`proxy.ts`** (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
Écrit sous l'ancien nom, le fichier **s'exécute quand même** — les redirections
fonctionnaient — pendant que **toutes les pages publiques renvoyaient 404**. Le
symptôme ne désigne pas la cause.

⚠️ **Second piège, dans le même fichier** : `NextResponse.next({ request })`, la
forme montrée par la documentation Supabase, produit une **404** sous Next 16.
La documentation du dépôt n'utilise que `NextResponse.next()`. Ne pas
« restaurer » l'argument.

Le duplicat `src/utils/supabase/` a été supprimé : il ne reste qu'une seule
implémentation. ⚠️ Sa version redirigeait **tout** ce qui n'est ni `/login`, ni
`/register`, ni `/auth` — l'activer aurait rendu la page d'accueil inaccessible.

## 60 · ✅ CORRIGÉ — Cinq établissements fantômes, et l'usine qui les fabriquait

`register/actions.ts` créait l'école **puis** l'utilisateur, en deux écritures
indépendantes. Quand la seconde échouait — le journal du serveur en porte deux
occurrences, « Unique constraint failed on the fields: (`email`) » — **l'école
restait, vide et sans propriétaire**.

⚠️ **La cause principale était plus subtile.** Quand l'adresse est déjà
inscrite, Supabase **ne renvoie pas d'erreur** : il renvoie un utilisateur
factice avec `identities: []`, délibérément, pour qu'on ne puisse pas savoir de
l'extérieur quelles adresses existent. Le code lisait `data.user.id` et
fabriquait une école de plus. D'où les doublons observés : « SABA ACADEMY » ×2,
« gomis » ×2, créées le même jour — des personnes qui réessayaient.

Corrigé : les deux écritures sont dans une **transaction**, et le cas
`identities: []` renvoie « un compte existe déjà », avec un lien vers la
connexion. Les cinq écoles fantômes ont été supprimées après essai à blanc et
sauvegarde (`scripts/purge-orphan-schools.ts`, sauvegarde dans `backups/`).

## 61 · ✅ CORRIGÉ — Trois ruptures du parcours d'inscription

1. **La confirmation par e-mail n'était pas gérée.** Avec
   `mailer_autoconfirm: false`, `signUp()` renvoie un compte **sans session**.
   Le code redirigeait quand même vers `/onboarding`, qui exige une session et
   renvoie donc vers `/login` — **sans un mot d'explication**. La personne
   venait de créer son compte et se retrouvait devant un formulaire de
   connexion, persuadée d'avoir échoué. Un écran « Confirmez votre adresse » le
   dit maintenant.
2. **`emailRedirectTo` était absent**, et `/auth/callback` renvoyait par défaut
   vers `/` — la page d'accueil commerciale. Une personne qui venait de
   confirmer son adresse était relâchée sur l'argumentaire, connectée sans le
   savoir. Elle arrive maintenant sur `/dashboard`, qui la dirige vers
   l'installation tant qu'elle n'est pas faite.
3. **`dashboard/layout.tsx` ne redirigeait PAS** un visiteur sans session : il
   écrivait « DASHBOARD ACCESSED BY USER: NO USER » dans le journal — en
   imprimant au passage l'adresse e-mail de chaque utilisateur à chaque
   navigation — et rendait la coquille du tableau de bord avec le rôle `PARENT`
   par défaut. Rien ne fuyait, chaque écran se protégeant lui-même, mais **la
   barrière était absente là où on la croyait posée**.

Les messages d'erreur d'authentification étaient par ailleurs **en anglais**
(« Invalid login credentials », « Email not confirmed ») dans une interface
entièrement française. Le second est celui qui compte pour le pilote.

## 62 · NON PROUVÉ — Le lien de confirmation réel

Tout le parcours est vérifié **sauf** un maillon : personne n'a encore reçu un
vrai e-mail de confirmation et cliqué son lien. Il n'a pas pu l'être : aucun
e-mail ne part (§57).

Ce qui EST prouvé : la route `/auth/callback` existe, refuse un lien incomplet
avec un message français, et n'accepte que des destinations internes (pas de
redirection ouverte). Ce qui ne l'est pas : qu'un lien `?code=` réellement émis
par Supabase ouvre la session. ⚠️ **À vérifier dès que le §57 est tranché**, et
avant d'inviter qui que ce soit.

Point technique à garder en tête : un lien produit par
`admin.generateLink()` utilise le flux **implicite** (`#access_token` dans le
fragment), que `/auth/callback` ne sait pas lire — il attend `?code=`, le flux
**PKCE** qu'utilise `signUp()` depuis le serveur. Les deux ne sont pas
interchangeables. Aucune gestion du fragment n'a été ajoutée : elle ne servirait
qu'aux liens fabriqués à la main, et constituerait une nouvelle surface
d'authentification pour un besoin qui n'existe pas encore.

## 63 · Le pilote rend la réinitialisation de mot de passe urgente

Le §53 reste ouvert et change de priorité : aucune route de réinitialisation
n'existe. Avec des comptes réels et des mots de passe choisis par leurs
propriétaires, **le premier oubli bloque définitivement un établissement**.

⚠️ La fonctionnalité dépend du **même envoi d'e-mail** que le §57 : elle ne peut
pas être livrée avant que celui-ci soit tranché.

# FIN DU BACKLOG PILOTE

# AUDIT DE MISE EN PRODUCTION — CONSIGNÉ LE 19 AOÛT 2026

> **Aucune modification n'a été faite dans ce chantier** : l'étape demandée était
> l'audit, et l'arrêt après le rapport. Ce qui suit est ce que l'audit a trouvé
> et qui n'était consigné nulle part. Rien n'est corrigé.

## 64 · 🔴 BLOQUANT — Le dépôt n'est sous aucun contrôle de version

`git rev-parse` répond « not a git repository ». Il n'y a **aucun historique,
aucune branche, aucune sauvegarde du code**.

Conséquences directes pour une mise en ligne : rien à déployer (Vercel, Docker
et l'auto-hébergement partent tous d'un dépôt) · **aucun retour arrière
possible** · aucune trace de qui a changé quoi · la seule copie du travail est
le disque de Kory.

⚠️ **À faire avant toute autre chose de ce chantier.** Attention au premier
`git add` : `.env`, `.mcp.json` (§67), les six JPEG et les quatre WebP à la
racine, `agent/`, `graphify-out/` et `node_modules` ne doivent pas y entrer —
le dépôt pèse 2 Go.

## 65 · 🔴 BLOQUANT DE SÉCURITÉ — Deux webhooks publics sans aucune authentification

`/api/webhooks/paydunya` et `/api/webhooks/whatsapp` acceptent **n'importe quel
POST anonyme**. Aucune signature, aucun secret, aucun contrôle d'établissement.

Le premier est le plus grave : si le corps JSON contient
`{"status":"completed","custom_data":{"invoice_id":"<uuid>"}}`, la route
**marque la facture PAYÉE et crée un `Payment`** — dans n'importe quelle école.
Il suffit de connaître ou de deviner un identifiant de facture. Aucun paiement
n'a eu lieu.

Les deux écrivent aussi dans `WebhookEvent` **sans limite** : un simple script
peut remplir la base depuis Internet.

⚠️ Ce n'est exploitable que lorsque l'application sera **accessible en ligne** —
elle ne l'est pas aujourd'hui. Mais c'est exactement ce que ce chantier prépare.

⚠️ **Le motif correct existe déjà dans le dépôt** : `/api/cron/overdue` **refuse
tout** tant que `CRON_SECRET` n'est pas défini (échec fermé, comparaison à
durée constante). Les deux webhooks doivent adopter le même comportement. Cela
n'implique **aucune** intégration de paiement (§14 du cahier des charges reste
respecté) : il s'agit de fermer, pas d'ouvrir.

## 66 · 🔴 BLOQUANT — Le projet ne peut pas se construire ailleurs que sur cette machine

Deux causes indépendantes :

1. **`prisma generate` n'est appelé nulle part.** Le générateur écrit dans
   `src/generated/prisma`, dossier **ignoré par `.gitignore`**. Sur un hôte
   neuf, `npm ci && npm run build` échouerait : le client Prisma n'existerait
   pas. Il manque un `postinstall` (ou un `prebuild`).
2. **`next.config.ts` est vide.** Pas de `output: "standalone"` — indispensable
   pour une image Docker raisonnable — et **aucun en-tête de sécurité**
   (`Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`,
   `Referrer-Policy`, `Permissions-Policy`).

Point rassurant, vérifié : **la compilation ne dépend pas d'ESLint**. La
documentation embarquée le dit — « linting will be removed from `next build` in
Next 16 » (`node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`).
Les **347 erreurs ESLint** actuelles sont donc de la dette, pas un blocage.
⚠️ Parmi elles, cinq « Cannot access variable before it is declared » dans les
générateurs de documents et quatorze « setState dans un effet » : à regarder,
sans confondre avertissement de compilateur React et défaut prouvé.

`package.json` n'a par ailleurs **aucun champ `engines`** : rien ne fixe la
version de Node attendue en production (24.17.0 en développement).

## 67 · 🔴 BLOQUANT — Une clé d'API en clair à la racine, et six variables non documentées

**`.mcp.json`** contient une clé Google (`X-Goog-Api-Key`) **en clair**, à la
racine du futur dépôt. Elle sert aux outils de conception, pas au produit — mais
elle partirait au premier `git push`. À sortir du dépôt ou à faire tourner.

**Six variables sont lues par le code et absentes de `.env`** :
`CRON_SECRET` · `PAYDUNYA_MASTER_KEY` · `WHATSAPP_API_KEY` ·
`WHATSAPP_VERIFY_TOKEN` · `OCR_PROVIDER` · `NEXT_PUBLIC_SITE_URL`. Seule la
dernière figure dans `.env.example`. Une liste d'environnement incomplète est
la première cause de déploiement à moitié fonctionnel.

⚠️ `WHATSAPP_VERIFY_TOKEN` a une **valeur de repli en dur** :
`"educom_local_dev"`. Acceptable en local, à supprimer avant la mise en ligne.

Point vérifié et **conforme** : `SUPABASE_SERVICE_ROLE_KEY` n'est lue qu'à un
seul endroit, `src/lib/supabase/admin.ts`, côté serveur. `verify-rls` (48/48)
contrôle déjà son absence du bundle client et des scripts servis.

## 68 · Résidus de test dans ce qui deviendra la production

État réel de la base, à la date de l'audit :

| Établissement | Comptes | Élèves | Classes | Factures | Pièces |
|---|---|---|---|---|---|
| Kory Academy 2 | 8 | 133 | 14 | 8 | 1 |
| Senghor | 1 | 3 | 1 | 0 | 0 |
| SABADO ACADEMY | 1 | 0 | 0 | 0 | 0 |

**10 comptes d'authentification, dont 9 ne se sont jamais connectés.** Deux
incohérences :

- `sondemob.…@sonde.invalid` — compte d'authentification **sans ligne
  applicative** : résidu de `verify-responsive`, dont le nettoyage a échoué
  (voir §28) ;
- `philogs14@gmail.com` (PARENT, Kory Academy 2) — ligne applicative **sans
  compte d'authentification** : cette personne ne peut pas se connecter.

⚠️ **Décision de Kory, pas la mienne** : « Senghor » et « SABADO ACADEMY »
ressemblent à des essais, mais « Senghor » contient trois élèves. **Aucune
donnée réelle ne doit être supprimée sans validation explicite.** Ce qui est
certain, c'est le résidu de sonde.

## 69 · Aucune supervision, aucune sauvegarde vérifiée

**Rien n'est installé** : ni Sentry, ni collecteur de journaux, ni sonde de
disponibilité, ni alerte. Aujourd'hui, un plantage en production ne serait connu
que si une école téléphone.

Les journaux se limitent à `console.error` et à **six `console.log`** qui
partiraient tels quels en production (deux impriment le contenu des webhooks,
c'est-à-dire potentiellement des données de familles).

`AuditLog` compte **18 entrées** : il trace qui a consulté, exporté, diffusé
quoi. C'est la seule source d'investigation en cas d'incident (§45) — et il
n'existe **aucun écran** pour le lire.

⚠️ **Les sauvegardes ne sont toujours pas vérifiées** (§42) : ni PostgreSQL, ni
Storage, ni restauration testée. Le plan Supabase du projet détermine ce qui
est réellement disponible (rétention, PITR) et **n'a pas pu être lu** : cela
demande l'accès au tableau de bord ou un jeton d'API de gestion.

⚠️ Ne jamais écrire qu'EduCom sauvegarde quotidiennement tant que ce n'est pas
constaté ET qu'une restauration n'a pas été essayée.

# FIN DE L'AUDIT DE MISE EN PRODUCTION

# PAIEMENT, INTÉGRATIONS ET MISE SOUS GIT — CONSIGNÉ LE 19 AOÛT 2026

> Ce lot exécute B1→B4 et applique une décision produit : **PayDunya est
> abandonné, Wave devient la voie de paiement retenue.** Il ferme les §64 à §67
> de l'audit précédent et en ouvre trois nouveaux.

---

## 70 · 🔴 À FAIRE PAR KORY — La clé Google doit être révoquée

**Une clé d'API Google a vécu en clair, à deux endroits, pendant plusieurs
semaines** : `.mcp.json` à la racine et `.agents/mcp_config.json`. La seconde
n'avait pas été repérée lors de l'audit — il a fallu chercher la valeur, pas le
nom de fichier.

Les deux fichiers sont désormais hors du dépôt (`.gitignore`), et le premier
commit a été vérifié : aucune trace de la clé n'y figure.

⚠️ **Sortir un fichier du dépôt n'est PAS une rotation de secret.** La clé a
existé en clair dans un dossier de travail, synchronisé ou sauvegardé
possiblement ailleurs. Elle doit être considérée comme **compromise** :

1. la révoquer dans la console Google Cloud ;
2. en générer une nouvelle ;
3. la restreindre (API autorisées, referrers) ;
4. ne la remettre que dans un fichier ignoré par Git.

**Cette action ne peut pas être faite depuis le dépôt : elle demande l'accès à
la console Google.** Tant qu'elle n'est pas faite, ce point reste ouvert.

---

## 71 · ✅ FAIT — PayDunya supprimé, et ce qu'on a trouvé en le retirant

**Décision de Kory : PayDunya n'est pas le système de paiement d'EduCom.** Il
n'est ni conservé, ni sécurisé « pour plus tard ». Trois choses ont été
supprimées, et deux d'entre elles étaient pires que le webhook lui-même.

**① La route `/api/webhooks/paydunya`** acceptait un **POST anonyme** et, sur la
seule foi d'un `status: "completed"` fourni par l'appelant, passait la facture à
`PAID` et créait un `Payment`. Aucune signature, aucune vérification
d'établissement. Quiconque devinait un identifiant de facture pouvait solder une
scolarité. Le contrôle de clé qui la précédait n'en était pas un : il se
contentait d'écrire dans la console avant de continuer.

**② Un faux lien de paiement envoyé aux familles.** `src/lib/services/chatbot.ts`
répondait aux parents :

> « Cliquez sur ce lien sécurisé pour payer via Wave / Orange Money :
> 🔗 https://…/checkout/demo-link-123 »

Ce lien était **écrit en dur**. Pire : la variable `PAYDUNYA_MASTER_KEY` n'a
**jamais existé dans `.env`** — la branche « clé absente » était donc la seule
jamais empruntée, et ce faux lien le **seul** que le produit ait jamais produit.

**③ Le mot « sécurisé ».** C'est le détail le plus grave des trois. Le message ne
disait pas seulement où payer : il rassurait.

**Aucune donnée n'a été supprimée.** Vérifié avant toute action : `WebhookEvent`
compte **1 ligne** (`WHATSAPP`), les **7** paiements sont tous `CASH`, sans
référence, dans « Kory Academy 2 » — des encaissements manuels réels. **Zéro**
paiement portant une référence de ce prestataire. Il n'y avait donc rien à
arbitrer côté données.

`PAYDUNYA_MASTER_KEY` a été retirée après vérification qu'aucun code ne la lisait
plus — pas parce que son nom contenait le mot.

---

## 72 · 🟠 ⚠️ PORTÉE CORRIGÉE AU §81 — L'idempotence des encaissements

> ⚠️ **Cette section analyse la facturation ÉCOLE → PARENTS** (`Invoice`,
> `Payment`). Le 19 août 2026 au soir, Kory a précisé que **Wave sert à
> encaisser les abonnements EduCom** — c'est-à-dire ÉCOLE → EDUCOM, un objet
> qui **n'existe pas dans le schéma**. L'analyse ci-dessous reste valable pour
> le jour où les parents paieront en ligne, mais **ce n'est pas le chantier
> Wave**. Voir **§81**.

C'est le point à trancher **avant** d'écrire la moindre ligne de Wave.

### Ce que le modèle actuel garantit — et ce qu'il ne garantit pas

`Payment { amount, method, reference?, invoiceId, schoolId, createdAt }`.
`PaymentMethod = CASH | CHECK | MOBILE_MONEY | BANK_TRANSFER`. Le modèle est
**déjà générique** : il n'a jamais rien eu de propre à un prestataire, et Wave
s'y logera sans changer de forme.

Trois constats issus de l'analyse de **toutes** les utilisations de
`Payment.reference` :

1. **Personne ne l'écrit.** Le seul rédacteur était le webhook supprimé.
   `markInvoiceAsPaid()` ne la renseigne pas, et aucun formulaire ne la
   collecte. **Les 7 paiements en base ont `reference = null`.**
2. **Aucune contrainte d'unicité.** Un même événement rejoué — et les
   fournisseurs de paiement **rejouent**, c'est leur mode normal de
   fonctionnement — créerait deux `Payment` pour un seul encaissement.
3. **`Payment` n'a pas de colonne de statut** : l'existence de la ligne EST
   l'encaissement (voir `src/lib/finance.ts`). Un doublon n'est donc pas une
   ligne « en double à ignorer », c'est **de l'argent compté deux fois**.

### Pourquoi il ne faut PAS simplement rendre `reference` unique

Ce serait le réflexe, et il casserait deux choses :

- **La référence n'est pas globale.** Le champ sert aussi de **numéro de
  chèque**. Deux établissements peuvent parfaitement présenter un chèque n°42 :
  une contrainte globale refuserait le second, sans explication compréhensible
  pour une secrétaire.
- **Elle n'a de sens que rapportée à un émetteur.** Un identifiant de
  transaction est unique *chez son fournisseur*, pas dans l'absolu.

L'ajout est aujourd'hui **sans risque pour les données** (0 référence en base,
donc 0 collision), mais il serait faux pour la suite.

### Les deux stratégies possibles

**Option A — unicité portée sur `Payment`.**
`@@unique([schoolId, method, reference])`, la contrainte n'étant appliquée que
lorsque `reference` n'est pas nul (PostgreSQL ignore les `NULL` dans un index
unique, ce qui préserve les saisies manuelles sans référence).
*Simple. Mais elle protège au moment de l'écriture comptable, c'est-à-dire
tard : un rejeu a déjà traversé toute la logique métier avant d'être refusé.*

**Option B — unicité portée sur l'ÉVÉNEMENT (recommandée).**
Donner à `WebhookEvent` un `externalId` et un `schoolId`, avec
`@@unique([provider, externalId])`. Un rejeu est alors rejeté **à la porte**,
avant toute écriture métier, et le champ `processed` (aujourd'hui inutilisé)
retrouve son rôle : marquer qu'un événement a été traité une fois.
*C'est l'endroit juste : l'idempotence est une propriété du transport, pas de la
comptabilité.*

**Recommandation : B, complétée par A.** B empêche le rejeu ; A reste le filet
si un jour un paiement est créé par un autre chemin.

⚠️ **Rien n'a été modifié dans Prisma.** Aucune contrainte n'est ajoutée sans
décision, et la forme exacte de `externalId` dépend de ce que Wave envoie
réellement — ce qui renvoie au §73.

### Ce qui manque aussi à `WebhookEvent`, quel que soit le choix

- **pas de `schoolId`** → un événement n'est rattaché à aucun établissement,
  donc ni cloisonné, ni relisable par école ;
- **`processed` n'est jamais lu ni écrit** par aucun code.

---

## 73 · 🔴 BLOQUANT — Il manque la documentation de l'API Wave

> ⚠️ **La liste de questions ci-dessous reste entièrement valable**, mais elle
> porte désormais sur l'encaissement des **abonnements EduCom**, pas sur le
> règlement des frais de scolarité. Le modèle de données concerné n'existe pas :
> voir **§81**.

**Wave est la voie de paiement retenue.** L'architecture interne est prête à
l'accueillir (§72), et **aucune ligne de code Wave n'a été écrite** :
`scripts/verify-integrations.ts` en fait un invariant vérifié.

⚠️ **Rien ne sera écrit avant lecture de la documentation officielle.** Les
éléments suivants **ne peuvent pas être devinés** — chacun conditionne la
sécurité de l'encaissement, et une supposition fausse se paierait en argent
réel :

1. **L'authentification** — quel type de secret, transmis comment ; s'il existe
   des environnements séparés (essai / production).
2. **La création d'une demande de paiement** — endpoint, paramètres exacts,
   **unité du montant** (franc CFA entier ? centimes ?), devise, référence
   marchande que l'on peut y attacher pour retrouver notre `Invoice`.
3. **Le retour au site** — URL de succès, d'échec, d'annulation.
4. **Le webhook** — quels événements, quelle charge utile, **quel identifiant
   d'événement stable** (c'est lui qui portera l'idempotence du §72).
5. **La vérification de signature** — c'est le point le plus important : sans
   elle, on retombe exactement sur le webhook supprimé au §71. Quel algorithme,
   quel en-tête, quelle chaîne signée, quelle tolérance d'horloge.
6. **Les statuts** — la liste exhaustive et lesquels sont **définitifs**.
7. **La vérification côté serveur** — existe-t-il un endpoint permettant de
   **redemander** l'état d'une transaction ? Sans lui, on ne peut jamais
   confirmer un paiement autrement qu'en croyant ce qu'on reçoit.

**Kory : merci de fournir la documentation Wave (ou un lien vers elle).** Tant
qu'elle manque, le chantier s'arrête ici — c'est la règle absolue posée pour ce
lot, et elle est la seule protection contre une intégration inventée.

Non tranché par ailleurs : **Stripe = plus tard**, **Orange Money = PENDING**.

⚠️ Règles à appliquer le jour du branchement, quelles que soient les réponses :
clé Wave **serveur uniquement** ; **jamais** de montant fourni par le
navigateur ; vérifier que l'`Invoice` appartient bien à l'école ; **ne jamais**
écrire `PAID` parce qu'une requête l'affirme ; journaliser chaque transition
dans `AuditLog`.

---

## 74 · ✅ FAIT — Le chatbot écrivait « envoyé » pour des messages jamais partis

`sendBotReply()` écrivait `status: "SENT"` sur **chaque** message, puis
vérifiait seulement ensuite s'il existait une clé d'API — et retournait sans
rien envoyer. **C'est exactement le défaut corrigé au lot 17 dans la diffusion**,
oublié dans ce service parce qu'il n'était appelé par aucun écran.

Le service entier a été supprimé, avec la route qui l'appelait (§75) : le faux
« envoyé » disparaît donc par construction, plutôt que d'être corrigé dans du
code que plus rien n'exécute.

**Aucune machine d'état parallèle n'a été créée.** `src/lib/channels.ts` reste
l'unique autorité : son registre `SEND_IMPLEMENTATIONS` est **vide**, donc aucun
canal n'a le droit d'écrire « envoyé ». `scripts/verify-integrations.ts` vérifie
désormais que ce registre est vide, et qu'**aucun fichier n'écrit un statut de
message sans passer par `channels.ts`**.

⚠️ **Les 6 lignes `SENT` de la table `Message` n'ont pas été touchées.** Elles
sont fausses — le compte Twilio n'a jamais émis un seul message — mais les
réécrire est une modification de données historiques, qui demande une décision
(**PENDING**). En attendant, l'écran qui les affiche dit maintenant en clair
qu'elles n'ont jamais quitté EduCom.

---

## 75 · ✅ FAIT — Le webhook WhatsApp, et le simulateur livré dans le produit

La route `/api/webhooks/whatsapp` acceptait des **POST anonymes** et écrivait
dans `WebhookEvent` **et** `Message`. Trois raisons de la supprimer plutôt que
de la « sécuriser » :

1. **Aucun fournisseur n'est configuré** — `channels.ts` le prouve : le registre
   d'envois est vide, et l'expéditeur Twilio n'est pas un expéditeur WhatsApp.
2. **Son jeton de vérification avait une valeur de repli en dur**
   (`"educom_local_dev"`), donc la vérification Meta réussissait pour n'importe
   qui connaissant cette chaîne.
3. **La sécuriser aurait exigé d'inventer un mécanisme de signature** — ce que
   ce lot interdit explicitement.

⚠️ **Son unique appelant était un simulateur livré DANS le produit.** L'écran
`communications/inbox` embarquait un champ « Simuler une réponse du parent
(Webhook) » qui fabriquait une charge utile Meta complète (`wamid.HBgLM…`, un
numéro sénégalais en dur) et la postait sur la route ; en cas de succès il
affichait **« 200 OK - Traité par l'API ! »** en vert. Un banc d'essai, dans une
page ouvrable par une secrétaire.

Le même écran affichait aussi le **double chevron bleu de WhatsApp** sur chaque
message sortant — un accusé de lecture, alors qu'aucun accusé n'existe — et
chargeait son fond depuis `web.whatsapp.com`.

L'écran a été réécrit : il ne fait plus que **relire** les messages enregistrés,
cloisonnés à l'établissement, avec un encadré qui dit ce qu'ils valent.

**Preuve réseau** (serveur en marche, `scripts/verify-integrations.ts` §5) :
`POST` anonyme sur les deux webhooks → **404**, `POST` anonyme sur
`/api/cron/overdue` → **503** (échec fermé, `CRON_SECRET` absent).

Il ne reste qu'**une seule route d'API** dans le projet : `/api/cron/overdue`.

---

## 76 · ✅ FAIT — Le produit envoyait des noms d'élèves à un service tiers

Trouvé en durcissant le vérificateur : `RecentInvoicesWidget` construisait
l'avatar de chaque facture ainsi :

> `https://ui-avatars.com/api/?name={prénom}+{nom}`

**À chaque affichage du tableau de bord, l'identité d'enfants partait chez un
service extérieur**, dans une URL journalisable côté serveur distant.

`TopNav` avait déjà été corrigé de cette manière ; **cette vignette avait été
oubliée, et c'était la plus sensible des deux** — l'une transmettait le nom d'un
membre du personnel, l'autre celui d'un élève.

Deux écrans chargeaient par ailleurs un décor depuis `web.whatsapp.com`.

Les trois sont désormais rendus localement. `scripts/verify-integrations.ts`
n'interdit plus « les liens de paiement » mais **tout hôte extérieur hors liste
d'autorisation explicite** : ajouter un hôte devient une décision visible en
revue, au lieu d'un `src=` qui passe inaperçu.

---

## 77 · ✅ FAIT — Quatre scripts pouvaient écrire dans un établissement au hasard

`prisma.school.findFirst()` — le raccourci est invisible tant qu'une seule école
existe. La base en compte trois, dont une avec **133 élèves réels**.

Le plus dangereux, `scripts/seed-classes.ts`, n'avait **ni essai à blanc, ni
confirmation, ni idempotence** : `npm run script -- scripts/seed-classes.ts`
créait douze classes dans un établissement arbitraire, et les recréait en double
à chaque exécution.

Les quatre (`seed-classes`, `seed-subjects`, `seed-test-students`,
`seed-senegal`) exigent maintenant `SCHOOL_ID`, puis `APPLY=1`. Sans
`SCHOOL_ID`, ils **refusent** et affichent les écoles avec leur **effectif
réel** — c'est ce chiffre qui doit faire hésiter. Le garde-fou vit dans
`scripts/_cible.ts`, en un seul endroit.

`scripts/seed-fee-fixtures.ts` vise l'école **la plus peuplée** (choix
documenté) et reste en essai à blanc par défaut : il ne peut pas écrire par
accident, mais il ne nomme pas sa cible — **PENDING**, moindre priorité.

⚠️ `update_classes.ts` contenait un `prisma.class.deleteMany({})` **global**,
déclenché si le total d'élèves de la base tombait à zéro. Il est sorti du projet
(`_local/`, ignoré par Git et exclu de TypeScript) et **ne doit pas être
exécuté**. Aucun `deleteMany({})` global ne subsiste dans le dépôt.

---

## 78 · ✅ FAIT — Le dépôt existe, et le projet se construit ailleurs

Ferme les §64, §66 et §67.

**Git.** Dépôt initialisé, premier commit de 441 fichiers. Avant de committer,
la racine a été triée **en lisant chaque fichier**, jamais sur son nom : six
JPEG aux noms d'URL signées Supabase (probablement des pièces d'élèves
téléchargées lors d'essais), un script d'envoi de SMS portant un **vrai numéro
sénégalais**, trois scripts ad hoc. Tout est dans `_local/`, **rien n'a été
supprimé**.

**Portabilité — prouvée, pas supposée.** Sur un **clone neuf** du dépôt :
`npm ci` (le `postinstall` ajouté a bien lancé `prisma generate` et produit le
client absent du dépôt) → `tsc --noEmit` : **0 erreur** → `next build` :
**compilé, 50 pages générées**. `engines` déclare l'intersection réelle des
exigences de Next et de Prisma : `^20.19 || ^22.12 || >=24`.

**Compiler sans casser la session de développement.** `next dev` et `next build`
écrivent dans le même `.next` (règle 3 d'`AGENTS.md`). `distDir` est désormais
paramétrable : `npm run build:verify` compile dans `.next-verify`, ignoré par
Git. Vérifié : `.next/dev` intact, serveur de dev toujours en marche.

**`.env.example` est complet, et c'est vérifiable.**
`scripts/verify-env-example.ts` relit les sources et compare les deux listes :
**12 variables lues, 12 documentées**. Il refuse aussi toute valeur réelle dans
ce fichier versé dans Git, et toute variable Wave ou Stripe déclarée par
anticipation. `CRON_SECRET` manquait ; `WHATSAPP_API_KEY` et
`WHATSAPP_VERIFY_TOKEN` n'ont plus aucun lecteur et ont été retirées.

⚠️ `CRON_SECRET` n'est **pas** défini dans le `.env` local : `/api/cron/overdue`
est donc **inerte**, et aucune facture ne bascule en retard automatiquement.
C'est le comportement voulu (échec fermé), mais il faudra définir la variable en
production — sinon la bascule ne se fera jamais.

**Clé de service Supabase :** vérifiée **absente du bundle client** (`.next/static`)
sur le build du clone neuf.

---

## 79 · 🟠 DÉCISION REQUISE — Le sélecteur de rôle de test

`src/app/dashboard/actions.ts` expose `changeTestRole()` : **tout utilisateur
connecté peut réécrire son propre rôle en base** (un PARENT peut devenir OWNER).
La seule protection est `NODE_ENV === "production"`.

Ce n'est pas une route ouverte, et le garde-fou fonctionne dans un build de
production. Mais c'est un contournement d'autorisation, et il a probablement
déjà eu un effet : **« Kory Academy 2 » ne contient plus aucun compte `OWNER`**
(8 comptes : 2 ADMIN, 2 TEACHER, 1 SECRETARY, 1 ACCOUNTANT, 1 ASSISTANT,
1 PARENT). C'est ce qui fait échouer 4 contrôles de `verify-lot-12-2` — **un
état de données, pas une régression de code**.

Trois options : le supprimer ; le réserver à une liste d'identifiants explicite ;
le laisser tel quel en assumant que `NODE_ENV` suffit.

⚠️ **Rien n'a été décidé ni modifié** : supprimer un outil que Kory utilise
peut-être quotidiennement n'est pas une décision d'agent.

---

## 80 · Relevé — 3 vulnérabilités « high » dans les dépendances

`npm audit` sur le clone neuf : **3 vulnérabilités « high »**, toutes issues d'un
seul paquet transitif (`deepmerge-ts < 8.0.0`). Le correctif n'est proposé que
via `npm audit fix --force`, c'est-à-dire avec **changements incompatibles** sur
la dépendance parente.

Non appliqué : une mise à jour cassante n'a pas sa place dans un lot dont le
build vient d'être prouvé. **PENDING** — à traiter avec un build de vérification
avant la mise en production.

# FIN DU LOT PAIEMENT / INTÉGRATIONS

---

# DÉPLOIEMENT VERCEL — CONSIGNÉ LE 19 AOÛT 2026 (SOIR)

## 81 · 🔴 CHANGEMENT DE PORTÉE — Wave encaisse les ABONNEMENTS EduCom

Décision de Kory : **Wave = abonnements EduCom**. Ce n'est pas une précision de
détail, cela change complètement l'objet du chantier.

|  | Ce que §72/§73 avaient analysé | Ce qu'il faut réellement |
|---|---|---|
| Qui paie | un parent | **une école** |
| Qui encaisse | l'école | **EduCom** |
| Objet | `Invoice` / `Payment` | **un abonnement** |
| Modèle | existe déjà | **n'existe pas du tout** |

**Vérifié sur le schéma :** aucun modèle `Subscription`, `Plan`, `Billing`,
`Tenant`, `Trial` ni `Account`. `School` n'a **ni plan, ni date de fin d'essai,
ni statut d'abonnement** — uniquement `onboardingCompleted`.

⚠️ **Conséquence directe, et elle est déjà publiée** : la page Tarifs annonce
« 14 jours d'essai », « 20 € », « 30 € ». **Aucun mécanisme ne décompte cet
essai, aucun ne distingue Pro de Premium, aucun ne sait si une école a payé.**
La page dit aujourd'hui la vérité en toutes lettres (« EduCom n'a pas encore de
paiement en ligne : rien ne peut vous être débité »), et cette phrase devra
rester exacte jusqu'au jour où le mécanisme existera vraiment.

**Ce qu'il faudra décider avant de brancher Wave** — aucune de ces réponses ne
peut être devinée, et chacune détermine le modèle de données :

1. Que se passe-t-il **à la fin des 14 jours** sans paiement ? Lecture seule ?
   Blocage de la connexion ? Rien, jusqu'à relance manuelle ? ⚠️ Couper l'accès
   à un établissement en pleine période de bulletins est une décision produit
   lourde, pas un réglage technique.
2. **Qu'est-ce qui distingue Pro de Premium ?** Toujours non arrêté (§ tarifs).
   Sans cette réponse, un abonnement n'a rien à faire respecter.
3. Facturation **mensuelle uniquement**, ou annuelle ?
4. Wave gère-t-il un **prélèvement récurrent**, ou chaque mois est-il un
   paiement ponctuel à relancer ? ⚠️ **Cette question est la première à poser à
   la documentation Wave** : elle change tout le modèle. Un paiement récurrent
   demande un mandat et un cycle ; un paiement ponctuel demande des rappels.
5. Que devient une école qui ne paie plus — ses **données** sont-elles
   conservées, et combien de temps ?

**Rien n'a été écrit ni modélisé.** La règle absolue tient : pas de
documentation Wave, pas de code Wave.

---

## 82 · ✅ FAIT — Trois pannes Vercel évitées avant le premier déploiement

Aucun déploiement n'a été lancé. Trois défauts ont été corrigés dans le dépôt,
et chacun se serait manifesté **après** la mise en ligne, sous une forme
difficile à diagnostiquer.

**① Le client Prisma aurait pu être absent ou périmé.**
`postinstall: prisma generate` suffit sur une machine neuve — mais **Vercel
restaure `node_modules` depuis son cache**, et `postinstall` ne rejoue alors
pas. Le client Prisma étant ignoré par Git, le build aurait compilé contre un
client absent ou décalé du schéma. `prisma generate` est désormais **aussi**
dans le script `build`.

**② `distDir` pouvait faire servir un dossier introuvable.**
`NEXT_DIST_DIR` redirige la sortie de compilation pour ne pas écraser le serveur
de développement (règle 3). Recopié un jour dans les variables du projet Vercel
— scénario probable, on copie souvent un `.env` local en bloc — le build aurait
« réussi » et le site n'aurait rien servi. Sur Vercel (`VERCEL=1`), la variable
est maintenant **ignorée**.

**③ La tâche planifiée aurait échoué tous les jours en silence.**
⚠️ **Vercel Cron appelle ses tâches en `GET`.** La route `/api/cron/overdue` ne
répondait qu'en `POST` et renvoyait **405** sur `GET`, volontairement (« un
traitement qui écrit ne doit pas être déclenché par une simple visite »). Sur
Vercel, cela aurait donné une tâche en échec quotidien, invisible, et **aucune
facture ne serait jamais passée en retard**.

`GET` est désormais accepté **avec exactement la même exigence** :
`Authorization: Bearer $CRON_SECRET`, comparé à durée constante, échec fermé si
le secret est absent. Une visite de navigateur ne porte pas cet en-tête → 401.
Vercel ajoute cet en-tête **automatiquement** dès que `CRON_SECRET` figure dans
les variables du projet : le contrat coïncide exactement.

Le vérificateur a été étendu **en même temps** que la surface : `POST` anonyme,
`GET` anonyme et **secret invalide** sont tous les trois éprouvés (24/24).
Ouvrir un verbe sans étendre le test aurait laissé la moitié de la surface non
vérifiée — c'est ainsi que les webhooks du §71 avaient traversé les revues.

`vercel.json` déclare la tâche à **02:00**. ⚠️ Le Sénégal est à **UTC+0** : les
horaires Vercel (UTC) sont donc directement l'heure de Dakar, sans conversion.
L'heure est modifiable — c'est un choix, pas une contrainte.

---

## 83 · Variables à définir dans le projet Vercel

Les **12** variables de `.env.example` (liste vérifiée par
`scripts/verify-env-example.ts`). Ce qui change par rapport au `.env` local :

| Variable | Valeur en production |
|---|---|
| `DATABASE_URL` | pooler **6543** + `pgbouncer=true` — obligatoire en serverless |
| `DIRECT_URL` | port **5432**, migrations uniquement |
| `NEXT_PUBLIC_SUPABASE_URL` | projet de production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | projet de production |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **jamais** de préfixe `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ le domaine réel — **bloqué** tant qu'il n'est pas choisi |
| `CRON_SECRET` | ⚠️ **valeur neuve**, jamais celle d'un `.env` local |
| `TWILIO_*` (3) | facultatives — ne débloquent aucun envoi (registre vide) |
| `OCR_PROVIDER` | **laisser vide** — sinon l'écran annonce un fournisseur inexistant |
| `NEXT_DIST_DIR` | ⚠️ **NE PAS la définir** (ignorée sur Vercel, mais inutile) |

⚠️ **`sslmode` n'est pas optionnel** dans les deux URL de base : sans lui, la
connexion se fait **en clair** (constaté le 19 août 2026).

⚠️ **`CRON_SECRET` absent = bascule des factures jamais exécutée.** La route
reste inerte (503) et ne le signale que dans les journaux du serveur.

**Bloquants restants, qui ne dépendent que de Kory** : le domaine (donc
`NEXT_PUBLIC_SITE_URL`), le SMTP de production (§57 — l'envoi intégré de
Supabase est limité et bloque déjà les inscriptions), et les URL de redirection
du projet Supabase de production (§58).

⚠️ **Le projet Supabase de production est-il le même que celui de
développement ?** La question n'a pas été tranchée et elle est structurante :
partager le projet ferait cohabiter les 133 élèves réels de « Kory Academy 2 »
avec les fixtures des sondes, qui créent et suppriment des écoles à chaque
exécution.

---

# SÉPARATION DEV / PRODUCTION SUPABASE — CONSIGNÉ LE 19 AOÛT 2026 (SOIR)

## 84 · 🟠 DÉCISION REQUISE — Deux projets Supabase, ou un seul ?

**Recommandation : deux projets distincts (option B).** Et surtout : **ne pas
promouvoir le projet actuel en production.**

### Ce qui est mesuré, pas supposé

Un seul projet existe : référence `vuvjtc…id`, région **eu-west-1** (Irlande),
PostgreSQL **17.6**. `DATABASE_URL`, `DIRECT_URL` et `NEXT_PUBLIC_SUPABASE_URL`
pointent tous les trois vers lui.

**⚠️ Le fait le plus important de tout cet audit :**

> **14 vérificateurs créent ET SUPPRIMENT des données** — écoles, comptes Auth,
> élèves, notes, documents — en lisant simplement `DATABASE_URL` dans `.env`.
> **Aucun ne demandait où il écrivait.**

Tant qu'un seul projet existe, cela ne se voit pas. Le jour où un projet de
production existe, **il suffit d'un `.env` recopié** — le geste le plus banal du
métier — pour que `npm run script -- scripts/verify-lot-15.ts` écrive dans la
base d'établissements réels. Et ces scripts nettoient derrière eux : ils
**suppriment**.

### Pourquoi le projet actuel ne peut pas devenir la production

Ce n'est pas une question de propreté, mais d'historique :

1. Il a servi de **bac à sable pendant six jours** (13 → 19 août). Écoles créées
   et supprimées, cinq établissements fantômes déjà purgés, comptes de sonde.
2. Il porte encore des **résidus de sonde** : un compte Auth `…@sonde.invalid`
   sans ligne `User`, et une école de sonde purgée à chaque exécution.
3. Son **mot de passe de base a circulé** (§86).
4. On ne peut pas dire quand un `db push` y a été appliqué, ni depuis quel état.

⚠️ Un environnement de production se caractérise moins par ses données que par
**ce qu'on peut affirmer de son passé**. Ici : rien.

### Comparaison

| | A — projet unique | **B — deux projets** |
|---|---|---|
| Isolation des données | ❌ aucune | ✅ physique |
| Auth | ❌ comptes de test et réels mêlés | ✅ annuaires séparés |
| Storage | ❌ un seul bucket | ✅ buckets distincts |
| RLS | identique | identique |
| Migrations Prisma | ❌ `db push` direct sur le réel | ✅ éprouvées en dev d'abord |
| Variables | 1 jeu | 2 jeux — ⚠️ à ne jamais mélanger |
| Fixtures / seeds | ❌ dans le réel | ✅ confinées |
| Vérificateurs | ❌ écrivent dans le réel | ✅ ne voient jamais la production |
| Sauvegardes | brouillées par les fixtures | ✅ restauration utile |
| Rollback | ❌ impossible à distinguer | ✅ possible |
| Risque humain | 🔴 **élevé** | 🟡 réduit, non nul |
| Maintenance | plus simple | 2 projets à tenir à jour |
| Coût | 1 projet | ⚠️ **décision commerciale** (voir plus bas) |
| Déploiement Vercel | identique | identique |

### Risques de l'option B, dits franchement

- **Deux schémas peuvent diverger.** Un `db push` en dev non rejoué en
  production, et l'application plante sur une colonne absente. Il faudra une
  discipline de migration — le dépôt n'a **aucun dossier `prisma/migrations`**
  aujourd'hui, tout passe par `db push`. **C'est le vrai chantier caché de
  cette option.**
- **Deux jeux de clés à ne pas confondre.** Le garde-fou ci-dessous réduit ce
  risque sans l'annuler.
- **Coût** : le palier gratuit Supabase est limité en nombre de projets actifs
  et met en pause les projets inactifs. ⚠️ **Un projet de production ne doit
  jamais être sur un palier qui peut le mettre en pause.** Le plan actuel n'a
  pas pu être lu — cela demande le tableau de bord.

### Travail nécessaire AVANT de créer le projet de production

1. Trancher le sort de « Kory Academy 2 » (§85).
2. Adopter des **migrations Prisma versionnées** plutôt que `db push` — sans
   quoi les deux bases divergeront.
3. Décider de la **région** (voir §87).
4. Rejouer le durcissement RLS sur le nouveau projet
   (`scripts/harden-rls.ts`).
5. Recréer le bucket `student-documents` **privé**.
6. Renseigner `EDUCOM_PRODUCTION_REF` sur toutes les machines de développement.

### ✅ Déjà fait — le garde-fou

`scripts/_garde-production.mjs` s'exécute **avant chaque `npm run script`**.
Si la base visée correspond à `EDUCOM_PRODUCTION_REF`, ou si
`EDUCOM_ENV=production`, le script est **refusé avant toute écriture**.
Éprouvé : `verify-lot-15` refusé, code de sortie 1.

⚠️ **Ce garde-fou n'est PAS la séparation.** C'est une ceinture de sécurité :
elle rattrape l'erreur humaine, elle ne crée pas deux environnements. Il ne
protège que le point d'entrée `npm run script` — un `npx tsx` direct le
contourne.

⚠️ Tant qu'`EDUCOM_PRODUCTION_REF` est vide, **il ne peut rien vérifier** et le
dit à chaque exécution, plutôt que de laisser croire à une protection.

### Ce qui doit être décidé par le propriétaire

1. Option A ou B (recommandation : **B**).
2. Le plan Supabase du projet de production.
3. La région.
4. Le sort des données actuelles (§85).

---

## 85 · Inventaire des données présentes — réelles, test, sonde, historiques

Relevé le 19 août 2026. **Rien n'a été supprimé, migré ni nettoyé.**

### Les trois écoles

| École | Créée | Élèves | Comptes | Nature |
|---|---|---|---|---|
| **Kory Academy 2** | 13 août | **133** | 8 | ⚠️ **RÉELLES + test mêlés** |
| Senghor | 14 août | 3 | 1 | test (école témoin) |
| SABADO ACADEMY | 18 août | 0 | 1 | test (créée à l'inscription) |

⚠️ **« Kory Academy 2 » n'est pas homogène.** Elle porte 14 classes, 134
inscriptions, 82 notes, 20 bulletins, 8 factures — mais aussi des élèves issus
de `seed-test-students` (pool de noms déterministe) et de `seed-senegal`.
**Séparer le réel du fictif demande un travail d'inventaire qui n'a pas été
fait, et qui ne peut pas être automatisé sans risque** : les noms fictifs sont
des noms sénégalais plausibles.

### Volumétrie globale

`School` 3 · `User` 10 · `Student` 136 · `Class` 15 · `Enrollment` 134 ·
`Grade` 82 · `Subject` 32 · `Term` 3 · `Evaluation` 9 · `ReportCard` 20 ·
`Invoice` 8 · `Payment` 7 · `Expense` 1 · `Message` 6 · `StudentDocument` 1 ·
`SchoolDocument` 1 · `AuditLog` 18 · `WebhookEvent` 1 · `Invitation` 2 ·
`FeeSchedule` 2 · `Survey` 0.

### Les quatre natures

**DONNÉES RÉELLES** — les 133 élèves de « Kory Academy 2 » et leur scolarité
(classes, notes, bulletins, factures). Les 7 paiements `CASH` sont des
encaissements réels saisis à la main. **Ce sont des données d'enfants.**

**DONNÉES DE TEST** — « Senghor » et « SABADO ACADEMY » ; les grilles tarifaires
de `seed-fee-fixtures` ; les élèves de `seed-test-students` mêlés au réel.

**DONNÉES DE SONDE** — créées et détruites à chaque exécution des vérificateurs,
préfixées `SONDE*` (`SONDEPIL`, `SONDEPLG`, `SONDERLS`, `SONDEEXP`, `SONDEMOB`,
`SONDERENDU`). ⚠️ **Résidu constaté** : un compte Auth `…@sonde.invalid` **sans
ligne `User`**, non supprimé. Signalé, **pas nettoyé** — conformément à la
consigne.

**DONNÉES HISTORIQUES, FAUSSES MAIS CONSERVÉES** — les **6 messages `SENT`** qui
n'ont jamais été émis (§74), et l'unique `WebhookEvent`. Conservés faute de
décision.

### Comptes Auth — 10, et trois anomalies

- ⚠️ **1 compte Auth orphelin** : `…@sonde.invalid`, **aucune ligne `User`**.
- ⚠️ **1 ligne `User` sans compte Auth** : un `PARENT` de « Kory Academy 2 » —
  **ce parent ne peut pas se connecter**, et rien dans l'interface ne le dit.
- ⚠️ **1 adresse avec une faute de frappe** : le compte `SECRETARY` de
  « Kory Academy 2 » est sur `@gmai.com` (sans « l »). **Cette adresse ne peut
  recevoir aucun message** — ni confirmation, ni réinitialisation. À corriger
  avant tout envoi réel, sinon ce compte sera définitivement inaccessible.
- 1 compte **non confirmé** : l'`ADMIN` de « Senghor ».

### Storage

Un seul bucket : **`student-documents`**, **privé** ✅. Un dossier, celui de
« Kory Academy 2 », **1 fichier**. **Aucune policy Storage** — l'accès passe
exclusivement par des liens signés produits côté serveur.

### RLS — le point à bien comprendre

**RLS est activé sur les 34 tables, avec ZÉRO policy.** C'est un « tout
refuser » : les clés `anon` et `authenticated` ne voient rien. C'est ce qui fait
passer `verify-rls` 48/48.

⚠️ **Mais l'application ne passe pas par là.** Prisma se connecte avec le rôle
`postgres`, dont **`rolbypassrls = true`** : RLS n'a **aucun effet** sur les
requêtes du produit. Toute la protection des données repose donc sur trois
choses : le cloisonnement `schoolId` appliqué dans le code, le mot de passe de
la base, et la clé de service.

Ce n'est pas un défaut — c'est une architecture cohérente et documentée. Mais
elle a une conséquence directe : **la fuite du mot de passe de la base équivaut
à la fuite de toutes les données** (§86).

---

## 86 · 🔴 À FAIRE PAR KORY — Le mot de passe de la base doit être changé

Deux raisons distinctes, chacune suffisante :

1. **Il est faible.** Un mot commun suivi de quelques chiffres. Pour une base
   accessible depuis Internet et dont le rôle **contourne RLS**, c'est le seul
   verrou réel.
2. ⚠️ **Il a été affiché en clair dans la sortie d'une commande de cet audit.**
   Le masquage appliqué ne couvrait que le préfixe `postgres://` ; la chaîne
   réelle utilise `postgresql://`, et le mot de passe est passé au travers. Il
   figure donc désormais dans l'historique de session. **C'est une erreur de ma
   part, et elle doit être traitée comme une divulgation.**

**À faire :** Supabase → Settings → Database → *Reset database password*, puis
mettre à jour `DATABASE_URL` et `DIRECT_URL` dans `.env` **et** dans Vercel.

⚠️ Si le projet de production est un projet neuf (§84), il aura de toute façon
son propre mot de passe — mais **celui-ci reste à changer**, car il protège les
133 élèves réels d'aujourd'hui.

---

## 87 · Relevé — latence, et ce qu'elle dit de la région

Le projet est en **eu-west-1** (Irlande). Les vérificateurs qui font beaucoup
d'allers-retours SQL sont **notablement lents** : `verify-lot-15` met plusieurs
minutes là où sa logique est instantanée.

⚠️ **Ce n'est pas un problème de performance de l'application** — Vercel exécute
le rendu au plus près de la base si les régions concordent. Mais cela pose une
question pour la production : **les utilisateurs sont au Sénégal.** Le trajet
Dakar → Irlande ajoute une latence à chaque page.

Deux réglages devront concorder : la **région Supabase** et la **région
d'exécution Vercel**. Les faire diverger est la faute classique — chaque requête
traverse alors l'Atlantique deux fois.

⚠️ **Aucune décision prise** : le choix de région reste au propriétaire, et
demande de comparer les régions Supabase réellement offertes par le plan retenu.

---

## 88 · SMTP de production — Resend retenu, rien n'est configuré

**Décision de Kory : Resend** comme fournisseur SMTP transactionnel, sous
réserve de validation et de configuration réelle.

**Pourquoi c'est bloquant.** L'envoi intégré de Supabase a déclenché une **alerte
de rebond / délivrabilité**, et son quota bloque déjà les inscriptions
(§57 : `over_email_send_rate_limit`). Sans SMTP réel, **personne d'extérieur ne
peut créer de compte** : c'est le dernier verrou avant un lancement.

**Où le brancher : dans Supabase, pas dans Next.js.** Supabase → Authentication
→ SMTP Settings accepte un SMTP personnalisé. Les trois messages concernés —
confirmation d'inscription, réinitialisation, invitations — sont **émis par
Supabase**, pas par l'application.

⚠️ **Ne pas installer de client d'e-mail dans Next.js.** Le dépôt n'en contient
aucun, et il ne doit pas en gagner un : ce serait une seconde couche d'envoi,
avec ses propres gabarits et ses propres échecs, pour des messages que Supabase
émet déjà. **La seule raison d'en ajouter un serait un message applicatif que
Supabase n'envoie pas** — il n'y en a aucun aujourd'hui.

**À préparer, dans cet ordre :**

1. **le domaine** — tout en dépend ; rien ne peut commencer avant ;
2. le domaine d'envoi chez Resend (souvent un sous-domaine dédié) ;
3. **SPF**, **DKIM**, **DMARC** — un `DMARC` en `p=none` d'abord, pour observer
   avant de durcir ;
4. le SMTP renseigné dans Supabase, avec une adresse d'expédition réelle ;
5. **un envoi réel testé**, vers plusieurs fournisseurs (Gmail, Outlook, Yahoo) ;
6. la surveillance des rebonds.

⚠️ **Le SMTP de production ne sera pas « terminé » tant qu'un e-mail réel n'aura
pas été reçu**, et le parcours d'inscription restera **NON PROUVÉ** jusque-là
(§62).

⚠️ Rappel du §85 : un compte existant porte une adresse `@gmai.com`. Le jour où
l'envoi fonctionnera, ce compte **continuera** de ne rien recevoir.

---

## 89 · Billing EduCom — le domaine n'existe pas, et c'est un chantier

Complète §81. **Rien n'a été créé ni modifié dans Prisma**, conformément à la
consigne.

**Vérifié :** aucun modèle `Subscription`, `Plan`, `Billing`, `Tenant`,
`Account`, `Trial`. `School` n'a **ni plan, ni statut d'abonnement, ni date de
début ou de fin d'essai** — seulement `onboardingCompleted`.

**Ne pas réutiliser `Invoice`/`Payment`.** Ces tables sont la facturation
**école → parents** : elles portent `schoolId` comme *propriétaire* des données.
Un abonnement EduCom a `schoolId` comme *client*. Les confondre ferait apparaître
l'abonnement dans les recettes de l'école, et fausserait `collectedByMethod()`,
les états financiers et les bulletins de recettes. ⚠️ **Un abonnement EduCom
n'est pas une recette de l'école : c'est une dépense.**

**Ce que le domaine devra porter, au minimum :** le plan retenu ; le statut
(essai / actif / impayé / suspendu) ; **la date de fin d'essai** ; la période
couverte ; l'historique des règlements ; la référence de transaction du
fournisseur.

⚠️ **Conséquence déjà visible** : la page Tarifs annonce « 14 jours d'essai ».
Aucun mécanisme ne les décompte. La page dit aujourd'hui la vérité (« rien ne
peut vous être débité ») ; **cette phrase doit rester exacte** jusqu'au jour où
le mécanisme existe.

---

## 90 · Idempotence du futur billing — contraintes, sans décision

Complète et **remplace pour le sujet Wave** l'analyse du §72, qui portait sur les
paiements scolaires.

⚠️ **Ne pas transposer le raisonnement des paiements scolaires.** Là-bas, la
référence sert aussi de numéro de chèque et l'encaissement est saisi par un
humain. Ici, l'événement vient d'une machine qui **réessaie** : c'est le mode
normal des fournisseurs de paiement.

**L'idempotence doit être portée par l'ÉVÉNEMENT FOURNISSEUR**, pas par la ligne
comptable :

1. l'identifiant d'événement Wave doit être **unique et stable** — c'est la clé
   du rejeu ; sa nature exacte dépend de la documentation (§73) ;
2. un événement déjà traité doit être **reconnu avant toute écriture métier** ;
3. un abonnement ne doit **jamais** être prolongé deux fois pour un même
   paiement ;
4. l'ordre d'arrivée n'est pas garanti : un événement plus ancien peut arriver
   après un plus récent, et ne doit pas écraser un état plus avancé ;
5. **rien ne doit être cru sur parole** : un statut reçu doit être reverifié
   auprès de Wave si un endpoint le permet (§73, point 7).

⚠️ **`Payment.reference` n'est PAS modifié**, et le schéma Prisma non plus :
définir une contrainte avant que le modèle de billing existe reviendrait à
figer une décision qui n'a pas été prise.

---

## 91 · Dépendance Wave — la question qui commande tout le modèle

Consignée comme demandé. **La documentation officielle Wave n'a toujours pas été
fournie**, et rien ne sera écrit sans elle.

> **Wave permet-il un véritable paiement récurrent pour un abonnement, ou
> faut-il générer un paiement ponctuel à chaque période ?**

C'est **la première question à résoudre**, avant même la signature du webhook,
parce qu'elle détermine le modèle de données et le produit :

- **Récurrent** → un mandat à stocker, un cycle à suivre, une révocation à
  gérer, des échecs de prélèvement à rattraper.
- **Ponctuel** → pas de mandat, mais **un mécanisme de relance** : une école qui
  oublie de payer perd l'accès à ses bulletins. ⚠️ C'est alors une question de
  produit autant que de technique — et le point 1 du §81 (que se passe-t-il à
  l'expiration ?) devient urgent.

Les six autres inconnues du §73 restent ouvertes : authentification, unité du
montant, retours d'URL, événements du webhook, **vérification de signature**,
statuts définitifs, endpoint de re-vérification.

**Ordre imposé, non négociable :** documentation Wave → décision de récurrence →
modèle Subscription/Billing → idempotence → intégration. **Sauter une étape,
c'est inventer.**

# FIN DU LOT SÉPARATION DEV / PRODUCTION

---

# C.3 — FONDATION DE PRODUCTION — CONSIGNÉ LE 19 AOÛT 2026 (NUIT)

## 92 · 🔴 NEEDS USER ACTION — Incident : mot de passe PostgreSQL divulgué

Complète le §86. **Traiter ce secret comme COMPROMIS.**

**L'incident.** Lors de l'audit C.2, une commande destinée à afficher la
configuration Supabase **sans les secrets** a masqué le mot de passe au moyen
d'un motif qui ne couvrait que le préfixe `postgres://`. La chaîne réelle
utilise `postgresql://`. **Le mot de passe est passé au travers et s'est affiché
en clair** dans la sortie, donc dans l'historique de session. C'est une erreur
d'outillage de ma part.

**Aggravant :** le mot de passe est faible — un mot courant suivi de quelques
chiffres.

**Où ce secret est utilisé.** Recensé :

| Emplacement | Nature |
|---|---|
| `.env` → `DATABASE_URL` | connexion applicative (pooler, 6543) |
| `.env` → `DIRECT_URL` | migrations Prisma (5432) |
| aucune autre | vérifié : ni dans le dépôt, ni dans `.env.example`, ni dans un commit |

⚠️ Le rôle utilisé est `postgres`, dont **`rolbypassrls = true`** : ce mot de
passe donne accès à **toutes** les données de **tous** les établissements, RLS
comprise. C'est le secret le plus sensible du projet, davantage que la clé de
service.

**Rotation — à faire par Kory, je ne peux pas le faire :**

1. Supabase → Settings → Database → **Reset database password** ;
2. remplacer la partie mot de passe dans `DATABASE_URL` **et** `DIRECT_URL`
   de `.env` — les deux, sinon les migrations cassent ;
3. redémarrer `next dev` (la chaîne est lue au démarrage) ;
4. ⚠️ **ne jamais afficher la nouvelle valeur**, ni ici, ni dans `progress.md`,
   ni dans un rapport, ni dans un journal.

**Conséquences de la rotation :** toute connexion ouverte est coupée ; `next dev`
et tout script échouent tant que `.env` n'est pas à jour. **Aucune donnée n'est
affectée** — un mot de passe n'est pas une donnée. Rien d'autre ne l'utilise
(pas de CI, pas de sauvegarde automatisée, pas de service tiers).

⚠️ **Ceci n'a PAS été fait.** Aucune rotation n'a eu lieu.

---

## 93 · ✅ FAIT — Le garde-fou ne se contourne plus par `npx tsx`

Le garde-fou posé en C.2 avait un défaut que C.3 a nommé : **il ne couvrait que
`npm run script`.** `npx tsx scripts/verify-lot-15.ts` passait à côté — et ce
script crée et supprime des écoles entières.

**Correction : la protection est passée DANS LE CHEMIN D'IMPORT.**
`scripts/_env.ts` est le point de passage obligatoire ; il exporte `prisma` et
applique les règles à l'import. Tous les modes d'invocation sont donc couverts,
sans exception.

**Audit des scripts** — 44 inspectés. Trois familles échappaient à toute
protection :

1. **`seed-subjects`, `seed-test-students`** construisaient leur **propre
   `PrismaClient`** ;
2. **`verify-tenant-isolation`, `merge-duplicate-classes`, `harden-rls`**
   ouvraient une **connexion `pg` brute** sur `DATABASE_URL` / `DIRECT_URL` —
   dont un script qui **fusionne des classes** (cascade sur `Enrollment` et
   `Grade`) et un qui **modifie la sécurité de la base** ;
3. `_cdp.ts` ouvre de **vraies sessions authentifiées**.

Toutes passent désormais par `_env`.

**Quatre signaux, porte fermée par défaut** — ne pas dépendre d'une seule
variable, qui s'oublie et se recopie :

| # | Signal | Effet |
|---|---|---|
| ① | `EDUCOM_ENV` ∈ {`development`, `test`} | **autorisation positive** — absente ou mal orthographiée → refus |
| ② | base visée ∈ `EDUCOM_DEV_REFS` | **liste blanche** — un projet créé demain est refusé par défaut |
| ③ | base visée = `EDUCOM_PRODUCTION_REF` | **veto**, même si ① et ② passent |
| ④ | `VERCEL` défini | **veto absolu, levable par RIEN** |

⚠️ **Une liste blanche, pas une liste noire.** Une liste de projets interdits
laisse passer celui qu'on a oublié d'y inscrire — c'est-à-dire précisément le
projet de production, le jour de sa création.

**La levée exceptionnelle** exige la phrase exacte
`oui-je-sais-ce-que-je-fais`. Un `=1` se tape par réflexe et finit par dormir
dans un `.env` ; une phrase se remarque en revue. Elle ne lève **jamais** le
veto ④, et n'est **pas** documentée dans `.env.example`.

**Éprouvé pour de vrai, dans les deux modes :**

| Cas | `npm run script` | `npx tsx` |
|---|---|---|
| `development` | ✅ autorisé | ✅ autorisé |
| `test` | ✅ autorisé | — |
| `EDUCOM_ENV=production` | ✅ refusé | ✅ refusé |
| base = production | ✅ refusé | ✅ refusé |
| connexion `pg` brute vers production | — | ✅ refusé |
| `VERCEL=1` | — | ✅ refusé |
| `EDUCOM_ENV` absente | — | ✅ refusé |

`scripts/verify-gardes.ts` — **23/23** — rejoue ces règles sur des
environnements **simulés** (la fonction est pure) et vérifie l'invariant
d'architecture : aucun script n'importe `src/lib/prisma` ni ne construit son
propre client. ⚠️ C'est ce contrôle qui a trouvé `harden-rls` et
`merge-duplicate-classes`, que j'avais manqués.

⚠️ **Limite honnête :** un programme qui lirait `DATABASE_URL` sans importer
`_env` resterait sans protection. L'invariant l'interdit dans ce dépôt ; il ne
peut rien contre un `psql` tapé à la main.

---

## 94 · ✅ PRÉPARÉ — Migrations versionnées, et pourquoi rien n'est appliqué

**Constat : `_prisma_migrations` est ABSENTE de la base.** Le projet n'a jamais
été migré ; tout est passé par `db push`.

⚠️ Avec deux environnements, `db push` devient un piège : rien ne garantit que
la production reçoive la même modification que le développement. Une colonne
ajoutée en dev et oubliée en production, et l'application plante — sans que le
dépôt permette de le voir venir.

**Ce qui a été produit** — `prisma/migrations/00000000000000_baseline/` :
1040 lignes, 34 tables, 20 énumérés, 71 index, 62 contraintes.

- ✅ **0 instruction destructive** — aucun `DROP`, `TRUNCATE` ni `DELETE`.
- ✅ **La base actuelle correspond exactement au schéma** : le diff entre la base
  de développement et `schema.prisma` est **vide**. La ligne de référence décrit
  donc fidèlement l'existant.

**Pourquoi la commande n'a PAS été jouée.** Baseliner le développement se fait
par `prisma migrate resolve --applied 00000000000000_baseline`, qui n'exécute
aucun SQL. Mais **la même ligne de référence doit être posée sur les deux
environnements**, et le projet de production n'existe pas. Baseliner le
développement seul créerait un décalage d'historique entre deux bases censées
partager le même. La commande est prête ; elle sera jouée sur les deux à la
suite.

Procédure complète : `prisma/migrations/README.md`.
⚠️ **`prisma migrate reset` supprime toute la base** : aucun usage légitime ici.

---

## 95 · ✅ PRÉPARÉ — Checklist de production dérivée de la base, pas rédigée

`scripts/checklist-production.ts` — **lecture seule**. Il lit la configuration de
sécurité réellement en place et en déduit la procédure à rejouer.

⚠️ **Elle n'est pas écrite à la main, et c'est le point.** Une liste rédigée se
périme le jour où un réglage change sans qu'on la mette à jour, et personne ne
s'en aperçoit avant la production.

**Ce qu'elle vérifie et confirme aujourd'hui :**

- bucket `student-documents` : **privé** ✅ ;
- **double verrou intact** : les 6 types MIME et la limite de 10 Mo déclarés sur
  le bucket correspondent **exactement** à `src/lib/studentFileLimits.ts` ✅ ;
- RLS : 34 tables actives, **0 policy** — refus total, à reproduire tel quel ;
- ⚠️ **zéro policy est volontaire.** Ajouter des policies « par école »
  n'ajouterait rien : cela **ouvrirait** un accès aujourd'hui fermé. Ne pas
  créer de matrice RLS parallèle — `scripts/harden-rls.ts` reste la référence.

⚠️ Le script rappelle que le rôle applicatif **contourne RLS** : la barrière du
produit est le cloisonnement `schoolId` dans le code, pas RLS.

**Aucun projet de production n'existe.** Rien dans cette checklist n'a été
exécuté ailleurs que sur le développement, en lecture.

---

## 96 · CRON_SECRET — trois refus prouvés, l'acceptation NON PROUVÉE

Éprouvé sur un serveur de production réel (`next start`, port isolé, secret
aléatoire de 48 caractères jamais affiché puis détruit), **sans toucher au
serveur de développement** :

| Requête | Attendu | Obtenu |
|---|---|---|
| `POST` sans en-tête | refus | ✅ **401** |
| `GET` sans en-tête | refus | ✅ **401** |
| `GET` secret incorrect | refus | ✅ **401** |
| `GET` bon secret, schéma `Basic` | refus | ✅ **401** |
| `GET` secret tronqué d'un caractère | refus | ✅ **401** |
| secret absent du serveur | refus | ✅ **503** (§82) |

⚠️ **401 et non 503** : le serveur avait bien un secret configuré. Les deux codes
sont distingués, ce qui prouve que le refus vient de la requête et non d'une
route inerte.

⃠ **NON PROUVÉ — « bon secret → 200 ».** Le prouver exigerait d'exécuter le
balayage réel, qui **basculerait une vraie facture** de « Kory Academy 2 » de
`PENDING` à `OVERDUE` (mesuré en essai à blanc : 1 facture). Ce chantier
interdit de modifier les données métier. Le chemin d'autorisation est le
**même** pour les six cas ci-dessus — c'est `authorise()`, appelée avant toute
écriture — mais **l'absence de preuve reste une absence de preuve**.

Pour lever ce point quand vous l'acceptez : définir `CRON_SECRET`, redémarrer,
puis appeler la route avec le bon secret ; une facture basculera.

---

## 97 · Résidu de fixture — trouvé, compté, supprimé

En vérifiant qu'aucune donnée n'avait bougé, un écart est apparu : **137 élèves
au lieu de 136**.

**Cause :** j'avais interrompu manuellement une exécution de `verify-lot-15`
pendant un diagnostic ; son nettoyage de fin n'a donc jamais tourné, et sa
fixture `SONDE15-Enfant Sonde` est restée **dans « Kory Academy 2 »**, l'école
réelle.

Traité selon la règle 4 : comptage des rattachements (1 inscription, 0 note,
0 document, 0 facture), essai à blanc, puis `APPLY=1`. **136 élèves rétablis.**

⚠️ **Ce qu'il faut en retenir** : un vérificateur interrompu laisse ses fixtures
dans la base. Ce n'est pas un défaut des scripts — c'est une propriété de tout
nettoyage placé en fin d'exécution. Vérifier les compteurs après une
interruption, plutôt que de supposer.

⚠️ **Le compte Auth `…@sonde.invalid` sans ligne `User` (§85) n'a PAS été
supprimé** : la consigne interdit le nettoyage automatique des données
existantes, et il n'a pas été créé pendant ce chantier.

# FIN DU LOT C.3

---

# C.3 — CLÔTURE — CONSIGNÉ LE 20 AOÛT 2026

## 98 · ✅ FAIT — Rotation du mot de passe PostgreSQL

Ferme le §92. **La rotation a été effectuée par Kory.** Vérifié depuis le dépôt,
sans qu'aucune valeur ne soit affichée :

| Contrôle | Résultat |
|---|---|
| connexion établie avec le nouveau secret | ✅ rôle `postgres`, 34 tables |
| `DATABASE_URL` et `DIRECT_URL` portent le même mot de passe | ✅ |
| `DATABASE_URL` = pooler 6543 · `DIRECT_URL` = 5432 | ✅ |
| `.env` ignoré par Git, jamais suivi | ✅ |
| ancien secret dans un fichier **versionné** | ✅ **0** |
| ancien secret dans **l'historique Git** (toutes branches) | ✅ **0** |
| `.env.example` sans valeur réelle | ✅ 12/12 |

⚠️ L'ancien secret n'a **jamais** été committé — `.env` était ignoré dès le
premier commit. **Aucune réécriture d'historique n'est nécessaire.**

---

## 99 · 🔴 TROUVÉ ET CORRIGÉ — La rotation avait remis la base EN CLAIR

C'est le défaut le plus important de cette clôture, et il ne se voyait pas :
tout fonctionnait.

**En réécrivant les deux chaînes de connexion avec le nouveau mot de passe, le
paramètre `sslmode` a disparu des deux.**

`.env.example` le documente pourtant depuis le 19 août : *« `sslmode` n'est PAS
optionnel : sans lui, node-postgres se connecte EN CLAIR »*. C'est exactement ce
qui s'est reproduit — le commentaire existait, le geste l'a contourné.

**Preuve, et pourquoi la première mesure était trompeuse.** Interrogé,
`pg_stat_ssl` répondait `ssl = NON` **même après correction**. Ce n'était pas la
bonne mesure : à travers un pooler, `pg_stat_ssl` décrit la liaison
*pooler → PostgreSQL*, pas *client → pooler*. La mesure juste se prend côté
client, sur la socket :

| Chaîne | socket TLS | protocole |
|---|---|---|
| `DATABASE_URL` (après correction) | ✅ OUI | **TLSv1.3** `TLS_AES_256_GCM_SHA384` |
| `DIRECT_URL` (après correction) | ✅ OUI | **TLSv1.3** `TLS_AES_256_GCM_SHA384` |
| **témoin** — même hôte sans `sslmode` | ❌ **NON** | aucun |

Le témoin est ce qui rend la preuve concluante : sans `sslmode`, le même serveur
accepte une connexion **en clair**. Ce n'était donc pas une protection
implicite du serveur.

⚠️ **Conséquence à connaître** : entre la rotation et cette correction, le
**nouveau** mot de passe et les données consultées ont circulé **non chiffrés**.
La fenêtre est courte et le trajet réseau limité — mais c'est une exposition
réelle. **Décision de Kory** : tourner à nouveau, ou accepter le risque.

⚠️ **À reproduire dans Vercel** : les variables de production devront porter
`sslmode`. Une chaîne recopiée sans lui donnerait une production en clair, sans
aucun signe extérieur.

---

## 100 · Le serveur de développement tournait avec l'ancien secret

Symptôme : `verify-responsive` chutait de 29/29 à 6/29, toutes les pages du
tableau de bord en **HTTP 500**. Ce n'était **pas** une régression de code.

Le journal du serveur le disait :

> `Authentication failed against the database server, the provided database
> credentials for postgres are not valid`
> puis `(ECIRCUITBREAKER) too many authentication failures, new connections are
> temporarily blocked`

`next dev` lit `.env` **au démarrage** : il tournait donc encore avec l'ancien
mot de passe, et ses tentatives répétées ont fini par déclencher le
**coupe-circuit de Supabase**, qui bloque temporairement toute nouvelle
connexion — y compris les bonnes.

Serveur redémarré ; `verify-responsive` **29/29** et `verify-plg-runtime`
**80/80** aussitôt rétablis.

⚠️ **Étape à ne pas oublier lors de toute rotation** : redémarrer les processus
qui ont lu `.env`. Sinon le symptôme n'est pas « ça ne marche plus », mais
« tout est en 500 sans raison apparente », et le coupe-circuit fait croire à une
panne Supabase.

---

## 101 · `db pull` a réécrit le schéma — restauré

`npx prisma db pull` régénère `prisma/schema.prisma` **depuis la base**. Le
fichier obtenu était sémantiquement identique — vérifié par
`prisma migrate diff` **dans les deux sens**, résultat vide — mais il avait :

- **supprimé les 15 commentaires simples** (`//`) qui documentaient les valeurs
  admises des colonnes `status` ;
- réordonné les champs (relations rejetées en fin de modèle) ;
- supprimé les lignes vides, produisant un diff de **1310 lignes** pour zéro
  changement de modèle.

Le fichier committé a été **restauré** (`git checkout`), et le client Prisma
régénéré (**7.9.1**, 5 fichiers). Les 15 commentaires et les 247 commentaires de
documentation sont intacts.

⚠️ **`db pull` est utile pour constater, pas pour éditer.** Sur ce dépôt, le
schéma est la source de vérité et la base en découle — pas l'inverse. Récupérer
la version tirée si besoin : `npx prisma db pull` la reproduit à l'identique.

---

## 102 · Résidus de fixtures — recensés, NON supprimés

La consigne de ce chantier interdit tout nettoyage. Constaté, donc, sans y
toucher :

| Table | Réel | Référence | Écart |
|---|---|---|---|
| `User` | 15 | 10 | **5 fixtures** `sonde15.*` |
| `Class` | 17 | 15 | **2** `SONDE15`, **1** `SONDEMOB` |
| `SchoolDocument` | 8 | 1 | **6** `SONDE15`, **1** `SONDEMOB` |

⚠️ **Toutes portent un préfixe de sonde**, et toutes datent du 19 août 22:32 —
l'exécution de `verify-lot-15` que j'avais interrompue manuellement (§97), plus
un lot `SONDEMOB` de 08:22.

⚠️ **Elles sont dans « Kory Academy 2 », l'école réelle** : les six documents
`SONDE15` apparaissent donc dans le centre documentaire comme des documents
d'établissement. C'est visible à l'écran.

**Aucune donnée métier n'a bougé** : 3 écoles, **136 élèves**, 134 inscriptions,
82 notes, 20 bulletins, 8 factures (7 `PAID` / 1 `PENDING`), 7 paiements tous
`CASH` sans référence — tous à la référence.

⚠️ **À nettoyer dans un chantier qui l'autorise.** Un vérificateur interrompu ne
nettoie jamais : relancer `verify-lot-15` ne les enlèvera pas, car chaque
exécution ne connaît que ses propres fixtures.

# FIN DE LA CLÔTURE C.3

---

# C.4 — ENVIRONNEMENT DE PRODUCTION — CONSIGNÉ LE 20 AOÛT 2026

## 103 · 🔴 NEEDS USER ACTION — Créer le projet Supabase de production

Le projet ne peut pas être créé depuis le dépôt : il faut le tableau de bord
Supabase. **Rien n'a été créé.**

**Nom recommandé :** `educom-production` — explicite, et impossible à confondre
avec l'actuel dans une liste de projets à 2 h du matin.
**Organisation :** la même que le projet actuel.

⚠️ **Ne rien copier depuis le développement.** Ni les 136 élèves, ni les
10 comptes, ni les 8 factures, ni les 7 paiements, ni les documents. La
production commence **vide**, et sa première école sera créée par une vraie
inscription — ce qui éprouvera le parcours réel par la même occasion.

⚠️ **Les fixtures `SONDE15` et `SONDEMOB` ne doivent jamais y apparaître.**
Elles subsistent dans le développement (§102) et restent intouchées.

**À reproduire**, dérivé de la base et non rédigé de mémoire — voir
`scripts/checklist-production.ts` : le schéma par migration, le durcissement
RLS, le bucket privé avec ses limites, les URL de redirection Auth.

---

## 104 · 🟠 DÉCISION REQUISE — Région du projet de production

Le développement est en **eu-west-1 (Irlande)**. La région **ne se change pas
après création** : c'est une décision d'architecture, pas un réglage.

**Ce qui plaide pour l'Europe :** c'est là que Supabase offre le plus de
régions ; l'Afrique de l'Ouest n'est pas servie. Le trajet Dakar → Irlande est
d'ailleurs parmi les plus courts disponibles — les câbles ouest-africains
remontent vers l'Europe.

**Ce qui mérite examen :** ce sont des **données de mineurs** — dossiers,
extraits de naissance, certificats médicaux, bulletins. La **Loi sénégalaise
n°2008-12** encadre le traitement des données personnelles. ⚠️ **Je ne sais pas**
si elle impose une localisation ou une déclaration préalable à la CDP : cela
demande un avis juridique, pas une supposition d'agent.

⚠️ **La région Supabase et la région d'exécution Vercel doivent CONCORDER.**
Les faire diverger fait traverser l'Atlantique deux fois à chaque requête.

**Constaté, sans conclure :** la latence actuelle est perceptible — certains
vérificateurs mettent plusieurs minutes là où leur logique est instantanée.

**Décision du propriétaire.** Aucune n'a été prise.

---

## 105 · ✅ FAIT — Les migrations sont prêtes, et prouvées sans risque

`prisma/migrations/00000000000000_baseline/` : 34 tables, 20 énumérés.
**Vérifié automatiquement** par `scripts/verify-production-ready.ts` :
**0 opération destructive** — aucun `DROP TABLE/COLUMN/TYPE`, `TRUNCATE`,
`DELETE FROM`, ni `ALTER TABLE … DROP`.

⚠️ Le contrôle **ignore les commentaires SQL** : une migration qui explique
pourquoi elle ne supprime rien contient le mot « DROP ». Sans ce filtrage, le
vérificateur se déclencherait sur sa propre documentation.

**Procédure, dans cet ordre** (`prisma/migrations/README.md`) :

1. base de production **neuve et vide** → `npx prisma migrate deploy` ;
2. base de développement → `npx prisma migrate resolve --applied …`
   (n'exécute aucun SQL, inscrit seulement la ligne de référence) ;
3. ensuite et pour toujours : `migrate dev` en développement,
   `migrate deploy` en production.

⚠️ **Interdits, définitivement** : `db push` sur la production ; `migrate reset`
(supprime toute la base) ; toute migration destructive sans relecture humaine et
sauvegarde vérifiée.

---

## 106 · Les quatre couches de protection — mesurées, pas supposées

Le cahier des charges demande de dire **d'où vient chaque protection**. La
réponse a été obtenue par des requêtes réelles, et elle corrige une idée reçue.

### Couche 1 — face à la clé publique du navigateur

Six tables interrogées avec la clé `anon` : **HTTP 401, code `42501`** pour
toutes.

⚠️ **`42501` signifie *insufficient privilege*, pas *ligne filtrée*.** Le refus
vient donc de la **révocation des droits** (`REVOKE ALL … FROM anon,
authenticated`, posée par `scripts/harden-rls.ts`), **pas de RLS**. Si RLS
agissait seule, la réponse serait `200 []` — un succès vide.

C'est exactement le « deux verrous valent mieux qu'un » du durcissement : RLS se
désactive d'un clic dans une interface, la révocation non.

### Couche 2 — le chemin réel de l'application

Prisma se connecte en `postgres`, **`rolbypassrls = true`**.

⚠️ **RLS n'a AUCUN effet sur le chemin du produit.** Écrire « les données sont
protégées par RLS » serait faux. RLS et les révocations protègent contre un
usage direct de l'API Supabase ; elles ne protègent pas d'un défaut de
l'application.

### Couche 3 — Storage

Bucket **privé**, **aucune policy**. Avec la clé publique : `listBuckets` renvoie
**0 bucket**, `list` **0 entrée**, et un objet réel demandé en accès public
renvoie **HTTP 400**. Les fichiers ne sont atteignables que par **URL signée**
produite côté serveur, à durée de vie courte.

### Couche 4 — l'isolation métier, dans le code

**C'est la seule qui protège une école d'une autre**, et elle vit entièrement
dans le code : `schoolId` appliqué à chaque requête, `requireActionContext()` /
`requireSchoolContext()`, `canSeeStudent()`, `canSeeDocument()`,
`canSeeCategory()`. Éprouvée par `verify-tenant-isolation` et par les lots 13.1
à 17.

### Ce qu'il faut en retenir pour la production

| Menace | Ce qui protège réellement |
|---|---|
| clé publique volée dans le navigateur | **révocations** (puis RLS) |
| fichier d'élève deviné à l'URL | **bucket privé + URL signées** |
| l'école A voit l'école B | **le code, et lui seul** |
| script de test lancé sur la production | **`scripts/_env.ts`** (§93) |
| mot de passe de la base | **rien d'autre** — ce rôle contourne RLS |

⚠️ **Ne jamais présenter RLS comme la barrière du produit.** La barrière, c'est
le cloisonnement `schoolId` dans le code — ce qui fait des tests d'isolation la
protection la plus précieuse du dépôt.

---

## 107 · Matrice des variables — Vercel

Les **14** variables réellement lues. **Aucune valeur n'est affichée nulle part.**

| Variable | Local | Preview | Production | Portée | Statut |
|---|---|---|---|---|---|
| `DATABASE_URL` | dev | ⚠️ **jamais la prod** | prod | 🔒 serveur | à créer |
| `DIRECT_URL` | dev | ⚠️ jamais la prod | prod | 🔒 serveur | à créer |
| `NEXT_PUBLIC_SUPABASE_URL` | dev | preview | prod | 🌐 navigateur | à créer |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dev | preview | prod | 🌐 navigateur | à créer |
| `SUPABASE_SERVICE_ROLE_KEY` | dev | ⚠️ jamais la prod | prod | 🔒 serveur | à créer |
| `NEXT_PUBLIC_SITE_URL` | localhost | URL de preview | **domaine** | 🌐 navigateur | ⛔ bloqué |
| `CRON_SECRET` | absent | absent | **valeur neuve** | 🔒 serveur | à créer |
| `EDUCOM_ENV` | `development` | `test` | **`production`** | 🔒 serveur | à définir |
| `EDUCOM_DEV_REFS` | ref dev | ref dev | **vide** | 🔒 serveur | à définir |
| `EDUCOM_PRODUCTION_REF` | ref prod | ref prod | (indifférent) | 🔒 serveur | ⛔ bloqué |
| `TWILIO_ACCOUNT_SID` · `_AUTH_TOKEN` · `_PHONE_NUMBER` | facultatif | — | facultatif | 🔒 serveur | n'active rien |
| `OCR_PROVIDER` | vide | vide | **vide** | 🔒 serveur | laisser vide |

⚠️ **`NEXT_DIST_DIR` ne doit être définie nulle part sur Vercel.** Elle est déjà
neutralisée quand `VERCEL=1` (§82), mais l'y ajouter n'aurait aucun sens.
⚠️ **`EDUCOM_ALLOW_PRODUCTION` ne doit jamais y figurer** : elle désarmerait le
garde-fou en permanence.

**Trois pièges de cette matrice :**

1. ⚠️ **Preview ne doit JAMAIS viser la base de production.** Une branche de test
   écrirait dans les données réelles. Les previews visent le développement, ou
   rien.
2. ⚠️ **`EDUCOM_ENV=production` sur Vercel** rend tout script inexécutable
   là-bas — c'est voulu, et cela se cumule avec le veto `VERCEL`, que rien ne
   lève.
3. ⚠️ **`sslmode` doit figurer dans les deux URL de production.** Son oubli lors
   de la rotation avait remis le développement en clair (§99) ; une chaîne
   recopiée sans lui donnerait une production en clair, **sans aucun signe
   extérieur**.

---

## 108 · ✅ FAIT — En-têtes de sécurité, et la CSP qui n'y est pas

L'application n'envoyait **aucun** en-tête de sécurité. Cinq ont été ajoutés et
**vérifiés réellement servis** : `Strict-Transport-Security`,
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`.

Deux choix méritent leur justification :

⚠️ **La caméra n'est PAS coupée.** Les écrans de dépôt de pièces utilisent
`<input type="file" accept="image/*">`, qui sur mobile ouvre « Prendre une
photo ». Une `Permissions-Policy` restrictive par réflexe aurait cassé le geste
le plus courant du produit, **sans le moindre message d'erreur**.

⚠️ **`X-Frame-Options: DENY` ne gêne pas l'aperçu de documents.** Cet `<iframe>`
charge une URL signée `*.supabase.co` : l'en-tête qui le gouverne est celui de
Supabase, pas le nôtre. Vérifié **avant** d'ajouter l'en-tête, pas après.

⚠️ **Aucune `Content-Security-Policy`, délibérément.** Une CSP utile pour Next.js
exige des `nonce` propagés à chaque script, plus les origines Supabase. Écrite à
l'aveugle, elle casserait l'application — ou serait si permissive qu'elle ne
protégerait rien tout en en donnant l'impression. **PENDING — chantier à part.**

`Strict-Transport-Security` est posé **sans `preload`** : l'inscription à la
liste de préchargement engage le domaine de façon difficilement réversible, et
le domaine n'est pas choisi.

---

## 109 · 🔴 NEEDS USER ACTION — Domaine, SMTP, sauvegardes

Trois dépendances externes ; aucune ne peut être levée depuis le dépôt.

**① Le domaine.** ⚠️ **Il bloque tout le reste** : `NEXT_PUBLIC_SITE_URL`, la
Site URL de Supabase Auth, les URL de redirection, les liens des e-mails, le
domaine d'envoi SMTP et son DKIM. ⚠️ Aucune URL temporaire ne doit devenir la
configuration définitive : un lien de confirmation envoyé vers une adresse
`*.vercel.app` continuera d'y pointer dans la boîte du destinataire longtemps
après le changement de domaine.

**② Le SMTP.** Fournisseur retenu : **Resend**, sous réserve de validation.
À brancher **dans Supabase → Authentication → SMTP**, pas dans Next.js : les
trois messages (confirmation, réinitialisation, invitation) sont émis par
Supabase. ⚠️ **Le dépôt ne contient aucun client d'e-mail et ne doit pas en
gagner un.** Ordre : domaine → domaine d'envoi → SPF, DKIM, DMARC (`p=none`
d'abord, pour observer avant de durcir) → SMTP dans Supabase → **envoi réel
testé** vers plusieurs fournisseurs → surveillance des rebonds.

**③ Les sauvegardes.** ⚠️ **Aucune n'est constatée, aucune restauration n'a été
essayée.** Le plan Supabase (rétention, PITR) n'a pas pu être lu — cela demande
le tableau de bord. ⚠️ **Ne jamais écrire qu'EduCom sauvegarde quotidiennement
tant que ce n'est pas constaté ET qu'une restauration n'a pas été réussie.**
Le Storage est à traiter séparément : il n'est pas couvert par les sauvegardes
PostgreSQL.

⚠️ **Aucune supervision, aucune alerte.** Aujourd'hui, un incident en production
ne serait connu que si une école téléphone. `AuditLog` reste la seule source
d'investigation, et **aucun écran ne permet de le lire**.

# FIN DU LOT C.4
