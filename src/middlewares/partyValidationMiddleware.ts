import { NextFunction, Request, Response } from "express";
import { validatePartyAccess } from "../utils/authorization/party";

async function partyValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { partyId } = req.params;

  if (!partyId || isNaN(parseInt(partyId))) {
    next();
    return;
  }

  const userId = req.auth?.userId || req.body?.userId;
  if (userId && !isNaN(parseInt(userId))) {
    const hasAccess = await validatePartyAccess(parseInt(partyId), userId);
    if (!hasAccess) {
      res.status(403).json({ error: "Access denied to this party" });
      return;
    }
  }

  next();
}

export default partyValidationMiddleware;
