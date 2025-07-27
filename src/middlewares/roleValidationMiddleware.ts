import { NextFunction, Request, Response } from "express";
import { db } from "../lib/db";

export enum UserRoleKeys {
  EDIT_PARTY_DETAILS = "EDIT_PARTY_DETAILS",
  SEND_INVITATIONS = "SEND_INVITATIONS",
  MANAGE_GUESTS = "MANAGE_GUESTS",
  VIEW_GUEST_LIST = "VIEW_GUEST_LIST",
  VIEW_LAYOUT = "VIEW_LAYOUT",
  EDIT_LAYOUT = "EDIT_LAYOUT",
  MANAGE_GUEST_CUSTOM_FIELDS = "MANAGE_GUEST_CUSTOM_FIELDS",
  MANAGE_HOSTS = "MANAGE_HOSTS",
  VIEW_PARTY = "VIEW_PARTY",
  MANAGE_HOST_PERMISSIONS = "MANAGE_HOST_PERMISSIONS",
}

const roleValidationMiddleware =
  (roleKey: UserRoleKeys = UserRoleKeys.VIEW_PARTY) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth?.userId;
    const partyIdParam =
      req.params?.partyId ||
      req.query?.partyId ||
      req.query?.party_id ||
      req.body?.partyId;

    if (!userId || !partyIdParam) {
      console.warn(
        "User ID or Party ID is missing in request",
        userId,
        partyIdParam,
        req.route.path,
        req.auth
      );
      res.status(403).json({ error: "User ID or Party ID is missing" });
      return;
    }

    const partyId = parseInt(partyIdParam.toString());
    if (isNaN(partyId)) {
      console.warn("Invalid Party ID format", partyIdParam);
      res.status(400).json({ error: "Invalid Party ID format" });
      return;
    }
    try {
      const partyOrganizer = await db.party.findUnique({
        where: { party_id: partyId },
        select: { organizer_id: true },
      });

      if (partyOrganizer?.organizer_id === userId) {
        next();
        return;
      }

      const userPermissions = await db.partyHost.findFirst({
        where: {
          party_id: partyId,
          host_id: userId,
        },
        include: {
          Roles: {
            include: {
              RolePermissions: {
                select: { permission_key: true },
              },
            },
          },
        },
      });
      if (
        !userPermissions ||
        !userPermissions?.Roles?.RolePermissions.some(
          (role) => role.permission_key === roleKey
        )
      ) {
        console.warn(
          `User ${userId} does not have the required role: ${roleKey} for party ${partyId}`
        );
        res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        return;
      }

      next();
    } catch (error) {
      console.error("Error in role validation middleware:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  };

export default roleValidationMiddleware;
