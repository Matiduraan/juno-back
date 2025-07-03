import express from "express";
import {
  createCalendarEvent,
  getCalendarEventsByPartyId,
  getCalendarIdByPartyId,
  linkCalendarWithGoogle,
  syncGoogleEvents,
} from "../controllers/calendarController";
import authMiddleware from "../middlewares/authMiddlewre";
import {
  getGoogleCalendarEvents,
  shareGoogleCalendar,
} from "../controllers/googleController";

const router = express();
router.use(authMiddleware);

router.get("/events/:partyId", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const partyId = req.params.partyId;
  if (!partyId || isNaN(parseInt(partyId))) {
    res.status(400).json({ error: "Invalid party ID" });
    return;
  }
  try {
    try {
      const calendarId = await getCalendarIdByPartyId(parseInt(partyId));
      // console.log("Calendar ID:", calendarId);
      if (calendarId) {
        const events = await getGoogleCalendarEvents({ userId, calendarId });
        // console.log("Google Calendar Events:", events);
        if (events && events.length > 0) {
          const synced = await syncGoogleEvents(
            userId,
            parseInt(partyId),
            events
          );
        }
      }
    } catch (error) {
      console.error("Error syncing Google Calendar events:", error);
    }
    const events = await getCalendarEventsByPartyId(parseInt(partyId));
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve events" });
  }
});

router.post("/event", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const {
    end,
    name,
    partyId,
    start,
    description,
    linkWithGoogleCalendar,
    location,
  } = req.body;

  if (!end || !name || !partyId || !start) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const event = await createCalendarEvent({
      end,
      name,
      partyId,
      start,
      userId,
      description,
      linkWithGoogleCalendar,
      location,
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.post("/connect/google", async (req, res) => {
  const userId = req.auth.userId;
  const { partyId } = req.body;

  if (!userId || !partyId || isNaN(parseInt(partyId))) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    const connect = await linkCalendarWithGoogle(partyId, userId);
    res.json(connect);
  } catch (error) {
    console.error("Error connecting to Google Calendar:", error);
    res.status(500).json({ error: "Failed to connect to Google Calendar" });
  }
});

router.put("/:partyId/share", async (req, res) => {
  const partyId = req.params.partyId;
  const userId = req.auth.userId;
  if (!partyId || isNaN(parseInt(partyId)) || !userId) {
    res.status(400).json({ error: "Invalid party ID or user ID" });
    return;
  }

  const { invitations } = req.body;
  if (!invitations || !Array.isArray(invitations)) {
    res.status(400).json({ error: "Invalid invitations format" });
    return;
  }

  try {
    const calendarId = await getCalendarIdByPartyId(parseInt(partyId));
    if (!calendarId) {
      res.status(404).json({ error: "Calendar not found for this party" });
      return;
    }
    const result = await shareGoogleCalendar(calendarId, userId, invitations);
    res.json(result);
  } catch (error) {
    console.error("Error sharing calendar:", error);
    res.status(500).json({ error: "Failed to share calendar" });
  }
});

export default router;
