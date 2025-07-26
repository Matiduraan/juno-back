import {
  createGoogleCalendar,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "./googleController";
import { isUserLinkedWithGoogle } from "./authController";
import { calendar_v3 } from "googleapis";
import { db } from "../lib/db";

export async function createCalendarEvent({
  end,
  name,
  partyId,
  start,
  userId,
  description,
  linkWithGoogleCalendar,

  location,
}: CreateEventInput) {
  let googleEventid: string | undefined;

  if (linkWithGoogleCalendar) {
    const isLinked = await isUserLinkedWithGoogle(userId);
    const calendar = await db.party.findFirst({
      where: { party_id: partyId },
      select: { google_calendar_id: true },
    });
    if (isLinked && calendar?.google_calendar_id) {
      const calendarId = calendar.google_calendar_id;

      const createdId = await createGoogleCalendarEvent({
        calendarId,
        name,
        start,
        end,
        description,
        location,
        userId,
      });
      if (createdId) {
        googleEventid = createdId;
      }
    }
  }

  return await db.calendarEvent.create({
    data: {
      event_name: name,
      event_start: start,
      event_end: end,
      event_description: description,
      event_location: location,
      party_id: partyId,
      google_event_id: googleEventid,
    },
  });
}

export async function getCalendarEventsByPartyId(partyId: number) {
  return await db.calendarEvent.findMany({
    where: { party_id: partyId },
    orderBy: { event_start: "asc" },
  });
}

export async function deleteCalendarEvent(eventId: number, userId: number) {
  const event = await db.calendarEvent.findUnique({
    where: { event_id: eventId },
    select: { google_event_id: true },
  });

  if (event?.google_event_id) {
    await deleteGoogleCalendarEvent(event.google_event_id, userId);
  }

  return await db.calendarEvent.delete({
    where: { event_id: eventId },
  });
}

export async function linkCalendarWithGoogle(partyId: number, userId: number) {
  const isLinked = await isUserLinkedWithGoogle(userId);
  if (!isLinked) {
    throw new Error("User is not linked with Google");
  }

  const party = await db.party.findUnique({
    where: { party_id: partyId },
  });

  if (!party) {
    throw new Error("Party not found");
  }
  if (party.google_calendar_id) {
    return party;
  }

  const newCalendar = await createGoogleCalendar(
    userId,
    party.party_name,
    partyId
  );

  return await db.party.update({
    where: { party_id: partyId },
    data: { google_calendar_id: newCalendar.id },
  });
}

export async function getCalendarIdByPartyId(partyId: number) {
  const party = await db.party.findUnique({
    where: { party_id: partyId },
    select: { google_calendar_id: true },
  });

  return party?.google_calendar_id;
}

export async function syncGoogleEvents(
  userId: number,
  partyId: number,
  events: calendar_v3.Schema$Event[]
) {
  const existingEvents = await db.calendarEvent.findMany({
    where: { party_id: partyId, google_event_id: { not: null } },
    select: { google_event_id: true },
  });
  console.log("Existing events:", existingEvents);

  const existingEventIds = new Set(
    existingEvents.map((e) => e.google_event_id)
  );

  for (const event of events) {
    if (existingEventIds.has(event.id ?? null)) {
      continue;
    }

    await db.calendarEvent.create({
      data: {
        event_name: event.summary || "No Title",
        event_start: event.start?.dateTime || event.start?.date || "",
        event_end: event.end?.dateTime || event.end?.date || "",
        event_description: event.description || "",
        event_location: event.location || "",
        party_id: partyId,
        google_event_id: event.id || undefined,
      },
    });
  }
}

export async function getUpcomingEvents(partyId: number, limit: number = 10) {
  return await db.calendarEvent.findMany({
    where: {
      party_id: partyId,
      event_start: {
        gte: new Date(),
      },
    },
    orderBy: {
      event_start: "asc",
    },
    select: {
      event_id: true,
      event_name: true,
      event_start: true,
      event_end: true,
      event_description: true,
      event_location: true,
      google_event_id: true,
    },
    take: limit,
  });
}
