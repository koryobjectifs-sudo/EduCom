import Link from "next/link";
import { PartyPopper, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import { currentAcademicYear } from "@/lib/studentFile";
import CertificateGenerator from "./Generator";

/**
 * Certificat de scolarité — et **première valeur** du produit (chantier PLG).
 *
 * ═══ POURQUOI CET ÉCRAN EST LA PREMIÈRE VALEUR ═══
 *
 * C'est le document qu'une école sénégalaise produit le plus souvent — banque,
 * bourse, ambassade, mutuelle — et le seul qui n'exige **rien d'autre qu'un
 * élève inscrit** : ni matières, ni notes, ni période, ni grille tarifaire.
 * Après l'inscription du premier élève, `createStudent()` mène ici directement.
 *
 * ⚠️ Le bandeau n'apparaît QUE sur ce trajet (`premier=1`) et n'invente rien :
 * le nom affiché est celui de l'élève réellement créé. Aucun contenu d'exemple.
 */
export default async function CertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; premier?: string }>;
}) {
  const { studentId, premier } = await searchParams;
  const { schoolId, school } = await requireSchoolContext();

  const students = await prisma.student.findMany({
    where: { schoolId },
    include: { enrollments: { include: { class: true } } },
    orderBy: { lastName: "asc" },
  });

  // Borné à l'école : un `studentId` venu de l'URL ne prouve rien.
  const premierEleve =
    premier === "1" && studentId ? students.find((s) => s.id === studentId) ?? null : null;

  return (
    <div className="space-y-5">
      {premierEleve && (
        <section className="rounded-surface border border-rule bg-surface p-5 shadow-card">
          <p className="flex items-center gap-2 text-role-card font-semibold text-text">
            <PartyPopper aria-hidden="true" className="h-5 w-5 text-success" />
            {premierEleve.firstName} {premierEleve.lastName} est inscrit
            {premierEleve.enrollments[0]?.class?.name ? ` en ${premierEleve.enrollments[0].class.name}` : ""}.
          </p>
          <p className="mt-2 max-w-2xl text-role-body leading-relaxed text-text-soft">
            Son certificat de scolarité est ci-dessous, à l&apos;en-tête de{" "}
            <span className="font-medium text-text">{school?.name}</span> — prêt à imprimer.
            C&apos;est le document que réclament les banques, les bourses et les ambassades ;
            vous n&apos;avez plus à le rédiger à la main.
          </p>
          <p className="mt-3 text-role-meta text-text-soft">
            <Link href="/dashboard/students/new" className="font-medium text-primary underline-offset-2 hover:underline">
              Inscrire un autre élève
            </Link>
            <span aria-hidden="true" className="mx-2 text-text-faint">·</span>
            <Link href="/dashboard" className="font-medium text-primary underline-offset-2 hover:underline">
              Aller au tableau de bord <ArrowRight aria-hidden="true" className="inline h-3.5 w-3.5" />
            </Link>
          </p>
        </section>
      )}

      <CertificateGenerator
        students={students}
        school={school}
        initialStudentId={studentId ?? null}
        academicYear={currentAcademicYear()}
      />
    </div>
  );
}
