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
import authMiddleware from "../middlewares/authMiddlewre";
import fs from "fs";
import {
  sendEmailInvitation,
  sendWhatsappInvitation,
} from "../controllers/notificationsController";
import {
  getPartyGuestsByIds,
  massiveUpdateGuestStatus,
  updateGuestStatus,
} from "../controllers/guestsController";
import roleValidationMiddleware from "../middlewares/roleValidationMiddleware";

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
  roleValidationMiddleware(),
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
      fs.unlinkSync(file.path); // Delete the file after upload
      res.status(200).json({
        message: "File uploaded successfully",
        fileLink: fileLink.invitation_file_link,
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
  roleValidationMiddleware(),
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
  roleValidationMiddleware(),
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { messageOption } = req.body;
    if (isNaN(Number(messageOption))) {
      res.status(400).json({ error: "Missing required field: messageOption" });
      return;
    }
    try {
      const updatedInvitation = await saveInvitationMessage({
        messageOption,
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
  roleValidationMiddleware(),
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
  roleValidationMiddleware(),
  async (req, res) => {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) {
      res.status(400).json({ error: "Invalid party ID" });
      return;
    }
    const { phone, option } = req.body;
    if (!phone) {
      res.status(400).json({ error: "Missing required field: phone" });
      return;
    }
    try {
      await sendWhatsappInvitation(
        partyId,
        phone,
        parseInt(process.env.MOCK_GUEST_ID ?? "1"),
        option
      );
      res.status(200).json({ message: "Test message sent successfully" });
    } catch (error) {
      console.error("Error fetching invitation for test message:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch invitation for test message" });
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
  if (failedMethods.length === methods.length && failedMethods.length > 0) {
    res.status(500).json({
      error: "Failed to send invitations",
      failedMethods,
    });
    return;
  }
  const update = await updateGuestStatus(parseInt(guestId), "INVITED");
  res.status(200).json({ update, failedMethods });
});

router.post(
  "/:partyId/massive/send",
  roleValidationMiddleware(),
  async (req, res) => {
    const { ids, methods } = req.body;
    const { partyId } = req.params;
    if (
      !ids ||
      !partyId ||
      isNaN(parseInt(partyId)) ||
      !Array.isArray(ids) ||
      ids.length === 0
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    try {
      let successInvites: number[] = [];
      let failedInvites: number[] = [];
      const guestsInfo = await getPartyGuestsByIds(parseInt(partyId), ids);
      if (guestsInfo.length === 0) {
        res.status(404).json({ error: "No guests found for the provided IDs" });
        return;
      }
      await massiveUpdateGuestStatus(parseInt(partyId), ids, "INVITED");
      let promises = [];
      for (const guest of guestsInfo) {
        if (methods.includes("email") && guest.guest_email) {
          const email: string = guest.guest_email;
          const promise = async () => {
            try {
              const invite = await sendEmailInvitation(
                parseInt(partyId),
                email,
                guest.guest_id
              );
              console.log("Whatsapp invite:", invite);

              if (invite.rejected.length === 0) {
                successInvites.push(guest.guest_id);
              }
            } catch (error) {
              console.error(
                `Error sending email to ${guest.guest_email}:`,
                error
              );
              failedInvites.push(guest.guest_id);
            }
          };
          promises.push(promise());
        }
        if (methods.includes("whatsapp") && !!guest.guest_phone) {
          const phone: string = guest.guest_phone;
          const promise = async () => {
            try {
              const invite = await sendWhatsappInvitation(
                parseInt(partyId),
                phone,
                guest.guest_id
              );
              if (invite) {
                successInvites.push(guest.guest_id);
              }
            } catch (error) {
              console.error(
                `Error sending WhatsApp message to ${guest.guest_phone}:`,
                error
              );
              failedInvites.push(guest.guest_id);
            }
          };
          promises.push(promise());
        }
      }
      await Promise.all(promises);
      const realFailedInvites = failedInvites.filter(
        (id) => !successInvites.includes(id)
      );
      if (realFailedInvites.length > 0) {
        await massiveUpdateGuestStatus(
          parseInt(partyId),
          failedInvites,
          "PENDING"
        );
      }
      if (successInvites.length === 0) {
        res.status(400).json({
          error: "No invitations were sent successfully",
          failedInvites,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Invitations sent successfully",
        invitedGuests: new Set(successInvites).size,
      });
    } catch (error) {
      console.error("Error inviting guests:", error);
      res.status(500).json({ error: "Failed to invite guests" });
    }
  }
);

router.get(
  "/:partyId",
  authMiddleware,
  roleValidationMiddleware(),
  async (req, res) => {
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
  }
);

router.delete(
  "/:partyId/file",
  authMiddleware,
  roleValidationMiddleware(),
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
