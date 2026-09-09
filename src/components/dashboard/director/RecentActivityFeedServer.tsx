import { getRecentActivityFeedData } from "@/lib/dashboard-director";
import RecentActivityFeed from "./RecentActivityFeed";

interface RecentActivityFeedServerProps {
  schoolId: string;
  scopeMoney: boolean;
}

export default async function RecentActivityFeedServer({ schoolId, scopeMoney }: RecentActivityFeedServerProps) {
  const activity = await getRecentActivityFeedData(schoolId, scopeMoney);
  return <RecentActivityFeed activity={activity} />;
}
