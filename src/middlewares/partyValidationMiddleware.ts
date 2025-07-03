import { NextFunction, Request, Response } from "express";
import { validatePartyAccess } from "../utils/authorization/party";

function partyValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { partyId } = req.params;

  // Check if partyId is provided and is a valid number
  if (!partyId || isNaN(parseInt(partyId))) {
    next();
    return;
  }

  // Check if userId is provided in the request body or headers
  const userId = req.auth?.userId || req.body?.userId;
  if (userId && !isNaN(parseInt(userId))) {
    const hasAccess = validatePartyAccess(parseInt(partyId), userId);
    if (!hasAccess) {
      res.status(403).json({ error: "Access denied to this party" });
      return;
    }
  }

  next();
}

export default partyValidationMiddleware;
