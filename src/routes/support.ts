import express from "express";
import { sendSupportEmail } from "../controllers/supportController";

const router = express();

router.post("/", async (req, res) => {
  const { message, email, name, subject } = req.body;
  if (!message || !email || !name || !subject) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  try {
    const sent = await sendSupportEmail(name, email, subject, message);
    if (sent.rejected.length === 0) {
      res.status(202).json({ message: "Support email sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send support email" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
