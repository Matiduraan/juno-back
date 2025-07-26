import express from "express";
import {
  createPartyMoment,
  deletePartyMoment,
  getPartyMomentById,
  getPartyMoments,
  getPartyMomentTypes,
  updatePartyMoment,
  createPartyMomentType,
  deletePartyMomentType,
  getPartyMomentTypeById,
  updatePartyMomentType,
} from "../controllers/momentController";
import authMiddleware from "../middlewares/authMiddlewre";
import roleValidationMiddleware from "../middlewares/roleValidationMiddleware";

const router = express();

router.use(authMiddleware);

router.get("/party/:partyId", async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  try {
    const moments = await getPartyMoments(partyId);
    res.json(moments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch moments" });
  }
});

router.get("/momentTypes", async (req, res) => {
  const userId = req.query?.userId
    ? parseInt(req.query.userId.toString())
    : undefined;
  try {
    const momentTypes = await getPartyMomentTypes(userId);
    console.log("Moment types fetched:", momentTypes);
    res.json(momentTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch moments" });
  }
});

router.get("/momentTypes/:momentTypeId", async (req, res) => {
  const momentTypeId = parseInt(req.params.momentTypeId);
  try {
    const momentType = await getPartyMomentTypeById(momentTypeId);
    if (momentType) {
      res.json(momentType);
    } else {
      res.status(404).json({ error: "Moment type not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch moment type" });
  }
});

router.post("/momentTypes", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId || isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const momentTypeData = req.body;
  if (
    !momentTypeData.moment_type_name ||
    !momentTypeData.moment_type_color ||
    !momentTypeData.moment_type_icon
  ) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const newMomentType = await createPartyMomentType({
      ...momentTypeData,
      user_id: userId,
    });
    res.status(201).json(newMomentType);
  } catch (error) {
    res.status(500).json({ error: "Failed to create moment type" });
  }
});

router.put("/momentTypes/:momentTypeId", async (req, res) => {
  const momentTypeId = parseInt(req.params.momentTypeId);
  const momentTypeData = req.body;
  if (
    !momentTypeData.moment_type_name ||
    !momentTypeData.moment_type_color ||
    !momentTypeData.moment_type_icon ||
    !momentTypeData.user_id ||
    isNaN(momentTypeId) ||
    isNaN(momentTypeData.user_id)
  ) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const updatedMomentType = await updatePartyMomentType(
      momentTypeId,
      momentTypeData
    );
    res.json(updatedMomentType);
  } catch (error) {
    res.status(500).json({ error: "Failed to update moment type" });
  }
});

router.delete("/momentTypes/:momentTypeId", async (req, res) => {
  const momentTypeId = parseInt(req.params.momentTypeId);
  try {
    await deletePartyMomentType(momentTypeId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete moment type" });
  }
});

router.get("/:partyMomentId", async (req, res) => {
  const partyMomentId = parseInt(req.params.partyMomentId);
  try {
    const moment = await getPartyMomentById(partyMomentId);
    if (moment) {
      res.json(moment);
    } else {
      res.status(404).json({ error: "Moment not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch moment" });
  }
});

router.post("/:partyId", async (req, res) => {
  const partyId = parseInt(req.params.partyId);
  if (!partyId || isNaN(partyId)) {
    res.status(400).json({ error: "Invalid party ID" });
    return;
  }
  const momentData = req.body;
  try {
    const newMoment = await createPartyMoment(partyId, momentData);
    res.status(201).json(newMoment);
  } catch (error) {
    res.status(500).json({ error: "Failed to create moment" });
  }
});

router.put("/:partyMomentId", async (req, res) => {
  const partyMomentId = parseInt(req.params.partyMomentId);
  if (!partyMomentId || isNaN(partyMomentId)) {
    res.status(400).json({ error: "Invalid moment ID" });
    return;
  }
  const momentData = req.body;
  if (
    !momentData.moment_type_id ||
    !momentData.moment_time_start ||
    !momentData.party_id
  ) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const updatedMoment = await updatePartyMoment(partyMomentId, momentData);
    res.json(updatedMoment);
  } catch (error) {
    console.error("Error updating moment:", error);
    res.status(500).json({ error: "Failed to update moment" });
  }
});

router.delete("/:partyMomentId", async (req, res) => {
  const partyMomentId = parseInt(req.params.partyMomentId);
  try {
    await deletePartyMoment(partyMomentId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete moment" });
  }
});

export default router;
