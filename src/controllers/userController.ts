import { PrismaClient, UserPreferences } from "@prisma/client";

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

export async function getUserPreferences(userId: number) {
  return await db.userPreferences.findUnique({
    where: { user_id: userId },
  });
}

export async function updateUserPreferences(
  userId: number,
  preferences: Partial<UserPreferences>
) {
  return await db.userPreferences.upsert({
    where: { user_id: userId },
    update: preferences,
    create: {
      user_id: userId,
      ...preferences,
    },
  });
}
