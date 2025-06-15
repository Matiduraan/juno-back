import { Party, PrismaClient } from "@prisma/client";
import { layoutIdOnPartyCreation } from "./layoutController";

const db = new PrismaClient();

export const getUserParties = (
  userId: number,
  offset: number,
  limit = 50,
  sort_by: keyof Party = "party_date",
  sort: "asc" | "desc" = "desc",
  name?: string
) => {
  const data = db.party.findMany({
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
      // name ? { party_name: { contains: name, mode: "insensitive" } } : {},
      party_name: name ? { contains: name, mode: "insensitive" } : undefined,
    },
    include: {
      PartyGuests: true,
      Layout: {
        include: {
          LayoutItem: true,
        },
      },
    },
    orderBy: {
      [sort_by]: sort,
    },
    take: limit !== 0 ? limit : undefined,
    skip: offset,
  });

  const pagination = db.party.count({
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
  });
  return Promise.all([data, pagination]).then(([data, total]) => ({
    data,
    pagination: {
      total,
      offset, // Assuming no offset for simplicity
      limit, // Assuming limit is the length of the data
    },
  }));
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

export const createParty = async (data: CreatePartyInput) => {
  const layoutId = await layoutIdOnPartyCreation(data.userId, data.layoutId);
  return db.party.create({
    data: {
      party_name: data.partyName,
      party_date: new Date(data.partyDate),
      party_location: data.partyLocation,
      party_start_time: new Date(data.partyStartTime),
      party_end_time: new Date(data.partyEndTime),
      organizer_id: data.userId,
      layout_id: layoutId,
    },
    include: {
      Layout: true,
    },
  });
};
