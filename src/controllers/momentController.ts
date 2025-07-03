import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function getPartyMoments(partyId: number) {
  return await db.partyMoment.findMany({
    where: {
      party_id: partyId,
    },
    include: {
      PartyMomentType: true,
    },
    orderBy: {
      moment_time_start: "asc",
    },
  });
}

export async function getPartyMomentById(partyMomentId: number) {
  return await db.partyMoment.findUnique({
    where: {
      moment_id: partyMomentId,
    },
    include: {
      PartyMomentType: true,
    },
  });
}

export async function createPartyMoment(
  partyId: number,
  momentData: CreateMomentInput
) {
  return await db.partyMoment.create({
    data: {
      party_id: partyId,
      ...momentData,
    },
  });
}

export async function updatePartyMoment(
  partyMomentId: number,
  { moment_type_id, party_id, ...momentData }: UpdateMomentInput
) {
  return await db.partyMoment.update({
    where: {
      moment_id: partyMomentId,
    },
    data: {
      ...momentData,
      Party: {
        connect: { party_id: party_id },
      },
      PartyMomentType: {
        connect: { moment_type_id: moment_type_id },
      },
    },
  });
}

export async function deletePartyMoment(partyMomentId: number) {
  return await db.partyMoment.delete({
    where: {
      moment_id: partyMomentId,
    },
  });
}

export async function getPartyMomentTypes(partyId?: number) {
  return await db.partyMomentType.findMany({
    where: {
      OR: [
        {
          user_id: partyId,
        },
        {
          user_id: {
            equals: null,
          },
        },
      ],
    },
  });
}

export async function getPartyMomentTypeById(momentTypeId: number) {
  return await db.partyMomentType.findUnique({
    where: {
      moment_type_id: momentTypeId,
    },
  });
}

export async function createPartyMomentType(
  momentTypeData: CreateMomentTypeInput
) {
  return await db.partyMomentType.create({
    data: momentTypeData,
  });
}

export async function updatePartyMomentType(
  momentTypeId: number,
  momentTypeData: UpdateMomentTypeInput
) {
  return await db.partyMomentType.update({
    where: {
      moment_type_id: momentTypeId,
      user_id: momentTypeData.user_id,
    },
    data: momentTypeData,
  });
}

export async function deletePartyMomentType(momentTypeId: number) {
  return await db.partyMomentType.delete({
    where: {
      moment_type_id: momentTypeId,
    },
  });
}
