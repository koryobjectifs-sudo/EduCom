import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "../../new/form";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (!dbUser) return null;

  const classData = await prisma.class.findUnique({
    where: { id, schoolId: dbUser.schoolId }
  });

  if (!classData) return null;

  // Get all teachers for this school to populate the dropdown
  const teachers = await prisma.user.findMany({
    where: {
      schoolId: dbUser.schoolId,
      role: "TEACHER"
    },
    orderBy: {
      firstName: "asc"
    }
  });

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <ClassForm teachers={teachers} initialData={classData} />
    </div>
  );
}
