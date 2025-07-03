// src/google.ts
import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.APP_URL}/google/callback`;

const db = new PrismaClient();

export const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes para acceder y gestionar calendarios
export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// URL para iniciar OAuth
export function getAuthUrl(
  userId?: number,
  action: "login" | "signup" | "link" = "login"
) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state: JSON.stringify({ userId, action }),
  });
}

export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token || !tokens.access_token) {
    throw new Error(
      "No refresh token received. Please check your Google OAuth configuration."
    );
  }

  return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    await db.googleRefreshToken.delete({
      where: { token: refreshToken },
    });
  }
}

export async function getGoogleAccessToken(userId: number) {
  const token = await db.googleRefreshToken.findFirst({
    where: { user_id: userId },
  });

  if (!token) {
    throw new Error("No Google refresh token found for this user.");
  }

  const accessToken = await refreshAccessToken(token.token);
  if (!accessToken?.access_token) {
    throw new Error("Failed to refresh access token.");
  }

  return accessToken.access_token;
}

export async function getGoogleUserId(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  if (!userInfo.data.id) {
    throw new Error("No Google user ID found in the access token.");
  }
  return userInfo.data.id;
}

export async function createGoogleCalendar(
  userId: number,
  calendarName: string,
  partyId: number
) {
  const accessToken = await getGoogleAccessToken(userId);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.calendars.insert({
    requestBody: {
      summary: calendarName,
      timeZone: "America/Argentina/Buenos_Aires",
    },
  });

  await db.party.update({
    where: { party_id: partyId },
    data: {
      google_calendar_id: response.data.id,
    },
  });

  return response.data;
}

export async function shareGoogleCalendar(
  calendarId: string,
  userId: number,
  shareEmails: {
    email: string;
    permission?: "reader" | "writer";
  }[]
) {
  const accessToken = await getGoogleAccessToken(userId);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  for (const invitation of shareEmails) {
    const { email, permission } = invitation;
    if (!email) continue;
    await calendar.acl.insert({
      calendarId,
      requestBody: {
        role: permission || "writer", // or "writer" if you want to allow editing
        scope: {
          type: "user",
          value: email,
        },
      },
    });
  }

  return { success: true, message: "Calendar shared successfully." };
}

export async function createGoogleCalendarEvent({
  calendarId,
  name,
  start,
  end,
  description,
  location,
  userId,
}: CreateGoogleCalendarEventInput) {
  const accessToken = await getGoogleAccessToken(userId);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: name,
    start: { dateTime: start },
    end: { dateTime: end },
    description,
    location,
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return response.data.id;
}

export async function deleteGoogleCalendarEvent(
  eventId: string,
  userId: number
) {
  const accessToken = await getGoogleAccessToken(userId);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.delete({
    eventId,
  });
}
export async function updateGoogleCalendarEvent({
  calendarId,
  eventId,
  name,
  start,
  end,
  description,
  location,
  userId,
}: CreateGoogleCalendarEventInput & { eventId: string }) {
  const accessToken = await getGoogleAccessToken(userId);
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: name,
    start: { dateTime: start },
    end: { dateTime: end },
    description,
    location,
  };

  const response = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });

  return response.data;
}

export async function getGoogleCalendarEvents({
  userId,
  calendarId,
  timeMin,
  timeMax,
}: {
  userId: number;
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
}) {
  try {
    const accessToken = await getGoogleAccessToken(userId);
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items;
  } catch (error) {
    return [];
  }
}

export async function getUserInfoByGoogleToken(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });

  try {
    const userInfo = await oauth2.userinfo.get();
    console.log("USER INFO:", userInfo.data);
    return {
      first_name: userInfo.data.given_name || "",
      last_name: userInfo.data.family_name || "",
      email: userInfo.data.email || "",
      google_id: userInfo.data.id || "",
      password: "",
    };
  } catch (error) {
    throw new Error("Failed to fetch user info from Google.");
  }
}
