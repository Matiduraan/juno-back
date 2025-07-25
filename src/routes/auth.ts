import express from "express";
import jwt from "jsonwebtoken";
import {
  createUser,
  forgotPassword,
  getUserByEmail,
  getUserByGoogleId,
  getUserById,
  getUserTokens,
  isRefreshTokenValid,
  revokeToken,
  updatePassword,
  validateAccount,
} from "../controllers/authController";
import { compare, hash } from "bcrypt";
import { getUserInfoByGoogleToken } from "../controllers/googleController";
import {
  sendAccountValidationEmail,
  sendForgotPasswordEmail,
} from "../controllers/notificationsController";
import authMiddleware from "../middlewares/authMiddlewre";

const router = express();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      res.status(500).json({ error: "JWT secret is not set" });
      return;
    }
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(403).json({ error: "Invalid email or password" });
      return;
    }
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      res.status(403).json({ error: "Invalid email or password" });
      return;
    }

    const { accessToken, refreshToken } = await getUserTokens({
      userId: user.user_id,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain:
        process.env.NODE_ENV === "production" ? ".juno.com.ar" : undefined,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      domain:
        process.env.NODE_ENV === "production" ? ".juno.com.ar" : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/validate", async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }
  try {
    const verified = await validateAccount(token);
    if (!verified || !verified.verified) {
      res.redirect(`${process.env.APP_URL}/login?error=validationFailed`);
      return;
    }
    res.redirect(`${process.env.APP_URL}/`);
  } catch (error) {
    console.error("Validation error:", error);
    res.redirect(`${process.env.APP_URL}/login?error=validationFailed`);
  }
});

router.post("/refresh-token", async (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) {
    res.sendStatus(401);
    return;
  }

  try {
    const userId = await isRefreshTokenValid(token);
    if (!userId) {
      res.sendStatus(401);
      return;
    }

    const newAccessToken = jwt.sign(
      { userId, userAgent: req.headers["user-agent"], ip: req.ip },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain:
        process.env.NODE_ENV === "production" ? ".juno.com.ar" : undefined,
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ ok: true });
  } catch {
    res.sendStatus(401);
    return;
  }
});

router.post("/signUp", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res
        .status(400)
        .json({ message: "Email, password, and name are required" });
      return;
    }

    const user = await createUser({
      email,
      password: await hash(password, 10),
      first_name: firstName,
      last_name: lastName,
    });

    if (!user) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    await sendAccountValidationEmail(
      user.email,
      user.email_verification_token!
    );

    const { accessToken, refreshToken } = await getUserTokens({
      userId: user.user_id,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production" ? ".juno.com.ar" : undefined,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production" ? ".juno.com.ar" : undefined,
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Sign up error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/loginWithGoogle", async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ error: "Access token is required" });
      return;
    }

    const userInfo = await getUserInfoByGoogleToken(accessToken);
    if (!userInfo) {
      res.status(401).json({ error: "Invalid access token" });
      return;
    }

    const existingUser = await getUserByGoogleId(userInfo.google_id);
    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { accessToken: newAccessToken, refreshToken } = await getUserTokens({
      userId: existingUser.user_id,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Debe estar en true si estás usando HTTPS
      sameSite: "lax",
      domain:
        process.env.NODE_ENV === "production" ? ".juno.com.ar" : undefined,
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      domain:
        process.env.NODE_ENV === "production" ? ".juno.com.ar" : undefined,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login with Google error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", async (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    path: "/",
  });
  const userId = req.auth?.userId;
  if (!userId) {
    res.sendStatus(200);
    return;
  }
  try {
    const { refresh_token: refreshToken } = req.cookies;
    await revokeToken({ user_id: userId, token: refreshToken });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/checkAuth", (req, res) => {
  const accessToken = req.cookies.access_token;
  if (!accessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!);
    res.status(200).json({ userId: (decoded as any).userId });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
});

router.post("/forgotPassword", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  try {
    const token = await forgotPassword(email);
    if (!token) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await sendForgotPasswordEmail(email, token);

    res.status(200).json({ message: "Password reset token created" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/updatePassword", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  try {
    const userId = await updatePassword(token, password);
    if (!userId) {
      res.status(404).json({ error: "Invalid token or user not found" });
      return;
    }
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/resendVerification", authMiddleware, async (req, res) => {
  const { userId } = req.auth || {};
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.verified || !user.email_verification_token) {
      res.status(400).json({ error: "User already verified" });
      return;
    }

    await sendAccountValidationEmail(user.email, user.email_verification_token);

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
