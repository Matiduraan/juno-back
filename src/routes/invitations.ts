import express from "express";
import multer from "multer";
import {
  getPartyInvitation,
  uploadInvitationFile,
  saveEmail,
  saveInvitationMessage,
  deleteInvitationFile,
  getPartyInvitationByGuestToken,
} from "../controllers/invitationsController";
import partyValidationMiddleware from "../middlewares/partyValidationMiddleware";
import authMiddleware from "../middlewares/authMiddlewre";
import fs from "fs";
import {
  sendEmailInvitation,
  sendWhatsappInvitation,
} from "../controllers/notificationsController";
import { updateGuestStatus } from "../controllers/guestsController";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const router = express();
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/webhook", (req, res) => {
  const body = req.body;
  console.log("Webhook received:", body);
  if (body.object === "whatsapp_business_account") {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];

    const value = changes?.value;

    // Procesar estados del mensaje
    if (value?.statuses) {
      value.statuses.forEach((statusObj: any) => {
        const { id, status, recipient_id, timestamp, errors } = statusObj;

        console.log(
          `[STATUS] Mensaje ${id} para ${recipient_id} tiene estado: ${status} (timestamp: ${timestamp})`
        );

        if (status === "failed") {
          console.error(`[ERROR] Falló el mensaje ${id} a ${recipient_id}`);
          if (errors?.length) {
            errors.forEach((err: any) => {
              console.error(
                `→ Código: ${err.code}, Título: ${
                  err.title
                }, Detalle: ${JSON.stringify(err)}`
              );
            });
          }
        }
      });
    }
  }

  // WhatsApp exige un 200 OK rápido
  res.sendStatus(200);
});

router.get("/webhook", (req, res) => {
  const token = req.query["hub.verify_token"];

  if (token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    res.send(req.query["hub.challenge"]);
    return;
  }

  res.send("Error, token de verificación inválido");
});

router.post(
  "/:partyId/file",
  authMiddleware,
  partyValidationMiddleware,
  upload.single("file"),
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const file = req.file;

    if (!file || !file.originalname || !file.mimetype) {
      res.status(400).json({ error: "File is required" });
      return;
    }
    const extension = file.originalname?.split(".").pop();

    if (
      !extension ||
      !["pdf", "png", "jpg"].includes(extension) ||
      !ALLOWED_MIME_TYPES.includes(file.mimetype)
    ) {
      fs.unlinkSync(file.path);
      res.status(400).json({
        error: "Invalid file type. Only PDF, PNG, and JPG are allowed.",
      });
      return;
    }
    try {
      const fileLink = await uploadInvitationFile(
        partyId,
        file.path,
        extension as "pdf" | "png" | "jpg",
        file.mimetype
      );
      console.log(fileLink);
      res.status(200).json({
        message: "File uploaded successfully",
        fileLink: file
          ? `${process.env.S3_ENDPOINT}/party-invitations/invitation-${partyId}.${extension}}`
          : null,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

router.post(
  "/:partyId/email",
  authMiddleware,
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { emailBody, emailSubject } = req.body;
    if (!emailBody || !emailSubject) {
      res.status(400).json({
        error: "Missing required fields: emailBody or emailSubject",
      });
      return;
    }
    try {
      const updatedInvitation = await saveEmail({
        body: emailBody,
        subject: emailSubject,
        partyId,
      });
      res.status(200).json(updatedInvitation);
    } catch (error) {
      console.error("Error saving email:", error);
      res.status(500).json({ error: "Failed to save email" });
    }
  }
);

router.post(
  "/:partyId/message",
  authMiddleware,
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { messageContent } = req.body;
    if (!messageContent) {
      res.status(400).json({ error: "Missing required field: messageContent" });
      return;
    }
    try {
      const updatedInvitation = await saveInvitationMessage({
        messageContent,
        partyId,
      });
      res.status(200).json(updatedInvitation);
    } catch (error) {
      console.error("Error saving invitation message:", error);
      res.status(500).json({ error: "Failed to save invitation message" });
    }
  }
);

router.post(
  "/:partyId/test-email",
  authMiddleware,
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { email, body, subject } = req.body;
    if (!email) {
      res.status(400).json({ error: "Missing required field: email" });
      return;
    }
    try {
      await sendEmailInvitation(
        partyId,
        email,
        parseInt(process.env.MOCK_GUEST_ID ?? "1"),
        body,
        subject
      );
      res.status(200).json({ message: "Test email sent successfully" });
    } catch (error) {
      console.error("Error fetching invitation for test email:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch invitation for test email" });
    }
  }
);

router.post(
  "/:partyId/test-phone",
  authMiddleware,
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { phone, body } = req.body;
    if (!phone) {
      res.status(400).json({ error: "Missing required field: phone" });
      return;
    }
    try {
      await sendWhatsappInvitation(
        partyId,
        phone,
        parseInt(process.env.MOCK_GUEST_ID ?? "1"),
        body
      );
      res.status(200).json({ message: "Test email sent successfully" });
    } catch (error) {
      console.error("Error fetching invitation for test email:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch invitation for test email" });
    }
  }
);

router.get("/guest/:token", async (req, res) => {
  const token = req.params.token;
  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }
  try {
    const invitation = await getPartyInvitationByGuestToken(token);
    if (!invitation) {
      res.sendStatus(404);
      return;
    }
    res.status(200).json(invitation);
  } catch (error) {
    console.error("Error fetching invitation:", error);
    res.status(500).json({ error: "Failed to fetch invitation" });
  }
});

router.post("/guest/:guestId/send", async (req, res) => {
  const { guestId } = req.params;
  const { partyId, methods } = req.body;
  if (!guestId || !partyId || (methods && !Array.isArray(methods))) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const failedMethods = [];
  if (methods.includes("email")) {
    try {
      const email = req.body.email;
      if (!email) {
        failedMethods.push("email");
        throw new Error("Email is required for email invitations");
      }
      await sendEmailInvitation(
        parseInt(partyId),
        email,
        parseInt(process.env.MOCK_GUEST_ID ?? "1")
      );
    } catch (error) {
      console.error("Error sending email invitation:", error);
      failedMethods.push("email");
    }
  }
  if (methods.includes("whatsapp")) {
    try {
      const phone = req.body.phone;
      if (!phone) {
        failedMethods.push("whatsapp");
        throw new Error("Phone number is required for WhatsApp invitations");
      }
      await sendWhatsappInvitation(parseInt(partyId), phone, parseInt(guestId));
    } catch (error) {
      failedMethods.push("whatsapp");
      console.error("Error sending WhatsApp invitation:", error);
    }
  }
  if (failedMethods.length === methods.length) {
    res.status(500).json({
      error: "Failed to send invitations",
      failedMethods,
    });
    return;
  }
  const update = await updateGuestStatus(parseInt(guestId), "INVITED");
  res.status(200).json({ update, failedMethods });
});

router.get("/:partyId", partyValidationMiddleware, async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  if (isNaN(partyId)) {
    res.status(400).json({ error: "Invalid party ID" });
    return;
  }
  try {
    const invitation = await getPartyInvitation(partyId);
    if (!invitation) {
      res.sendStatus(204);
      return;
    }
    res.status(200).json(invitation);
  } catch (error) {
    console.error("Error fetching invitation:", error);
    res.status(500).json({ error: "Failed to fetch invitation" });
  }
});

router.delete(
  "/:partyId/file",
  authMiddleware,
  partyValidationMiddleware,
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    try {
      const deleted = await deleteInvitationFile(partyId);
      if (deleted) {
        res.status(200).json({ message: "File deleted successfully" });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  }
);

export default router;
