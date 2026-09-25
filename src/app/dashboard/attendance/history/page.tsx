import { redirect } from "next/navigation";

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const p = new URLSearchParams();
  p.set("tab", "history");
  for (const [k, v] of Object.entries(sp)) {
    if (k !== "tab" && typeof v === "string") p.set(k, v);
  }
  redirect(`/dashboard/attendance?${p.toString()}`);
}
