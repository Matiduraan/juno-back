import { Request, Response, NextFunction } from "express";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if the user is authenticated
  // TODO: Replace with actual authentication logic
  req.auth = {
    userId: 1,
  };

  // If authenticated, proceed to the next middleware or route handler
  next();
};
export default authMiddleware;
