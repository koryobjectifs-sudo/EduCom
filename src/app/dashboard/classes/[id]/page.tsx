import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Edit, Users, BookOpen, GraduationCap, Calendar, User } from "lucide-react";
import AssignmentsPanel from "./AssignmentsPanel";
import { StatusBadge } from "@/components/ui/Badge";

export default async function ClassProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return null;

  const classData = await prisma.class.findUnique({
    where: { id, schoolId: dbUser.schoolId },
    include: {
      teacher: true,
      enrollments: {
        include: {
          student: true
        }
      }
    }
  });

  if (!classData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-text-primary">Classe introuvable</h2>
        <Link href="/dashboard/classes" className="text-primary hover:underline mt-4 inline-block">Retour aux classes</Link>
      </div>
    );
  }

  // Get current academic year logic (simple fallback for now)
  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  // Affectations : qui saisit quoi dans cette classe.
  const [assignments, teachers, classSubjects] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: { classId: id, schoolId: dbUser.schoolId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { schoolId: dbUser.schoolId, role: "TEACHER" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.classSubject.findMany({
      where: { classId: id },
      include: { subject: { select: { id: true, name: true } } },
    }),
  ]);

  const canEditAssignments = ["OWNER", "ADMIN", "SECRETARY"].includes(dbUser.role);

  return (
    <div className="space-y-6 max-w-7xl pb-12 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Banner / Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-hover text-white shadow-xl">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
        
        <div className="relative p-8 sm:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard/classes"
              className="rounded-2xl p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all hover:scale-105 shadow-sm"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">
                  Classe
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {academicYear}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight">
                {classData.name}
              </h1>
            </div>
          </div>
          
          <Link 
            href={`/dashboard/classes/${classData.id}/edit`}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-primary bg-white rounded-2xl hover:bg-gray-50 transition-all hover:scale-105 hover:shadow-lg"
          >
            <Edit className="h-4 w-4" /> Configurer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Info Widgets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Professeur Widget */}
          <div className="rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <User className="w-24 h-24 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Professeur Principal</h3>
              </div>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {classData.teacher ? `${classData.teacher.firstName} ${classData.teacher.lastName}` : "Non assigné"}
              </p>
              {classData.teacher && (
                <p className="text-sm text-text-muted mt-1">Responsable pédagogique</p>
              )}
            </div>
          </div>

          <AssignmentsPanel
            classId={id}
            assignments={assignments}
            teachers={teachers}
            subjects={classSubjects.map((cs) => cs.subject)}
            canEdit={canEditAssignments}
          />

          {/* Effectif Widget */}
          <div className="rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg p-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-24 h-24 text-[#ca8a04]" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-[#fefce8] flex items-center justify-center text-[#ca8a04]">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Effectif</h3>
              </div>
              <p className="text-3xl font-extrabold text-text-primary mt-2 flex items-baseline gap-2">
                {classData.enrollments.length} <span className="text-lg font-medium text-text-muted">élèves</span>
              </p>
              <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#ca8a04] to-[#facc15] rounded-full" 
                  style={{ width: `${Math.min((classData.enrollments.length / 30) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-text-muted mt-2 text-right">Capacité typique: ~30</p>
            </div>
          </div>
        </div>

        {/* Right Column: Students List */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg overflow-hidden h-full flex flex-col">
            <div className="border-b border-white/20 px-6 py-5 flex justify-between items-center bg-white/40">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" /> Liste des Élèves
              </h3>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                {classData.enrollments.length} Total
              </span>
            </div>
            
            <div className="p-0 flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-border/30">
                <thead className="bg-white/40 backdrop-blur-sm sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                      Élève
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="relative px-6 py-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-white/20">
                  {classData.enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center">
                        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-10 w-10 text-text-muted/50" />
                        </div>
                        <h4 className="text-lg font-bold text-text-primary">Classe vide</h4>
                        <p className="text-sm text-text-secondary mt-1">Aucun élève n'est encore inscrit dans cette classe.</p>
                      </td>
                    </tr>
                  ) : (
                    classData.enrollments.map((enr) => (
                      <tr key={enr.id} className="hover:bg-white/60 transition-colors group cursor-default">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm shadow-sm">
                              {enr.student.firstName[0]}{enr.student.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                                {enr.student.firstName} {enr.student.lastName}
                              </p>
                              <p className="text-xs text-text-muted">
                                {enr.academicYear}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge domain="student" status={enr.student.status} dot />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            href={`/dashboard/students/${enr.studentId}`} 
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white text-primary border border-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                          >
                            Voir le profil
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
