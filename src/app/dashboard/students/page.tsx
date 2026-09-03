import { PageHeader } from "@/components/ui/PageHeader";
import DirectoryClient from "../directory/DirectoryClient";
import { loadDirectory, resumeAnnuaire } from "../directory/data";

/**
 * Élèves & dossiers — **l'annuaire directement**.
 *
 * ═══ CE QUI A CHANGÉ, ET POURQUOI ═══
 *
 * Cet écran était un MENU de quatre cartes — Annuaire, Dossiers élèves,
 * Importer, Exporter — sur une page vide aux trois quarts. La rubrique la plus
 * consultée du produit n'affichait donc aucun élève et imposait un clic de
 * détour sur le chemin le plus fréquent du secrétariat.
 *
 * Le parcours est maintenant : **Élèves & dossiers → Annuaire**, et les trois
 * vues — Élèves, Classes, **Dossiers élèves** — sont DANS l'annuaire. Le menu
 * ne séparait pas des destinations différentes : il séparait trois angles sur
 * le même sujet.
 *
 * ⚠️ Le `<h1>` dit « Annuaire », pas « Élèves & dossiers ». Le fil d'Ariane
 * porte la rubrique (`Accueil › Élèves & dossiers › Annuaire`) : l'utilisateur
 * doit voir où il a atterri, et le titre de la rubrique est déjà surligné dans
 * la barre latérale. Répéter « Élèves & dossiers » en `<h1>` laissait croire
 * qu'on était resté sur un menu.
 *
 * ⚠️ **Rien n'est devenu inatteignable.** « Dossiers élèves » est un onglet de
 * l'annuaire ; Importer et Exporter sont dans la barre d'outils de l'annuaire,
 * où ils vivaient déjà. Les routes `/dashboard/directory`,
 * `/dashboard/students/dossiers`, `/dashboard/students/import` et
 * `/dashboard/students/export` **existent et fonctionnent toujours** : aucun
 * lien, favori ou raccourci existant ne casse.
 *
 * ⚠️ **Aucune requête n'est écrite ici.** `loadDirectory()` est le chargement de
 * l'annuaire, partagé avec `/dashboard/directory`, portée par rôle comprise.
 */
export default async function StudentsPage() {
  const d = await loadDirectory();

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        breadcrumb={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Élèves & dossiers" },
          { label: "Annuaire" },
        ]}
        title="Annuaire"
        description={resumeAnnuaire(d)}
      />

      <DirectoryClient
        studentsData={d.studentsData}
        classesData={d.classes}
        teachersData={d.teachers}
      />
    </div>
  );
}
