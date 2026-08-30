import { requireSchoolContext } from "@/lib/documentContext";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAttendanceForClass } from "../actions";
import { TakeAttendanceClient } from "./TakeAttendanceClient";

export default async function TakeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const { schoolId } = await requireSchoolContext();
  const sp = await searchParams;
  
  if (!sp.classId) {
    redirect("/dashboard/attendance");
  }

  const classId = sp.classId;
  const targetClass = await prisma.class.findFirst({
    where: { id: classId, schoolId }
  });

  if (!targetClass) {
    redirect("/dashboard/attendance");
  }

  const date = sp.date ? new Date(sp.date) : new Date();
  
  const data = await getAttendanceForClass(classId, date);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-text">Saisie des présences</h1>
        <p className="mt-1 text-[13px] text-text-soft">
          Classe : <span className="font-semibold text-text">{targetClass.name}</span> — {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <TakeAttendanceClient 
        classId={classId} 
        className={targetClass.name}
        date={date.toISOString()}
        initialData={data} 
      />
    </div>
  );
}
