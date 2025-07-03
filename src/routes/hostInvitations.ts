import express from "express";
import authMiddleware from "../middlewares/authMiddlewre";
import {
  acceptInvitation,
  getHostInvitationsCount,
  getUserHostInvitations,
} from "../controllers/hostInvitationsController";
import { HostInvitationStatus } from "@prisma/client";

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
    const { status } = req.query;
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
    const invitations = await getUserHostInvitations(userId, statusFilter);

    res.status(200).json({
      results: invitations,
      pagination: {
        limit: limit ? parseInt(limit as string) : 10,
        offset: offset ? parseInt(offset as string) : 0,
        total: invitations.length,
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

export default router;
