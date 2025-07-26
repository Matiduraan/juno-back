import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import { db } from "../lib/db";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // necesario para MinIO
});

export const uploadInvitationFile = async (
  partyId: number,
  filePath: string,
  extension: "pdf" | "png" | "jpg",
  contentType: string
) => {
  const fileStream = fs.createReadStream(filePath);

  const params = {
    Bucket: process.env.S3_BUCKET_NAME || "juno-invitations",
    Key: `invitation-${partyId}.${extension}`,
    Body: fileStream,
    ContentType: contentType,
  };

  await s3.send(new PutObjectCommand(params));
  fs.unlinkSync(filePath); // Elimina el archivo local después de subirlo
  const fileUrl = `${process.env.S3_ENDPOINT}/party-invitations/invitation-${partyId}.${extension}`;

  return await db.partyInvitation.upsert({
    where: { party_id: partyId },
    update: {
      invitation_file_link: fileUrl,
      invitation_file_extension: extension,
    },
    create: {
      party_id: partyId,
      invitation_file_link: fileUrl,
      invitation_file_extension: extension,
      email_body: "",
      email_subject: "",
      message_option: 0,
    },
  });
};

export const getPartyInvitation = async (partyId: number) => {
  return await db.partyInvitation.findUnique({
    where: { party_id: partyId },
  });
};

export const saveEmail = async ({
  body,
  subject,
  partyId,
}: SaveInvitationEmailInput) => {
  return await db.partyInvitation.upsert({
    where: { party_id: partyId },
    update: {
      email_body: body,
      email_subject: subject,
    },
    create: {
      party_id: partyId,
      email_body: body,
      email_subject: subject,
    },
  });
};

export const saveInvitationMessage = async ({
  messageOption,
  partyId,
}: SaveInvitationMessageInput) => {
  return await db.partyInvitation.upsert({
    where: { party_id: partyId },
    update: {
      message_option: messageOption,
    },
    create: {
      party_id: partyId,
      email_body: "",
      email_subject: "",
      message_option: messageOption,
    },
  });
};

export const deleteInvitationFile = async (partyId: number) => {
  const invitation = await db.partyInvitation.findUnique({
    where: { party_id: partyId },
  });

  if (!invitation || !invitation.invitation_file_link) {
    throw new Error("No invitation file found for this party");
  }

  const fileName = `invitation-${partyId}.${invitation.invitation_file_extension}`;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME || "juno-invitations",
    Key: fileName,
  };

  await s3.send(new PutObjectCommand(params));

  return await db.partyInvitation.update({
    where: { party_id: partyId },
    data: {
      invitation_file_link: null,
      invitation_file_extension: null,
    },
  });
};

export const getPartyInvitationByGuestToken = async (token: string) => {
  const guest = await db.partyGuest.findFirst({
    where: {
      confirmation_id: token,
    },
    select: {
      party_id: true,
      guest_id: true,
    },
  });

  const invitation = await db.partyInvitation.findUnique({
    where: {
      party_id: guest?.party_id,
    },
    select: {
      invitation_id: true,
      party_id: true,
      invitation_file_link: true,
    },
  });
  return {
    ...invitation,
    guest_id: guest?.guest_id,
  };
};
