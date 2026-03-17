import { db } from "@/lib/db";
import NewProjectForm from "@/app/projects/new/NewProjectForm";

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const clients = await db.client.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <NewProjectForm clients={clients as any} />
    </div>
  );
}
