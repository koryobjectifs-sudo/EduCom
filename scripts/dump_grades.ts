import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const grades = await prisma.grade.findMany({
    include: {
      term: true,
      evaluation: true
    }
  });
  console.log("ALL GRADES:", grades.map(g => ({
    value: g.value,
    term: g.term.name,
    eval: g.evaluation?.name
  })));

  const evals = await prisma.evaluation.findMany({
    include: { term: true }
  });
  console.log("ALL EVALS:", evals.map(e => ({
    name: e.name,
    term: e.term.name,
    type: e.type
  })));
}

main().catch(console.error);
