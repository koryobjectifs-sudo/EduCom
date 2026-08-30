import { prisma } from '../src/lib/prisma';

async function run() {
  const user = await prisma.user.findFirst({ where: { email: "koryobjectifs@gmail.com" } });
  if (!user) return;
  const parent = await prisma.user.findFirst({ where: { role: "PARENT", schoolId: user.schoolId } });
  console.log("Parent phone:", parent?.phone);
}
run();
