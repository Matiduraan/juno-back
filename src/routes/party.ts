import express from "express";
import {
  addPartyGuest,
  deletePartyGuest,
  exportGuestsInfo,
  getPartyGuests,
  getPartyGuestsCountByStatus,
  updateGuestsSeats,
  updateGuestStatus,
  updatePartyGuest,
} from "../controllers/guestsController";
import { getParty, getPartyLayout } from "../controllers/partyController";
import { buildGuestsFilter } from "../utils/guestsFilters";
import { utils, write } from "xlsx";
import { GUEST_STATUS } from "../constants/guest";

const router = express();

router.get("/:partyId", async (req, res) => {
  const { partyId } = req.params;
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
    res.status(200).json(party);
  } catch (error) {
    console.error("Error fetching guests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:partyId/guests", async (req, res) => {
  const { partyId } = req.params;
  const { offset = 0, limit = 50, status, query } = req.query;
  if (!partyId || isNaN(parseInt(partyId))) {
    res.status(400).json({ error: "Invalid party ID" });
    return;
  }
  try {
    const guests = await getPartyGuests(
      parseInt(partyId),
      parseInt(offset.toString()),
      parseInt(limit.toString()),
      buildGuestsFilter(
        query ? query.toString() : undefined,
        status ? status.toString() : undefined
      )
    );
    res.status(200).json(guests);
  } catch (error) {
    console.error("Error fetching guests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:partyId/guests/export", async (req, res) => {
  const { partyId } = req.params;
  if (!partyId || isNaN(parseInt(partyId))) {
    res.status(400).json({ error: "Invalid party ID" });
    return;
  }
  try {
    const guests = await getPartyGuests(parseInt(partyId));

    const worksheet = utils.json_to_sheet(guests.data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Reporte de Invitados");

    const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

    // Enviar el archivo como respuesta
    res.setHeader("Content-Disposition", 'attachment; filename="reporte.xlsx"');
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting guests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:partyId/guests/status", async (req, res) => {
  const { partyId } = req.params;
  if (!partyId || isNaN(parseInt(partyId))) {
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
});

router.post("/:partyId/guests", async (req, res) => {
  const { partyId } = req.params;
  if (!partyId || isNaN(parseInt(partyId))) {
    res.status(400).json({ error: "Invalid party ID" });
    return;
  }
  const { guest_name, guest_notes, guest_email, guest_phone } = req.body;

  if (!guest_name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const newGuest = await addPartyGuest({
      party_id: parseInt(partyId),
      guest_name,
      guest_email,
      guest_phone,
      guest_notes,
    });
    res.status(201).json(newGuest);
  } catch (error) {
    console.error("Error adding guest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:partyId/guests", async (req, res) => {
  const {
    guest_id,
    party_id,
    guest_name,
    guest_status,
    guest_email,
    guest_phone,
  } = req.body;

  if (!guest_id) {
    res.status(400).json({ error: "Missing guest ID" });
    return;
  }

  try {
    const updatedGuest = await updatePartyGuest(party_id, parseInt(guest_id), {
      guest_name,
      guest_status,
      guest_email,
      guest_phone,
    });
    res.status(200).json(updatedGuest);
  } catch (error) {
    console.error("Error updating guest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:partyId/guests/seats", async (req, res) => {
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
});

router.put("/:partyId/guests/status", async (req, res) => {
  const { guest_id, guest_status } = req.body;

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
});

router.delete("/:partyId/guests/:guestId", async (req, res) => {
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
});

router.get("/:partyId/layout", async (req, res) => {
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
});

export default router;
