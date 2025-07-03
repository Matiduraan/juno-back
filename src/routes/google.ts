import express from "express";
import {
  getAuthUrl,
  getTokens,
  getUserInfoByGoogleToken,
} from "../controllers/googleController";
import {
  createUser,
  getUserByEmail,
  getUserByGoogleId,
  linkUserWithGoogle,
} from "../controllers/authController";
import authMiddleware from "../middlewares/authMiddlewre";
import readTokenMiddleware from "../middlewares/readTokenMiddleware";

const router = express();

router.get("/", readTokenMiddleware, (req, res) => {
  const userId = req.auth?.userId;
  const action = req.query.action?.toString() ?? "login";
  if (!action || !["login", "signup", "link"].includes(action)) {
    res.status(400).json({ error: "Invalid action" });
    return;
  }
  if ((!userId || isNaN(parseInt(userId.toString()))) && action === "link") {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  const url = getAuthUrl(userId, action as "login" | "signup" | "link");
  res.json({
    redirectUri: url,
  });
});

router.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  const rawState = req.query.state?.toString();

  if (!code || !rawState) {
    res.status(400).json({ error: "Authorization code is required" });
    return;
  }
  try {
    const tokens = await getTokens(code);
    const state = JSON.parse(rawState);
    if (!tokens.access_token || !tokens.refresh_token) {
      res.status(400).json({ error: "User ID is required in state" });
      return;
    }
    if (state.action === "signup") {
      const data = await getUserInfoByGoogleToken(tokens.access_token);
      const existingUser = await getUserByGoogleId(data.google_id);
      if (existingUser) {
        res.redirect(`${process.env.APP_URL}/login?error=userAlreadyExists`);
        return;
      }
      const newUser = await createUser(data);
      if (!newUser) {
        res.redirect(`${process.env.APP_URL}/login?error=userCreationFailed`);
        return;
      }
      res.redirect(`${process.env.APP_URL}/login?token=${tokens.access_token}`);
      return;
    } else if (state.action === "login") {
      const data = await getUserInfoByGoogleToken(tokens.access_token);
      const existingUser = await getUserByGoogleId(data.google_id);
      if (!existingUser) {
        res.redirect(`${process.env.APP_URL}/login?error=userNotFound`);
        return;
      }
      res.redirect(`${process.env.APP_URL}/login?token=${tokens.access_token}`);
      return;
    } else if (state.action === "link") {
      if (!state.userId || isNaN(parseInt(state.userId))) {
        res.status(400).json({ error: "User ID is required in state" });
        return;
      }
      const userId = parseInt(state.userId);
      await linkUserWithGoogle(
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        },
        userId
      );
      res.redirect(`${process.env.APP_URL}/party`);
      return;
    }

    res.redirect(`${process.env.APP_URL}/login`);
  } catch (error) {
    console.error("Error during Google OAuth callback:", error);
    res.redirect(`${process.env.APP_URL}/login?error=internalError`);
  }
});

export default router;
