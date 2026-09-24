# EduCom SaaS — Matrice Officielle des Rôles & Checklist des Droits

> **Document de Référence d'Autorisation et Périmètre Métier**  
> *Dernière mise à jour : 23 septembre 2026*

---

## 1. Principes Cardinaux d'Autorisation

1. **Séparation Stricte Écriture / Délibération / Impression** :
   - **Notes des élèves** : Seul l'**Enseignant affecté** (`TEACHER`) a le droit de saisir et modifier les notes d'une matière ou de sa classe élémentaire. Ni la direction (`OWNER`, `ADMIN`), ni le secrétariat (`SECRETARY`) ne peuvent éditer une note.
   - **Conseil de classe** : Réservé à la **Direction** (`OWNER`, `ADMIN`). Attribution des distinctions, sanctions et décisions d'orientation. Les absences y sont **consolidées automatiquement** depuis les listes d'appel et ne peuvent être falsifiées manuellement.
   - **Validation & Impression des Bulletins** : Effectuée par le **Secrétariat** (`SECRETARY`) et la **Direction**, dès que l'enseignant a soumis sa saisie.
2. **Cloisonnement Enseignant** :
   - Un enseignant ne voit **que ses classes** et ne saisit **que ses matières affectées**.
   - Un enseignant ne peut en aucun cas déclencher d'envois WhatsApp/SMS externes aux parents.
3. **Périmètre Parents (Espace Famille)** :
   - Un parent ne voit **que ses propres enfants** (bulletins approuvés, reçus, état des paiements). Il a zéro droit d'écriture sur le registre scolaire.

---

## 2. Tableau Synthétique des Droits par Espace

| Espace Métier | Fonctionnalité | OWNER | ADMIN | SECRETARY | TEACHER | ACCOUNTANT | PARENT |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Scolarité** | Liste globale des élèves | ✅ | ✅ | ✅ | ❌ (ses élèves) | ❌ | ❌ |
| | Inscription / Admission | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Structure des classes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Pédagogie** | Saisie & modification des notes | ❌ *(Audit)* | ❌ *(Audit)* | ❌ *(Audit)* | ✅ *(Ses classes)* | ❌ | ❌ |
| | Soumission de la grille de notes | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| | Conseil de classe (Délibérations) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Validation finale des bulletins | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Impression des bulletins (classe/élève)| ✅ | ✅ | ✅ | ❌ | ❌ | ✅ *(Ses enfants)* |
| | Appel & registre des présences | ✅ | ✅ | ✅ | ✅ *(Sa classe)* | ❌ | ❌ |
| | Suivi élèves en difficulté | ✅ | ✅ | ✅ | ✅ *(Ses élèves)* | ❌ | ❌ |
| | Configuration des matières/coefs | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Finance** | Facturation scolaire & échéanciers | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Enregistrement des paiements & reçus | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Relances d'impayés & WhatsApp | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Dépenses & Bilan financier | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Communication** | Messagerie interne établissement | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Campagnes SMS / WhatsApp parents | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Documents** | Certificats de scolarité & attestations | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Modèles officiels & archivage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Administration**| Cachet, logo, signature école | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Gestion de l'équipe (comptes, rôles) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Clôture de l'année scolaire | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Checklist par Rôle

