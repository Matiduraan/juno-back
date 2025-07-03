import express from "express";
import {
  createLayout,
  deleteLayout,
  duplicateLayout,
  getLayout,
  getUserLayouts,
  updateLayout,
} from "../controllers/layoutController";
import authMiddleware from "../middlewares/authMiddlewre";

const router = express();
router.use(authMiddleware);

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

router.post("/:layoutId/duplicate", async (req, res) => {
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
    const newLayout = await duplicateLayout(parseInt(layoutId), userId);
    res.status(201).json(newLayout);
  } catch (error) {
    console.error("Error duplicating layout:", error);
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
    const { layoutName, elements, layoutDescription } = req.body;

    if (!Array.isArray(elements)) {
      res.status(400).json({ error: "Invalid elements format" });
      return;
    }

    const layout = await updateLayout({
      layoutId: parseInt(layoutId),
      layoutName,
      elements,
      layoutDescription,
    });

    res.status(200).json(layout);
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
    const { layoutName, layoutDescription, elements = [] } = req.body;

    if (!Array.isArray(elements)) {
      res.status(400).json({ error: "Invalid elements format" });
      return;
    }

    const newLayout = await createLayout({
      layoutName,
      layoutDescription,
      elements,
      userId,
    });

    res.status(201).json(newLayout);
  } catch (error) {
    console.error("Error creating layout:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:layoutId", async (req, res) => {
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
    const layout = await getLayout(parseInt(layoutId));
    if (!layout) {
      res.status(404).json({ error: "Layout not found" });
      return;
    }
    const hasPermission = layout.layout_owner_id === userId;
    if (!hasPermission || layout.layout_type === "PARTY") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await deleteLayout(parseInt(layoutId));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
