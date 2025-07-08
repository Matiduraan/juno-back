import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import { sendEmail } from "../utils/email";
import {
  getDocumentMessageInput,
  getImageMessageInput,
  getTextMessageInput,
  sendWhatsappMessage,
} from "../utils/whatsapp";

const db = new PrismaClient();

const replacePlaceholders = (
  template: string,
  data: Record<string, string>
) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || "");
};

const generateMessageReplacements = async (
  partyId: number,
  guestId: number
) => {
  const party = await db.party.findUnique({
    where: { party_id: partyId },
  });

  const guest = await db.partyGuest.findUnique({
    where: { guest_id: guestId },
  });

  return {
    party_name: party?.party_name || "",
    party_date: dayjs(party?.party_date).format("DD-MM-YYYY") || "",
    party_time: party?.party_start_time || "",
    guest_name: guest?.guest_name || "",
    party_location: party?.party_location_name || "",
    party_location_link: party?.party_location_link || "",
    guest_confirmation_link: `${process.env.APP_URL}/invite?token=${guest?.confirmation_id}`,
  };
};

export const sendEmailInvitation = async (
  partyId: number,
  email: string,
  guestId: number,
  customBody?: string,
  customSubject?: string
) => {
  const partyInvitation = await db.partyInvitation.findUnique({
    where: { party_id: partyId },
  });

  if (
    !partyInvitation ||
    !partyInvitation.email_body ||
    !partyInvitation.email_subject
  ) {
    throw new Error("Party invitation not found");
  }
  const body = customBody || partyInvitation.email_body;
  const subject = customSubject || partyInvitation.email_subject;

  const replacements = await generateMessageReplacements(partyId, guestId);
  const emailBody = replacePlaceholders(body, replacements);
  const emailSubject = replacePlaceholders(subject, replacements);

  const attachment = partyInvitation.invitation_file_link
    ? [
        {
          filename: `invitation-${partyId}.${partyInvitation.invitation_file_extension}`,
          path: partyInvitation.invitation_file_link,
          contentType: `application/${partyInvitation.invitation_file_extension}`,
        },
      ]
    : undefined;

  return await sendEmail(
    email,
    emailSubject,
    `<pre>${emailBody}</pre>`,
    attachment
  );
};

export const sendWhatsappInvitation = async (
  partyId: number,
  phoneNumber: string,
  guestId: number,
  customBody?: string
) => {
  const partyInvitation = await db.partyInvitation.findUnique({
    where: { party_id: partyId },
  });

  if (!partyInvitation || !partyInvitation.message_content) {
    throw new Error("Party invitation not found");
  }
  const body = customBody || partyInvitation.message_content;

  const replacements = await generateMessageReplacements(partyId, guestId);
  const whatsappBody = replacePlaceholders(body, replacements);

  const messageData = partyInvitation.invitation_file_link
    ? partyInvitation.invitation_file_extension === "pdf"
      ? getDocumentMessageInput(
          phoneNumber,
          partyInvitation.invitation_file_link,
          whatsappBody
        )
      : getImageMessageInput(
          phoneNumber,
          partyInvitation.invitation_file_link,
          whatsappBody
        )
    : getTextMessageInput(phoneNumber, whatsappBody);
  return await sendWhatsappMessage(messageData);
};
