import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload = jwt.verify(accessToken, process.env.JWT_SECRET) as {
      userId: number;
    } | null;

    if (!payload) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const userId = payload.userId;

    if (!userId || isNaN(parseInt(userId.toString()))) {
      res.status(401).json({ error: "Invalid user ID" });
      return;
    }

    req.auth = {
      userId,
    };

    // If authenticated, proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};
export default authMiddleware;
