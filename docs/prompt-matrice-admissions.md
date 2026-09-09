Refonds la page /dashboard/students/dossiers/review (Examen des admissions
et conformité).

BUGS À CORRIGER EN PRIORITÉ
1. Tous les élèves affichent "0 ans". La date de naissance n'est pas
   remplie ou pas parsée à l'import. Corrige la chaîne complète : parsing
   des formats jj/mm/aaaa, jj-mm-aaaa et aaaa-mm-jj à l'import, stockage,
   puis calcul de l'âge à l'affichage. Sans âge, les règles
   conditionnelles ci-dessous sont inapplicables.
   Quand la date de naissance est absente, afficher "Âge inconnu" et non
   "0 ans", et faire remonter la pièce manquante dans la checklist.
2. Tous les élèves affichent "Non renseigné" en Parent / Tuteur. Vérifie
   le mapping des colonnes tuteur à l'import et la déduplication par
   téléphone. Une colonne entièrement vide est un problème de données, pas
   d'affichage.

STRUCTURE DU TABLEAU

Colonnes fixes :
  Case à cocher (sélection multiple)
  Élève (avatar, nom, âge)
  Classe
  Parent / Tuteur
  [colonnes documents — voir ci-dessous]
  Statut d'admission + actions

Les colonnes documents ne doivent PAS être codées en dur. Aujourd'hui la
page affiche 2 colonnes fixes (Extrait de naissance, Photos d'identité)
identiques pour un CI et un CM1, alors que les pièces exigées varient par
cycle. Elles doivent être dérivées de document_requirement pour le cycle
de la classe affichée.

PIÈCES EXIGÉES PAR CYCLE

Si les modèles document_requirement et student_document n'existent pas
encore, crée-les avec ce contenu. S'ils existent, vérifie que le seed
correspond et complète-le.

document_requirement
  id
  schoolId          // multi-tenant, chaque école ajuste sa liste
  cycle             // PRESCOLAIRE | ELEMENTAIRE | MOYEN | SECONDAIRE
  label
  required          // boolean, modifiable par l'école
  source            // OFFICIEL | ETABLISSEMENT
  conditional       // ex: "age < 6" pour le certificat préscolaire
  pinned            // boolean, colonne épinglée dans le tableau
  order

student_document
  id
  studentId
  requirementId
  status            // FOURNI | EN_REGULARISATION | MANQUANT
  fileUrl           // nullable
  note              // nullable
  updatedAt

Contexte réglementaire sénégalais (source des pièces marquées OFFICIEL) :
- Inscription au CI : extrait ou bulletin de naissance. Si l'enfant a
  moins de 6 ans, ajouter un certificat de scolarité du cycle préscolaire.
- Entrée en 6e (décret n° 90-1463 du 28 décembre 1990) : demande
  d'inscription, acte d'état civil (bulletin, extrait ou jugement), fiche
  scolaire si le candidat est présenté par une école publique ou privée
  autorisée. Âge maximum 14 ans au 31 décembre de l'année de l'examen.
- Inscription au CFEE : bulletin ou extrait de naissance, fiche scolaire
  ou certificat de scolarité, droit d'inscription de 250 FCFA (FAEC). Pas
  de limite d'âge pour le CFEE.

Valeurs à seeder (l'école peut tout modifier ensuite) :

Préscolaire :
  Extrait ou bulletin de naissance — officiel, requis, épinglé
  Personnes autorisées à récupérer l'enfant — établissement, requis, épinglé
  Photos d'identité — établissement, optionnel
  Fiche de renseignements signée — établissement, optionnel
  Règlement intérieur signé — établissement, optionnel

Élémentaire :
  Extrait ou bulletin de naissance — officiel, requis, épinglé
  Certificat de scolarité préscolaire — officiel, requis si âge < 6 ans en CI
  Fiche scolaire / certificat de scolarité — officiel, requis, épinglé
  Certificat de transfert (exeat) — officiel, requis si transfert
  Bulletin de l'année précédente — établissement, optionnel
  Photos d'identité — établissement, optionnel
  Fiche de renseignements signée — établissement, optionnel
  Pièce d'identité du tuteur — établissement, optionnel
  Règlement intérieur signé — établissement, optionnel

Moyen :
  Acte d'état civil (bulletin, extrait ou jugement) — officiel, requis, épinglé
  Fiche scolaire — officiel, requis, épinglé
  Demande d'inscription — officiel, requis
  Relevé de notes CFEE — établissement, optionnel
  Bulletin de l'année précédente — établissement, optionnel
  Photos d'identité — établissement, optionnel
  Pièce d'identité du tuteur — établissement, optionnel
  Règlement intérieur signé — établissement, optionnel

Secondaire :
  Acte d'état civil — officiel, requis, épinglé
  Fiche scolaire / certificat de scolarité — officiel, requis, épinglé
  Relevé de notes BFEM — établissement, optionnel
  Bulletin de l'année précédente — établissement, optionnel
  Photos d'identité — établissement, optionnel
  Pièce d'identité du tuteur — établissement, optionnel
  Règlement intérieur signé — établissement, optionnel

Ne pas seeder le carnet de vaccination : c'est de la donnée de santé, et
le principe de proportionnalité de la loi 2008-12 interdit de collecter
une pièce que l'école n'utilise pas réellement. L'école peut l'ajouter
elle-même si elle en a l'usage.

Les pièces conditionnelles doivent se recalculer automatiquement à partir
de la date de naissance et de la classe, jamais par saisie manuelle. Le
certificat de scolarité préscolaire n'apparaît que pour un élève de CI de
moins de 6 ans, et disparaît de sa checklist dès qu'il a 6 ans.

Ajoute un écran de réglages "Pièces du dossier" où l'école active,
désactive, réordonne, épingle et ajoute des pièces par cycle. Les pièces
marquées OFFICIEL peuvent être rendues optionnelles mais pas supprimées :
afficher un avertissement qui nomme la conséquence.

Problème d'échelle à résoudre : une classe de CM2 peut avoir 8 pièces
exigées. Huit colonnes rendent le tableau illisible et impossible sur
mobile. Solution à implémenter :

- 2 à 3 colonnes de documents épinglées, choisies par l'école dans les
  réglages (par défaut : les pièces marquées OFFICIEL et requises).
- Une colonne "Autres pièces" compacte affichant un compteur de pastilles,
  par exemple "3 ✓ · 2 ✗", cliquable.
- Un clic sur la ligne (ou sur le compteur) déplie la ligne et affiche
  toutes les pièces du cycle avec leur statut et leur action.
- Quand le filtre de classe est sur une classe unique, les colonnes
  s'adaptent au cycle de cette classe. Sur "Toutes les classes", n'afficher
  que les pièces communes à tous les cycles présents.

ÉTATS D'UNE PIÈCE (3 états, pas 2)

  FOURNI            → coche verte + nom du fichier au survol, clic = aperçu
  EN_REGULARISATION → pastille orange "en cours", avec la date de mise à jour
  MANQUANT          → bouton d'action

Aujourd'hui il n'y a que "déposer ou rien". EN_REGULARISATION est
indispensable : au Sénégal beaucoup de familles ont entamé une démarche
d'état civil sans l'avoir terminée. C'est le statut le plus utilisé en
pratique.

Ne jamais bloquer sur une pièce manquante : un élève sans extrait de
naissance reste inscriptible et peut être présenté aux examens. La
checklist informe, elle n'interdit pas.

ACTION DE DÉPÔT

Un seul bouton, qui ouvre un menu à deux entrées :
  - Choisir un fichier (PDF, JPG, PNG)
  - Prendre une photo  → input capture="environment" sur mobile,
                          masqué sur desktop sans caméra

Après capture, proposer un recadrage simple et une compression avant
envoi. Les secrétariats travaillent souvent sur des connexions lentes :
compresser côté client avant l'upload, pas après.

Prévoir aussi un dépôt multiple : sélectionner plusieurs élèves via les
cases à cocher, puis déposer la même pièce pour tous, ou marquer tous les
sélectionnés EN_REGULARISATION en une action.

COLONNE PROGRESSION & ADMISSION

Supprimer la barre de progression actuelle "0/2 (0%)" : la fraction et le
pourcentage disent la même chose, et une barre à zéro répétée sur toutes
les lignes est du bruit visuel.

La remplacer par :
  - une fraction seule, discrète : "0 / 2 pièces"
  - le statut d'admission sous forme de badge
  - le bouton d'action principal

Clarifie la relation entre les deux notions, aujourd'hui ambiguë : le
statut de la checklist (pièces fournies) et le statut d'admission
(l'élève est-il admis) sont indépendants. Une école peut valider
l'admission d'un élève dont le dossier est incomplet. Le bouton "Valider"
doit donc rester actif à 0/2, mais afficher une confirmation qui nomme la
conséquence, dans le ton existant de l'application :
  "Ce dossier est incomplet (2 pièces manquantes). L'admission sera
   validée, mais les pièces resteront à régulariser."

ONGLETS DU HAUT

Les libellés actuels se chevauchent : "Nécessitent une décision" et
"Checklist non conforme" désignent partiellement la même population.
Redéfinis-les sans recouvrement, chacun avec un compteur :
  À traiter          — admission non tranchée
  Pièces manquantes  — admis, mais dossier incomplet
  Complets           — admis et dossier complet
  Tous

MOBILE

Le tableau ne doit pas être scrollé horizontalement sur mobile. Sous
768px, basculer en cartes, une par élève :

  Nom + classe + âge
  Tuteur (ou "Tuteur non renseigné" en action cliquable)
  Ligne de pastilles de pièces, une par document, code couleur
  Bouton principal : Déposer une pièce
  Badge de statut d'admission

Les actions de dépôt et de capture photo doivent être utilisables à une
main : cibles tactiles d'au moins 44px, boutons en bas de carte.

CONTRAINTES
- npx tsc --noEmit doit passer à 0 erreur avant que tu me rendes la main.
- Réutilise les modèles document_requirement et student_document s'ils
  existent déjà ; sinon crée-les selon la section "Pièces exigées par
  cycle" ci-dessus. Dans tous les cas, migration Prisma incluse avec seed
  des valeurs par défaut pour les écoles existantes, selon leurs cycles.
- Micro-textes dans le ton existant de l'application : expliquer la
  conséquence, pas la mécanique.
- Aucune notification automatique aux familles.
- Ne touche à rien en dehors de cette page et des correctifs de données
  cités en priorité. Signale en fin de réponse ce que tu as vu à corriger
  ailleurs sans le faire.

À LA FIN
Liste les fichiers modifiés, les migrations créées, et explique comment tu
as tranché l'affichage des colonnes quand plusieurs cycles sont visibles
en même temps.
