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

export async function getUserPreferences(userId: number, partyId?: number) {
  return await db.userPreferences.findMany({
    where: {
      user_id: userId,
      OR: [
        {
          party_id: partyId,
        },
        {
          party_id: null,
        },
      ],
    },
  });
}

export async function updateUserPreferences(
  userId: number,
  partyId: number | null,
  preferencesName: string,
  preferenceValue: string | null
) {
  if (preferenceValue === null) {
    return db.userPreferences.deleteMany({
      where: {
        user_id: userId,
        party_id: partyId,
        preference_name: preferencesName,
      },
    });
  }

  const updated = await db.userPreferences.updateManyAndReturn({
    where: {
      user_id: userId,
      party_id: partyId,
      preference_name: preferencesName,
    },
    data: {
      preference_value: preferenceValue,
    },
  });
  if (updated.length === 0) {
    return db.userPreferences.create({
      data: {
        user_id: userId,
        party_id: partyId,
        preference_name: preferencesName,
        preference_value: preferenceValue,
      },
    });
  }
  return updated[0];
}
