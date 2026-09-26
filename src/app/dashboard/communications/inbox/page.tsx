import { redirect } from "next/navigation";

/** Ancienne boîte WhatsApp archivée (voir `communication-archive.md`) → Discussions. */
export default function AncienneBoite() {
  redirect("/dashboard/communications/communaute");
}
