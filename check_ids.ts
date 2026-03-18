import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log('--- ALL INVOICES ---');
  invoices.forEach(inv => {
    console.log(`INV: ${inv.number}, CID: ${inv.clientId}, PID: ${inv.projectId || 'NONE'}`);
  });

  const clients = await prisma.client.findMany({
    take: 10
  });

  console.log('\n--- ALL CLIENTS ---');
  clients.forEach(c => {
    console.log(`Name: "${c.name}", ID: ${c.id}`);
  });

  const projects = await prisma.project.findMany({
    take: 10
  });

  console.log('\n--- ALL PROJECTS ---');
  projects.forEach(p => {
    console.log(`Name: "${p.name}", ID: ${p.id}, CID: ${p.clientId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
