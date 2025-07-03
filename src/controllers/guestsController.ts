import { PrismaClient, PartyGuest } from "@prisma/client";
import { validateGuestFromFile } from "../validations/partyValidations";
import { GUEST_SORTABLE_FIELDS } from "../constants/guest";

const db = new PrismaClient();

export const getPartyGuests = async (
  partyId: number,
  offset = 0,
  limit = 50,
  filters: GuestsFilters = { query: "", status: [] },
  sort: { field?: string; direction?: "asc" | "desc" } = {
    field: "guest_name",
    direction: "asc",
  }
) => {
  let sortField: string =
    sort?.field && GUEST_SORTABLE_FIELDS.includes(sort.field)
      ? sort.field
      : "guest_name";

  const guests = await db.partyGuest.findMany({
    where: {
      party_id: partyId,
      guest_name: {
        contains: filters.query,
        mode: "insensitive",
      },
      guest_status: filters.status?.length ? { in: filters.status } : undefined,
    },
    select: {
      guest_id: true,
      guest_email: true,
      guest_name: true,
      guest_phone: true,
      guest_status: true,
      guest_notes: true,
      guest_avatar: true,
      guest_seat_id: true,
      Guest_seat: {
        select: {
          layout_item_name: true,
        },
      },
    },
    take: limit !== 0 ? limit : undefined,
    skip: offset,
    orderBy:
      sortField === "guest_seat"
        ? [
            {
              Guest_seat: {
                layout_item_name: sort.direction || "asc",
              },
              // guest_name: sort.direction || "asc",
            },
            { guest_name: "asc" },
          ]
        : [{ [sortField]: sort.direction || "asc" }, { guest_name: "asc" }],
  });

  const total = await db.partyGuest.count({
    where: {
      party_id: partyId,
      guest_name: {
        contains: filters.query,
        mode: "insensitive",
      },
      guest_status: filters.status?.length ? { in: filters.status } : undefined,
    },
  });
  return {
    data: guests,
    pagination: {
      total,
      offset,
      limit,
    },
  };
};

export const getPartyGuestsCountByStatus = async (partyId: number) => {
  const guestsCount = await db.partyGuest.groupBy({
    by: ["guest_status"],
    where: {
      party_id: partyId,
    },
    _count: {
      guest_status: true,
    },
  });

  return guestsCount.reduce(
    (acc, curr) => {
      acc[curr.guest_status] = curr._count.guest_status;
      return acc;
    },
    {
      INVITED: 0,
      ACCEPTED: 0,
      DECLINED: 0,
      PENDING: 0,
    } as Record<string, number>
  );
};

export const addPartyGuest = (guestData: AddGuestInput) => {
  return db.partyGuest.create({
    data: guestData,
  });
};

export const massiveAddPartyGuests = (guests: AddGuestInput[]) => {
  return db.partyGuest.createMany({
    data: guests,
    skipDuplicates: true, // Skip duplicates if any
  });
};

export const deletePartyGuest = (guestId: number, partyId: number) => {
  return db.partyGuest.delete({
    where: {
      guest_id: guestId,
      party_id: partyId,
    },
  });
};

export const updateGuestStatus = (guestId: number, status: GuestStatus) => {
  return db.partyGuest.update({
    where: {
      guest_id: guestId,
    },
    data: {
      guest_status: status,
    },
  });
};

export const updatePartyGuest = (
  guestId: number,
  partyId: number,
  guestData: Partial<AddGuestInput>
) => {
  return db.partyGuest.update({
    where: {
      guest_id: guestId,
      party_id: partyId,
    },
    data: guestData,
  });
};

export const exportGuestsInfo = async (partyId: number) => {
  const guests = await db.partyGuest.findMany({
    where: {
      party_id: partyId,
    },
    select: {
      guest_name: true,
      guest_email: true,
      guest_phone: true,
      guest_status: true,
      guest_notes: true,
    },
  });

  const csvContent = [
    "Guest Name,Email,Phone,Status,Notes",
    ...guests.map(
      (guest) =>
        `${guest.guest_name},${guest.guest_email || ""},${
          guest.guest_phone || ""
        },${guest.guest_status || ""},${guest.guest_notes || ""}`
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  return url;
};

export const updateGuestsSeats = async (
  partyId: number,
  seats: { guestId: number; seatId: number }[]
) => {
  return db.$transaction(
    seats.map(({ guestId, seatId }) =>
      db.partyGuest.update({
        where: {
          guest_id: guestId,
          party_id: partyId,
        },
        data: {
          guest_seat_id: seatId,
        },
      })
    )
  );
};

export const addMultipleGuests = async (
  partyId: number,
  guests: MassiveAddGuestInput[]
) => {
  return db.partyGuest.createMany({
    data: guests.map((guest) => ({
      party_id: partyId,
      guest_name: guest.guest_name,
      guest_email: guest.guest_email,
      guest_phone: guest.guest_phone,
      guest_notes: guest.guest_notes,
      guest_status: "PENDING",
    })),
    skipDuplicates: true, // Skip duplicates if any
  });
};

export const processGuestsFile = (guests: unknown[][]) => {
  const processedGuests: Omit<AddGuestInput, "party_id">[] =
    validateGuestFromFile(guests, "filter");

  return processedGuests;
};
