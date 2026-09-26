import { redirect } from "next/navigation";

/** Anciennes campagnes WhatsApp archivées (voir `communication-archive.md`) → Communauté. */
export default function AnciennesCampagnes() {
  redirect("/dashboard/communications/communaute");
}
