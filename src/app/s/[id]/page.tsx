import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientSurvey from "./ClientSurvey";

export default async function PublicSurveyPage({ params }: { params: { id: string } }) {
  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: {
      school: true
    }
  });

  if (!survey || !survey.isActive) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-900 px-8 py-10 text-center text-white">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-900 font-black text-3xl mb-4">
            E
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{survey.title}</h1>
          {survey.description && (
            <p className="mt-2 text-blue-100">{survey.description}</p>
          )}
          <p className="mt-6 text-xs text-blue-300 font-medium uppercase tracking-widest">
            {survey.school.name}
          </p>
        </div>

        <div className="p-8">
          <ClientSurvey survey={survey} />
        </div>
      </div>
    </div>
  );
}
