import { redirect } from "next/navigation";

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    redirect("/invite");
  }
  redirect(`/invite?token=${encodeURIComponent(token)}`);
}
