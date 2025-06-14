declare namespace Express {
  interface Request {
    auth: {
      userId?: number;
      // Add other authentication-related properties as needed
    };
  }
}
