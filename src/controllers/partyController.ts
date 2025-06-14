import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const getUserParties = (userId: number) => {
  return db.party.findMany({
    where: {
      OR: [
        {
          organizer_id: userId,
        },
        {
          PartyHosts: {
            some: {
              host_id: userId,
            },
          },
        },
      ],
    },
    include: {
      PartyGuests: true,
      Layout: {
        include: {
          LayoutItem: true,
        },
      },
    },
  });
};

export const getParty = (partyId: number) => {
  return db.party.findFirst({
    where: {
      party_id: partyId,
    },
    select: {
      party_id: true,
      party_name: true,
      party_date: true,
      party_location: true,
      Layout: {
        select: {
          layout_id: true,
          layout_name: true,
        },
      },
    },
  });
};

export const getPartyLayout = (partyId: number) => {
  return db.layout.findFirst({
    where: {
      Party: {
        some: {
          party_id: partyId,
        },
      },
    },
    include: {
      LayoutItem: {
        include: {
          PartyGuest: true,
        },
      },
    },
  });
};
