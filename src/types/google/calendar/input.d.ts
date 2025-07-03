type CreateGoogleCalendarEventInput = {
  // calendarId, name, start, end, description, location, partyId, userId
  calendarId: string;
  name: string;
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
  description?: string;
  location?: string;
  userId: number;
};

type CreateEventInput = {
  name: string;
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
  description?: string;
  location?: string;
  linkWithGoogleCalendar?: boolean;
  partyId: number;
  userId: number;
};
