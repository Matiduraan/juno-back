import { PartyGuest, PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import { sendEmail } from "../utils/email";
import {
  sendWhatsappMessage,
  getTemplateMessageInput,
} from "../utils/whatsapp";
import { sendWhatsappTemplateMessage } from "../utils/twilio";

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

const whatsappTemplates = (
  guestName: string,
  partyName: string,
  inviteLink: string,
  inviteToken: string
) => [
  {
    name: "invite",
    twilioId: "HX452c15da09e9b261eb118826fdc754c6",
    languageCode: "en",
    bodyParameters: [guestName, partyName, inviteLink],
    buttonUrlVariable: inviteToken,
  },
  {
    name: "invite_formal",
    twilioId: "HXffe2b022fd336a8b514e01db260ff1e5",
    languageCode: "en",
    bodyParameters: [guestName, partyName, inviteLink],
    buttonUrlVariable: inviteToken,
  },
  {
    name: "invite_informal",
    twilioId: "HXcf8df425a09168f8f0eea03bcfb20268",
    languageCode: "en",
    bodyParameters: [guestName, partyName, inviteLink],
    buttonUrlVariable: inviteToken,
  },
];

export const sendWhatsappInvitation = async (
  partyId: number,
  phoneNumber: string,
  guestId: number,
  customTemplate?: number
) => {
  const partyInvitation = await db.partyInvitation.findUnique({
    where: { party_id: partyId },
  });

  if (!partyInvitation || partyInvitation.message_option === null) {
    throw new Error("Party invitation not found");
  }
  const template = customTemplate || partyInvitation.message_option;

  const replacements = await generateMessageReplacements(partyId, guestId);
  // const whatsappBody = replacePlaceholders(body, replacements);
  const templateData = whatsappTemplates(
    replacements.guest_name,
    replacements.party_name,
    replacements.guest_confirmation_link,
    replacements.guest_confirmation_link.split("token=")[1]
  )[template];
  // const messageData = getTemplateMessageInput(
  //   phoneNumber,
  //   templateData.name,
  //   templateData.bodyParameters,
  //   templateData.buttonUrlVariable,
  //   templateData.languageCode
  // );
  // return await sendWhatsappMessage(messageData);
  return await sendWhatsappTemplateMessage({
    to: phoneNumber,
    templateName: templateData.twilioId,
    bodyVariables: templateData.bodyParameters,
    buttonVariable: templateData.buttonUrlVariable,
  });
};
