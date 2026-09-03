# EDUCOM NAVIGATION ARCHITECTURE (Chantier #5)

## 1. Philosophie & Objectif
Le but de ce chantier est de réduire le nombre de "portes d'entrée" exposées à l'utilisateur, passant d'une liste de fonctionnalités isolées à une navigation structurée par **domaines métiers**. Aucune fonctionnalité n'a été supprimée, seul le point d'entrée a été déplacé ou consolidé.

## 2. Before / After (Sidebar Navigation)

### AVANT (11 rubriques éclatées)
- Tableau de bord
- Rapports
- Saisie des notes
- Annuaire
- Documents
- Centre documentaire
- Exports de dossiers
- Communications
- Paiements
- Équipe
- Configuration pédagogique
- Paramètres

### APRÈS (8 domaines unifiés)
1. Tableau de bord
2. Élèves & dossiers
3. Présences
4. Notes & bulletins
5. Finance
6. Documents
7. Communications
8. Administration (Équipe, Paramètres, Configuration, Rapports)

## 3. Consolidation Fonctionnelle

### Élèves & Dossiers (`/dashboard/directory`)
*Ancienne porte d'entrée :* Annuaire, Exports de dossiers (séparés dans la barre latérale).
*Nouvelle porte d'entrée :* Sidebar > "Élèves & dossiers".
*Changements apportés :* La page Annuaire agit désormais comme un Hub. Les actions "Importer" et "Exporter" sont disponibles en haut de page de l'annuaire (zone Gestion des données). L'import continue de suivre le workflow First Win (Chantier #1).

### Présences (`/dashboard/attendance`)
*Ancienne porte d'entrée :* Inexistante au niveau global.
*Nouvelle porte d'entrée :* Sidebar > "Présences".
*Changements apportés :* Remonté au rang de domaine principal, permettant aux enseignants et directeurs d'accéder au suivi et à la prise de présences rapidement.

### Notes & Bulletins (`/dashboard/grades`)
*Ancienne porte d'entrée :* "Saisie des notes".
*Nouvelle porte d'entrée :* Sidebar > "Notes & bulletins".
*Changements apportés :* Le nom a été élargi pour englober tout le cycle d'évaluation scolaire (saisie, évaluations, préparation des bulletins).

### Finance (`/dashboard/payments`)
*Ancienne porte d'entrée :* "Paiements".
*Nouvelle porte d'entrée :* Sidebar > "Finance".
*Changements apportés :* Changement sémantique pour englober la facturation, les tarifs et les impayés, limitant ce domaine aux directeurs et comptables.

### Documents (`/dashboard/documents`)
*Ancienne porte d'entrée :* "Documents" ET "Centre documentaire" séparés.
*Nouvelle porte d'entrée :* Sidebar > "Documents".
*Changements apportés :* L'accès au centre documentaire n'encombre plus la navigation de premier niveau, il est internalisé dans l'espace Documents.

### Administration (`/dashboard/settings`, `/dashboard/reports`, `/dashboard/team`)
*Ancienne porte d'entrée :* Sections éclatées.
*Nouvelle porte d'entrée :* Sidebar > Groupe "Administration".
*Changements apportés :* Les Rapports, la Configuration pédagogique, l'Équipe et les Paramètres sont visuellement regroupés sous un seul label administratif, rendant ces accès clairs pour le Directeur / Owner sans noyer l'enseignant.

## 4. Dashboard Entry Points (Domain Access)
Le Dashboard n'est plus un cul-de-sac où toutes les informations tentent de s'afficher d'un coup. Nous avons ajouté une section "Espaces de travail" juste sous la Next Best Action. 
Ces cartes agissent comme des raccourcis massifs vers les 5 grands domaines métiers (Élèves, Présences, Notes, Finance, Documents) et respectent strictement les permissions du `Contextual OS`.

## 5. Role Awareness & Contextual OS
- **Permissions Intactes** : Les enseignants ne voient toujours pas la carte Finance ni l'entrée Finance de la sidebar, car `hasAccess` de la fonction `visibleSections` n'a pas été modifiée, uniquement le nommage et le regroupement.
- **Mobile Navigation** : Comme la navigation mobile utilise les mêmes données (`visibleItems`), le nettoyage de la sidebar s'est automatiquement propagé au tiroir mobile.

## 6. L'Audit des Fonctionnalités (Feature Inventory)
Aucune fonctionnalité n'a été supprimée. Le tableau suivant prouve l'accessibilité de 100% du périmètre fonctionnel :

| Feature | Existing Route | New Domain | New Entry Point | Status |
|---|---|---|---|---|
| **Annuaire** | `/dashboard/directory` | Élèves & dossiers | Hub `directory` (Onglets) | ACCESSIBLE |
| **Dossiers élèves** | `/dashboard/students/[id]` | Élèves & dossiers | Clic sur un élève dans `directory` | ACCESSIBLE |
| **Importer élèves** | `/dashboard/students/import` | Élèves & dossiers | Bouton "Importer" dans `directory` | ACCESSIBLE |
| **Exporter élèves** | `/dashboard/students/export` | Élèves & dossiers | Bouton "Exporter" dans `directory` | ACCESSIBLE |
| **Documents administratifs** | `/dashboard/documents/*` | Documents | Liste dans le Hub `documents` | ACCESSIBLE |
| **Centre documentaire** | `/dashboard/documents/centre` | Documents | Encart dédié dans le Hub `documents` | ACCESSIBLE |
| **Prendre les présences** | `/dashboard/attendance/take` | Présences | Bouton dans le Hub `attendance` | ACCESSIBLE |
| **Suivi des présences** | `/dashboard/attendance` | Présences | Hub `attendance` | ACCESSIBLE |
| **Notes (Saisie)** | `/dashboard/grades` | Notes & bulletins | Hub `grades` (Contrôle/Compo) | ACCESSIBLE |
| **Évaluations (Planning)** | `/dashboard/grades` | Notes & bulletins | Hub `grades` (Planning affiché) | ACCESSIBLE |
| **Bulletins** | `/dashboard/documents/report-card` | Notes & bulletins | Bouton "Bulletins" dans Hub `grades` | ACCESSIBLE |
| **Paiements (Suivi)** | `/dashboard/payments` | Finance | Hub `payments` | ACCESSIBLE |
| **Impayés (Relances)** | `/dashboard/payments` | Finance | Hub `payments` (Carte À Relancer) | ACCESSIBLE |
| **Rapports financiers** | `/dashboard/payments/statement` | Finance | Hub `payments` (Bouton État financier) | ACCESSIBLE |
| **Communications (Messages)** | `/dashboard/communications/inbox` | Communications | Hub `communications` | ACCESSIBLE |
| **Sondages** | `/dashboard/communications/surveys` | Communications | Hub `communications` | ACCESSIBLE |
| **Équipe** | `/dashboard/team` | Administration | Nouveau Hub `/dashboard/admin` | ACCESSIBLE |
| **Config. Pédagogique** | `/dashboard/settings/pedagogie` | Administration | Nouveau Hub `/dashboard/admin` | ACCESSIBLE |
| **Paramètres** | `/dashboard/settings` | Administration | Nouveau Hub `/dashboard/admin` | ACCESSIBLE |
| **Rapports Globaux** | `/dashboard/reports` | Administration | Nouveau Hub `/dashboard/admin` | ACCESSIBLE |
| **Config. Financière** | `/dashboard/settings/fees` | Administration | Nouveau Hub `/dashboard/admin` | ACCESSIBLE |
| **Config. Documents** | `/dashboard/settings/documents` | Administration | Nouveau Hub `/dashboard/admin` | ACCESSIBLE |

## 7. Routes Conservées
Absolument toutes les routes existantes ont été conservées (`/dashboard/students/import`, `/dashboard/students/export`, `/dashboard/documents/centre`, etc.). Seules les références dans les menus et les hubs ont évolué.
