import { getAcademicDashboardData } from "@/lib/dashboard-director";
import AcademicProgressSection from "./AcademicProgressSection";

interface AcademicProgressSectionServerProps {
  schoolId: string;
  className?: string;
}

export default async function AcademicProgressSectionServer({
  schoolId,
  className = "h-full flex-1",
}: AcademicProgressSectionServerProps) {
  const academic = await getAcademicDashboardData(schoolId);
  return <AcademicProgressSection academic={academic} className={className} />;
}
