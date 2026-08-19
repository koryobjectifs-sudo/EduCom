import Link from "next/link";
import { UserPlus, FileText, School } from "lucide-react";

/**
 * Premiers pas — le pont entre l'installation et la première valeur.
 *
 * ═══ IL N'APPARAÎT QUE SUR UNE ABSENCE RÉELLE ═══
 *
 * ⚠️ Ce panneau ne se pilote par aucun drapeau « onboarding vu », aucune date,
 * aucun compteur de visites. Il s'affiche **tant que l'établissement n'a aucun
 * élève** — une absence vraie, lue en base — et disparaît de lui-même dès qu'il
 * y en a un. Un état stocké aurait pu mentir : celui-ci ne le peut pas.
 *
 * ═══ UNE SEULE ACTION SUIVANTE ═══
 *
 * §9 : pas dix propositions. Un tableau de bord vide n'a qu'une chose à dire à
 * une directrice qui vient d'installer son école, et c'est ce qu'elle vient
 * faire ici : inscrire un élève. Le reste attend.
 *
 * ⚠️ Les chiffres cités (classes) viennent de requêtes réelles, passées en
 * props. Aucun exemple, aucun élève fictif, aucune statistique inventée.
 */
export function PremiersPas({
  schoolName,
  classesCount,
  canAddStudent,
}: {
  schoolName: string;
  classesCount: number;
  canAddStudent: boolean;
}) {
  return (
    <section
      aria-labelledby="premiers-pas"
      className="rounded-surface border border-rule bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id="premiers-pas" className="text-role-section font-semibold tracking-tight text-text">
        {schoolName} est prête. Il manque vos élèves.
      </h2>

      <p className="mt-2 max-w-2xl text-role-body leading-relaxed text-text-soft">
        {classesCount > 0
          ? `Vos ${classesCount} classes existent déjà. Dès qu'un élève y est inscrit, EduCom peut produire ses documents officiels.`
          : "Créez une classe, puis inscrivez un élève : EduCom pourra alors produire ses documents officiels."}
      </p>

      {/* Ce que débloque l'action, dit avant de la demander. */}
      <ul className="mt-4 space-y-2">
        <li className="flex items-start gap-2.5 text-role-body text-text-soft">
          <School aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
          {classesCount > 0
            ? `${classesCount} classe${classesCount > 1 ? "s" : ""} créée${classesCount > 1 ? "s" : ""} à l'installation`
            : "Aucune classe pour l'instant"}
        </li>
        <li className="flex items-start gap-2.5 text-role-body text-text-soft">
          <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
          Certificat de scolarité, bulletin, facture et reçu : disponibles dès le premier élève
        </li>
      </ul>

      {canAddStudent ? (
        <Link
          href="/dashboard/students/new"
          className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-6 text-role-body font-semibold text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          Inscrire le premier élève
        </Link>
      ) : (
        /* Aucun bouton mort : un rôle sans droit d'admission lit pourquoi. */
        <p className="mt-5 text-role-meta leading-relaxed text-text-soft">
          L&apos;inscription des élèves relève de la direction ou du secrétariat.
        </p>
      )}
    </section>
  );
}

export default PremiersPas;
