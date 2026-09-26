import { redirect } from "next/navigation";

/** 26 sept. 2026 : les messages vivent dans la Communauté (une seule page). */
export default async function MessagesFamillePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  redirect(c ? `/famille/communaute?c=${encodeURIComponent(c)}` : "/famille/communaute");
}
