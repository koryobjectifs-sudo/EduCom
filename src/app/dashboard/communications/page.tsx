import { redirect } from "next/navigation";

/**
 * 25 sept. 2026 — « Product Change » : l'ancien centre de communication
 * (WhatsApp, campagnes) est archivé dans `src/lib/communication/legacy/`
 * (voir `communication-archive.md`). L'entrée du module est la Communauté.
 */
export default function CommunicationsPage() {
  redirect("/dashboard/communications/communaute");
}
