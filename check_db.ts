import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: {
      client: true,
      project: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('--- RECENT INVOICES ---');
  invoices.forEach(inv => {
    console.log(`ID: ${inv.id}, Number: ${inv.number}, Client: ${inv.client?.name}, Project: ${inv.project?.name || 'NONE'}`);
  });

  const projects = await prisma.project.findMany({
    include: {
      invoices: true
    }
  });

  console.log('\n--- PROJECTS AND THEIR INVOICES ---');
  projects.forEach(p => {
    console.log(`Project: ${p.name}, ClientID: ${p.clientId}, Invoices: ${p.invoices.length}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
