import express from "express";
import { getUserParties } from "../controllers/partyController";
import { Party } from "@prisma/client";
import { getUserLayouts } from "../controllers/layoutController";
import authMiddleware from "../middlewares/authMiddlewre";
import { getUserDetails } from "../controllers/userController";

const router = express();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const userId = req.auth.userId;
  if (!userId || isNaN(parseInt(userId.toString()))) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  try {
    const user = await getUserDetails(userId);
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/parties", async (req, res) => {
  try {
    console.log("Fetching user parties", req.cookies);
    const userId = req.auth.userId;
    if (!userId || isNaN(parseInt(userId.toString()))) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const {
      offset = 0,
      limit = 50,
      sort = "desc",
      sort_field = "party_date",
      query,
    } = req.query;
    if (!["asc", "desc"].includes(sort.toString())) {
      res.status(400).json({ error: "Invalid sort order" });
      return;
    }
    const validSortByFields = ["party_date", "party_name", "party_id"];
    if (
      typeof sort_field !== "string" ||
      !validSortByFields.includes(sort_field)
    ) {
      res.status(400).json({ error: "Invalid sort_field field" });
      return;
    }
    const sort_field_field: keyof Party = sort_field.toString() as keyof Party;
    const sort_order_field = sort.toString() as "asc" | "desc";

    const parties = await getUserParties(
      userId,
      parseInt(offset.toString()),
      parseInt(limit.toString()),
      sort_field_field,
      sort_order_field,
      query ? query.toString() : undefined
    );

    res.status(200).json(parties);
  } catch (error) {
    console.error("Error fetching user parties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/layouts", async (req, res) => {
  try {
    const userId = req.auth.userId;
    if (!userId || isNaN(parseInt(userId.toString()))) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    const { offset, limit } = req.query;
    if (
      isNaN(parseInt(offset?.toString() || "0")) ||
      isNaN(parseInt(limit?.toString() || "50")) ||
      parseInt(limit?.toString() || "50") < 0
    ) {
      res.status(400).json({ error: "Invalid pagination params" });
      return;
    }
    const layouts = await getUserLayouts(
      userId,
      parseInt(offset?.toString() || "0"),
      parseInt(limit?.toString() || "50")
    );

    res.status(200).json(layouts);
  } catch (error) {
    console.error("Error fetching user layouts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
