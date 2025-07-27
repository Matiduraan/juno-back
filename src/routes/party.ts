import express from "express";
import {
  addMultipleGuests,
  addPartyGuest,
  deletePartyGuest,
  getPartyCustomFields,
  getPartyGuestById,
  getPartyGuests,
  getPartyGuestsCountByStatus,
  processGuestsFile,
  updateGuestsSeats,
  updateGuestStatus,
  updatePartyGuest,
} from "../controllers/guestsController";
import {
  createParty,
  getParty,
  getPartyLayout,
  getPartyPermissions,
  getPartySummaryMetrics,
  updateParty,
} from "../controllers/partyController";
import { buildGuestsFilter } from "../utils/guestsFilters";
import { utils, write } from "xlsx";
import { GUEST_STATUS } from "../constants/guest";
import { createPartyLayout } from "../controllers/layoutController";
import multer from "multer";
import xlsx from "node-xlsx";
import authMiddleware from "../middlewares/authMiddlewre";
import { getUpcomingEvents } from "../controllers/calendarController";
import {
  getPartyHostInvitations,
  inviteHosts,
} from "../controllers/hostInvitationsController";
import { HostInvitationStatus } from "@prisma/client";
import roleValidationMiddleware, {
  UserRoleKeys,
} from "../middlewares/roleValidationMiddleware";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express();

router.use(authMiddleware);

