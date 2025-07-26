import express from "express";
import authMiddleware from "../middlewares/authMiddlewre";
import {
  acceptInvitation,
  createRole,
  deleteRole,
  getAllPermissions,
  getHostInvitationsCount,
  getPartyRoles,
  getUserHostInvitations,
  updateHostRole,
  updateRolePermissions,
} from "../controllers/hostInvitationsController";
import { HostInvitationStatus, RolePermissionKey } from "@prisma/client";
import roleValidationMiddleware, {
  UserRoleKeys,
} from "../middlewares/roleValidationMiddleware";

const router = express();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  const { limit, offset } = req.query;

  try {
    // const { status } = req.query;
    // const statusEnum: string[] = Object.values(HostInvitationStatus);
    // if (
    //   status
    //     ?.toString()
    //     .split(",")
    //     .some((s) => !statusEnum.includes(s))
    // ) {
    //   res.status(400).json({ error: "Invalid status filter" });
    //   return;
    // }
    // const statusFilter: HostInvitationStatus[] | undefined = status
    //   ? (status.toString().split(",") as HostInvitationStatus[])
    //   : undefined;
    // const invitations = await getUserHostInvitations(userId, statusFilter);

    res.status(200).json({
      results: [],
      // results: invitations,
      pagination: {
        limit: limit ? parseInt(limit as string) : 10,
        offset: offset ? parseInt(offset as string) : 0,
        // total: invitations.length,
        total: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/count", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  const { status } = req.query;
  try {
    const statusEnum: string[] = Object.values(HostInvitationStatus);
    if (
      status
        ?.toString()
        .split(",")
        .some((s) => !statusEnum.includes(s))
    ) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }
    const statusFilter: HostInvitationStatus[] | undefined = status
      ? (status.toString().split(",") as HostInvitationStatus[])
      : undefined;
    const count = await getHostInvitationsCount(userId, statusFilter);
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error counting invitations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:invitationId/accept", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }

  const { invitationId } = req.params;

  try {
    const result = await acceptInvitation(parseInt(invitationId, 10));
    res.status(200).json(result);
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/roles", async (req, res) => {
  let partyId: number | null = parseInt(req.query.partyId?.toString() || "0");

  if (!partyId || isNaN(partyId)) {
    partyId = null;
  }

  try {
    const roles = await getPartyRoles(partyId);

    res.status(200).json(roles ?? []);
  } catch (error) {
    console.error("Error fetching party roles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/roles/permissions", async (req, res) => {
  try {
    const permissions = Object.values(RolePermissionKey);
    res.status(200).json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/role", async (req, res) => {
  const { partyId, roleName, permissions } = req.body;
  const permissionsValid =
    Array.isArray(permissions) &&
    permissions.every((perm) =>
      Object.values(RolePermissionKey).includes(perm)
    );
  if (
    !partyId ||
    !roleName ||
    !permissionsValid ||
    typeof roleName !== "string" ||
    typeof partyId !== "number"
  ) {
    res.status(400).json({ error: "Invalid role data" });
    return;
  }
  try {
    const newRole = await createRole(
      partyId,
      roleName,
      permissions as RolePermissionKey[]
    );
    if (!newRole) {
      res.status(400).json({ error: "Failed to create role" });
      return;
    }

    res.status(201).json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:hostId/role", async (req, res) => {
  const { hostId } = req.params;
  const { roleId } = req.body;

  if (!hostId || isNaN(parseInt(hostId, 10)) || !roleId || isNaN(roleId)) {
    res.status(400).json({ error: "Invalid host or role ID" });
    return;
  }

  try {
    const updatedHost = await updateHostRole(parseInt(hostId, 10), roleId);
    res.status(200).json(updatedHost);
  } catch (error) {
    console.error("Error updating host role:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/:role/permissions",
  roleValidationMiddleware(UserRoleKeys.MANAGE_HOST_PERMISSIONS),
  async (req, res) => {
    const { role } = req.params;
    const { permissions, partyId } = req.body;
    const permissionsValid =
      Array.isArray(permissions) &&
      permissions.every((perm) =>
        Object.values(RolePermissionKey).includes(perm)
      );
    if (
      !permissionsValid ||
      permissions.length === 0 ||
      !partyId ||
      isNaN(partyId)
    ) {
      res.status(400).json({ error: "Invalid role data" });
      return;
    }
    try {
      const updatedPermissions = await updateRolePermissions(
        parseInt(role, 10),
        partyId,
        permissions as RolePermissionKey[]
      );
      res.status(200).json(updatedPermissions);
    } catch (error) {
      console.error("Error updating role permissions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete("/roles/:roleId", async (req, res) => {
  const { roleId } = req.params;
  const { partyId } = req.query;

  if (
    !roleId ||
    isNaN(parseInt(roleId, 10)) ||
    !partyId ||
    isNaN(parseInt(partyId.toString(), 10))
  ) {
    res.status(400).json({ error: "Invalid role or party ID" });
    return;
  }

  try {
    const deletedRole = await deleteRole(
      parseInt(roleId, 10),
      parseInt(partyId.toString(), 10)
    );
    if (!deletedRole) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    res.status(200).json(deletedRole);
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