### 👑 1. OWNER (Propriétaire / Fondateur)
- [x] Accès illimité à tous les écrans et données de l'établissement (`*`).
- [x] Gestion des paramètres légaux, cachet officiel, logo et signature directrice.
- [x] Présidence et arbitrage des Conseils de classe.
- [x] Consultation de toutes les grilles de notes en mode audit/supervision (sans modification directe des notes).
- [x] Supervision financière complète (chiffre d'affaires, trésorerie, impayés).
- [x] Recrutement et gestion des membres d'équipe (Secrétaires, Comptables, Enseignants).

---

### 🏛️ 2. ADMIN (Directeur / Adjoint / Censeur)
- [x] Pilotage quotidien de l'établissement (Scolarité, Pédagogie, Communication).
- [x] Gestion des admissions et des effectifs de classes.
- [x] Animation et tenue des Conseils de classe (distinctions, sanctions, orientation).
- [x] Consultation de toutes les grilles de notes en mode lecture seule (vérification des moyennes).
- [x] Validation finale des bulletins de notes avant diffusion.
- [x] Notification des absences signalées aux familles.
- [ ] *Interdiction : Ne peut pas modifier le logo/cachet de l'école (réservé OWNER).*
- [ ] *Interdiction : Ne peut pas modifier directement les notes saisies par les enseignants.*

---

### 📋 3. SECRETARY (Secrétariat Général)
- [x] Gestion administrative des dossiers élèves et pièces justificatives.
- [x] Gestion des inscriptions et réinscriptions annuelles.
- [x] Accès complet à l'espace Pédagogie :
  - Consultation des notes en lecture seule.
  - Suivi des validations des bulletins.
  - Impression en masse ou unitaire des bulletins officiels.
- [x] Suivi du registre d'appel et envoi des notifications WhatsApp d'absences aux parents.
- [x] Génération et impression des certificats de scolarité et documents administratifs.
- [x] Tenue du calendrier des évaluations et affectations pédagogiques (`/dashboard/settings/pedagogie`).
- [ ] *Interdiction : Ne peut pas délibérer en conseil de classe ni modifier les sanctions.*
- [ ] *Interdiction : Ne peut pas encaisser de paiements ni créer de factures (réservé Comptable).*
- [ ] *Interdiction : Ne peut pas modifier les notes des élèves.*

---

### 🧑‍🏫 4. TEACHER (Enseignant / Maître Titulaire / Professeur Principal)
- [x] Vue restreinte **exclusivement** à ses classes et matières attribuées.
- [x] **Pouvoir exclusif de saisie** : Seul acteur habilité à saisir et corriger les notes de devoirs, compositions et appréciations pédagogiques de sa matière.
- [x] Bouton **« Soumettre la saisie »** pour verrouiller sa grille et la transmettre au secrétariat et à la direction.
- [x] Appel quotidien de présence pour sa classe (ou son heure de cours) :
  - Marque les élèves Présents, Absents, En retard, ou Excusés.
  - Ces données alimentent **automatiquement** le compteur officiel d'absences du bulletin et du conseil de classe.
- [x] Suivi pédagogique de ses élèves en difficulté.
- [ ] *Interdiction : Ne voit pas les classes des autres collègues.*
- [ ] *Interdiction : Ne peut pas envoyer de messages WhatsApp directs aux parents.*
- [ ] *Interdiction : Ne peut pas modifier les notes d'autres matières.*

---

### 💳 5. ACCOUNTANT (Comptable / Gestionnaire Financier)
- [x] Accès dédié et prioritaire à l'espace **Finance** (`/dashboard/payments`).
- [x] Enregistrement des règlements (Espèces, Wave, Orange Money, Virement, Chèque).
- [x] Génération instantanée des reçus de paiement officiels.
- [x] Planification et suivi des échéanciers de scolarité par famille.
- [x] Envoi des relances de paiement par WhatsApp / SMS / Email.
- [x] Enregistrement des dépenses de fonctionnement et suivi du journal de caisse.
- [ ] *Interdiction : Zéro accès aux notes, appréciations et bulletins d'élèves.*
- [ ] *Interdiction : Ne peut pas modifier la structure des classes ni les dossiers élèves.*

---

### 👨‍👩‍👧 6. PARENT (Parent d'élève / Tuteur)
- [x] Accès sécurisé à son **Espace Famille** dédié (`/famille`).
- [x] Consultation des bulletins de notes **approuvés** de ses enfants.
- [x] Suivi en temps réel des absences et retards signalés.
- [x] Consultation du solde financier, des échéances à venir et téléchargement des reçus.
- [ ] *Interdiction : Zéro accès aux données d'autres familles.*
- [ ] *Interdiction : Zéro droit d'écriture sur les dossiers, présences ou notes.*
- [ ] *Interdiction : Ne voit aucun brouillon de note avant validation officielle.*
