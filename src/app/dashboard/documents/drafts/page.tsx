import { prisma } from "@/lib/prisma";
import { requireSchoolContext } from "@/lib/documentContext";
import DraftsList from "./DraftsList";

export const metadata = {
  title: "Mes Brouillons - EduCom",
};

export default async function DraftsPage() {
  // ⚠️ Ces deux requêtes tournaient SANS filtre `schoolId` : la page chargeait
  // les élèves et les classes de TOUS les établissements pour résoudre les
  // identifiants de brouillons en noms — et les transmettait au client.
  // Quatrième fuite de ce type dans le projet, après le tableau de bord et les
  // rapports (lot 00), l'annuaire des élèves et les sondages (lot 07).
  const { schoolId } = await requireSchoolContext();

  const students = await prisma.student.findMany({
    where: { schoolId },
    include: {
      enrollments: {
        include: {
          class: true
        }
      }
    }
  });

  const classes = await prisma.class.findMany({ where: { schoolId } });

  return <DraftsList students={students} classes={classes} />;
}
