import { db } from '@/lib/db';

export async function getOrCreateDefaultUser() {
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        email: 'admin@dimaz.es',
        name: 'Admin',
        role: 'ADMIN',
      },
    });
  }

  return user;
}
