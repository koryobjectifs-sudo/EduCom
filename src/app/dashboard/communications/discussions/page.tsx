import { redirect } from "next/navigation";

/** 26 sept. 2026 : les discussions vivent dans la Communauté (une seule page façon Slack). */
export default async function DiscussionsPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  redirect(c ? `/dashboard/communications/communaute?c=${encodeURIComponent(c)}` : "/dashboard/communications/communaute");
}
