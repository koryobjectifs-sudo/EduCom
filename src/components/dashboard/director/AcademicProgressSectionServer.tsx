import { getAcademicDashboardData } from "@/lib/dashboard-director";
import AcademicProgressSection from "./AcademicProgressSection";

interface AcademicProgressSectionServerProps {
  schoolId: string;
}

export default async function AcademicProgressSectionServer({ schoolId }: AcademicProgressSectionServerProps) {
  const academic = await getAcademicDashboardData(schoolId);
  return <AcademicProgressSection academic={academic} />;
}
