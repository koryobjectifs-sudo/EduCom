import { prisma } from "@/lib/prisma";

export interface ResolvedParent {
  parentId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

/**
 * Tries to identify a parent from an incoming WhatsApp number.
 * 
 * Rules:
 * 1. Matches the number in the `User` table where role = PARENT.
 * 2. If multiple parents match, or no parent matches, returns null.
 *    (Ambiguous numbers require human resolution).
 * 3. Returns the parent's context (schoolId, and their enrolled students).
 */
export async function resolveParentFromWhatsApp(waNumber: string, schoolId?: string): Promise<ResolvedParent | null> {
  // Normalize the incoming number (Meta provides it without '+' usually, e.g. "221771234567")
  // You may need to adjust normalization based on how numbers are stored in DB.
  // We assume the DB stores it with or without '+', so we search both.
  const withPlus = waNumber.startsWith("+") ? waNumber : `+${waNumber}`;
  const withoutPlus = waNumber.startsWith("+") ? waNumber.substring(1) : waNumber;

  const parents = await prisma.user.findMany({
    where: {
      role: "PARENT",
      ...(schoolId ? { schoolId } : {}),
      OR: [
        { phone: waNumber },
        { phone: withPlus },
        { phone: withoutPlus }
      ]
    },
    include: {
      students: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    }
  });

  // If 0 or >1 matches, it's ambiguous or unknown. Return null.
  if (parents.length !== 1) {
    return null;
  }

  const parent = parents[0];

  return {
    parentId: parent.id,
    schoolId: parent.schoolId,
    firstName: parent.firstName,
    lastName: parent.lastName,
    students: parent.students,
  };
}
