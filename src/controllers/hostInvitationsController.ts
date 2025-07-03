import { HostInvitationStatus, PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const getUserHostInvitations = async (
  userId: number,
  status?: HostInvitationStatus[]
) => {
  const userEmail = await db.user.findUnique({
    where: { user_id: userId },
    select: { email: true },
  });
  console.log("User Email:", userEmail, status);
  if (!userEmail) {
    throw new Error("User not found");
  }

  return db.hostInvitation.findMany({
    where: {
      email: userEmail.email,
      // status: status,
      ...(status ? { status: { in: status } } : {}),
    },
    include: {
      Party: {
        include: {
          Organizer: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      },
    },
  });
};

export const getPartyHostInvitations = async (
  partyId: number,
  status?: HostInvitationStatus[]
) => {
  return db.hostInvitation.findMany({
    where: {
      party_id: partyId,
      status: status ? { in: status } : undefined,
    },
    include: {
      Party: {
        include: {
          Organizer: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      },
    },
  });
};

export const acceptInvitation = async (invitationId: number) => {
  const invite = await db.hostInvitation.update({
    where: { invitation_id: invitationId },
    data: { status: HostInvitationStatus.ACCEPTED },
  });

  const user = await db.user.findUnique({
    where: { email: invite.email },
    select: { user_id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return await db.partyHost.create({
    data: {
      party_id: invite.party_id,
      host_id: user.user_id,
    },
  });
};

export const inviteHosts = async (invitationsData: InvitationInput[]) => {
  const validInvitations = invitationsData.filter(
    (invitation) => invitation.email && invitation.partyId && invitation.name
  );
  return await db.hostInvitation.createMany({
    data: validInvitations.map((invitation) => ({
      party_id: invitation.partyId,
      email: invitation.email,
      name: invitation.name,
      status: invitation.status,
    })),
  });
};

export const getHostInvitationsCount = async (
  userId: number,
  status?: HostInvitationStatus[]
) => {
  const userEmail = await db.user.findUnique({
    where: { user_id: userId },
    select: { email: true },
  });
  if (!userEmail) {
    throw new Error("User not found");
  }

  return await db.hostInvitation.count({
    where: {
      email: userEmail.email,
      ...(status ? { status: { in: status } } : {}),
    },
  });
};
