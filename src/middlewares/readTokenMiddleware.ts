import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const readTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
      next();
      return;
    }

    const payload = jwt.verify(accessToken, process.env.JWT_SECRET) as {
      userId: number;
    } | null;

    if (!payload) {
      next();
      return;
    }

    const userId = payload.userId;

    if (!userId || isNaN(parseInt(userId.toString()))) {
      next();
      return;
    }

    req.auth = {
      userId: 1,
    };

    // If authenticated, proceed to the next middleware or route handler
    next();
  } catch (error) {
    next();
    return;
  }
};
export default readTokenMiddleware;
