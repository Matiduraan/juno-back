import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const validatePartyAccess = async (partyId: number, userId?: number) => {
  if (!userId || isNaN(parseInt(userId.toString()))) return false;
  const party = await db.party.findFirst({
    where: {
      party_id: partyId,
      OR: [
        { organizer_id: userId },
        {
          PartyHosts: {
            some: {
              host_id: userId,
            },
          },
        },
      ],
    },
  });
  console.log(
    "Party access validation for user:",
    userId,
    "Party:",
    partyId,
    "Result:",
    !!party
  );
  return !!party;
};
