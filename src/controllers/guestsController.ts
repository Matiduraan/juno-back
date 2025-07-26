import { PartyGuest, CustomFieldType } from "@prisma/client";
import { validateGuestFromFile } from "../validations/partyValidations";
import { GUEST_SORTABLE_FIELDS } from "../constants/guest";
import {
  formatCustomFieldValueToString,
  validateCustomFieldValue,
} from "../utils/guestCustomValues";
import { db } from "../lib/db";

export const getPartyGuestById = async (partyId: number, guestId: number) => {
  return await db.partyGuest.findFirst({
    where: {
      party_id: partyId,
      guest_id: guestId,
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
  });
};

export const getPartyGuestsByIds = async (
  partyId: number,
  guestIds: number[]
): Promise<PartyGuest[]> => {
  return await db.partyGuest.findMany({
    where: {
      party_id: partyId,
      guest_id: {
        in: guestIds,
      },
    },
  });
};

export const getPartyGuests = async (
  partyId: number,
  offset = 0,
  limit = 50,
  filters: GuestsFilters = { query: "", status: [] },
  sort: { field?: string; direction?: "asc" | "desc" } = {
    field: "guest_name",
    direction: "asc",
  },
  includeCustomFields = false
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
      ...(includeCustomFields && {
        GuestCustomFieldValues: {
          select: {
            field_id: true,
            field_value: true,
          },
        },
      }),
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

export const addPartyGuest = ({
  custom_fields,
  ...guestData
}: AddGuestInput) => {
  return db.$transaction(async (tx) => {
    const newGuest = await tx.partyGuest.create({
      data: guestData,
    });

    if (custom_fields && custom_fields.length > 0) {
      const fields = await tx.guestCustomFields.findMany({
        where: {
          field_id: {
            in: custom_fields.map((field) => field.field_id),
          },
        },
      });

      await Promise.all(
        custom_fields.map(async (field) => {
          const customField = fields.find((f) => f.field_id === field.field_id);
          if (!customField) {
            throw new Error(`Custom field with ID ${field.field_id} not found`);
          }
          if (
            field.field_value !== null &&
            !validateCustomFieldValue(
              customField.field_type as CustomFieldType,
              field.field_value
            )
          ) {
            throw new Error(
              `Invalid value for field ${customField.field_name}`
            );
          }
          const value =
            field.field_value === null
              ? null
              : formatCustomFieldValueToString(
                  customField.field_type as CustomFieldType,
                  field.field_value
                );
          if (value === null) {
            await tx.guestCustomFieldValues.delete({
              where: {
                field_id_guest_id: {
                  field_id: field.field_id,
                  guest_id: newGuest.guest_id,
                },
              },
            });
          } else {
            await tx.guestCustomFieldValues.upsert({
              where: {
                field_id_guest_id: {
                  field_id: field.field_id,
                  guest_id: newGuest.guest_id,
                },
              },
              update: {
                field_value: value,
              },
              create: {
                field_id: field.field_id,
                guest_id: newGuest.guest_id,
                field_value: value,
              },
            });
          }
        })
      );
    }
    return newGuest;
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
  const confirmed = status === "ACCEPTED" || status === "DECLINED";
  return db.partyGuest.update({
    where: {
      guest_id: guestId,
    },
    data: {
      guest_status: status,
      confirmed_at: confirmed ? new Date() : null,
    },
  });
};

export const massiveUpdateGuestStatus = async (
  partyId: number,
  ids: number[],
  status: GuestStatus
) => {
  if (ids.length === 0) {
    throw new Error("No guest IDs provided for update");
  }
  console.log(
    `Updating guests with IDs: ${ids.join(", ")} to status: ${status}`
  );
  return await db.partyGuest.updateMany({
    where: {
      party_id: partyId,
      guest_id: {
        in: ids,
      },
    },
    data: {
      guest_status: status,
      confirmed_at:
        status === "ACCEPTED" || status === "DECLINED" ? new Date() : null,
    },
  });
};

export const updatePartyGuest = (
  guestId: number,
  partyId: number,
  { custom_fields, ...guestData }: Partial<AddGuestInput>
) => {
  return db.$transaction(async (tx) => {
    if (custom_fields && custom_fields.length > 0) {
      const customFields = custom_fields;
      const fields = await getCustomFieldsByIds(
        customFields.map((field) => field.field_id)
      );
      await Promise.all(
        customFields.map(async (field) => {
          const customField = fields.find((f) => f.field_id === field.field_id);
          if (!customField) {
            throw new Error(`Custom field with ID ${field.field_id} not found`);
          }
          if (
            field.field_value !== null &&
            typeof field.field_value !== "string"
          ) {
            throw new Error(
              `Invalid value for field ${customField.field_name} ${field.field_value}`
            );
          }
          if (field.field_value === null) {
            await db.guestCustomFieldValues.delete({
              where: {
                field_id_guest_id: {
                  field_id: field.field_id,
                  guest_id: guestId,
                },
              },
            });
          } else {
            await db.guestCustomFieldValues.upsert({
              where: {
                field_id_guest_id: {
                  field_id: field.field_id,
                  guest_id: guestId,
                },
              },
              update: {
                field_value: field.field_value,
              },
              create: {
                field_id: field.field_id,
                guest_id: guestId,
                field_value: field.field_value,
              },
            });
          }
        })
      );
    }
    return tx.partyGuest.update({
      where: {
        guest_id: guestId,
        party_id: partyId,
      },
      data: guestData,
    });
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

export const getPartyCustomFields = async (partyId: number) => {
  return await db.guestCustomFields.findMany({
    where: {
      party_id: partyId,
    },
  });
};

export const updatePartyCustomFields = async (
  partyId: number,
  customFields: {
    field_name: string;
    field_type: CustomFieldType;
    field_id?: number;
  }[]
) => {
  return await Promise.all(
    customFields.map((field) => {
      return db.guestCustomFields.upsert({
        where: {
          field_id: field.field_id ?? -1,
        },
        update: {
          field_name: field.field_name,
        },
        create: {
          party_id: partyId,
          field_name: field.field_name,
          field_type: field.field_type,
        },
      });
    })
  );
};

export const deletePartyCustomField = async (
  partyId: number,
  fieldId: number
) => {
  return await db.guestCustomFields.delete({
    where: {
      party_id: partyId,
      field_id: fieldId,
    },
  });
};

export const getCustomFieldsByIds = async (fieldIds: number[]) => {
  return await db.guestCustomFields.findMany({
    where: {
      field_id: {
        in: fieldIds,
      },
    },
  });
};

export const setCustomFieldValue = async (
  fieldId: number,
  fieldType: CustomFieldType,
  guestId: number,
  fieldValue: string | number | boolean
) => {
  const value = formatCustomFieldValueToString(fieldType, fieldValue);
  return await db.guestCustomFieldValues.upsert({
    where: {
      field_id_guest_id: {
        field_id: fieldId,
        guest_id: guestId,
      },
    },
    update: {
      field_value: value,
    },
    create: {
      field_id: fieldId,
      guest_id: guestId,
      field_value: value,
    },
  });
};
