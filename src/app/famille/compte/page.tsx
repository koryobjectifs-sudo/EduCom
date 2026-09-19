import { requireFamilyContext } from "@/lib/familyContext";
import { prisma } from "@/lib/prisma";
import ParentAccountView from "@/app/dashboard/settings/ParentAccountView";

export const metadata = {
  title: "Mon Compte | Espace Famille EduCom",
  description: "Gérez votre compte parent et vos préférences",
};

export default async function FamilyAccountPage() {
  const { user, school, schoolId } = await requireFamilyContext();

  const childrenCount = await prisma.student.count({
    where: { schoolId, parentId: user.id },
  });

  return (
    <ParentAccountView
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      }}
      school={{
        name: school.name,
        phone: school.phone,
        email: school.email,
        address: school.address,
      }}
      childrenCount={childrenCount}
    />
  );
}
