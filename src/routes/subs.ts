import express from "express";
import {
  getSubscriptionPlanById,
  getSubscriptionPlans,
  getUserFeatures,
  getUserSubscription,
} from "../controllers/subsController";
import authMiddleware from "../middlewares/authMiddlewre";
import {
  isValidFeatureKey,
  keyValidation,
  validateFeatureParams,
} from "../validations/subsValidation";
import { parseQueryToRecord } from "../utils/queryParser";

const router = express();

router.get("/plans", async (req, res) => {
  try {
    const plans = await getSubscriptionPlans();
    res.status(200).json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/plans/:planId", async (req, res) => {
  const planId = parseInt(req.params.planId, 10);
  if (isNaN(planId)) {
    res.status(400).json({ error: "Invalid plan ID" });
    return;
  }

  try {
    const plan = await getSubscriptionPlanById(planId);
    if (!plan) {
      res.status(404).json({ error: "Subscription plan not found" });
      return;
    }
    res.status(200).json(plan);
  } catch (error) {
    console.error("Error fetching subscription plan by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/", authMiddleware, (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const userSubscription = getUserSubscription(userId);
    if (!userSubscription) {
      res.status(404).json({ error: "User subscription not found" });
      return;
    }
    res.status(200).json(userSubscription);
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/userFeatures", authMiddleware, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const features = await getUserFeatures(userId);
    if (!features) {
      res.status(404).json({ error: "User subscription not found" });
      return;
    }
    res.status(200).json(features);
  } catch (error) {
    console.error("Error fetching user features:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/userFeatures/:featureKey", authMiddleware, async (req, res) => {
  const userId = req.auth?.userId;
  const featureKey = req.params.featureKey;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!featureKey || !isValidFeatureKey(featureKey)) {
    res.status(400).json({ error: "Feature key is required" });
    return;
  }
  const data = parseQueryToRecord(req.query);

  try {
    const isDataValid = await validateFeatureParams(featureKey, data ?? {});
    if (!isDataValid) {
      console.error("Invalid parameters for feature validation:", data);
      res
        .status(400)
        .json({ error: "Invalid parameters for feature validation" });
      return;
    }
    const isFeatureEnabled = await keyValidation(featureKey, {
      userId: userId.toString(),
      ...data,
    });
    res.status(200).json({ enabled: isFeatureEnabled });
  } catch (error) {
    console.error("Error validating feature key:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