router.post("/", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const {
    party_name,
    party_date,
    party_location_name,
    party_location_link,
    party_start_time,
    party_end_time,
    hosts,
    layoutId,
    party_dress_code,
    party_special_instructions,
  } = req.body;
  if (
    !party_name ||
    !party_date ||
    !party_location_name ||
    !party_start_time ||
    !party_end_time ||
    !layoutId
  ) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const newParty = await createParty({
      userId,
      partyDate: party_date,
      partyName: party_name,
      partyLocationName: party_location_name,
      partyLocationLink: party_location_link,
      partyStartTime: party_start_time,
      partyEndTime: party_end_time,
      layoutId: layoutId,
      partyDressCode: party_dress_code,
      partySpecialInstructions: party_special_instructions,
    });
    try {
      if (hosts && Array.isArray(hosts) && hosts.length > 0) {
        await inviteHosts(hosts);
      }
    } catch (_) {}
    res.status(201).json(newParty);
  } catch (error) {
    console.error("Error creating party:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/:partyId",
  roleValidationMiddleware(UserRoleKeys.VIEW_PARTY),
  async (req, res) => {
    const { partyId } = req.params;

    try {
      const party = await getParty(parseInt(partyId));
      if (!party) {
        res.status(404).json({ error: "No party found" });
        return;
      }
      res.status(200).json(party);
    } catch (error) {
      console.error("Error fetching guests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/:partyId/guests",
  roleValidationMiddleware(UserRoleKeys.VIEW_GUEST_LIST),
  async (req, res) => {
    const { partyId } = req.params;
    const {
      offset = 0,
      limit = 50,
      status,
      query,
      sort,
      sortBy,
      includeCustomFields = "false",
    } = req.query;
    if (!partyId || isNaN(parseInt(partyId))) {
      console.warn("Invalid party ID:", partyId);
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    try {
      const sortDirection = sort?.toString();
      const guests = await getPartyGuests(
        parseInt(partyId),
        parseInt(offset.toString()),
        parseInt(limit.toString()),
        buildGuestsFilter(
          query ? query.toString() : undefined,
          status ? status.toString() : undefined
        ),
        {
          field: sortBy ? sortBy.toString() : "guest_name",
          direction:
            sortDirection &&
            (sortDirection === "asc" || sortDirection === "desc")
              ? sortDirection
              : "asc",
        },
        includeCustomFields.toString() === "true"
      );
      res.status(200).json(guests);
    } catch (error) {
      console.error("Error fetching guests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get("/:partyId/permissions", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { partyId } = req.params;
  if (!partyId || isNaN(parseInt(partyId))) {
    res.status(400).json({ error: "Invalid party ID" });
    return;
  }
  try {
    const permissions = await getPartyPermissions(parseInt(partyId), userId);
    res.status(200).json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/:partyId/guests/export",
  roleValidationMiddleware(),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    try {
      const guests = await getPartyGuests(
        parseInt(partyId),
        undefined,
        undefined,
        undefined,
        undefined,
        true
      );
      const customFieldsNames = await getPartyCustomFields(parseInt(partyId));

      const guestsData = guests.data.map((guest) => {
        return {
          "Guest ID": guest.guest_id,
          "Guest Name": guest.guest_name,
          "Guest Email": guest.guest_email,
          "Guest Phone": guest.guest_phone,
          "Guest Status": guest.guest_status,
          "Guest Notes": guest.guest_notes,
          "Guest Seat": guest.Guest_seat?.layout_item_name || "-",
          ...customFieldsNames.reduce(
            (acc, field) => ({
              ...acc,
              [field.field_name]:
                guest.GuestCustomFieldValues.find(
                  (value) => value.field_id === field.field_id
                )?.field_value || "-",
            }),
            {}
          ),
        };
      });
      const worksheet = utils.json_to_sheet(guestsData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Reporte de Invitados");

      const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

      // Enviar el archivo como respuesta
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="reporte.xlsx"'
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting guests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/:partyId/summaryMetrics",
  roleValidationMiddleware(UserRoleKeys.VIEW_PARTY),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      console.warn("Invalid party ID:", partyId);
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    try {
      const metrics = await getPartySummaryMetrics(parseInt(partyId));
      res.status(200).json(metrics);
    } catch (error) {
      console.error("Error fetching summary metrics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/:partyId/upcomingEvents",
  roleValidationMiddleware(UserRoleKeys.VIEW_PARTY),
  async (req, res) => {
    const { partyId } = req.params;
    const { limit = 10 } = req.query;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    try {
      const party = await getParty(parseInt(partyId));
      if (!party) {
        res.status(404).json({ error: "No party found" });
        return;
      }
      const upcomingEvents = await getUpcomingEvents(
        parseInt(partyId),
        parseInt(limit.toString())
      );
      res.status(200).json(upcomingEvents);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/:partyId/hostInvitations",
  roleValidationMiddleware(UserRoleKeys.VIEW_PARTY),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const status = req.query.status;

    if (
      status &&
      status
        .toString()
        .split(",")
        .some((s) => s !== "PENDING" && s !== "ACCEPTED" && s !== "REJECTED")
    ) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }
    try {
      const invitations = await getPartyHostInvitations(
        parseInt(partyId),
        status
          ? (status.toString().split(",") as HostInvitationStatus[])
          : undefined
      );

      res.status(200).json(invitations);
    } catch (error) {
      console.error("Error fetching host invitations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/:partyId/guests/status",
  roleValidationMiddleware(UserRoleKeys.VIEW_GUEST_LIST),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      console.warn("Invalid party ID:", partyId);
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    try {
      const guests = await getPartyGuestsCountByStatus(parseInt(partyId));
      res.status(200).json(guests);
    } catch (error) {
      console.error("Error fetching guests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/:partyId/inviteHost",
  roleValidationMiddleware(UserRoleKeys.MANAGE_HOSTS),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { invitations } = req.body;
    if (
      !invitations ||
      !Array.isArray(invitations) ||
      invitations.length === 0
    ) {
      res.status(400).json({ error: "No invitations data provided" });
      return;
    }
    try {
      const result = await inviteHosts(invitations);
      res.status(201).send({
        invitationsSent: result.count,
      });
    } catch (error) {
      console.error("Error inviting hosts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/:partyId/guests",
  roleValidationMiddleware(UserRoleKeys.MANAGE_GUESTS),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { guest_name, guest_notes, guest_email, guest_phone, custom_fields } =
      req.body;
    if (!guest_name && !guest_email && !guest_phone && !guest_notes) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!guest_name) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const validCustomFields =
        Array.isArray(custom_fields) &&
        custom_fields.every(
          (field: Record<string, unknown>) =>
            !!field.field_id &&
            typeof field.field_id === "number" &&
            (typeof field.field_value === "string" ||
              field.field_value === null)
        );
      if (!validCustomFields) {
        res.status(400).json({ error: "Invalid custom fields data" });
        return;
      }
      const newGuest = await addPartyGuest({
        party_id: parseInt(partyId),
        guest_name,
        guest_email,
        guest_phone,
        guest_notes,
        custom_fields,
      });
      res.status(201).json(newGuest);
    } catch (error) {
      console.error("Error adding guest:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/:partyId/guests/massive/create",
  roleValidationMiddleware(UserRoleKeys.MANAGE_GUESTS),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { guests } = req.body;
    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      res.status(400).json({ error: "No guests data provided" });
      return;
    }
    try {
      const result = await addMultipleGuests(parseInt(partyId), guests);

      res.status(201).send({
        guestsCreated: result.count,
      });
    } catch (error) {
      console.error("Error creating guests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/:partyId/guests/massive/upload",
  roleValidationMiddleware(UserRoleKeys.MANAGE_GUESTS),
  upload.single("file"),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const fileBuffer = req.file.buffer;
    try {
      const worksheetsFromFile = xlsx.parse(fileBuffer, {});
      if (worksheetsFromFile.length === 0 || !worksheetsFromFile[0].data) {
        res.status(400).json({ error: "Invalid file format" });
        return;
      }
      const [_, __, ...dataRows] = worksheetsFromFile[0].data;
      const guests = processGuestsFile(dataRows);

      res.status(200).send(guests);
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/:partyId/guests",
  roleValidationMiddleware(UserRoleKeys.MANAGE_GUESTS),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const {
      guest_id,
      guest_name,
      guest_status,
      guest_email,
      guest_phone,
      guest_notes,
      custom_fields,
    } = req.body;

    if (!guest_id) {
      res.status(400).json({ error: "Missing guest ID" });
      return;
    }

    try {
      const validCustomFields =
        Array.isArray(custom_fields) &&
        custom_fields.every(
          (field: Record<string, unknown>) =>
            !!field.field_id &&
            typeof field.field_id === "number" &&
            (typeof field.field_value === "string" ||
              field.field_value === null)
        );
      if (!validCustomFields) {
        res.status(400).json({ error: "Invalid custom fields data" });
        return;
      }
      const updatedGuest = await updatePartyGuest(
        parseInt(guest_id),
        parseInt(partyId),
        {
          guest_name,
          guest_status,
          guest_email,
          guest_phone,
          guest_notes,
          custom_fields,
        }
      );
      res.status(200).json(updatedGuest);
    } catch (error) {
      console.error("Error updating guest:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/:partyId/guests/seats",
  roleValidationMiddleware(UserRoleKeys.MANAGE_GUESTS),
  async (req, res) => {
    const { guests } = req.body;
    const { partyId } = req.params;

    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const updatedGuest = await updateGuestsSeats(parseInt(partyId), guests);
      res.status(200).json(updatedGuest);
    } catch (error) {
      console.error("Error updating guest seat:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/:partyId/guests/status",
  roleValidationMiddleware(UserRoleKeys.MANAGE_GUESTS),
  async (req, res) => {
    const { guest_id, guest_status } = req.body;
    const { partyId } = req.params;

    if (!guest_id || !guest_status) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (GUEST_STATUS.indexOf(guest_status) === -1) {
      res.status(400).json({ error: "Invalid guest status" });
      return;
    }

    try {
      const updatedGuest = await updateGuestStatus(
        parseInt(guest_id),
        guest_status
      );
      res.status(200).json(updatedGuest);
    } catch (error) {
      console.error("Error updating guest status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/:partyId/guests/:guestId",
  roleValidationMiddleware(UserRoleKeys.MANAGE_GUESTS),
  async (req, res) => {
    const { partyId, guestId } = req.params;

    if (
      !partyId ||
      isNaN(parseInt(partyId)) ||
      !guestId ||
      isNaN(parseInt(guestId))
    ) {
      res.status(400).json({ error: "Invalid party or guest ID" });
      return;
    }

    try {
      const deletedGuest = await deletePartyGuest(
        parseInt(guestId),
        parseInt(partyId)
      );
      res.status(200).json(deletedGuest);
    } catch (error) {
      console.error("Error deleting guest:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/:partyId/layout",
  roleValidationMiddleware(UserRoleKeys.VIEW_LAYOUT),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    try {
      const party = await getPartyLayout(parseInt(partyId));
      if (!party) {
        res.status(404).json({ error: "No party found" });
        return;
      }
      res.status(200).json(party);
    } catch (error) {
      console.error("Error fetching party layout:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post("/layout", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { layout_name } = req.body;
  if (!layout_name || typeof layout_name !== "string") {
    res.status(400).json({ error: "Invalid layout name" });
    return;
  }
  try {
    const layout = await createPartyLayout(userId, layout_name);

    res.status(200).json(layout);
  } catch (error) {
    console.error("Error fetching party layout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/:partyId/guests/:guestId",
  roleValidationMiddleware(UserRoleKeys.VIEW_GUEST_LIST),
  async (req, res) => {
    const { guestId, partyId } = req.params;
    if (
      !guestId ||
      isNaN(parseInt(guestId)) ||
      !partyId ||
      isNaN(parseInt(partyId))
    ) {
      res.status(400).json({ error: "Invalid guest ID" });
      return;
    }
    try {
      const guest = await getPartyGuestById(
        parseInt(partyId),
        parseInt(guestId)
      );
      if (!guest) {
        res.status(404).json({ error: "No guest found" });
        return;
      }
      res.status(200).json(guest);
    } catch (error) {
      console.error("Error fetching guest:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/:partyId/guests/:guestId/confirmation",
  roleValidationMiddleware(),
  async (req, res) => {
    const { partyId, guestId } = req.params;
    if (
      !partyId ||
      isNaN(parseInt(partyId)) ||
      !guestId ||
      isNaN(parseInt(guestId))
    ) {
      res.status(400).json({ error: "Invalid party or guest ID" });
      return;
    }
    try {
      const updatedGuest = await updateGuestStatus(
        parseInt(guestId),
        "ACCEPTED"
      );
      res.status(200).json(updatedGuest);
    } catch (error) {
      console.error("Error confirming guest:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/:partyId",
  roleValidationMiddleware(UserRoleKeys.EDIT_PARTY_DETAILS),
  async (req, res) => {
    const { partyId } = req.params;
    if (!partyId || isNaN(parseInt(partyId))) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const {
      partyName,
      partyDate,
      partyLocationName,
      partyLocationLink,
      partyStartTime,
      partyEndTime,
      partyDressCode,
      partySpecialInstructions,
    } = req.body;
    if (
      !partyName ||
      !partyDate ||
      !partyLocationName ||
      !partyStartTime ||
      !partyEndTime
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    try {
      const updatedParty = await updateParty(parseInt(partyId), {
        partyName,
        partyDate,
        partyLocationName,
        partyLocationLink,
        partyStartTime,
        partyEndTime,
        partyDressCode,
        partySpecialInstructions,
      });

      res.status(200).json(updatedParty);
    } catch (error) {
      console.error("Error validating party access:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
