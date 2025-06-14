import express from "express";
import {
  createLayout,
  getLayout,
  getUserLayouts,
  updateLayout,
} from "../controllers/layoutController";

const router = express();

router.get("/:layoutId", async (req, res) => {
  const { layoutId } = req.params;
  if (!layoutId || isNaN(parseInt(layoutId))) {
    res.status(400).json({ error: "Invalid layout ID" });
    return;
  }
  try {
    const layout = await getLayout(parseInt(layoutId));
    if (!layout) {
      res.status(404).json({ error: "Layout not found" });
      return;
    }
    res.status(200).json(layout);
  } catch (error) {
    console.error("Error fetching layout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const layouts = await getUserLayouts(userId);
    res.status(200).json(layouts);
  } catch (error) {
    console.error("Error fetching user layouts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:layoutId", async (req, res) => {
  const { layoutId } = req.params;
  if (!layoutId || isNaN(parseInt(layoutId))) {
    res.status(400).json({ error: "Invalid layout ID" });
    return;
  }

  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { layoutName, elements } = req.body;

    if (!Array.isArray(elements)) {
      res.status(400).json({ error: "Invalid elements format" });
      return;
    }

    await updateLayout({
      layoutId: parseInt(layoutId),
      layoutName,
      elements,
    });

    res.status(200).json({ message: "Layout updated successfully" });
  } catch (error) {
    console.error("Error updating layout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { layoutName, elements } = req.body;

    if (!Array.isArray(elements)) {
      res.status(400).json({ error: "Invalid elements format" });
      return;
    }

    const newLayout = await createLayout({
      layoutName,
      elements,
      userId,
    });

    res.status(201).json(newLayout);
  } catch (error) {
    console.error("Error creating layout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
