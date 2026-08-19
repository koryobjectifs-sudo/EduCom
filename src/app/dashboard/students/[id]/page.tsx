import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, GraduationCap, Calendar, User as UserIcon, Activity, HeartPulse, FileText, ReceiptText, FileBadge, FolderOpen } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { canSeeHealthData, studentWhereFor } from "@/lib/studentScope";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.schoolId) return null;

  // ⚠️ Lot 13.1 — cet écran n'était borné que par l'école. Il porte le groupe
  // sanguin, les notes médicales et le lien vers le dossier : la borne de rôle
  // manquait, exactement comme sur le dossier lui-même (audit du lot 13).
  const actor = { userId: dbUser.id, schoolId: dbUser.schoolId, role: dbUser.role };
  const scope = await studentWhereFor(actor);
  const health = canSeeHealthData(actor);

  const student = await prisma.student.findFirst({
    where: { AND: [scope, { id, schoolId: dbUser.schoolId }] },
    include: {
      parent: true,
      enrollments: {
        include: {
          class: true,
        },
        orderBy: { academicYear: "desc" },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 3
      }
    },
  });

  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Élève introuvable</h2>
        <Link href="/dashboard/students" className="text-blue-900 hover:underline mt-4 inline-block">Retour à l'annuaire</Link>
      </div>
    );
  }

  const currentEnrollment = student.enrollments[0];

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/students"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Profil Élève
            </h1>
          </div>
        </div>
        
        {/* Quick Actions Shortcuts */}
        {/* `flex-wrap` : sur mobile les quatre raccourcis débordaient sur une
            seule ligne. Le dossier est en tête — c'est le point d'entrée du
            lot 13, et le plus utilisé au quotidien par le secrétariat. */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/students/${student.id}/dossier`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <FolderOpen className="h-4 w-4" /> Dossier
          </Link>
          <Link 
            href={`/dashboard/documents/certificate?studentId=${student.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <FileBadge className="h-4 w-4" /> Certificat
          </Link>
          <Link 
            href={`/dashboard/documents/report-card?studentId=${student.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FileText className="h-4 w-4" /> Bulletin
          </Link>
          <Link 
            href={`/dashboard/documents/invoice?studentId=${student.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <ReceiptText className="h-4 w-4" /> Facturer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Identity Card */}
        <div className="xl:col-span-1 space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="bg-blue-900 h-24"></div>
            <div className="px-6 pb-6 relative">
              <div className="h-20 w-20 rounded-full border-4 border-white bg-blue-100 flex items-center justify-center text-blue-900 font-semibold text-2xl absolute -top-10 shadow-sm">
                {student.firstName[0]}{student.lastName[0]}
              </div>
              <div className="mt-12">
                <h2 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Matricule: {student.id.split("-")[0].toUpperCase()}</p>
                
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge domain="student" status={student.status} />
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {currentEnrollment?.class?.name || "Sans classe"}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Date de naissance</p>
                    <p>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("fr-FR") : "Non renseignée"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Adresse</p>
                    <p>{student.address || "Non renseignée"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Inscription</p>
                    <p>Enregistré le {student.createdAt.toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parents / Responsable */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col">
              <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Responsable Légal</h3>
              </div>
              <div className="p-6 flex-grow">
                {student.parent ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{student.parent.firstName} {student.parent.lastName}</p>
                      <p className="text-sm font-medium text-gray-500">Parent / Tuteur</p>
                    </div>
                    <div className="space-y-3 pt-2">
                      {student.parent.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{student.parent.email}</span>
                        </div>
                      )}
                      {student.parent.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{student.parent.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <UserIcon className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">Aucun responsable légal assigné.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Medical & Emergency */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col">
              <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <HeartPulse className="h-5 w-5 text-rose-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Dossier Médical & Urgence</h3>
              </div>
              <div className="p-6 flex-grow space-y-5">
                {/* ⚠️ Le bloc médical n'est pas caché en CSS : il n'est pas rendu
                    du tout. Un `hidden` laisserait la donnée dans la source de la
                    page, donc lisible par qui n'y a pas droit. Le contact
                    d'urgence, lui, reste affiché : joindre une famille pendant un
                    incident fait partie du travail de tout le personnel. */}
                {health ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Groupe Sanguin</p>
                        <p className="text-base font-bold text-gray-900 mt-0.5">{student.bloodGroup || "Non renseigné"}</p>
                      </div>
                      {student.bloodGroup && (
                        <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center">
                          <span className="text-rose-600 font-black text-sm">{student.bloodGroup}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes Médicales (Allergies, PAI)</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        {student.medicalNotes || "Aucune note médicale ou allergie signalée."}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    Les informations médicales relèvent du secrétariat et ne sont pas affichées ici.
                  </p>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Contact en cas d'urgence
                  </p>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="font-semibold text-gray-900">{student.emergencyContact || "Non renseigné"}</span>
                    <span className="text-gray-600">{student.emergencyPhone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic History & Invoices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">Historique Scolaire</h3>
              </div>
              <div className="p-6">
                {student.enrollments.length > 0 ? (
                  <div className="space-y-4">
                    {student.enrollments.map((enr) => (
                      <div key={enr.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-gray-900">{enr.class?.name}</p>
                          <p className="text-xs text-gray-500">Année {enr.academicYear}</p>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md">Terminé</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Aucun historique d'inscription.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-900">Dernières Factures</h3>
                <Link href={`/dashboard/documents/invoice?studentId=${student.id}`} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Créer
                </Link>
              </div>
              <div className="p-6">
                {student.invoices.length > 0 ? (
                  <div className="space-y-4">
                    {student.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-gray-900">{inv.totalAmount} FCFA</p>
                          <p className="text-xs text-gray-500">{new Date(inv.dueDate).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <StatusBadge domain="invoice" status={inv.status} size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <ReceiptText className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500">Aucune facture enregistrée.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
