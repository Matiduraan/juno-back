import { HostInvitationStatus, RolePermissionKey } from "@prisma/client";
import { db } from "../lib/db";

export const getUserHostInvitations = async (
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
              email: true,
            },
          },
        },
      },
      Role: {
        select: {
          role_id: true,
          role_name: true,
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
      role_id: invite.role_id,
    },
  });
};

export const inviteHosts = async (invitationsData: InvitationInput[]) => {
  const existingHosts = await db.partyHost.findMany({
    where: {
      party_id: { in: invitationsData.map((invitation) => invitation.partyId) },
      Host: {
        email: { in: invitationsData.map((invitation) => invitation.email) },
      },
    },
    select: { party_id: true, Host: { select: { email: true } } },
  });
  const validInvitations = invitationsData.filter(
    (invitation) =>
      invitation.email &&
      invitation.partyId &&
      invitation.name &&
      invitation.role &&
      !existingHosts.some(
        (host) =>
          host.party_id === invitation.partyId &&
          host.Host.email === invitation.email
      )
  );
  return await db.hostInvitation.createMany({
    skipDuplicates: true,
    data: validInvitations.map((invitation) => ({
      party_id: invitation.partyId,
      email: invitation.email,
      name: invitation.name,
      status: invitation.status,
      role_id: invitation.role,
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

export const getPartyRoles = async (partyId: number | null) => {
  return await db.roles.findMany({
    where: {
      OR: [{ party_id: partyId }, { party_id: null }],
    },
    select: {
      role_id: true,
      role_name: true,
      party_id: true,
      RolePermissions: {
        select: { permission_key: true },
      },
    },
  });
};

export const getAllPermissions = async () => {
  return await db.rolePermissions.findMany();
};

export const createRole = async (
  partyId: number,
  roleName: string,
  permissions: RolePermissionKey[]
) => {
  try {
    const newRole = await db.roles.create({
      data: {
        party_id: partyId,
        role_name: roleName,
      },
    });

    if (permissions && permissions.length > 0) {
      await db.rolePermissions.createMany({
        data: permissions.map((permission) => ({
          role_id: newRole.role_id,
          permission_key: permission,
        })),
      });
    }

    return newRole;
  } catch (error) {
    console.error("Error creating role:", error);
    throw new Error("Internal server error");
  }
};

export const updateHostRole = async (hostId: number, roleId: number) => {
  return await db.partyHost.update({
    where: { party_host_id: hostId },
    data: { role_id: roleId },
  });
};

export const updateRolePermissions = async (
  roleId: number,
  partyId: number,
  permissions: RolePermissionKey[]
) => {
  const role = await db.roles.findUnique({
    where: { role_id: roleId, party_id: partyId },
  });
  if (!role) {
    throw new Error("Role not found");
  }
  await db.rolePermissions.deleteMany({
    where: { role_id: roleId, Roles: { party_id: partyId } },
  });

  return await db.rolePermissions.createMany({
    data: permissions.map((permission) => ({
      role_id: roleId,
      permission_key: permission,
    })),
  });
};

export const deleteRole = async (roleId: number, partyId: number) =>
  await db.roles.delete({
    where: { role_id: roleId, party_id: partyId },
  });
