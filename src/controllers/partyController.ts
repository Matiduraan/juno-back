import { Party, PrismaClient } from "@prisma/client";
import { layoutIdOnPartyCreation } from "./layoutController";
import dayjs, { Dayjs } from "dayjs";

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

export const getParty = async (partyId: number) => {
  const party = await db.party.findFirst({
    where: {
      party_id: partyId,
    },
    select: {
      party_id: true,
      party_name: true,
      party_date: true,
      party_start_time: true,
      party_end_time: true,
      party_location_name: true,
      party_location_link: true,
      party_dress_code: true,
      party_special_instructions: true,
      organizer_id: true,
      google_calendar_id: true,
      PartyHosts: {
        select: {
          host_id: true,
        },
      },
      Organizer: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      Layout: {
        select: {
          layout_id: true,
          layout_name: true,
          layout_owner_id: true,
        },
      },
    },
  });
  const { Layout, Organizer, PartyHosts, ...partyData } = party || {};
  return {
    ...partyData,
    layout: Layout ?? {},
    organizer: Organizer
      ? {
          firstName: Organizer.first_name,
          lastName: Organizer.last_name,
          email: Organizer.email,
        }
      : null,
    hosts: PartyHosts ?? [],
  };
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
      party_date: dayjs(data.partyDate, "YYYY-MM-DD").toDate(),
      party_location_name: data.partyLocationName,
      party_location_link: data.partyLocationLink,
      party_start_time: data.partyStartTime,
      party_dress_code: data.partyDressCode,
      party_special_instructions: data.partySpecialInstructions,
      party_end_time: data.partyEndTime,
      Organizer: {
        connect: {
          user_id: data.userId,
        },
      },
      Layout: {
        connect: {
          layout_id: layoutId,
        },
      },
    },
    include: {
      Layout: true,
    },
  });
};

export const getPartySummaryMetrics = async (partyId: number) => {
  const guests = db.$queryRaw<
    Array<{
      total_guests: number;
      confirmed_guests: number;
    }>
  >`
    select COUNT(*) as total_guests, 
            SUM(case when guest_status = 'ACCEPTED' then 1 else 0 end) as confirmed_guests from "PartyGuest" pg 
    where pg.party_id = ${partyId}`;

  const party = db.party.findFirst({
    where: {
      party_id: partyId,
    },
    select: {
      party_date: true,
    },
  });

  const [query, partyDate] = await Promise.all([guests, party]);

  return {
    total_guests: Number(query[0]?.total_guests ?? 0),
    confirmed_guests: Number(query[0]?.confirmed_guests ?? 0),
    days_until_party: dayjs(partyDate?.party_date).diff(dayjs(), "day"),
  };
};

export const updateParty = async (
  partyId: number,
  data: Partial<UpdatePartyInput>
) => {
  return db.party.update({
    where: {
      party_id: partyId,
    },
    data: {
      party_name: data.partyName,
      party_date: dayjs(data.partyDate, "YYYY-MM-DD").toDate(),
      party_location_name: data.partyLocationName,
      party_location_link: data.partyLocationLink,
      party_dress_code: data.partyDressCode,
      party_special_instructions: data.partySpecialInstructions,
      party_start_time: data.partyStartTime,
      party_end_time: data.partyEndTime,
    },
    include: {
      Layout: true,
    },
  });
};
