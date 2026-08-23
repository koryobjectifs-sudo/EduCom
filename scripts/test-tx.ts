import { prisma } from '../src/lib/prisma';
import crypto from 'crypto';

async function test() {
  const userId = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      const existant = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, schoolId: true },
      })
      if (existant?.schoolId) return

      const school = await tx.school.create({ data: { name: 'SENG.CO ACADEMY', email: 'koryobjectifs@gmail.com' } })
      await tx.user.create({
        data: {
          id: userId,
          email: 'koryobjectifs@gmail.com',
          firstName: 'JM',
          lastName: 'KORY',
          role: 'ADMIN',
          schoolId: school.id,
        },
      })
    })
    console.log("SUCCESS");
  } catch(e) {
    console.error("FAILED", e);
  }
}
test();
