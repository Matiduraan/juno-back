import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function getUserDetails(userId: number) {
  return await db.user.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      email: true,
      user_role: true,
      google_id: true,
      verified: true,
    },
  });
}
