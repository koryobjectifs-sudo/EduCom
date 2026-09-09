import { redirect } from "next/navigation";

export default function PendingStudentsPage() {
  redirect("/dashboard/students/dossiers/review");
}
