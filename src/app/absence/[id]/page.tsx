import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AbsenceForm from "./AbsenceForm";
import Image from "next/image";

export default async function AbsencePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const attendanceId = resolvedParams.id;

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      student: true,
      school: true,
    }
  });

  if (!attendance) {
    notFound();
  }

  const dateStr = attendance.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-sunk py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          {attendance.school.logo ? (
            <div className="h-16 w-16 relative rounded-xl overflow-hidden border border-rule/50 bg-white shadow-sm mb-4">
              <Image 
                src={attendance.school.logo} 
                alt={`Logo ${attendance.school.name}`}
                fill
                className="object-contain p-2"
              />
            </div>
          ) : (
            <div className="h-16 w-16 flex items-center justify-center rounded-xl border border-rule bg-white shadow-sm mb-4 text-2xl font-bold text-primary">
              {attendance.school.name.substring(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold text-text">{attendance.school.name}</h1>
        </div>

        <div className="rounded-xl border border-rule bg-surface shadow-card overflow-hidden">
          <AbsenceForm 
            attendanceId={attendanceId} 
            studentName={`${attendance.student.firstName} ${attendance.student.lastName}`} 
            dateStr={dateStr}
          />
        </div>
      </div>
    </div>
  );
}
