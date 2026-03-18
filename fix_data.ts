import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Link Invoice 002 to Project 'ejemplo'
  const project = await prisma.project.findFirst({ where: { name: 'ejemplo' } });
  if (project) {
    const updated = await prisma.invoice.update({
      where: { number: '002' },
      data: { projectId: project.id }
    });
    console.log(`Updated Invoice 002: Linked to project ${project.name}`);
  } else {
    console.log('Project "ejemplo" not found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
