import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { sortClasses } from "@/lib/classOrder";
import { StudentForm } from "./form";

/**
 * Formulaire d'admission — le deuxième écran du parcours de première valeur.
 *
 * ═══ TROIS DÉFAUTS RÉELS, TROUVÉS PAR LA SONDE LE 19 AOÛT 2026 ═══
 *
 * La sonde du parcours échouait sur « l'inscription du PREMIER élève mène à son
 * certificat », avec le message serveur « Classe introuvable dans votre
 * établissement. » L'action avait raison de refuser : la faute était ici.
 *
 * ⚠️ **1. FUITE ENTRE ÉTABLISSEMENTS.** La page appelait
 * `prisma.class.findMany()` **sans aucun filtre** : la liste déroulante
 * « Classe » proposait les classes de TOUTES les écoles de la base. Une
 * directrice voyait donc les classes des autres établissements, et pouvait en
 * choisir une. Seul le contrôle de `createStudent()` empêchait l'inscription
 * d'aboutir — la barrière de dernier recours faisait tout le travail, et son
 * message d'erreur, incompréhensible pour l'utilisatrice, était le seul indice
 * du problème.
 *
 * ⚠️ **2. ÉCRITURE DANS L'ÉCOLE D'UN AUTRE.** Si aucune classe n'existait, la
 * page prenait `prisma.school.findFirst()` — une école **arbitraire**, pas
 * celle de l'utilisateur — et y créait six classes « CI … CM2 ». Ouvrir un
 * formulaire modifiait les données d'un autre locataire.
 *
 * ⚠️ **3. LES COLLÈGES ET LYCÉES NE POUVAIENT PAS INSCRIRE.** La liste était
 * ensuite filtrée sur `["CI","CP","CE1","CE2","CM1","CM2"]`. Une école ayant
 * choisi « Collège » à l'installation voyait une liste **vide**, sans
 * explication, sur l'écran qui mène à sa première valeur.
 *
 * Les trois viennent de la même cause : la page ne demandait jamais *à quelle
 * école* elle appartenait. Elle le fait maintenant, comme tous les autres
 * écrans du tableau de bord, via `requireSchoolContext()`.
 */
export default async function NewStudentPage() {
  const { schoolId } = await requireSchoolContext();

  // ⚠️ Le filtre `schoolId` n'est pas une optimisation : c'est la frontière.
  const classes = sortClasses(
    await prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, cycle: true },
    }),
  );

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* Aucune classe : on le dit, et on donne l'action qui débloque. Créer
          d'office six classes de primaire supposerait que toute école en est
          une — et écrirait dans la base sans que personne l'ait demandé. */}
      {classes.length === 0 ? (
        <div className="rounded-surface border border-rule bg-surface p-8 text-center shadow-card">
          <h1 className="text-role-page font-bold tracking-tight text-text">
            Créez d&apos;abord une classe
          </h1>
          <p className="mx-auto mt-3 max-w-md text-role-body leading-relaxed text-text-soft">
            Un élève s&apos;inscrit dans une classe : votre établissement doit en compter
            au moins une. Cela prend quelques secondes.
          </p>
          <Link
            href="/dashboard/classes/new"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-control bg-primary px-5 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Créer une classe
          </Link>
        </div>
      ) : (
        <StudentForm classes={classes} />
      )}
    </div>
  );
}
